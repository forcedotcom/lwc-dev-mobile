/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import { AndroidVirtualDevice } from '../../../../../../common/AndroidTypes';
import { AndroidSDKUtils } from '../../../../../../common/AndroidUtils';
import { CommandLineUtils } from '../../../../../../common/Common';
import { IOSSimulatorDevice } from '../../../../../../common/IOSTypes';
import { XcodeUtils } from '../../../../../../common/IOSUtils';
import Setup from '../setup';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'device');

export default class List extends SfdxCommand {
    public static description = messages.getMessage('commandDescription');

    public static readonly flagsConfig: FlagsConfig = {
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            longDescription: messages.getMessage('platformFlagDescription'),
            required: true
        })
    };

    public async run(): Promise<any> {
        const platform = this.flags.platform;
        this.logger.info(`Device List command invoked for ${platform}`);
        if (!this.isValidPlatform(platform)) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage('error:invalidInputFlagsDescription'),
                    'lwc-dev-mobile',
                    [
                        `${messages.getMessage(
                            'remedy:invalidInputFlagsDescription'
                        )}`
                    ]
                )
            );
        }

        const setupResult = await Setup.run(['-p', this.flags.platform]);
        if (!setupResult || !setupResult.hasMetAllRequirements) {
            this.logger.warn(
                `Device list failed for ${this.flags.platform}. Setup requirements have not been met.`
            );
            return Promise.resolve(false);
        }
        this.logger.info('Setup requirements met, continuing with device list');

        return CommandLineUtils.platformFlagIsIOS(platform)
            ? this.iOSDeviceList()
            : this.androidDeviceList();
    }

    public async iOSDeviceList(): Promise<IOSSimulatorDevice[]> {
        const deviceList = await XcodeUtils.getSupportedSimulators();
        this.showDeviceList(deviceList);
        return Promise.resolve(deviceList);
    }

    public async androidDeviceList(): Promise<AndroidVirtualDevice[]> {
        const deviceList = await AndroidSDKUtils.fetchEmulators();
        this.showDeviceList(deviceList);
        return Promise.resolve(deviceList);
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:device:list', {});
        this.logger = logger;
    }

    private isValidPlatform(platform: string): boolean {
        return (
            CommandLineUtils.platformFlagIsIOS(platform) ||
            CommandLineUtils.platformFlagIsAndroid(platform)
        );
    }

    private showDeviceList(list: any[]) {
        const tree = cli.tree();
        tree.insert('DeviceList');
        list.forEach((item) => {
            tree.nodes.DeviceList.insert(chalk.bold.green(item));
        });
        tree.display();
    }
}
