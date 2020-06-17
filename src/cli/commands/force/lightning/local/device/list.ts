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

export default class List extends Setup {
    public static description = messages.getMessage('commandDescription');

    public static readonly flagsConfig: FlagsConfig = {
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            longDescription: messages.getMessage('platformFlagDescription'),
            required: true
        })
    };

    public examples = [
        `sfdx force:lightning:local:device:list -p iOS`,
        `sfdx force:lightning:local:device:list -p Android`
    ];

    public async run(): Promise<any> {
        const platform = this.flags.platform;
        this.logger.info(`Device List command invoked for ${platform}`);

        return new Promise<any>((resolve, reject) => {
            super
                .run() // run setup first
                .then((result) => {
                    this.logger.info(
                        'Setup requirements met, continuing with device list'
                    );

                    const deviceList = CommandLineUtils.platformFlagIsIOS(
                        platform
                    )
                        ? this.iOSDeviceList()
                        : this.androidDeviceList();

                    resolve(deviceList);
                })
                .catch((error) => {
                    this.logger.warn(
                        `Device list failed for ${platform}. Setup requirements have not been met.`
                    );
                    reject(error);
                });
        });
    }

    public iOSDeviceList(): Promise<IOSSimulatorDevice[]> {
        return XcodeUtils.getSupportedSimulators().then((result) => {
            this.showDeviceList(result);
            return result;
        });
    }

    public androidDeviceList(): Promise<AndroidVirtualDevice[]> {
        return AndroidSDKUtils.fetchEmulators().then((result) => {
            this.showDeviceList(result);
            return result;
        });
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:device:list', {});
        this.logger = logger;
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
