import childProcess from 'child_process';
import iOSConfig from '../config/iosconfig.json';
import util from 'util';
const exec = util.promisify(childProcess.exec);

const XCRUN_CMD = '/usr/bin/xcrun';
const DEVICE_TYPE_PREFIX = 'com.apple.CoreSimulator.SimDeviceType';
const RUNTIME_TYPE_PREFIX = 'com.apple.CoreSimulator.SimRuntime';

export class XcodeUtils {
    private static isDeviceAlreadyBootedError(error: Error): boolean {
        return error.message
            ? error.message.toLowerCase().match('state: booted') !== null
            : false;
    }

    public static async bootDevice(udid: string): Promise<boolean> {
        const command = `${XCRUN_CMD} simctl boot ${udid}`;
        try {
            const { stdout } = await XcodeUtils.executeCommand(command);
        } catch (error) {
            if (!XcodeUtils.isDeviceAlreadyBootedError(error)) {
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
            const { stdout } = await XcodeUtils.executeCommand(command);
            return new Promise<string>((resolve, reject) => {
                resolve(stdout.trim());
            });
        } catch (error) {
            return new Promise<string>((resolve, reject) => {
                reject(`The command '${command}' failed to execute ${error}`);
            });
        }
    }

    public static async executeCommand(
        command: string
    ): Promise<{ stdout: string; stderr: string }> {
        return exec(command);
    }

    public static async getSupportedDevicesThatMatch(): Promise<[{}]> {
        const runtimesCmd = `${XCRUN_CMD} simctl list --json devices available`;
        const DEVICES_KEY = 'devices';
        const DEVICE_ID_KEY = 'deviceTypeIdentifier';
        const AVAILABLE_KEY = 'isAvailable';
        const preferedDevices = iOSConfig.supportedDevices;
        const preferedRuntimes = iOSConfig.supportedRuntimes;

        try {
            const supportedRuntimes = await XcodeUtils.getSupportedRuntimes();
            const runtimeMatchRegex = new RegExp(
                `\.SimRuntime\.(${supportedRuntimes.join('|')})`
            );
            const deviceMatchRegex = new RegExp(
                `\.SimDeviceType\.(${preferedDevices.join('|')})`
            );
            const { stdout } = await XcodeUtils.executeCommand(runtimesCmd);
            const devicesObj: any = JSON.parse(stdout);
            const devices: any[] = devicesObj[DEVICES_KEY] || [];
            let runtimes: any[] = Object.keys(devices).filter((key) => {
                return key && key.match(runtimeMatchRegex);
            });
            runtimes = runtimes.sort().reverse();
            if (runtimes && runtimes.length > 0) {
                const runtimeDevices = devices[runtimes[0]];
                let filteredDevices = runtimeDevices.filter(
                    (entry: { [x: string]: any }) => {
                        return (
                            entry[DEVICE_ID_KEY] &&
                            entry[AVAILABLE_KEY] &&
                            entry[DEVICE_ID_KEY].match(deviceMatchRegex) &&
                            entry[AVAILABLE_KEY] === true
                        );
                    }
                );
                filteredDevices = filteredDevices.map(
                    (entry: { [x: string]: any }) => {
                        entry['runtime'] = runtimes[0];
                        return entry;
                    }
                );

                if (filteredDevices && filteredDevices.length > 0) {
                    return new Promise<[{}]>((resolve, reject) =>
                        resolve(filteredDevices)
                    );
                }
            }
        } catch (runtimesError) {
            return new Promise<[{}]>((resolve, reject) =>
                reject(`The command '${runtimesCmd}' failed: ${runtimesError}`)
            );
        }
        return new Promise<[{}]>((resolve, reject) =>
            reject(
                `The command '${runtimesCmd}' failed to locate an available device for runtimes ${preferedRuntimes.join(
                    ','
                )} with device type ${preferedDevices.join(',')}`
            )
        );
    }

    public static async getSupportedRuntimes(): Promise<string[]> {
        const configuredRuntimes = await XcodeUtils.getSimulatorRuntimes();
        const supportedRuntimes: string[] = iOSConfig.supportedRuntimes;
        const rtIntersection = configuredRuntimes.filter(
            (configuredRuntime) => {
                const responsiveRuntime = supportedRuntimes.find(
                    (supportedRuntime) =>
                        configuredRuntime.startsWith(supportedRuntime)
                );
                return responsiveRuntime !== undefined;
            }
        );

        if (rtIntersection.length > 0) {
            return new Promise<string[]>((resolve, reject) =>
                resolve(rtIntersection)
            );
        } else {
            return new Promise<string[]>((resolve, reject) => reject());
        }
    }

    public static async getSimulatorRuntimes(): Promise<string[]> {
        const runtimesCmd = `${XCRUN_CMD} simctl list --json runtimes`;
        const runtimeMatchRegex = /.*SimRuntime\.((iOS|watchOS|tvOS)-[\d\-]+)$/;
        const RUNTIMES_KEY = 'runtimes';
        const ID_KEY = 'identifier';

        try {
            const { stdout } = await XcodeUtils.executeCommand(runtimesCmd);
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
            return new Promise<string[]>((resolve, reject) =>
                resolve(filteredRuntimes)
            );
        } catch (runtimesError) {
            return new Promise<string[]>((resolve, reject) =>
                reject(
                    `The command '${runtimesCmd}' failed: ${runtimesError}, error code: ${runtimesError.code}`
                )
            );
        }
    }
    public static async waitUntilDeviceIsReady(udid: string): Promise<boolean> {
        const command = `${XCRUN_CMD} simctl bootstatus "${udid}"`;
        try {
            const { stdout } = await XcodeUtils.executeCommand(command);
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
                const { stdout } = await XcodeUtils.executeCommand(command);
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
            const { stdout } = await XcodeUtils.executeCommand(command);
            return new Promise<boolean>((resolve, reject) => {
                resolve(true);
            });
        } catch (error) {
            return new Promise<boolean>((resolve, reject) => {
                reject(`The command '${command}' failed to execute ${error}`);
            });
        }
    }

    public static async openUrlInNativeBrowser(
        url: string,
        udid: string
    ): Promise<boolean> {
        return XcodeUtils.launchSimulatorApp()
            .then(() => {
                return XcodeUtils.bootDevice(udid);
            })
            .then(() => {
                return this.waitUntilDeviceIsReady(udid);
            })
            .then(() => {
                return this.launchURLInBootedSimulator(udid, url);
            });
    }
}

// XcodeUtils.getSupportedDevicesThatMatch()
//     .then((runtimeDevices) => {
//         console.log(`runtimeDevices: ${runtimeDevices}`);
//     })
//     .catch((error) => {
//         console.log(error);
//     });
