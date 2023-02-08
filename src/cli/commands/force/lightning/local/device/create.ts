/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import {
    CommandLineUtils,
    FlagsConfigType
} from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import {
    Requirement,
    CommandRequirements,
    RequirementProcessor,
    HasRequirements
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import util from 'util';

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

    public static examples = [
        `sfdx force:lightning:local:device:create -p iOS -n MyNewVirtualDevice -d iPhone-8`,
        `sfdx force:lightning:local:device:create -p Android -n MyNewVirtualDevice -d pixel_xl`
    ];

    public static readonly flagsConfig: FlagsConfig = {
        devicename: flags.string({
            char: 'n',
            description: messages.getMessage('deviceNameFlagDescription'),
            required: true,
            validate: (deviceName) => {
                if (deviceName && deviceName.trim().length > 0) {
                    return true;
                } else {
                    throw new SfError(
                        messages.getMessage(
                            'error:invalidDeviceNameFlagsDescription'
                        ),
                        'lwc-dev-mobile',
                        Create.examples
                    );
                }
            }
        }),
        devicetype: flags.string({
            char: 'd',
            description: messages.getMessage('deviceTypeFlagDescription'),
            required: true,
            validate: (deviceType) => {
                if (deviceType && deviceType.trim().length > 0) {
                    return true;
                } else {
                    throw new SfError(
                        messages.getMessage(
                            'error:invalidDeviceTypeFlagsDescription'
                        ),
                        'lwc-dev-mobile',
                        Create.examples
                    );
                }
            }
        }),
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.ApiLevel, false),
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.Platform, true)
    };

    public platform = '';
    public deviceName = '';
    public deviceType = '';

    public async run(): Promise<void> {
        this.logger.info(
            `Device Create command invoked for ${this.flags.platform}`
        );

        this.platform = this.flags.platform as string;
        this.deviceName = this.flags.devicename as string;
        this.deviceType = this.flags.devicetype as string;

        return RequirementProcessor.execute(this.commandRequirements)
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

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Create.examples;
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
            requirements.setup = CommandLineUtils.platformFlagIsAndroid(
                this.flags.platform
            )
                ? new AndroidEnvironmentRequirements(
                      this.logger,
                      this.flags.apilevel
                  )
                : new IOSEnvironmentRequirements(this.logger);

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
