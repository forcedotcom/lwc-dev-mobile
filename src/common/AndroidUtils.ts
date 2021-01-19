/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import * as childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import androidConfig from '../config/androidconfig.json';
import {
    AndroidPackage,
    AndroidPackages,
    AndroidVirtualDevice
} from './AndroidTypes';
import { Version } from './Common';
import { CommonUtils } from './CommonUtils';
import { LaunchArgument } from './PreviewConfigFile';
import { PreviewUtils } from './PreviewUtils';

const spawn = childProcess.spawn;
type StdioOptions = childProcess.StdioOptions;

const LOGGER_NAME = 'force:lightning:mobile:android';
const USER_HOME =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const WINDOWS_OS = 'win32';
const ANDROID_SDK_MANAGER_NAME = 'sdkmanager';
const ANDROID_AVD_MANAGER_NAME = 'avdmanager';
const ANDROID_ADB_NAME = 'adb';
const DEFAULT_ADB_CONSOLE_PORT = 5554;

export enum AndroidSDKRootSource {
    androidHome = 'ANDROID_HOME',
    androidSDKRoot = 'ANDROID_SDK_ROOT'
}

export interface AndroidSDKRoot {
    rootLocation: string;
    rootSource: AndroidSDKRootSource;
}

export class AndroidSDKUtils {
    public static async initializeLogger(): Promise<void> {
        AndroidSDKUtils.logger = await Logger.child(LOGGER_NAME);
        return Promise.resolve();
    }

    public static convertToUnixPath(dirPath: string): string {
        return dirPath.replace(/[\\]+/g, '/');
    }

    public static isCached(): boolean {
        return !AndroidSDKUtils.packageCache.isEmpty();
    }

    public static executeCommand(
        command: string,
        stdioOptions: StdioOptions = ['ignore', 'pipe', 'ignore']
    ): string {
        return CommonUtils.executeCommand(command, stdioOptions);
    }

    public static isJavaHomeSet(): boolean {
        return process.env.JAVA_HOME
            ? process.env.JAVA_HOME.trim().length > 0
            : false;
    }

    public static clearCaches() {
        AndroidSDKUtils.emulatorCommand = undefined;
        AndroidSDKUtils.androidCmdLineToolsBin = undefined;
        AndroidSDKUtils.androidPlatformTools = undefined;
        AndroidSDKUtils.avdManagerCommand = undefined;
        AndroidSDKUtils.adbShellCommand = undefined;
        AndroidSDKUtils.sdkManagerCommand = undefined;
        AndroidSDKUtils.sdkRoot = undefined;
        AndroidSDKUtils.packageCache = new AndroidPackages();
    }

    public static async androidSDKPrerequisitesCheck(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            // Attempt to run sdkmanager and see if it throws any exceptions.
            // If no errors are encountered then all prerequisites are met.
            // But if an error is encountered then we'll try to see if it
            // is due to unsupported Java version or something else.
            AndroidSDKUtils.fetchAndroidCmdLineToolsLocation([
                'ignore', // stdin
                'pipe', // stdout
                'pipe' // stderr
            ])
                .then((result) => resolve(result))
                .catch((error) => {
                    const e: Error = error;
                    const stack = e.stack || '';
                    const idx = stack.indexOf(
                        'java.lang.NoClassDefFoundError: javax/xml/bind/annotation/XmlSchema'
                    );

                    if (!AndroidSDKUtils.isJavaHomeSet()) {
                        reject(new Error('JAVA_HOME is not set.'));
                    } else if (idx !== -1) {
                        reject(new Error('unsupported Java version.'));
                    } else if (error.status && error.status === 127) {
                        reject(
                            new Error(
                                `SDK Manager not found. Expected at ${AndroidSDKUtils.getSdkManagerCommand()}`
                            )
                        );
                    } else {
                        reject(error);
                    }
                });
        });
    }

    public static async fetchAndroidCmdLineToolsLocation(
        stdioOptions: StdioOptions = ['ignore', 'pipe', 'ignore']
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            if (!AndroidSDKUtils.getAndroidSdkRoot()) {
                reject(new Error('Android SDK root is not set.'));
                return;
            }
            try {
                AndroidSDKUtils.executeCommand(
                    `${AndroidSDKUtils.getSdkManagerCommand()} --version`,
                    stdioOptions
                );
                resolve(AndroidSDKUtils.getAndroidCmdLineToolsBin());
            } catch (err) {
                reject(err);
                return;
            }
        });
    }

    public static async fetchAndroidSDKPlatformToolsLocation(): Promise<
        string
    > {
        return new Promise(async (resolve, reject) => {
            if (!AndroidSDKUtils.getAndroidSdkRoot()) {
                return reject(new Error('Android SDK root is not set.'));
            }
            try {
                AndroidSDKUtils.executeCommand(
                    `${AndroidSDKUtils.getAdbShellCommand()} --version`
                );
                resolve(AndroidSDKUtils.getAndroidPlatformTools());
            } catch (err) {
                reject(err);
            }
        });
    }

    public static async fetchInstalledPackages(): Promise<AndroidPackages> {
        if (!AndroidSDKUtils.getAndroidSdkRoot()) {
            return Promise.reject(new Error('Android SDK root is not set.'));
        }

        if (!AndroidSDKUtils.isCached()) {
            try {
                const stdout = AndroidSDKUtils.executeCommand(
                    `${AndroidSDKUtils.getSdkManagerCommand()} --list`
                );
                if (stdout) {
                    const packages = AndroidPackages.parseRawPackagesString(
                        stdout
                    );
                    AndroidSDKUtils.packageCache = packages;
                }
            } catch (err) {
                return Promise.reject(err);
            }
        }

        return Promise.resolve(AndroidSDKUtils.packageCache);
    }

    public static fetchEmulators(): Promise<AndroidVirtualDevice[]> {
        return new Promise((resolve, reject) => {
            let devices: AndroidVirtualDevice[] = [];
            try {
                const result = AndroidSDKUtils.executeCommand(
                    AndroidSDKUtils.getAvdManagerCommand() + ' list avd'
                );
                if (result) {
                    devices = AndroidVirtualDevice.parseRawString(
                        result.toString()
                    );
                }
            } catch (exception) {
                AndroidSDKUtils.logger.warn(exception);
            }
            return resolve(devices);
        });
    }

    public static async findRequiredAndroidAPIPackage(): Promise<
        AndroidPackage
    > {
        try {
            const minSupportedRuntimeAndroid = Version.from(
                androidConfig.minSupportedRuntimeAndroid
            );

            const packages = await AndroidSDKUtils.fetchInstalledPackages();
            if (packages.isEmpty()) {
                return Promise.reject(
                    new Error(
                        `No Android API packages are installed. Minimum supported Android API package version is ${androidConfig.minSupportedRuntimeAndroid}`
                    )
                );
            }

            const matchingPlatforms = packages.platforms.filter((pkg) =>
                pkg.version.sameOrNewer(minSupportedRuntimeAndroid)
            );
            if (matchingPlatforms.length < 1) {
                return Promise.reject(
                    new Error(
                        `Could not locate a supported Android API package. Minimum supported Android API package version is ${androidConfig.minSupportedRuntimeAndroid}`
                    )
                );
            }

            // Sort the packages with latest version by negating the comparison result
            matchingPlatforms.sort((a, b) => a.version.compare(b.version) * -1);

            // Return the latest package that also has matching emulator images
            for (const platform of matchingPlatforms) {
                const emulatorImage = await AndroidSDKUtils.packageWithRequiredEmulatorImages(
                    platform
                );

                if (emulatorImage) {
                    return platform;
                }
            }

            // If we got here then it means that we don't have any Android API packages with emulator images.
            // So we will go ahead and return the latest one anyway. This is b/c the setup command will error
            // out stating that no packages with matching emulator images have been found so the user would
            // then know that they should install emulator images for the latest API package.
            return matchingPlatforms[0];
        } catch (error) {
            return Promise.reject(
                new Error(
                    `Could not find android api packages. ${error.errorMessage}`
                )
            );
        }
    }

    public static async findRequiredEmulatorImages(): Promise<AndroidPackage> {
        try {
            const installedAndroidPackage = await AndroidSDKUtils.findRequiredAndroidAPIPackage();
            const emulatorImage = await AndroidSDKUtils.packageWithRequiredEmulatorImages(
                installedAndroidPackage
            );

            if (emulatorImage) {
                return Promise.resolve(emulatorImage);
            } else {
                return Promise.reject(
                    new Error(
                        `Could not locate an emulator image. Requires any one of these [${androidConfig.supportedImages.join(
                            ','
                        )} for ${[installedAndroidPackage.platformAPI]}]`
                    )
                );
            }
        } catch (error) {
            return Promise.reject(
                new Error(`Could not find android emulator packages.`)
            );
        }
    }

    public static getNextAndroidAdbPort(): Promise<number> {
        const command = `${AndroidSDKUtils.getAdbShellCommand()} devices`;
        return new Promise<number>((resolve, reject) => {
            let adbPort = 0;
            try {
                const stdout = AndroidSDKUtils.executeCommand(command);
                let listOfDevices: number[] = stdout
                    .toString()
                    .split(os.EOL)
                    .filter((avd: string) =>
                        avd.toLowerCase().startsWith('emulator')
                    )
                    .map((value) => {
                        const array = value.match(/\d+/);
                        const portNumbers = array ? array.map(Number) : [0];
                        return portNumbers[0];
                    });
                if (listOfDevices && listOfDevices.length > 0) {
                    listOfDevices = listOfDevices.sort().reverse();
                    adbPort = listOfDevices[0];
                }
            } catch (exception) {
                AndroidSDKUtils.logger.error(exception);
            }
            return resolve(adbPort);
        });
    }

    public static hasEmulator(emulatorName: string): Promise<boolean> {
        const resolvedEmulator = AndroidSDKUtils.resolveEmulatorImage(
            emulatorName
        );
        return Promise.resolve(resolvedEmulator !== undefined);
    }

    public static async createNewVirtualDevice(
        emulatorName: string,
        emulatorImage: string,
        platformAPI: string,
        device: string,
        abi: string
    ): Promise<boolean> {
        // Just like Android Studio AVD Manager GUI interface, replace blank spaces with _ so that the ID of this AVD
        // doesn't have blanks (since that's not allowed). AVD Manager will automatially replace _ back with blank
        // to generate user friendly display names.
        const resolvedName = emulatorName.replace(/ /gi, '_');

        const createAvdCommand = `${AndroidSDKUtils.getAvdManagerCommand()} create avd -n ${resolvedName} --force -k ${AndroidSDKUtils.systemImagePath(
            platformAPI,
            emulatorImage,
            abi
        )} --device ${device} --abi ${abi}`;

        return new Promise((resolve, reject) => {
            try {
                const child = AndroidSDKUtils.spawnChild(createAvdCommand);
                child.stdin.setDefaultEncoding('utf8');
                child.stdin.write('no');
                if (child) {
                    child.stdout.on('data', () => {
                        setTimeout(() => {
                            resolve(true);
                        }, 3000);
                    });
                    child.stdout.on('exit', () => resolve(true));
                    child.stderr.on('error', (err) => {
                        reject(
                            new Error(
                                `Could not create emulator. Command failed: ${createAvdCommand}\n${err}`
                            )
                        );
                    });
                    child.stderr.on('data', (data) => {
                        reject(
                            new Error(
                                `Could not create emulator. Command failed: ${createAvdCommand}\n${data}`
                            )
                        );
                    });
                } else {
                    reject(new Error(`Could not create emulator.`));
                }
            } catch (error) {
                reject(new Error(`Could not create emulator. ${error}`));
            }
        }).then((resolve) =>
            AndroidSDKUtils.updateEmulatorConfig(emulatorName)
        );
    }

    public static startEmulator(
        emulatorName: string,
        requestedPortNumber: number
    ): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            let portNumber = requestedPortNumber;
            const resolvedEmulator = AndroidSDKUtils.resolveEmulatorImage(
                emulatorName
            );

            // This shouldn't happen b/c we make ensure an emulator exists
            // before calling this method, but keeping it just in case
            if (resolvedEmulator === undefined) {
                reject(new Error(`Invalid emulator: ${emulatorName}`));
                return;
            }

            try {
                if (
                    AndroidSDKUtils.isEmulatorAlreadyStarted(resolvedEmulator)
                ) {
                    // get port number from emu-launch-params.txt
                    portNumber = AndroidSDKUtils.getEmulatorPort(
                        resolvedEmulator,
                        requestedPortNumber
                    );
                    resolve(portNumber);
                    return;
                }
                const cmd = `${AndroidSDKUtils.getEmulatorCommand()} @${resolvedEmulator} -port ${portNumber}`;
                const child = spawn(cmd, {
                    detached: true,
                    shell: true
                });
                if (child) {
                    child.unref();

                    child.stdout.on('data', () => {
                        // TODO: rather than calling into pollDeviceStatus() to see if device is booted
                        // we could just listen to the boot message that is sent to stdout of the process

                        // if stdout is called then it means that the process succeeded in launching the emulator
                        resolve(portNumber);
                    });

                    child.stderr.on('data', (data) => {
                        reject(
                            new Error(
                                `Could not start emulator. Command failed: ${cmd}\n${data}`
                            )
                        );
                    });
                } else {
                    reject(new Error(`Could not start emulator.`));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    public static async pollDeviceStatus(portNumber: number): Promise<boolean> {
        const command = `${AndroidSDKUtils.getAdbShellCommand()} -s emulator-${portNumber} wait-for-device shell getprop sys.boot_completed`;
        const timeout = androidConfig.deviceBootReadinessWaitTime;
        const numberOfRetries = androidConfig.deviceBootStatusPollRetries;
        return new Promise<boolean>((resolve, reject) => {
            const timeoutFunc = (commandStr: string, noOfRetries: number) => {
                try {
                    const stdout = AndroidSDKUtils.executeCommand(commandStr);
                    if (stdout && stdout.trim() === '1') {
                        resolve(true);
                    } else {
                        if (noOfRetries === 0) {
                            reject(
                                new Error(
                                    `Timeout waiting for emulator-${portNumber} to boot.`
                                )
                            );
                        } else {
                            setTimeout(
                                timeoutFunc,
                                timeout,
                                commandStr,
                                noOfRetries - 1
                            );
                        }
                    }
                } catch (error) {
                    reject(
                        new Error(
                            `Unable to communicate with emulator via ADB.`
                        )
                    );
                }
            };
            setTimeout(timeoutFunc, 1000, command, numberOfRetries);
        });
    }

    public static launchURLIntent(
        url: string,
        emulatorPort: number
    ): Promise<boolean> {
        const openUrlCommand = `${AndroidSDKUtils.getAdbShellCommand()} -s emulator-${emulatorPort} shell am start -a android.intent.action.VIEW -d ${url}`;
        return new Promise((resolve, reject) => {
            try {
                AndroidSDKUtils.executeCommand(openUrlCommand);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    public static launchNativeApp(
        compName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        targetAppArguments: LaunchArgument[],
        launchActivity: string,
        emulatorPort: number,
        serverAddress: string | undefined,
        serverPort: string | undefined
    ): Promise<boolean> {
        try {
            if (appBundlePath && appBundlePath.trim().length > 0) {
                AndroidSDKUtils.logger.info(
                    `Installing app ${appBundlePath.trim()} to emulator`
                );
                const pathQuote = process.platform === WINDOWS_OS ? '"' : "'";
                const installCommand = `${AndroidSDKUtils.getAdbShellCommand()} -s emulator-${emulatorPort} install -r -t ${pathQuote}${appBundlePath.trim()}${pathQuote}`;
                AndroidSDKUtils.executeCommand(installCommand);
            }

            let launchArgs =
                `--es "${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}" "${compName}"` +
                ` --es "${PreviewUtils.PROJECT_DIR_ARG_PREFIX}" "${projectDir}"`;

            if (serverAddress) {
                launchArgs += ` --es "${PreviewUtils.SERVER_ADDRESS_PREFIX}" "${serverAddress}"`;
            }

            if (serverPort) {
                launchArgs += ` --es "${PreviewUtils.SERVER_PORT_PREFIX}" "${serverPort}"`;
            }

            targetAppArguments.forEach((arg) => {
                launchArgs += ` --es "${arg.name}" "${arg.value}"`;
            });

            const launchCommand =
                `${AndroidSDKUtils.getAdbShellCommand()} -s emulator-${emulatorPort}` +
                ` shell am start -S -n "${targetApp}/${launchActivity}"` +
                ' -a android.intent.action.MAIN' +
                ' -c android.intent.category.LAUNCHER' +
                ` ${launchArgs}`;

            AndroidSDKUtils.logger.info(
                `Relaunching app ${targetApp} in emulator`
            );
            AndroidSDKUtils.executeCommand(launchCommand);

            return Promise.resolve(true);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    public static getEmulatorPort(
        emulatorName: string,
        requestedPortNumber: number
    ): number {
        // if config file does not exist, its created but not launched so use the requestedPortNumber
        // else we will read it from emu-launch-params.txt file.
        const launchFileName = path.join(
            `${USER_HOME}`,
            '.android',
            'avd',
            `${emulatorName}.avd`,
            'emu-launch-params.txt'
        );
        let adjustedPort = requestedPortNumber;
        if (fs.existsSync(launchFileName)) {
            const data = fs.readFileSync(launchFileName, 'utf8').toString();
            // find the following string in file, absence of port indicates use of default port
            // -port
            // 5572
            adjustedPort = DEFAULT_ADB_CONSOLE_PORT;
            const portArgumentString = '-port';
            const portStringIndx = data.indexOf(portArgumentString);
            if (portStringIndx > -1) {
                const portIndx = data.indexOf(
                    '55',
                    portStringIndx + portArgumentString.length
                );
                if (portIndx > -1) {
                    const parsedPort = parseInt(
                        data.substring(portIndx, portIndx + 4),
                        10
                    );
                    // port numbers must be in the range if present
                    if (parsedPort >= 5554 && parsedPort <= 5584) {
                        adjustedPort = parsedPort;
                    }
                }
            }
        }
        return adjustedPort;
    }

    // This method is public for testing purposes.
    public static updateEmulatorConfig(emulatorName: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            const config = await AndroidSDKUtils.readEmulatorConfig(
                emulatorName
            );
            if (config.size === 0) {
                // If we cannot edit the AVD config, fail silently.
                // This will be a degraded experience but should still work.
                resolve(true);
                return;
            }

            // Utilize hardware.
            config.set('hw.keyboard', 'yes');
            config.set('hw.gpu.mode', 'auto');
            config.set('hw.gpu.enabled', 'yes');

            // Give emulator the appropriate skin.
            let skinName = config.get('hw.device.name') || '';
            if (skinName) {
                if (skinName === 'pixel') {
                    skinName = 'pixel_silver';
                } else if (skinName === 'pixel_xl') {
                    skinName = 'pixel_xl_silver';
                }
                const sdkRoot = AndroidSDKUtils.getAndroidSdkRoot();
                config.set('skin.name', skinName);
                config.set(
                    'skin.path',
                    `${
                        (sdkRoot && sdkRoot.rootLocation) || ''
                    }/skins/${skinName}`
                );
                config.set('skin.dynamic', 'yes');
                config.set('showDeviceFrame', 'yes');
            }

            AndroidSDKUtils.writeEmulatorConfig(emulatorName, config);
            resolve(true);
        });
    }

    public static getAndroidPlatformTools(): string {
        if (!AndroidSDKUtils.androidPlatformTools) {
            const sdkRoot = AndroidSDKUtils.getAndroidSdkRoot();
            AndroidSDKUtils.androidPlatformTools = path.join(
                (sdkRoot && sdkRoot.rootLocation) || '',
                'platform-tools'
            );
        }

        return AndroidSDKUtils.androidPlatformTools;
    }

    public static getAndroidSdkRoot(): AndroidSDKRoot | undefined {
        if (!AndroidSDKUtils.sdkRoot) {
            const home =
                process.env.ANDROID_HOME && process.env.ANDROID_HOME.trim();

            const root =
                process.env.ANDROID_SDK_ROOT &&
                process.env.ANDROID_SDK_ROOT.trim();

            if (home && fs.existsSync(home)) {
                AndroidSDKUtils.sdkRoot = {
                    rootLocation: home,
                    rootSource: AndroidSDKRootSource.androidHome
                };
            } else if (root && fs.existsSync(root)) {
                AndroidSDKUtils.sdkRoot = {
                    rootLocation: root,
                    rootSource: AndroidSDKRootSource.androidSDKRoot
                };
            }
        }

        return AndroidSDKUtils.sdkRoot;
    }

    private static logger: Logger = new Logger(LOGGER_NAME);
    private static packageCache: AndroidPackages = new AndroidPackages();
    private static emulatorCommand: string | undefined;
    private static androidCmdLineToolsBin: string | undefined;
    private static androidPlatformTools: string | undefined;
    private static avdManagerCommand: string | undefined;
    private static adbShellCommand: string | undefined;
    private static sdkManagerCommand: string | undefined;
    private static sdkRoot: AndroidSDKRoot | undefined;

    private static getEmulatorCommand(): string {
        if (!AndroidSDKUtils.emulatorCommand) {
            const sdkRoot = AndroidSDKUtils.getAndroidSdkRoot();
            AndroidSDKUtils.emulatorCommand = path.join(
                (sdkRoot && sdkRoot.rootLocation) || '',
                'emulator',
                'emulator'
            );
        }

        return AndroidSDKUtils.emulatorCommand;
    }

    private static getAndroidCmdLineToolsBin(): string {
        if (!AndroidSDKUtils.androidCmdLineToolsBin) {
            const sdkRoot = AndroidSDKUtils.getAndroidSdkRoot();
            AndroidSDKUtils.androidCmdLineToolsBin = path.join(
                (sdkRoot && sdkRoot.rootLocation) || '',
                'cmdline-tools'
            );

            // It is possible to install various versions of the command line tools side-by-side
            // In this case the directory structure would be based on tool versions:
            //
            //    cmdline-tools/1.0/bin
            //    cmdline-tools/2.1/bin
            //    cmdline-tools/3.0/bin
            //    cmdline-tools/4.0-beta01/bin
            //    cmdline-tools/latest/bin
            //
            // Below, we get the list of all directories, then sort them descendingly and grab the first one.
            // This would either resolve to 'latest' or the latest versioned folder name
            if (fs.existsSync(AndroidSDKUtils.androidCmdLineToolsBin)) {
                const content = fs.readdirSync(
                    AndroidSDKUtils.androidCmdLineToolsBin
                );
                if (content && content.length > 0) {
                    content.sort((a, b) => (a > b ? -1 : 1));

                    AndroidSDKUtils.androidCmdLineToolsBin = path.join(
                        AndroidSDKUtils.androidCmdLineToolsBin,
                        content[0],
                        'bin'
                    );
                }
            }
        }

        return AndroidSDKUtils.androidCmdLineToolsBin;
    }

    private static getAvdManagerCommand(): string {
        if (!AndroidSDKUtils.avdManagerCommand) {
            AndroidSDKUtils.avdManagerCommand = path.join(
                AndroidSDKUtils.getAndroidCmdLineToolsBin(),
                ANDROID_AVD_MANAGER_NAME
            );
        }

        return AndroidSDKUtils.avdManagerCommand;
    }

    private static getAdbShellCommand(): string {
        if (!AndroidSDKUtils.adbShellCommand) {
            AndroidSDKUtils.adbShellCommand = path.join(
                AndroidSDKUtils.getAndroidPlatformTools(),
                ANDROID_ADB_NAME
            );
        }

        return AndroidSDKUtils.adbShellCommand;
    }

    private static getSdkManagerCommand(): string {
        if (!AndroidSDKUtils.sdkManagerCommand) {
            AndroidSDKUtils.sdkManagerCommand = path.join(
                AndroidSDKUtils.getAndroidCmdLineToolsBin(),
                ANDROID_SDK_MANAGER_NAME
            );
        }

        return AndroidSDKUtils.sdkManagerCommand;
    }

    private static async packageWithRequiredEmulatorImages(
        androidPackage: AndroidPackage
    ): Promise<AndroidPackage | undefined> {
        const installedSystemImages = await AndroidSDKUtils.fetchInstalledSystemImages(
            androidPackage.platformAPI
        );
        const platformAPI = androidPackage.platformAPI;

        for (const architecture of androidConfig.architectures) {
            for (const image of androidConfig.supportedImages) {
                for (const img of installedSystemImages) {
                    if (
                        img.path.match(
                            `(${platformAPI};${image};${architecture})`
                        ) !== null
                    ) {
                        return Promise.resolve(img);
                    }
                }
            }
        }

        return Promise.resolve(undefined);
    }

    private static systemImagePath(
        platformAPI: string,
        emuImage: string,
        abi: string
    ): string {
        const pathName = `system-images;${platformAPI};${emuImage};${abi}`;
        if (process.platform === WINDOWS_OS) {
            return pathName;
        }
        return `'${pathName}'`;
    }

    private static async fetchInstalledSystemImages(
        androidApi: string
    ): Promise<AndroidPackage[]> {
        return AndroidSDKUtils.fetchInstalledPackages().then(
            (packages) => packages.systemImages
        );
    }

    private static isEmulatorAlreadyStarted(emulatorName: string): boolean {
        const findProcessCommand =
            process.platform === WINDOWS_OS
                ? `wmic process where "CommandLine Like \'%qemu-system-x86_64%\'" get CommandLine  | findstr "${emulatorName}"`
                : `ps -ax | grep qemu-system-x86_64 | grep ${emulatorName} | grep -v grep`;

        // ram.img.dirty is a one byte file created when avd is started and removed when avd is stopped.
        const launchFileName = path.join(
            `${USER_HOME}`,
            '.android',
            'avd',
            `${emulatorName}.avd`,
            'snapshots',
            'default_boot',
            'ram.img.dirty'
        );

        // first ensure that ram.img.dirty exists
        if (!fs.existsSync(launchFileName)) {
            return false;
        }

        // then ensure that the process is also running for the selected emulator
        let foundProcess = false;
        try {
            const findResult = CommonUtils.executeCommand(findProcessCommand);
            foundProcess = findResult != null && findResult.trim().length > 0;
        } catch (error) {
            AndroidSDKUtils.logger.debug(
                `Unable to find the emulator process: ${error}`
            );
        }
        return foundProcess;
    }

    // NOTE: detaching a process in windows seems to detach the streams. Prevent spawn from detaching when
    // used in Windows OS for special handling of some commands (adb).
    private static spawnChild(command: string): childProcess.ChildProcess {
        if (process.platform === WINDOWS_OS) {
            const child = spawn(command, { shell: true });
            return child;
        } else {
            const child = spawn(command, { shell: true, detached: true });
            child.unref();
            return child;
        }
    }

    // The user can provide us with emulator name as an ID (Pixel_XL) or as display name (Pixel XL).
    // This method can be used to resolve a display name back to an id since emulator commands
    // work with IDs not display names.
    private static resolveEmulatorImage(
        emulatorName: string
    ): string | undefined {
        const emulatorDisplayName = emulatorName.replace(/[_-]/gi, ' ').trim(); // eg. Pixel_XL --> Pixel XL, tv-emulator --> tv emulator

        try {
            const stdout = AndroidSDKUtils.executeCommand(
                AndroidSDKUtils.getEmulatorCommand() + ' ' + '-list-avds'
            );
            const listOfAVDs = stdout.toString().split(os.EOL);
            for (const avd of listOfAVDs) {
                const avdDisplayName = avd.replace(/[_-]/gi, ' ').trim();

                if (
                    avd === emulatorName ||
                    avdDisplayName === emulatorDisplayName
                ) {
                    return avd;
                }
            }
        } catch (exception) {
            AndroidSDKUtils.logger.error(exception);
        }

        return undefined;
    }

    private static async readEmulatorConfig(
        emulatorName: string
    ): Promise<Map<string, string>> {
        const filePath =
            USER_HOME + `/.android/avd/${emulatorName}.avd/config.ini`;
        try {
            const configFile = fs.readFileSync(filePath, 'utf8');
            const configMap = new Map();
            for (const line of configFile.split('\n')) {
                const config = line.split('=');
                if (config.length > 1) {
                    configMap.set(config[0], config[1]);
                }
            }

            return configMap;
        } catch (error) {
            AndroidSDKUtils.logger.warn(
                'Unable to read emulator config at: ' + filePath
            );
            return new Map<string, string>();
        }
    }

    private static writeEmulatorConfig(
        emulatorName: string,
        config: Map<string, string>
    ): void {
        let configString = '';
        // This looks wrong, but the callback signature of forEach is function(value,key,map).
        config.forEach((value, key) => {
            configString += key + '=' + value + '\n';
        });
        const filePath =
            USER_HOME + `/.android/avd/${emulatorName}.avd/config.ini`;
        try {
            fs.writeFileSync(filePath, configString, 'utf8');
        } catch (error) {
            // If we cannot edit the AVD config, fail silently.
            // This will be a degraded experience but should still work.
            AndroidSDKUtils.logger.warn(
                'Unable to write emulator config at: ' + filePath
            );
        }
    }
}
