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
import shell from 'shelljs';
import androidConfig from '../config/androidconfig.json';
import { AndroidPackage, AndroidVirtualDevice } from './AndroidTypes';
import { MapUtils } from './Common';
import { CommonUtils } from './CommonUtils';

const execSync = childProcess.execSync;
const spawn = childProcess.spawn;
type StdioOptions = childProcess.StdioOptions;

export class AndroidSDKUtils {
    static get androidHome(): string {
        return process.env.ANDROID_HOME ? process.env.ANDROID_HOME.trim() : '';
    }
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

    public static setLogger(logger: Logger) {
        if (logger) {
            AndroidSDKUtils.logger = logger;
        }
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
        return CommonUtils.executeCommand(command, stdioOptions).toString();
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
                    }
                    if (idx !== -1) {
                        reject(new Error('unsupported Java version.'));
                    }
                    if (error.status === 127) {
                        reject(
                            new Error(
                                'SDK Manager not found. Expected at ' +
                                    AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD
                            )
                        );
                    }
                    reject(error.message);
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
                const result = execSync(
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
                const packages = await AndroidSDKUtils.fetchInstalledPackages();
                if (packages.size < 1) {
                    return reject(
                        new Error(
                            `Could not find android api packages. Requires any one of these [${
                                androidConfig.supportedRuntimes[0]
                            } - ${
                                androidConfig.supportedRuntimes[
                                    androidConfig.supportedRuntimes.length - 1
                                ]
                            }]`
                        )
                    );
                }

                const filteredList: string[] = androidConfig.supportedRuntimes.filter(
                    (runtimeString) =>
                        packages.get('platforms;' + runtimeString) !== null
                );
                if (filteredList.length < 1) {
                    return reject(
                        new Error(
                            `Could not locate a matching android api package. Requires any one of these [${
                                androidConfig.supportedRuntimes[0]
                            } - ${
                                androidConfig.supportedRuntimes[
                                    androidConfig.supportedRuntimes.length - 1
                                ]
                            }]`
                        )
                    );
                }
                // use the first one.
                const androidPackage = packages.get(
                    'platforms;' + filteredList[0]
                );
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

    public static async findRequiredBuildToolsPackage(): Promise<
        AndroidPackage
    > {
        return new Promise<AndroidPackage>(async (resolve, reject) => {
            try {
                const packages = await AndroidSDKUtils.fetchInstalledPackages();
                const matchingKeys: string[] = [];

                const range = `${androidConfig.supportedBuildTools[0]}.x.y-${
                    androidConfig.supportedBuildTools[
                        androidConfig.supportedBuildTools.length - 1
                    ]
                }.x.y`;
                const versionRegex = androidConfig.supportedBuildTools.reduce(
                    (previous, current) => `${previous}|${current}`
                );
                packages.forEach((value, key) => {
                    // look for 29.x.y or 28.x.y and so on
                    if (
                        key.match(
                            `(build-tools;(${versionRegex}))[.][0-5][.][0-5]`
                        ) !== null
                    ) {
                        matchingKeys.push(key);
                    }
                });

                if (matchingKeys.length < 1) {
                    return reject(
                        new Error(
                            `Could not locate a matching build tools package. Requires any one of these [${range}]`
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
                        `Could not find build tools packages. ${error.errorMessage}`
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
            AndroidSDKUtils.enableHWKeyboardForEmulator(emulatorName)
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

    public static getEmulatorPort(
        emulatorName: string,
        requestedPortNumber: number
    ): number {
        // if config file does not exist, its created but not launched so use the requestedPortNumber
        // else we will read it from emu-launch-params.txt file.
        const userHome =
            process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
        const launchFileName = path.join(
            `${userHome}`,
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

    private static logger: Logger = new Logger(
        'force:lightning:mobile:android'
    );
    private static DEFAULT_ADB_CONSOLE_PORT = 5554;
    private static packageCache: Map<string, AndroidPackage> = new Map();

    private static getToolsBin(): string {
        let toolsLocation = AndroidSDKUtils.ANDROID_TOOLS_BIN;
        if (
            !fs.existsSync(toolsLocation) &&
            fs.existsSync(AndroidSDKUtils.ANDROID_CMD_LINE_TOOLS_BIN)
        ) {
            toolsLocation = AndroidSDKUtils.ANDROID_CMD_LINE_TOOLS_BIN;
        }
        return toolsLocation;
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

    private static enableHWKeyboardForEmulator(
        emulatorName: string
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                shell
                    .echo('hw.keyboard=yes')
                    .toEnd(`~/.android/avd/${emulatorName}.avd/config.ini`);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
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
        const userHome =
            process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
        // ram.img.dirty is a one byte file created when avd is started and removed when avd is stopped.
        const launchFileName = path.join(
            `${userHome}`,
            '.android',
            'avd',
            `${emulatorName}.avd`,
            'snapshots',
            'default_boot',
            'ram.img.dirty'
        );
        return fs.existsSync(launchFileName);
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
}
