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
import { IOSUtils } from '../../../../../../common/IOSUtils';
import { LoggerSetup } from '../../../../../../common/LoggerSetup';

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

    public examples = [
        `sfdx force:lightning:local:device:list -p iOS`,
        `sfdx force:lightning:local:device:list -p Android`
    ];

    public async run(): Promise<any> {
        const platform = this.flags.platform;
        this.logger.info(`Device List command invoked for ${platform}`);

        if (!CommandLineUtils.platformFlagIsValid(platform)) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage('error:invalidInputFlagsDescription'),
                    'lwc-dev-mobile',
                    this.examples
                )
            );
        }

        return new Promise<any>((resolve, reject) => {
            const deviceList = CommandLineUtils.platformFlagIsIOS(platform)
                ? this.iOSDeviceList()
                : this.androidDeviceList();

            resolve(deviceList);
        });
    }

    public async iOSDeviceList(): Promise<IOSSimulatorDevice[]> {
        const startTime = new Date().getTime();
        const result = await IOSUtils.getSupportedSimulators();
        this.showDeviceList(result, startTime);
        return result;
    }

    public async androidDeviceList(): Promise<AndroidVirtualDevice[]> {
        const startTime = new Date().getTime();
        const result = await AndroidSDKUtils.fetchEmulators();
        this.showDeviceList(result, startTime);
        return result;
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:device:list', {});
        this.logger = logger;
        await LoggerSetup.initializePluginLoggers();
    }

    private showDeviceList(list: any[], startTime: number) {
        const endTime = new Date().getTime();
        const duration = Math.abs((endTime - startTime) / 1000);

        const message = `DeviceList (${duration} sec)`;
        const tree = cli.tree();
        tree.insert(message);
        const rootNode = tree.nodes[message];

        list.forEach((item) => {
            rootNode.insert(chalk.bold.green(item));
        });
        tree.display();
    }
}
