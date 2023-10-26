/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Flags } from '@salesforce/sf-plugins-core';
import { Logger, Messages } from '@salesforce/core';
import {
    AndroidEnvironmentRequirements,
    AndroidUtils,
    BaseCommand,
    CommandLineUtils,
    CommandRequirements,
    CommonUtils,
    FlagsConfigType,
    IOSEnvironmentRequirements,
    IOSUtils,
    Requirement,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';
import util from 'util';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'device-create'
);

export class Create extends BaseCommand {
    protected _commandName = 'force:lightning:local:device:create';

    public static readonly description =
        messages.getMessage('commandDescription');

    public static readonly examples = [
        `sfdx force:lightning:local:device:create -p iOS -n MyNewVirtualDevice -d iPhone-8`,
        `sfdx force:lightning:local:device:create -p Android -n MyNewVirtualDevice -d pixel_xl`
    ];

    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.Json, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevel, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.ApiLevel, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.Platform, true),
        devicename: Flags.string({
            char: 'n',
            description: messages.getMessage('deviceNameFlagDescription'),
            required: true,
            validate: (deviceName: string) => {
                return deviceName && deviceName.trim().length > 0;
            }
        }),
        devicetype: Flags.string({
            char: 'd',
            description: messages.getMessage('deviceTypeFlagDescription'),
            required: true,
            validate: (deviceType: string) => {
                return deviceType && deviceType.trim().length > 0;
            }
        })
    };

    public async run(): Promise<void> {
        this.logger.info(
            `Device Create command invoked for ${this.flagValues.platform}`
        );

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
                        this.flagValues.devicename,
                        this.flagValues.devicetype
                    )
                );
                return this.executeDeviceCreate();
            })
            .then(() => {
                const message = util.format(
                    messages.getMessage('deviceCreateSuccessStatus'),
                    this.flagValues.devicename,
                    this.flagValues.devicetype
                );
                CommonUtils.stopCliAction(message);
            })
            .catch((error) => {
                CommonUtils.stopCliAction(
                    messages.getMessage('deviceCreateFailureStatus')
                );
                this.logger.warn(
                    `Device Create failed for ${this.flagValues.platform}.`
                );
                return Promise.reject(error);
            });
    }

    protected populateCommandRequirements(): void {
        const requirements: CommandRequirements = {};

        requirements.setup = CommandLineUtils.platformFlagIsAndroid(
            this.flagValues.platform
        )
            ? new AndroidEnvironmentRequirements(
                  this.logger,
                  this.flagValues.apilevel
              )
            : new IOSEnvironmentRequirements(this.logger);

        requirements.create = {
            requirements: [
                new DeviceNameAvailableRequirement(this, this.logger),
                new ValidDeviceTypeRequirement(this, this.logger)
            ],
            enabled: true
        };

        this._commandRequirements = requirements;
    }

    private async executeDeviceCreate(): Promise<any> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(
            this.flagValues.platform
        );
        return isAndroid
            ? this.executeAndroidDeviceCreate()
            : this.executeIOSDeviceCreate();
    }

    private async executeAndroidDeviceCreate(): Promise<void> {
        return AndroidUtils.fetchSupportedEmulatorImagePackage(
            this.flagValues.apilevel
        ).then((preferredPack) => {
            const emuImage = preferredPack.platformEmulatorImage || 'default';
            const androidApi = preferredPack.platformAPI;
            const abi = preferredPack.abi;
            return AndroidUtils.createNewVirtualDevice(
                this.flagValues.devicename,
                emuImage,
                androidApi,
                this.flagValues.devicetype,
                abi
            );
        });
    }

    private async executeIOSDeviceCreate(): Promise<string> {
        return IOSUtils.getSupportedRuntimes().then((supportedRuntimes) =>
            IOSUtils.createNewDevice(
                this.flagValues.devicename,
                this.flagValues.devicetype,
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
            this.owner.flagValues.platform
        );
        const deviceName = this.owner.flagValues.devicename;

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
            this.owner.flagValues.platform
        );
        const deviceType = this.owner.flagValues.devicetype;

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
