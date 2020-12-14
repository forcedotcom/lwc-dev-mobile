/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import childProcess from 'child_process';
import cli from 'cli-ux';
import util from 'util';
import { IOSUtils } from './IOSUtils';
import { IOSAppPreviewConfig, LaunchArgument } from './PreviewConfigFile';
import { PreviewUtils } from './PreviewUtils';
const exec = util.promisify(childProcess.exec);

export class IOSLauncher {
    private simulatorName: string;

    constructor(simulatorName: string) {
        this.simulatorName = simulatorName;
    }

    public async launchPreview(
        compName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: IOSAppPreviewConfig | undefined,
        serverPort: string
    ): Promise<boolean> {
        const availableDevices: string[] = await IOSUtils.getSupportedDevices();
        const supportedRuntimes: string[] = await IOSUtils.getSupportedRuntimes();
        const currentSimulator = await IOSUtils.getSimulator(
            this.simulatorName
        );
        const currentSimulatorUDID: string | null =
            currentSimulator && currentSimulator.udid;
        let deviceUDID = '';
        const spinner = cli.action;
        cli.action.start(`Launching`, `Searching for ${this.simulatorName}`, {
            stdout: true
        });
        if (!currentSimulatorUDID || currentSimulatorUDID.length === 0) {
            spinner.start(
                `Launching`,
                `Creating device ${this.simulatorName}`,
                {
                    stdout: true
                }
            );
            deviceUDID = await IOSUtils.createNewDevice(
                this.simulatorName,
                availableDevices[0],
                supportedRuntimes[0]
            );
            spinner.start(`Launching`, `Created device ${this.simulatorName}`, {
                stdout: true
            });
        } else {
            spinner.start(`Launching`, `Found device ${this.simulatorName}`, {
                stdout: true
            });
            deviceUDID = currentSimulatorUDID;
        }

        return IOSUtils.launchSimulatorApp()
            .then(() => {
                spinner.start(`Launching`, `Starting device ${deviceUDID}`, {
                    stdout: true
                });
                return IOSUtils.bootDevice(deviceUDID);
            })
            .then(() => {
                spinner.start(
                    `Launching`,
                    `Waiting for device ${deviceUDID} to boot`,
                    {
                        stdout: true
                    }
                );
                return IOSUtils.waitUntilDeviceIsReady(deviceUDID);
            })
            .then(() => {
                if (PreviewUtils.isTargetingBrowser(targetApp)) {
                    const compPath = PreviewUtils.prefixRouteIfNeeded(compName);
                    const url = `http://localhost:${serverPort}/lwc/preview/${compPath}`;
                    return IOSUtils.launchURLInBootedSimulator(deviceUDID, url);
                } else {
                    const targetAppArguments: LaunchArgument[] =
                        (appConfig && appConfig.launch_arguments) || [];
                    return IOSUtils.launchAppInBootedSimulator(
                        deviceUDID,
                        compName,
                        projectDir,
                        appBundlePath,
                        targetApp,
                        targetAppArguments
                    );
                }
            })
            .catch((error) => {
                spinner.stop('Error encountered during launch');
                throw error;
            });
    }
}

// let launcher = new IOSLauncher('sfdxdevmobile-101');
// launcher
//     .launchNativeBrowser('http://salesforce.com')
//     .then((result) => {
//         console.log('Done!');
//     })
//     .catch((error) => {
//         console.log('Error!' + error);
//     });
