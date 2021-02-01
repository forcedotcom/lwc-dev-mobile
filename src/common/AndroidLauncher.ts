/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import cli from 'cli-ux';
import androidConfig from '../config/androidconfig.json';
import { AndroidSDKUtils } from './AndroidUtils';
import { AndroidAppPreviewConfig, LaunchArgument } from './PreviewConfigFile';
import { PreviewUtils } from './PreviewUtils';

export class AndroidLauncher {
    private emulatorName: string;

    constructor(emulatorName: string) {
        this.emulatorName = emulatorName;
    }

    public async launchPreview(
        compName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: AndroidAppPreviewConfig | undefined,
        serverPort: string
    ): Promise<void> {
        const preferredPack = await AndroidSDKUtils.findRequiredEmulatorImages();
        const emuImage = preferredPack.platformEmulatorImage || 'default';
        const androidApi = preferredPack.platformAPI;
        const abi = preferredPack.abi;
        const device = androidConfig.supportedDevices[0];
        const requestedPort = await AndroidSDKUtils.getNextAndroidAdbPort();
        const spinner = cli.action;
        const emuName = this.emulatorName;
        spinner.start(`Launching`, `Searching for ${emuName}`, {
            stdout: true
        });
        return AndroidSDKUtils.hasEmulator(emuName)
            .then((result) => {
                if (!result) {
                    spinner.start(`Launching`, `Creating device ${emuName}`, {
                        stdout: true
                    });
                    return AndroidSDKUtils.createNewVirtualDevice(
                        emuName,
                        emuImage,
                        androidApi,
                        device,
                        abi
                    );
                }
                spinner.start(`Launching`, `Found device ${emuName}`, {
                    stdout: true
                });
                return Promise.resolve();
            })
            .then(() => {
                spinner.start(`Launching`, `Starting device ${emuName}`, {
                    stdout: true
                });
                return AndroidSDKUtils.startEmulator(emuName, requestedPort);
            })
            .then(async (actualPort) => {
                spinner.start(`Launching`, `Waiting for ${emuName} to boot`, {
                    stdout: true
                });
                await AndroidSDKUtils.pollDeviceStatus(actualPort);

                const useServer = PreviewUtils.useLwcServerForPreviewing(
                    targetApp,
                    appConfig
                );
                const address = useServer ? 'http://10.0.2.2' : undefined; // TODO: dynamically determine server address
                const port = useServer ? serverPort : undefined;

                if (PreviewUtils.isTargetingBrowser(targetApp)) {
                    const compPath = PreviewUtils.prefixRouteIfNeeded(compName);
                    const url = `${address}:${port}/lwc/preview/${compPath}`;
                    spinner.stop(`Opening Browser with url ${url}`);
                    return AndroidSDKUtils.launchURLIntent(url, actualPort);
                } else {
                    spinner.stop(`Launching App ${targetApp}`);

                    const launchActivity =
                        (appConfig && appConfig.activity) || '';

                    const targetAppArguments: LaunchArgument[] =
                        (appConfig && appConfig.launch_arguments) || [];
                    return AndroidSDKUtils.launchNativeApp(
                        compName,
                        projectDir,
                        appBundlePath,
                        targetApp,
                        targetAppArguments,
                        launchActivity,
                        actualPort,
                        address,
                        port
                    );
                }
            })
            .catch((error) => {
                spinner.stop('Error encountered during launch');
                throw error;
            });
    }
}
