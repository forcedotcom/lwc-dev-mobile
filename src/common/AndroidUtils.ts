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
import { AndroidPackage, AndroidVirtualDevice } from './AndroidTypes';
import { MapUtils, Version } from './Common';
import { CommonUtils } from './CommonUtils';
import { LaunchArgument } from './PreviewConfigFile';
import { PreviewUtils } from './PreviewUtils';

const spawn = childProcess.spawn;
type StdioOptions = childProcess.StdioOptions;

const LOGGER_NAME = 'force:lightning:mobile:android';

export class AndroidSDKUtils {
    static get androidHome(): string {
        return process.env.ANDROID_HOME ? process.env.ANDROID_HOME.trim() : '';
    }
    public static USER_HOME =
        process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    public static WINDOWS_OS = 'win32';
    public static ANDROID_SDK_MANAGER_NAME = 'sdkmanager';
    public static ANDROID_AVD_MANAGER_NAME = 'avdmanager';

    public static ANDROID_HOME = process.env.ANDROID_HOME
        ? process.env.ANDROID_HOME
        : '';
    public static EMULATOR_COMMAND = path.join(
        AndroidSDKUtils.ANDROID_HOME,
        'emulator',
        'emulator'
    );
    public static ANDROID_TOOLS_BIN = path.join(
        AndroidSDKUtils.ANDROID_HOME,
        'tools',
        'bin'
    );
    public static ANDROID_CMD_LINE_TOOLS_BIN = path.join(
        AndroidSDKUtils.ANDROID_HOME,
        'cmdline-tools',
        'latest',
        'bin'
    );

    public static ANDROID_PLATFORM_TOOLS = path.join(
        AndroidSDKUtils.ANDROID_HOME,
        'platform-tools'
    );

    public static AVDMANAGER_COMMAND = path.join(
        AndroidSDKUtils.getToolsBin(),
        AndroidSDKUtils.ANDROID_AVD_MANAGER_NAME
    );

    public static ADB_SHELL_COMMAND = path.join(
        AndroidSDKUtils.ANDROID_PLATFORM_TOOLS,
        'adb'
    );

    public static ANDROID_SDK_MANAGER_CMD = path.join(
        AndroidSDKUtils.getToolsBin(),
        AndroidSDKUtils.ANDROID_SDK_MANAGER_NAME
    );

    public static ADB_SHELL_COMMAND_VERSION =
        AndroidSDKUtils.ADB_SHELL_COMMAND + ' --version';

    public static async initializeLogger(): Promise<void> {
        AndroidSDKUtils.logger = await Logger.child(LOGGER_NAME);
        return Promise.resolve();
    }

    public static convertToUnixPath(dirPath: string): string {
        return dirPath.replace(/[\\]+/g, '/');
    }

    public static isCached(): boolean {
        return AndroidSDKUtils.packageCache.size > 0;
    }

    public static executeCommand(
        command: string,
        stdioOptions: StdioOptions = ['ignore', 'pipe', 'ignore']
    ): string {
        return CommonUtils.executeCommand(command, stdioOptions);
    }

    public static isAndroidHomeSet(): boolean {
        return process.env.ANDROID_HOME
            ? process.env.ANDROID_HOME.trim().length > 0
            : false;
    }

    public static isJavaHomeSet(): boolean {
        return process.env.JAVA_HOME
            ? process.env.JAVA_HOME.trim().length > 0
            : false;
    }

    public static clearCaches() {
        AndroidSDKUtils.packageCache.clear();
    }

    public static async androidSDKPrerequisitesCheck(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            // Attempt to run sdkmanager and see if it throws any exceptions.
            // If no errors are encountered then all prerequisites are met.
            // But if an error is encountered then we'll try to see if it
            // is due to unsupported Java version or something else.
            AndroidSDKUtils.fetchAndroidSDKToolsLocation([
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
                                `SDK Manager not found. Expected at ${AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD}`
                            )
                        );
                    } else {
                        reject(error);
                    }
                });
        });
    }

    public static async fetchAndroidSDKToolsLocation(
        stdioOptions: StdioOptions = ['ignore', 'pipe', 'ignore']
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            if (!AndroidSDKUtils.isAndroidHomeSet()) {
                reject(new Error('ANDROID_HOME is not set.'));
                return;
            }
            try {
                AndroidSDKUtils.executeCommand(
                    `${AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD} --version`,
                    stdioOptions
                );
                resolve(AndroidSDKUtils.getToolsBin());
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
            if (!AndroidSDKUtils.isAndroidHomeSet()) {
                return reject(new Error('ANDROID_HOME is not set.'));
            }
            try {
                AndroidSDKUtils.executeCommand(
                    AndroidSDKUtils.ADB_SHELL_COMMAND_VERSION
                );
                resolve(AndroidSDKUtils.ANDROID_PLATFORM_TOOLS);
            } catch (err) {
                reject(err);
            }
        });
    }

    public static async fetchInstalledPackages(): Promise<
        Map<string, AndroidPackage>
    > {
        return new Promise<Map<string, AndroidPackage>>((resolve, reject) => {
            if (!AndroidSDKUtils.isAndroidHomeSet()) {
                return reject(new Error('ANDROID_HOME is not set.'));
            }

            if (!AndroidSDKUtils.isCached()) {
                try {
                    const stdout = AndroidSDKUtils.executeCommand(
                        `${AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD} --list`
                    );
                    if (stdout) {
                        const packages = AndroidPackage.parseRawPackagesString(
                            stdout
                        );
                        AndroidSDKUtils.packageCache = packages;
                    }
                } catch (err) {
                    return reject(err);
                }
            }
            resolve(AndroidSDKUtils.packageCache);
        });
    }

    public static fetchEmulators(): Promise<AndroidVirtualDevice[]> {
        return new Promise((resolve, reject) => {
            let devices: AndroidVirtualDevice[] = [];
            try {
                const result = AndroidSDKUtils.executeCommand(
                    AndroidSDKUtils.AVDMANAGER_COMMAND + ' list avd'
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
        return new Promise<AndroidPackage>(async (resolve, reject) => {
            try {
                const minSupportedAndroidRuntime: Version = new Version(
                    androidConfig.minSupportedAndroidRuntime
                );
                const packages = await AndroidSDKUtils.fetchInstalledPackages();
                if (packages.size < 1) {
                    return reject(
                        new Error(
                            `Could not find any supported Android API packages. Minimum supported Android API package version is ${androidConfig.minSupportedAndroidRuntime}`
                        )
                    );
                }

                const matchingKeys: string[] = [];
                packages.forEach((value, key) => {
                    if (key.toLowerCase().startsWith('platforms;android-')) {
                        const platformVersion = new Version(
                            key.toLowerCase().replace('platforms;android-', '')
                        );
                        if (
                            platformVersion.sameOrNewer(
                                minSupportedAndroidRuntime
                            )
                        ) {
                            matchingKeys.push(key);
                        }
                    }
                });

                if (matchingKeys.length < 1) {
                    return reject(
                        new Error(
                            `Could not locate a matching Android API package. Minimum supported Android API package version is ${androidConfig.minSupportedAndroidRuntime}`
                        )
                    );
                }

                matchingKeys.sort();
                matchingKeys.reverse();

                // use the first one.
                const androidPackage = packages.get(matchingKeys[0]);
                resolve(androidPackage);
            } catch (error) {
                reject(
                    new Error(
                        `Could not find android api packages. ${error.errorMessage}`
                    )
                );
            }
        });
    }

    public static async findRequiredEmulatorImages(): Promise<AndroidPackage> {
        return new Promise<AndroidPackage>(async (resolve, reject) => {
            try {
                const installedAndroidPackage = await AndroidSDKUtils.findRequiredAndroidAPIPackage();
                const packages = await AndroidSDKUtils.fetchInstalledSystemImages(
                    installedAndroidPackage.platformAPI
                );
                let supportedPackage: string | null = null;
                const platformAPI = installedAndroidPackage.platformAPI;
                for (const architecture of androidConfig.architectures) {
                    for (const image of androidConfig.supportedImages) {
                        for (const key of Array.from(packages.keys())) {
                            if (
                                key.match(
                                    `(system-images;${platformAPI};${image};${architecture})`
                                ) !== null
                            ) {
                                supportedPackage = key;
                                break;
                            }
                        }
                        if (supportedPackage) {
                            break;
                        }
                    }
                    if (supportedPackage) {
                        break;
                    }
                }

                if (supportedPackage === null) {
                    reject(
                        new Error(
                            `Could not locate an emulator image. Requires any one of these [${androidConfig.supportedImages.join(
                                ','
                            )} for ${[platformAPI]}]`
                        )
                    );
                    return;
                }

                resolve(packages.get(supportedPackage));
            } catch (error) {
                reject(new Error(`Could not find android emulator packages.`));
            }
        });
    }

    public static getNextAndroidAdbPort(): Promise<number> {
        const command = `${AndroidSDKUtils.ADB_SHELL_COMMAND} devices`;
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
        return new Promise((resolve, reject) => {
            try {
                const stdout = AndroidSDKUtils.executeCommand(
                    AndroidSDKUtils.EMULATOR_COMMAND + ' ' + '-list-avds'
                );
                const listOfAVDs = stdout
                    .toString()
                    .split(os.EOL)
                    .filter((avd: string) => avd === emulatorName);
                return resolve(listOfAVDs && listOfAVDs.length > 0);
            } catch (exception) {
                AndroidSDKUtils.logger.error(exception);
            }
            return resolve(false);
        });
    }

    public static async createNewVirtualDevice(
        emulatorName: string,
        emulatorimage: string,
        platformAPI: string,
        device: string,
        abi: string
    ): Promise<boolean> {
        const createAvdCommand = `${
            AndroidSDKUtils.AVDMANAGER_COMMAND
        } create avd -n ${emulatorName} --force -k ${this.systemImagePath(
            platformAPI,
            emulatorimage,
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
                    child.stderr.on('error', () => reject(false));
                } else {
                    reject(false);
                }
            } catch (error) {
                reject(error);
            }
        }).then((resolve) =>
            AndroidSDKUtils.updateEmulatorConfig(emulatorName)
        );
    }

    public static startEmulator(
        emulatorName: string,
        requestedPortNumber: number
    ): Promise<number> {
        return new Promise((resolve, reject) => {
            let portNumber = requestedPortNumber;
            try {
                if (AndroidSDKUtils.isEmulatorAlreadyStarted(emulatorName)) {
                    // get port number from emu-launch-params.txt
                    portNumber = AndroidSDKUtils.getEmulatorPort(
                        emulatorName,
                        requestedPortNumber
                    );
                    resolve(portNumber);
                    return;
                }
                const child = spawn(
                    `${AndroidSDKUtils.EMULATOR_COMMAND} @${emulatorName} -port ${portNumber}`,
                    { detached: true, shell: true, stdio: 'ignore' }
                );
                resolve(portNumber);
                child.unref();
            } catch (error) {
                reject(error);
            }
        });
    }

    public static async pollDeviceStatus(portNumber: number): Promise<boolean> {
        const command = `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${portNumber} wait-for-device shell getprop sys.boot_completed`;
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
        const openUrlCommand = `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${emulatorPort} shell am start -a android.intent.action.VIEW -d ${url}`;
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
        emulatorPort: number
    ): Promise<boolean> {
        try {
            if (appBundlePath && appBundlePath.trim().length > 0) {
                AndroidSDKUtils.logger.info(
                    `Installing app ${appBundlePath.trim()} to emulator`
                );
                const installCommand = `${
                    AndroidSDKUtils.ADB_SHELL_COMMAND
                } -s emulator-${emulatorPort} install -r -t '${appBundlePath.trim()}'`;
                AndroidSDKUtils.executeCommand(installCommand);
            }

            let launchArgs =
                `--es "${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}" "${compName}"` +
                ` --es "${PreviewUtils.PROJECT_DIR_ARG_PREFIX}" "${projectDir}"`;

            targetAppArguments.forEach((arg) => {
                launchArgs += ` --es "${arg.name}" "${arg.value}"`;
            });

            const launchCommand =
                `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${emulatorPort}` +
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
            `${AndroidSDKUtils.USER_HOME}`,
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
            adjustedPort = this.DEFAULT_ADB_CONSOLE_PORT;
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
                config.set('skin.name', skinName);
                config.set(
                    'skin.path',
                    `${AndroidSDKUtils.ANDROID_HOME}/skins/${skinName}`
                );
                config.set('skin.dynamic', 'yes');
                config.set('showDeviceFrame', 'yes');
            }

            AndroidSDKUtils.writeEmulatorConfig(emulatorName, config);
            resolve(true);
        });
    }

    private static logger: Logger = new Logger(LOGGER_NAME);
    private static DEFAULT_ADB_CONSOLE_PORT = 5554;
    private static packageCache: Map<string, AndroidPackage> = new Map();
    private static toolsBinLocation: string;

    private static getToolsBin(): string {
        if (this.toolsBinLocation === undefined) {
            this.toolsBinLocation = AndroidSDKUtils.ANDROID_TOOLS_BIN;
            if (
                !fs.existsSync(this.toolsBinLocation) &&
                fs.existsSync(AndroidSDKUtils.ANDROID_CMD_LINE_TOOLS_BIN)
            ) {
                this.toolsBinLocation =
                    AndroidSDKUtils.ANDROID_CMD_LINE_TOOLS_BIN;
            }
        }
        return this.toolsBinLocation;
    }

    private static systemImagePath(
        platformAPI: string,
        emuImage: string,
        abi: string
    ): string {
        const pathName = `system-images;${platformAPI};${emuImage};${abi}`;
        if (process.platform === AndroidSDKUtils.WINDOWS_OS) {
            return pathName;
        }
        return `'${pathName}'`;
    }

    private static async fetchInstalledSystemImages(
        androidApi: string
    ): Promise<Map<string, AndroidPackage>> {
        const allPacks = await AndroidSDKUtils.fetchInstalledPackages();
        return new Promise<Map<string, AndroidPackage>>((resolve, reject) => {
            const systemImages = MapUtils.filter(
                allPacks,
                (key, value) => key.indexOf(`system-images;${androidApi}`) > -1
            );
            resolve(systemImages);
        });
    }

    private static isEmulatorAlreadyStarted(emulatorName: string): boolean {
        const findProcessCommand =
            process.platform === AndroidSDKUtils.WINDOWS_OS
                ? `tasklist /V /FI "IMAGENAME eq qemu-system-x86_64.exe" | findstr "${emulatorName}"`
                : `ps -ax | grep qemu-system-x86_64 | grep ${emulatorName} | grep -v grep`;

        // ram.img.dirty is a one byte file created when avd is started and removed when avd is stopped.
        const launchFileName = path.join(
            `${AndroidSDKUtils.USER_HOME}`,
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
        if (process.platform === AndroidSDKUtils.WINDOWS_OS) {
            const child = spawn(command, { shell: true });
            return child;
        } else {
            const child = spawn(command, { shell: true, detached: true });
            child.unref();
            return child;
        }
    }

    private static async readEmulatorConfig(
        emulatorName: string
    ): Promise<Map<string, string>> {
        const filePath =
            AndroidSDKUtils.USER_HOME +
            `/.android/avd/${emulatorName}.avd/config.ini`;
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
            AndroidSDKUtils.USER_HOME +
            `/.android/avd/${emulatorName}.avd/config.ini`;
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
