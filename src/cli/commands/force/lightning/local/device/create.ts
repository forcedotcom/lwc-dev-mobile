/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import util from 'node:util';
import { Flags } from '@salesforce/sf-plugins-core';
import { Logger, Messages } from '@salesforce/core';
import {
    AndroidDeviceManager,
    AndroidEnvironmentRequirements,
    AndroidUtils,
    AppleDeviceManager,
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
import { z } from 'zod';
import { DeviceOperationResultSchema, DeviceOperationResultType, DeviceSchema } from '../schema/device.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'device-create');

export class Create extends BaseCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly examples = messages.getMessages('examples');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.JsonFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.OutputFormatFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevelFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.ApiLevelFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.PlatformFlag, true),
        devicename: Flags.string({
            char: 'n',
            description: messages.getMessage('flags.deviceName.description'),
            required: true,
            validate: (deviceName: string) => deviceName && deviceName.trim().length > 0
        }),
        devicetype: Flags.string({
            char: 'd',
            description: messages.getMessage('flags.deviceType.description'),
            required: true,
            validate: (deviceType: string) => deviceType && deviceType.trim().length > 0
        })
    };

    protected _commandName = 'force:lightning:local:device:create';

    public get platform(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.platform as string;
    }
    public get deviceName(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.devicename as string;
    }
    public get deviceType(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.devicetype as string;
    }
    public get apiLevel(): string | undefined {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.apilevel as string | undefined;
    }

    protected static getOutputSchema(): z.ZodTypeAny {
        return DeviceOperationResultSchema;
    }

    public async run(): Promise<DeviceOperationResultType | void> {
        this.logger.info(`Device Create command invoked for ${this.platform}`);

        const creationSuccessMessage = messages.getMessage('device.create.successStatus', [
            this.deviceName,
            this.deviceType
        ]);

        if (this.jsonEnabled()) {
            // if in JSON mode, just execute the create command and return the device
            await this.executeDeviceCreate();
            const device = await (CommandLineUtils.platformFlagIsAndroid(this.platform)
                ? new AndroidDeviceManager()
                : new AppleDeviceManager()
            ).getDevice(this.deviceName);

            const deviceInfo = DeviceSchema.parse(device);
            return {
                device: deviceInfo,
                success: true,
                message: creationSuccessMessage
            };
        }

        // do the RequirementProcessor.execute if not in JSON mode and then execute the create command
        return RequirementProcessor.execute(this.commandRequirements)
            .then(() => {
                // execute the create command
                this.logger.info('Setup requirements met, continuing with Device Create');
                CommonUtils.startCliAction(
                    messages.getMessage('device.create.action'),
                    messages.getMessage('device.create.status', [this.deviceName, this.deviceType])
                );
                return this.executeDeviceCreate();
            })
            .then(() => {
                CommonUtils.stopCliAction(creationSuccessMessage);
            })
            .catch((error: Error) => {
                CommonUtils.stopCliAction(messages.getMessage('device.create.failureStatus'));
                this.logger.warn(`Device Create failed for ${this.platform} - ${error.message}`);
                throw error;
            });
    }

    protected populateCommandRequirements(): void {
        const requirements: CommandRequirements = {};

        requirements.setup = CommandLineUtils.platformFlagIsAndroid(this.platform)
            ? new AndroidEnvironmentRequirements(this.logger, this.apiLevel)
            : new IOSEnvironmentRequirements(this.logger);

        requirements.create = {
            requirements: [
                new DeviceNameAvailableRequirement(this, this.logger),
                new ValidDeviceTypeRequirement(this, this.logger)
            ],
            enabled: true
        };

        this.commandRequirements = requirements;
    }

    private async executeDeviceCreate(): Promise<void> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(this.platform);

        return isAndroid ? this.executeAndroidDeviceCreate() : this.executeIOSDeviceCreate();
    }

    private async executeAndroidDeviceCreate(): Promise<void> {
        const preferredPack = await AndroidUtils.fetchSupportedEmulatorImagePackage(this.apiLevel, this.logger);

        const emuImage = preferredPack.platformEmulatorImage ?? 'default';
        const androidApi = preferredPack.platformAPI;
        const abi = preferredPack.abi;
        return AndroidUtils.createNewVirtualDevice(
            this.deviceName,
            emuImage,
            androidApi,
            this.deviceType,
            abi,
            this.logger
        );
    }

    private async executeIOSDeviceCreate(): Promise<void> {
        const appleDeviceManager = new AppleDeviceManager();
        const runtimes = await appleDeviceManager.enumerateRuntimes();
        const match = runtimes.find(
            (runtime) =>
                runtime.supportedDeviceTypes.find((deviceType) => deviceType.typeName === this.deviceType) !== undefined
        );
        await IOSUtils.createNewDevice(this.deviceName, this.deviceType, match?.runtimeName ?? '', this.logger);
    }
}

class DeviceNameAvailableRequirement implements Requirement {
    public title: string = messages.getMessage('reqs.deviceName.title');
    // eslint-disable-next-line sf-plugin/no-missing-messages
    public fulfilledMessage: string = messages.getMessage('reqs.deviceName:fulfilledMessage');
    // eslint-disable-next-line sf-plugin/no-missing-messages
    public unfulfilledMessage: string = messages.getMessage('reqs.deviceName:unfulfilledMessage');
    public logger: Logger;
    private owner: Create;

    public constructor(owner: Create, logger: Logger) {
        this.owner = owner;
        this.logger = logger;
    }

    // ensure a virtual device with the same name doesn't exist already
    public async checkFunction(): Promise<string> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(this.owner.platform);

        const deviceAlreadyExists = isAndroid
            ? await new AndroidDeviceManager().getDevice(this.owner.deviceName)
            : await new AppleDeviceManager().getDevice(this.owner.deviceName);

        return deviceAlreadyExists
            ? Promise.reject(util.format(this.unfulfilledMessage, this.owner.deviceName))
            : Promise.resolve(util.format(this.fulfilledMessage, this.owner.deviceName));
    }
}

class ValidDeviceTypeRequirement implements Requirement {
    public title: string = messages.getMessage('reqs.deviceType.title');
    // eslint-disable-next-line sf-plugin/no-missing-messages
    public fulfilledMessage: string = messages.getMessage('reqs.deviceType.fulfilledMessage');
    // eslint-disable-next-line sf-plugin/no-missing-messages
    public unfulfilledMessage: string = messages.getMessage('reqs.deviceType:unfulfilledMessage');
    public logger: Logger;
    private owner: Create;

    public constructor(owner: Create, logger: Logger) {
        this.owner = owner;
        this.logger = logger;
    }

    // check whether device type is valid (i.e. it matches one of the possible values of available device types)
    public async checkFunction(): Promise<string> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(this.owner.platform);

        const supportedDeviceTypes = isAndroid
            ? await AndroidUtils.getSupportedDeviceTypes()
            : await IOSUtils.getSupportedDeviceTypes(this.logger);

        const match = supportedDeviceTypes.find((deviceType) => deviceType === this.owner.deviceType);

        return match !== undefined
            ? Promise.resolve(util.format(this.fulfilledMessage, this.owner.deviceType))
            : Promise.reject(
                  util.format(this.unfulfilledMessage, this.owner.deviceType, supportedDeviceTypes.join(', '))
              );
    }
}
