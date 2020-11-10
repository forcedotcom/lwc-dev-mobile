/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import childProcess from 'child_process';
import { Version } from '../common/Common';
import iOSConfig from '../config/iosconfig.json';
import { IOSSimulatorDevice } from './IOSTypes';
import { LaunchArgument } from './PreviewConfigFile';
import { PreviewUtils } from './PreviewUtils';

const XCRUN_CMD = '/usr/bin/xcrun';
const DEVICE_TYPE_PREFIX = 'com.apple.CoreSimulator.SimDeviceType';
const RUNTIME_TYPE_PREFIX = 'com.apple.CoreSimulator.SimRuntime';

const LOGGER_NAME = 'force:lightning:mobile:ios';

export class IOSUtils {
    public static async initializeLogger(): Promise<void> {
        IOSUtils.logger = await Logger.child(LOGGER_NAME);
        return Promise.resolve();
    }

    public static async bootDevice(udid: string): Promise<boolean> {
        const command = `${XCRUN_CMD} simctl boot ${udid}`;
        try {
            const { stdout } = await IOSUtils.executeCommand(command);
        } catch (error) {
            if (!IOSUtils.isDeviceAlreadyBootedError(error)) {
                return new Promise<boolean>((resolve, reject) => {
                    reject(
                        `The command '${command}' failed to execute ${error}`
                    );
                });
            }
        }
        return new Promise<boolean>((resolve, reject) => {
            resolve(true);
        });
    }

    public static async createNewDevice(
        simulatorName: string,
        deviceType: string,
        runtime: string
    ): Promise<string> {
        const command = `${XCRUN_CMD} simctl create ${simulatorName} ${DEVICE_TYPE_PREFIX}.${deviceType} ${RUNTIME_TYPE_PREFIX}.${runtime}`;
        try {
            const { stdout } = await IOSUtils.executeCommand(command);
            return new Promise<string>((resolve, reject) => {
                resolve(stdout.trim());
            });
        } catch (error) {
            return new Promise<string>((resolve, reject) => {
                reject(`The command '${command}' failed to execute ${error}`);
            });
        }
    }

    public static async getSimulator(
        simulatorName: string
    ): Promise<IOSSimulatorDevice | null> {
        return new Promise(async (resolve, reject) => {
            try {
                const devices = await IOSUtils.getSupportedSimulators();
                for (const device of devices) {
                    if (simulatorName.match(device.name)) {
                        return resolve(device);
                    }
                }
            } catch (exception) {
                IOSUtils.logger.warn(exception);
            }

            IOSUtils.logger.info(`Unable to find simulator: ${simulatorName}`);
            return resolve(null);
        });
    }

    public static async getSupportedSimulators(): Promise<
        IOSSimulatorDevice[]
    > {
        return new Promise(async (resolve, reject) => {
            let devices: IOSSimulatorDevice[] = [];
            try {
                const devicesCmd = `${XCRUN_CMD} simctl list --json devices available`;
                const supportedRuntimes = await IOSUtils.getSupportedRuntimes();
                const { stdout } = await IOSUtils.executeCommand(devicesCmd);
                devices = IOSSimulatorDevice.parseJSONString(
                    stdout,
                    supportedRuntimes
                );
            } catch (runtimesError) {
                IOSUtils.logger.warn(runtimesError);
            }
            return resolve(devices);
        });
    }

    public static async executeCommand(
        command: string
    ): Promise<{ stdout: string; stderr: string }> {
        return new Promise<{ stdout: string; stderr: string }>(
            (resolve, reject) => {
                IOSUtils.logger.debug(`Executing command: '${command}'.`);
                childProcess.exec(command, (error, stdout, stderr) => {
                    if (error) {
                        IOSUtils.logger.error(
                            `Error executing command '${command}':`
                        );
                        IOSUtils.logger.error(`${error}`);
                        reject(error);
                    } else {
                        resolve({ stdout, stderr });
                    }
                });
            }
        );
    }

    public static async getSupportedDevices(): Promise<string[]> {
        const runtimesCmd = `${XCRUN_CMD} simctl list  --json devicetypes`;
        const identifier = 'identifier';
        const deviceTypesKey = 'devicetypes';
        const deviceMatchRegex = /SimDeviceType.iPhone-[8,1,X]/;
        let error = new Error(
            'xcrun simctl list devicestypes returned an empty list'
        );
        try {
            const { stdout } = await IOSUtils.executeCommand(runtimesCmd);
            const devicesObj: any = JSON.parse(stdout);
            const devices: any[] = devicesObj[deviceTypesKey] || [];
            const matchedDevices: any[] = devices.filter((entry) => {
                return (
                    entry[identifier] &&
                    entry[identifier].match(deviceMatchRegex)
                );
            });

            if (matchedDevices) {
                return new Promise<string[]>((resolve, reject) =>
                    resolve(
                        matchedDevices.map(
                            (entry) => entry.identifier.split('.')[4]
                        )
                    )
                );
            }
        } catch (runtimesError) {
            error = runtimesError;
        }
        return new Promise<string[]>((resolve, reject) =>
            reject(`Could not find any available devices. ${error.message}`)
        );
    }

    public static async getSupportedRuntimes(): Promise<string[]> {
        const configuredRuntimes = await IOSUtils.getSimulatorRuntimes();
        const minSupportedRuntimeIOS = Version.from(
            iOSConfig.minSupportedRuntimeIOS
        );

        const rtIntersection = configuredRuntimes.filter(
            (configuredRuntime) => {
                const configuredRuntimeVersion = Version.from(
                    configuredRuntime.toLowerCase().replace('ios-', '')
                );

                return configuredRuntimeVersion.sameOrNewer(
                    minSupportedRuntimeIOS
                );
            }
        );

        if (rtIntersection.length > 0) {
            return Promise.resolve(rtIntersection);
        } else {
            return Promise.reject();
        }
    }

    public static async getSimulatorRuntimes(): Promise<string[]> {
        const runtimesCmd = `${XCRUN_CMD} simctl list --json runtimes available`;
        const runtimeMatchRegex = /.*SimRuntime\.((iOS|watchOS|tvOS)-[\d\-]+)$/;
        const RUNTIMES_KEY = 'runtimes';
        const ID_KEY = 'identifier';

        try {
            const { stdout } = await IOSUtils.executeCommand(runtimesCmd);
            const runtimesObj: any = JSON.parse(stdout);
            const runtimes: any[] = runtimesObj[RUNTIMES_KEY] || [];
            let filteredRuntimes = runtimes.filter((entry) => {
                return entry[ID_KEY] && entry[ID_KEY].match(runtimeMatchRegex);
            });
            filteredRuntimes = filteredRuntimes.sort().reverse();
            filteredRuntimes = filteredRuntimes.map((entry) => {
                return (entry[ID_KEY] as string).replace(
                    runtimeMatchRegex,
                    '$1'
                );
            });
            if (filteredRuntimes && filteredRuntimes.length > 0) {
                return new Promise<string[]>((resolve, reject) =>
                    resolve(filteredRuntimes)
                );
            }
        } catch (runtimesError) {
            return new Promise<string[]>((resolve, reject) =>
                reject(
                    `The command '${runtimesCmd}' failed: ${runtimesError}, error code: ${runtimesError.code}`
                )
            );
        }
        return new Promise<string[]>((resolve, reject) =>
            reject(
                `The command '${runtimesCmd}'  could not find available runtimes`
            )
        );
    }
    public static async waitUntilDeviceIsReady(udid: string): Promise<boolean> {
        const command = `${XCRUN_CMD} simctl bootstatus "${udid}"`;
        try {
            const { stdout } = await IOSUtils.executeCommand(command);
            return new Promise<boolean>((resolve, reject) => {
                resolve(true);
            });
        } catch (error) {
            return new Promise<boolean>((resolve, reject) => {
                reject(`The command '${command}' failed to execute ${error}`);
            });
        }
    }

    public static async launchSimulatorApp(): Promise<boolean> {
        const command = `open -a Simulator`;
        return new Promise(async (resolve, reject) => {
            try {
                const { stdout } = await IOSUtils.executeCommand(command);
                resolve(true);
            } catch (error) {
                reject(`The command '${command}' failed to execute ${error}`);
            }
        });
    }

    public static async launchURLInBootedSimulator(
        udid: string,
        url: string
    ): Promise<boolean> {
        const command = `${XCRUN_CMD} simctl openurl "${udid}" ${url}`;
        try {
            const { stdout } = await IOSUtils.executeCommand(command);
            return new Promise<boolean>((resolve, reject) => {
                resolve(true);
            });
        } catch (error) {
            return new Promise<boolean>((resolve, reject) => {
                reject(`The command '${command}' failed to execute: ${error}`);
            });
        }
    }

    public static async launchAppInBootedSimulator(
        udid: string,
        compName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        targetAppArguments: LaunchArgument[]
    ): Promise<boolean> {
        if (appBundlePath && appBundlePath.trim().length > 0) {
            const installCommand = `${XCRUN_CMD} simctl install ${udid} '${appBundlePath.trim()}'`;

            try {
                IOSUtils.logger.info(
                    `Installing app ${appBundlePath.trim()} to simulator`
                );
                await IOSUtils.executeCommand(installCommand);
            } catch (error) {
                return Promise.reject(
                    `The command '${installCommand}' failed to execute: ${error}`
                );
            }
        }

        let launchArgs =
            `${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}=${compName}` +
            ` ${PreviewUtils.PROJECT_DIR_ARG_PREFIX}=${projectDir}`;

        targetAppArguments.forEach((arg) => {
            launchArgs += ` ${arg.name}=${arg.value}`;
        });

        const terminateCommand = `${XCRUN_CMD} simctl terminate "${udid}" ${targetApp}`;
        const launchCommand = `${XCRUN_CMD} simctl launch "${udid}" ${targetApp} ${launchArgs}`;

        // attempt at terminating the app first (in case it is already running) and then try to launch it again with new arguments.
        // if we hit issues with terminating, just ignore and continue.
        try {
            IOSUtils.logger.info(`Terminating app ${targetApp} in simulator`);
            await IOSUtils.executeCommand(terminateCommand);
        } catch {
            // ignore and continue
        }

        try {
            IOSUtils.logger.info(`Launching app ${targetApp} in simulator`);
            await IOSUtils.executeCommand(launchCommand);
            return Promise.resolve(true);
        } catch (error) {
            return Promise.reject(
                `The command '${launchCommand}' failed to execute: ${error}`
            );
        }
    }

    private static logger: Logger = new Logger(LOGGER_NAME);

    private static isDeviceAlreadyBootedError(error: Error): boolean {
        return error.message
            ? error.message.toLowerCase().match('state: booted') !== null
            : false;
    }
}

// IOSUtils.getSupportedDevices()
//     .then((runtimeDevices) => {
//         console.log(`runtimeDevices: ${runtimeDevices}`);
//     })
//     .catch((error) => {
//         console.log(error);
//     });
