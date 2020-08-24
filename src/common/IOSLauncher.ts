/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import childProcess from 'child_process';
import cli from 'cli-ux';
import util from 'util';
import { PreviewUtils } from './Common';
import { XcodeUtils } from './IOSUtils';
const exec = util.promisify(childProcess.exec);

export class IOSLauncher {
    private simulatorName: string;

    constructor(simulatorName: string) {
        this.simulatorName = simulatorName;
    }

    public async launchPreview(
        compName: string,
        projectDir: string,
        targetApp: string,
        targetAppArguments: string
    ): Promise<boolean> {
        const availableDevices: string[] = await XcodeUtils.getSupportedDevices();
        const supportedRuntimes: string[] = await XcodeUtils.getSupportedRuntimes();
        const currentSimulator = await XcodeUtils.getSimulator(
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
            deviceUDID = await XcodeUtils.createNewDevice(
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

        if (PreviewUtils.isTargetingBrowser(targetApp)) {
            const compPath = PreviewUtils.prefixRouteIfNeeded(compName);
            const url = `http://localhost:3333/lwc/preview/${compPath}`;
            return XcodeUtils.openUrlInNativeBrowser(url, deviceUDID, spinner);
        } else {
            return XcodeUtils.launchNativeApp(
                compName,
                projectDir,
                targetApp,
                targetAppArguments,
                deviceUDID,
                spinner
            );
        }
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
