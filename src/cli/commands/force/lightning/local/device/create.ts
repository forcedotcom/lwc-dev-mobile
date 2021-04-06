/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, FlagsConfig } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { Setup } from '@salesforce/lwc-dev-mobile-core/lib/cli/commands/force/lightning/local/setup';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import {
    CommandRequirements,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import util from 'util';
import { getPlatformSetupRequirements } from '../../setupRequirementsUtil';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'device-create'
);

export class Create extends Setup {
    public static description = messages.getMessage('commandDescription');

    public static readonly flagsConfig: FlagsConfig = {
        apilevel: flags.string({
            char: 'a',
            description: messages.getMessage('apiLevelFlagDescription'),
            longDescription: messages.getMessage('apiLevelFlagDescription'),
            required: false
        }),
        devicename: flags.string({
            char: 'n',
            description: messages.getMessage('deviceNameFlagDescription'),
            required: true
        }),
        devicetype: flags.string({
            char: 'd',
            description: messages.getMessage('deviceTypeFlagDescription'),
            required: true
        }),
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            required: true
        })
    };

    public examples = [
        `sfdx force:lightning:local:device:create -p iOS -n MyNewVirtualDevice -d iPhone-8`,
        `sfdx force:lightning:local:device:create -p Android -n MyNewVirtualDevice -d pixel_xl`
    ];

    public platform: string = '';
    public deviceName: string = '';
    public deviceType: string = '';

    public async run(): Promise<any> {
        await this.init(); // ensure init first

        this.logger.info(
            `Device Create command invoked for ${this.flags.platform}`
        );

        return this.validateInputParameters()
            .then(() => {
                return RequirementProcessor.execute(this.commandRequirements);
            })
            .then(() => {
                // execute the create command
                this.logger.info(
                    'Setup requirements met, continuing with Device Create'
                );
                CommonUtils.startCliAction(
                    messages.getMessage('deviceCreateAction'),
                    util.format(
                        messages.getMessage('deviceCreateStatus'),
                        this.deviceName,
                        this.deviceType
                    )
                );
                return this.executeDeviceCreate();
            })
            .then(() => {
                const message = util.format(
                    messages.getMessage('deviceCreateSuccessStatus'),
                    this.deviceName,
                    this.deviceType
                );
                CommonUtils.stopCliAction(message);
            })
            .catch((error) => {
                CommonUtils.stopCliAction(
                    messages.getMessage('deviceCreateFailureStatus')
                );
                this.logger.warn(
                    `Device Create failed for ${this.flags.platform}.`
                );
                return Promise.reject(error);
            });
    }

    protected async validateInputParameters(): Promise<void> {
        return super.validateInputParameters().then(() => {
            const deviceName = this.flags.devicename as string;
            const deviceType = this.flags.devicetype as string;

            // ensure that the device name flag value is valid
            if (deviceName == null || deviceName.trim() === '') {
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidDeviceNameFlagsDescription'
                        ),
                        'lwc-dev-mobile',
                        this.examples
                    )
                );
            }

            // ensure that the device type flag value is valid
            if (deviceType == null || deviceType.trim() === '') {
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidDeviceTypeFlagsDescription'
                        ),
                        'lwc-dev-mobile',
                        this.examples
                    )
                );
            }

            this.platform = this.flags.platform;
            this.deviceName = deviceName;
            this.deviceType = deviceType;
            return Promise.resolve();
        });
    }

    protected async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        return super
            .init()
            .then(() => Logger.child('force:lightning:local:device:create', {}))
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const commandDict: CommandRequirements = {};
            commandDict.setup = getPlatformSetupRequirements(
                this.logger,
                this.flags.platform,
                this.flags.apilevel
            );
            this._requirements = commandDict;
        }
        return this._requirements;
    }

    private async executeDeviceCreate(): Promise<any> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(this.platform);
        return isAndroid
            ? this.executeAndroidDeviceCreate()
            : this.executeIOSDeviceCreate();
    }

    private async executeAndroidDeviceCreate(): Promise<void> {
        return AndroidUtils.fetchSupportedEmulatorImagePackage(
            this.flags.apilevel
        ).then((preferredPack) => {
            const emuImage = preferredPack.platformEmulatorImage || 'default';
            const androidApi = preferredPack.platformAPI;
            const abi = preferredPack.abi;
            return AndroidUtils.createNewVirtualDevice(
                this.deviceName,
                emuImage,
                androidApi,
                this.deviceType,
                abi
            );
        });
    }

    private async executeIOSDeviceCreate(): Promise<string> {
        return IOSUtils.getSupportedRuntimes().then((supportedRuntimes) =>
            IOSUtils.createNewDevice(
                this.deviceName,
                this.deviceType,
                supportedRuntimes[0]
            )
        );
    }
}
