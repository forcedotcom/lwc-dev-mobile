/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import {
    Requirement,
    CommandRequirements,
    RequirementProcessor,
    HasRequirements
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

export class Create extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static readonly flagsConfig: FlagsConfig = {
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
        ...CommonUtils.apiLevelFlagConfig,
        ...CommonUtils.platformFlagConfig
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
        return CommonUtils.validatePlatformFlag(this.flags, this.examples)
            .then(() =>
                CommonUtils.validateApiLevelFlag(this.flags, this.examples)
            )
            .then(() => {
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
            const requirements: CommandRequirements = {};
            requirements.setup = getPlatformSetupRequirements(
                this.logger,
                this.flags.platform,
                this.flags.apilevel
            );
            requirements.create = {
                requirements: [
                    new DeviceNameAvailableRequirement(this, this.logger),
                    new ValidDeviceTypeRequirement(this, this.logger)
                ],
                enabled: true
            };
            this._requirements = requirements;
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

// tslint:disable-next-line: max-classes-per-file
class DeviceNameAvailableRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:devicename:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:devicename:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:devicename:unfulfilledMessage'
    );
    public logger: Logger;
    private owner: Create;

    constructor(owner: Create, logger: Logger) {
        this.owner = owner;
        this.logger = logger;
    }

    // ensure a virtual device with the same name doesn't exist already
    public async checkFunction(): Promise<string> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(
            this.owner.platform
        );
        const deviceName = this.owner.deviceName;

        const deviceAlreadyExists = isAndroid
            ? await AndroidUtils.hasEmulator(deviceName)
            : (await IOSUtils.getSimulator(deviceName)) != null;

        return deviceAlreadyExists
            ? Promise.reject(util.format(this.unfulfilledMessage, deviceName))
            : Promise.resolve(util.format(this.fulfilledMessage, deviceName));
    }
}

// tslint:disable-next-line: max-classes-per-file
class ValidDeviceTypeRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:devicetype:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:devicetype:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:devicetype:unfulfilledMessage'
    );
    public logger: Logger;
    private owner: Create;

    constructor(owner: Create, logger: Logger) {
        this.owner = owner;
        this.logger = logger;
    }

    // check whether device type is valid (i.e. it matches one of the possible values of available device types)
    public async checkFunction(): Promise<string> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(
            this.owner.platform
        );
        const deviceType = this.owner.deviceType;

        const supportedDevices = isAndroid
            ? await AndroidUtils.getSupportedDevices()
            : await IOSUtils.getSupportedDevices();

        const match = supportedDevices.find((device) => device === deviceType);

        return match !== undefined
            ? Promise.resolve(util.format(this.fulfilledMessage, deviceType))
            : Promise.reject(
                  util.format(
                      this.unfulfilledMessage,
                      deviceType,
                      supportedDevices.join(', ')
                  )
              );
    }
}
