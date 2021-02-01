/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import { ActionBase } from 'cli-ux';
import { Version } from '../common/Common';
import iOSConfig from '../config/iosconfig.json';
import { CommonUtils } from './CommonUtils';
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

    public static async bootDevice(udid: string): Promise<void> {
        const command = `${XCRUN_CMD} simctl boot ${udid}`;
        return CommonUtils.executeCommandAsync(command)
            .then(() => Promise.resolve())
            .catch((error) => {
                if (!IOSUtils.isDeviceAlreadyBootedError(error)) {
                    return Promise.reject(
                        new Error(
                            `The command '${command}' failed to execute ${error}`
                        )
                    );
                } else {
                    return Promise.resolve();
                }
            });
    }

    public static async createNewDevice(
        simulatorName: string,
        deviceType: string,
        runtime: string
    ): Promise<string> {
        const command = `${XCRUN_CMD} simctl create '${simulatorName}' ${DEVICE_TYPE_PREFIX}.${deviceType} ${RUNTIME_TYPE_PREFIX}.${runtime}`;
        return CommonUtils.executeCommandAsync(command)
            .then((result) => Promise.resolve(result.stdout.trim()))
            .catch((error) =>
                Promise.reject(
                    new Error(
                        `The command '${command}' failed to execute ${error}`
                    )
                )
            );
    }

    public static async getSimulator(
        simulatorName: string
    ): Promise<IOSSimulatorDevice | null> {
        return IOSUtils.getSupportedSimulators()
            .then((devices) => {
                for (const device of devices) {
                    if (simulatorName === device.name) {
                        return Promise.resolve(device);
                    }
                }

                IOSUtils.logger.info(
                    `Unable to find simulator: ${simulatorName}`
                );
                return Promise.resolve(null);
            })
            .catch((error) => {
                IOSUtils.logger.warn(error);
                return Promise.resolve(null);
            });
    }

    public static async getSupportedSimulators(): Promise<
        IOSSimulatorDevice[]
    > {
        let supportedRuntimes: string[] = [];

        return IOSUtils.getSupportedRuntimes()
            .then((runtimes) => {
                supportedRuntimes = runtimes;
                return CommonUtils.executeCommandAsync(
                    `${XCRUN_CMD} simctl list --json devices available`
                );
            })
            .then((result) => {
                const devices = IOSSimulatorDevice.parseJSONString(
                    result.stdout,
                    supportedRuntimes
                );

                return Promise.resolve(devices);
            })
            .catch((error) => {
                IOSUtils.logger.warn(error);
                return Promise.resolve([]);
            });
    }

    public static async getSupportedDevices(): Promise<string[]> {
        return CommonUtils.executeCommandAsync(
            `${XCRUN_CMD} simctl list  --json devicetypes`
        )
            .then((result) => {
                const identifier = 'identifier';
                const deviceTypesKey = 'devicetypes';
                const deviceMatchRegex = /SimDeviceType.iPhone-[8,1,X]/;
                const devicesObj: any = JSON.parse(result.stdout);
                const devices: any[] = devicesObj[deviceTypesKey] || [];
                const matchedDevices: any[] = devices.filter((entry) => {
                    return (
                        entry[identifier] &&
                        entry[identifier].match(deviceMatchRegex)
                    );
                });

                if (matchedDevices) {
                    return Promise.resolve(
                        matchedDevices.map(
                            (entry) => entry.identifier.split('.')[4]
                        )
                    );
                } else {
                    return Promise.reject(
                        new Error(
                            `Could not find any available devices. 'xcrun simctl list devicestypes' command returned an empty list.`
                        )
                    );
                }
            })
            .catch((error) =>
                Promise.reject(
                    new Error(`Could not find any available devices. ${error}`)
                )
            );
    }

    public static async getSupportedRuntimes(): Promise<string[]> {
        return IOSUtils.getSimulatorRuntimes().then((configuredRuntimes) => {
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
        });
    }

    public static async getSimulatorRuntimes(): Promise<string[]> {
        const runtimesCmd = `${XCRUN_CMD} simctl list --json runtimes available`;
        return CommonUtils.executeCommandAsync(runtimesCmd)
            .then((result) => {
                const runtimeMatchRegex = /.*SimRuntime\.((iOS)-[\d\-]+)$/;
                const RUNTIMES_KEY = 'runtimes';
                const ID_KEY = 'identifier';
                const runtimesObj: any = JSON.parse(result.stdout);
                const runtimes: any[] = runtimesObj[RUNTIMES_KEY] || [];
                let filteredRuntimes = runtimes.filter((entry) => {
                    return (
                        entry[ID_KEY] && entry[ID_KEY].match(runtimeMatchRegex)
                    );
                });
                filteredRuntimes = filteredRuntimes.sort().reverse();
                filteredRuntimes = filteredRuntimes.map((entry) => {
                    return (entry[ID_KEY] as string).replace(
                        runtimeMatchRegex,
                        '$1'
                    );
                });
                if (filteredRuntimes && filteredRuntimes.length > 0) {
                    return Promise.resolve(filteredRuntimes);
                } else {
                    return Promise.reject(
                        new Error(
                            `The command '${runtimesCmd}' could not find any available runtimes`
                        )
                    );
                }
            })
            .catch((error) => {
                return Promise.reject(
                    new Error(
                        `The command '${runtimesCmd}' failed: ${error}, error code: ${error.code}`
                    )
                );
            });
    }

    public static async waitUntilDeviceIsReady(udid: string): Promise<void> {
        const command = `${XCRUN_CMD} simctl bootstatus "${udid}"`;
        return CommonUtils.executeCommandAsync(command)
            .then(() => Promise.resolve())
            .catch((error) =>
                Promise.reject(
                    new Error(
                        `The command '${command}' failed to execute ${error}`
                    )
                )
            );
    }

    public static async launchSimulatorApp(): Promise<void> {
        const command = `open -a Simulator`;
        return CommonUtils.executeCommandAsync(command)
            .then(() => Promise.resolve())
            .catch((error) =>
                Promise.reject(
                    new Error(
                        `The command '${command}' failed to execute ${error}`
                    )
                )
            );
    }

    public static async launchURLInBootedSimulator(
        udid: string,
        url: string,
        spinner?: ActionBase | undefined
    ): Promise<void> {
        const command = `${XCRUN_CMD} simctl openurl "${udid}" ${url}`;
        IOSUtils.updateSpinner(
            spinner,
            'Launching',
            `Opening browser with url ${url}`
        );
        return CommonUtils.executeCommandAsync(command)
            .then(() => Promise.resolve())
            .catch((error) =>
                Promise.reject(
                    new Error(
                        `The command '${command}' failed to execute ${error}`
                    )
                )
            );
    }

    public static async launchAppInBootedSimulator(
        udid: string,
        compName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        targetAppArguments: LaunchArgument[],
        serverAddress: string | undefined,
        serverPort: string | undefined,
        spinner?: ActionBase | undefined
    ): Promise<void> {
        let thePromise: Promise<{ stdout: string; stderr: string }>;
        if (appBundlePath && appBundlePath.trim().length > 0) {
            const installMsg = `Installing app ${appBundlePath.trim()} to simulator`;
            IOSUtils.logger.info(installMsg);
            IOSUtils.updateSpinner(spinner, 'Launching', installMsg);
            const installCommand = `${XCRUN_CMD} simctl install ${udid} '${appBundlePath.trim()}'`;
            thePromise = CommonUtils.executeCommandAsync(installCommand);
        } else {
            thePromise = Promise.resolve({ stdout: '', stderr: '' });
        }

        return thePromise
            .then(async () => {
                let launchArgs =
                    `${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}=${compName}` +
                    ` ${PreviewUtils.PROJECT_DIR_ARG_PREFIX}=${projectDir}`;

                if (serverAddress) {
                    launchArgs += ` ${PreviewUtils.SERVER_ADDRESS_PREFIX}=${serverAddress}`;
                }

                if (serverPort) {
                    launchArgs += ` ${PreviewUtils.SERVER_PORT_PREFIX}=${serverPort}`;
                }

                targetAppArguments.forEach((arg) => {
                    launchArgs += ` ${arg.name}=${arg.value}`;
                });

                const terminateCommand = `${XCRUN_CMD} simctl terminate "${udid}" ${targetApp}`;
                const launchCommand = `${XCRUN_CMD} simctl launch "${udid}" ${targetApp} ${launchArgs}`;

                // attempt at terminating the app first (in case it is already running) and then try to launch it again with new arguments.
                // if we hit issues with terminating, just ignore and continue.
                try {
                    const terminateMsg = `Terminating app ${targetApp} in simulator`;
                    IOSUtils.logger.info(terminateMsg);
                    IOSUtils.updateSpinner(spinner, 'Launching', terminateMsg);
                    await CommonUtils.executeCommandAsync(terminateCommand);
                } catch {
                    // ignore and continue
                }

                const launchMsg = `Launching app ${targetApp} in simulator`;
                IOSUtils.logger.info(launchMsg);
                IOSUtils.updateSpinner(spinner, 'Launching', launchMsg);
                return CommonUtils.executeCommandAsync(launchCommand);
            })
            .then(() => Promise.resolve());
    }

    private static logger: Logger = new Logger(LOGGER_NAME);

    private static isDeviceAlreadyBootedError(error: Error): boolean {
        return error.message
            ? error.message.toLowerCase().match('state: booted') !== null
            : false;
    }

    private static updateSpinner(
        spinner: ActionBase | undefined,
        action: string,
        status?: string | undefined
    ) {
        if (spinner) {
            spinner.start(action, status, { stdout: true });
        }
    }
}
