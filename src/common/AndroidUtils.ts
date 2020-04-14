import androidConfig from '../config/androidconfig.json';
import { AndroidPackage } from './AndroidTypes';
import childProcess from 'child_process';
import { Logger } from '@salesforce/core';
import os from 'os';
import path from 'path';
const execSync = childProcess.execSync;
const spawn = childProcess.spawn;

export class AndroidSDKUtils {
    static get androidHome(): string {
        return process.env.ANDROID_HOME ? process.env.ANDROID_HOME.trim() : '';
    }
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
    public static ANDROID_PLATFORM_TOOLS = path.join(
        AndroidSDKUtils.ANDROID_HOME,
        'platform-tools'
    );
    public static AVDMANAGER_COMMAND = path.join(
        AndroidSDKUtils.ANDROID_TOOLS_BIN,
        'avdmanager'
    );
    public static ANDROID_LIST_TARGETS_COMMAND =
        AndroidSDKUtils.AVDMANAGER_COMMAND + ' list ' + 'target';
    public static ANDROID_LIST_DEVICES_COMMAND =
        AndroidSDKUtils.AVDMANAGER_COMMAND + ' list ' + 'devices';
    public static ANDROID_LIST_AVDS_COMMAND =
        AndroidSDKUtils.AVDMANAGER_COMMAND + ' list ' + 'avd';
    public static ADB_SHELL_COMMAND = path.join(
        AndroidSDKUtils.ANDROID_PLATFORM_TOOLS,
        'adb'
    );
    public static ANDROID_SDK_MANAGER_NAME = 'sdkmanager';
    public static ANDROID_SDK_MANAGER_CMD = path.join(
        AndroidSDKUtils.ANDROID_TOOLS_BIN,
        AndroidSDKUtils.ANDROID_SDK_MANAGER_NAME
    );
    public static ANDROID_SDK_MANAGER_LIST_COMMAND =
        AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD + ' --list';
    public static ANDROID_SDK_MANAGER_VERSION_COMMAND =
        AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD + ' --version';
    public static ADB_SHELL_COMMAND_VERSION =
        AndroidSDKUtils.ADB_SHELL_COMMAND + ' --version';

    public static setLogger(logger: Logger) {
        if (logger) {
            AndroidSDKUtils.logger = logger;
        }
    }

    public static isCached(): boolean {
        return AndroidSDKUtils.packageCache.size > 0;
    }

    public static executeCommand(command: string): string {
        return execSync(command, {
            stdio: ['ignore', 'pipe', 'ignore']
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

    public static async fetchAndroidSDKToolsLocation(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            if (!AndroidSDKUtils.isAndroidHomeSet()) {
                reject(new Error('ANDROID_HOME is not set.'));
                return;
            }
            try {
                AndroidSDKUtils.executeCommand(
                    AndroidSDKUtils.ANDROID_SDK_MANAGER_VERSION_COMMAND
                );
                resolve(AndroidSDKUtils.ANDROID_TOOLS_BIN);
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
                        AndroidSDKUtils.ANDROID_SDK_MANAGER_LIST_COMMAND
                    );
                    if (stdout) {
                        const packages = AndroidPackage.parseRawString(stdout);
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

                const filteredList: Array<string> = androidConfig.supportedRuntimes.filter(
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
                const matchingKeys: Array<string> = [];

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

                packages.forEach((value, key) => {
                    if (
                        key.match(`(system-images;(${imagesRegex}))`) !== null
                    ) {
                        matchingKeys.push(key);
                    }
                });
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

                matchingKeys.sort();
                matchingKeys.reverse();

                // use the first one.
                const androidPackage = packages.get(matchingKeys[0]);
                resolve(androidPackage);
            } catch (error) {
                reject(
                    new Error(
                        `Could not find android emulator packages. ${error.errorMessage}`
                    )
                );
            }
        });
    }

    static hasEmulator(emulatorName: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                let stdout = AndroidSDKUtils.executeCommand(
                    AndroidSDKUtils.EMULATOR_COMMAND + ' ' + '-list-avds'
                );
                var listOfAVDs = stdout
                    .toString()
                    .split(os.EOL)
                    .filter((avd: String) => avd == emulatorName);
                return resolve(listOfAVDs && listOfAVDs.length > 0);
            } catch (exception) {
                AndroidSDKUtils.logger.error(exception);
            }
            return resolve(false);
        });
    }

    static createNewVirtualDevice(
        emulatorName: string,
        emulatorimage: string,
        target: string,
        device: string
    ): Promise<boolean> {
        const createAvdCommand = `${AndroidSDKUtils.AVDMANAGER_COMMAND} create avd -n ${emulatorName} --force -k 'system-images;${target};${emulatorimage};x86_64' --device ${device} --abi x86_64`;
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

    static startEmulator(emulatorName: string, port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                const child = spawn(
                    `${AndroidSDKUtils.EMULATOR_COMMAND} @${emulatorName} -port ${port}`,
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

    static async pollDeviceStatus(
        portNumber: number,
        numberofRetries: number,
        timeoutMillis: number
    ): Promise<boolean> {
        const command = `adb  -s emulator-${portNumber} shell getprop dev.bootcomplete`;
        console.log(`Waiting for device to boot ..`);
        return new Promise<boolean>(async (resolve, reject) => {
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
            return new Promise((resolve) => setTimeout(resolve, timeoutMillis))
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

    static launchURLIntent(
        url: string,
        emulatorPort: number
    ): Promise<boolean> {
        const openUrlCommand = `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${emulatorPort} shell am start -a android.intent.action.VIEW -d ${url}`;
        console.log(openUrlCommand);
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
}
