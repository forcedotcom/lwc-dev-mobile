/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { CommandLineUtils } from '../../../../../../common/Common';
import { AndroidSDKUtils } from '../../../../../../common/AndroidUtils';
import { XcodeUtils } from '../../../../../../common/IOSUtils';
import { AndroidVirtualDevice } from '../../../../../../common/AndroidTypes';
import { IOSSimulatorDevice } from '../../../../../../common/IOSTypes';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'device');

export default class List extends SfdxCommand {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ sfdx force:lightning:local:device:list -p iOS`,
        `$ sfdx force:lightning:local:device:list -p Android`
    ];

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

        return CommandLineUtils.platformFlagIsIOS(platform)
            ? this.iOSDeviceList()
            : this.androidDeviceList();
    }

    public async iOSDeviceList(): Promise<IOSSimulatorDevice[]> {
        const list = await XcodeUtils.getSupportedSimulators();

        /*for (const item of list) {
            console.log(item.name);
            console.log(item.runtimeId);
            console.log('---------');
        }*/

        return Promise.resolve(list);
    }

    public async androidDeviceList(): Promise<AndroidVirtualDevice[]> {
        const list = await AndroidSDKUtils.fetchEmulators();

        /*for (const item of list) {
            console.log(item.displayName);
            console.log(item.deviceName);
            console.log(item.api);
            console.log('---------');
        }*/

        return Promise.resolve(list);
    }

    private isValidPlatform(platform: string): boolean {
        return (
            CommandLineUtils.platformFlagIsIOS(platform) ||
            CommandLineUtils.platformFlagIsAndroid(platform)
        );
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:device:list', {});
        this.logger = logger;
    }
}
