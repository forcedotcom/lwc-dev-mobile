/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import * as childProcess from 'child_process';
import os from 'os';
import path from 'path';
import androidConfig from '../config/androidconfig.json';
import { AndroidPackage } from './AndroidTypes';
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
        AndroidSDKUtils.ANDROID_TOOLS_BIN,
        AndroidSDKUtils.ANDROID_AVD_MANAGER_NAME
    );

    public static ADB_SHELL_COMMAND = path.join(
        AndroidSDKUtils.ANDROID_PLATFORM_TOOLS,
        'adb'
    );

    public static ANDROID_SDK_MANAGER_CMD = path.join(
        AndroidSDKUtils.ANDROID_TOOLS_BIN,
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
        return execSync(command, {
            stdio: stdioOptions
        }).toString();
    }

    public static isAndroidHomeSet(): boolean {
        return process.env.ANDROID_HOME
            ? process.env.ANDROID_HOME.trim().length > 0
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

                    if (idx !== -1) {
                        reject('unsupported Java version');
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
                    `${AndroidSDKUtils.getSDKManagerCmd()} --version`,
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
                        `${AndroidSDKUtils.getSDKManagerCmd()} --list`
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
                const packages = await AndroidSDKUtils.fetchInstalledPackages();
                const installedAndroidPackage = await AndroidSDKUtils.findRequiredAndroidAPIPackage();
                const matchingKeys: string[] = [];
                const platformAPI = installedAndroidPackage.platformAPI;
                const reducer = (accumalator: string, current: string) =>
                    accumalator.length > 0
                        ? `${accumalator}|${platformAPI};${current}`
                        : `${platformAPI};${current}`;
                const imagesRegex = androidConfig.supportedImages.reduce(
                    reducer,
                    ''
                );
                // Will retry with next architecture in list until it finds one.
                for (const architecture of androidConfig.architectures) {
                    for (const key of Array.from(packages.keys())) {
                        if (
                            key.match(
                                `(system-images;(${imagesRegex});${architecture})`
                            ) !== null
                        ) {
                            matchingKeys.push(key);
                            break;
                        }
                    }

                    if (matchingKeys.length > 0) {
                        break;
                    }
                }

                if (matchingKeys.length < 1) {
                    reject(
                        new Error(
                            `Could not locate an emulator image. Requires any one of these [${androidConfig.supportedImages.join(
                                ','
                            )} for ${[platformAPI]}]`
                        )
                    );
                    return;
                }

                // use the first one.
                const androidPackage = packages.get(matchingKeys[0]);
                resolve(androidPackage);
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

    public static createNewVirtualDevice(
        emulatorName: string,
        emulatorimage: string,
        platformAPI: string,
        device: string,
        abi: string
    ): Promise<boolean> {
        const createAvdCommand = `${AndroidSDKUtils.getAVDManagerCmd()} create avd -n ${emulatorName} --force -k ${this.systemImagePath(
            platformAPI,
            emulatorimage,
            abi
        )} --device ${device} --abi ${abi}`;
        return new Promise((resolve, reject) => {
            try {
                const child = spawn(createAvdCommand, { shell: true });
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
        });
    }

    public static startEmulator(
        emulatorName: string,
        portNumber: number
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                const child = spawn(
                    `${AndroidSDKUtils.EMULATOR_COMMAND} @${emulatorName} -port ${portNumber}`,
                    { shell: true }
                );
                child.stdin.setDefaultEncoding('utf8');
                if (child) {
                    child.stdout.on('data', () => resolve(true));
                    child.stderr.on('error', () => reject(false));
                } else {
                    reject(false);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // NOTE: I have not had success with using something similar to this
    // adb -s emulator-${portNumber} wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done;'
    // It has led to device and adb freezes. Need to revisit later.
    public static async pollDeviceStatus(
        portNumber: number,
        numberofRetries: number,
        timeoutMillis: number
    ): Promise<boolean> {
        const command = `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${portNumber} shell getprop dev.bootcomplete`;
        return new Promise<boolean>((resolve, reject) => {
            if (numberofRetries === 1) {
                const message = `Waited too long for emulator emulator-${portNumber} to boot.`;
                AndroidSDKUtils.logger.error(message);
                return reject(new Error(message));
            }

            try {
                const stdout = AndroidSDKUtils.executeCommand(command);
                if (stdout && stdout.trim() === '1') {
                    return resolve(true);
                }
            } catch (exception) {
                AndroidSDKUtils.logger.warn(
                    `Waiting for emulator-${portNumber} to boot, retries left ${
                        numberofRetries - 1
                    }`
                );
            }
            return new Promise((resolveDeviceStatus) =>
                setTimeout(resolve, timeoutMillis)
            )
                .then(() => {
                    return AndroidSDKUtils.pollDeviceStatus(
                        portNumber,
                        numberofRetries - 1,
                        timeoutMillis
                    );
                })
                .then((result) => resolve(result))
                .catch((error) => reject(error));
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

    private static logger: Logger = new Logger(
        'force:lightning:mobile:android'
    );

    private static packageCache: Map<string, AndroidPackage> = new Map();

    private static getToolsBin(): string {
        let toolsLocation = AndroidSDKUtils.ANDROID_TOOLS_BIN;
        if (process.platform === AndroidSDKUtils.WINDOWS_OS) {
            toolsLocation = AndroidSDKUtils.ANDROID_CMD_LINE_TOOLS_BIN;
        }
        return toolsLocation;
    }

    private static getSDKManagerCmd(): string {
        const toolsLocation = this.getToolsBin();
        return path.join(
            toolsLocation,
            AndroidSDKUtils.ANDROID_SDK_MANAGER_NAME
        );
    }

    private static getAVDManagerCmd(): string {
        const toolsLocation = this.getToolsBin();
        return path.join(
            toolsLocation,
            AndroidSDKUtils.ANDROID_AVD_MANAGER_NAME
        );
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
}
