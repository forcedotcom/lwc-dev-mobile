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
    ): Promise<boolean> {
        const preferredPack = await AndroidSDKUtils.findRequiredEmulatorImages();
        const emuImage = preferredPack.platformEmulatorImage || 'default';
        const androidApi = preferredPack.platformAPI;
        const abi = preferredPack.abi;
        const device = androidConfig.supportedDevices[0];
        let requestedPort = await AndroidSDKUtils.getNextAndroidAdbPort();
        const spinner = cli.action;
        // need to incr by 2, one for console port and next for adb
        requestedPort =
            requestedPort < androidConfig.defaultAdbPort
                ? androidConfig.defaultAdbPort
                : requestedPort + 2;
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
                    ).then((resolve) => true);
                }
                spinner.start(`Launching`, `Found device ${emuName}`, {
                    stdout: true
                });
                return true;
            })
            .then((resolve) => {
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

                const address =
                    appConfig && appConfig.preview_server_enabled === true
                        ? 'http://10.0.2.2' // TODO: dynamically determine server address
                        : undefined;

                const port =
                    appConfig && appConfig.preview_server_enabled === true
                        ? serverPort
                        : undefined;

                if (PreviewUtils.isTargetingBrowser(targetApp)) {
                    const compPath = PreviewUtils.prefixRouteIfNeeded(compName);
                    const url = `${address}:${serverPort}/lwc/preview/${compPath}`;
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

// let launcher = new AndroidLauncher('testemu7');
// launcher
//     .launchNativeBrowser('http://salesforce.com/')
//     .then((result) => {
//         console.log('Its all cool!');
//     })
//     .catch((error) => {
//         console.log(`uh oh! ${error}`);
//     });
