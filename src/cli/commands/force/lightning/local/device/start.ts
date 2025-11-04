/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import {
    AndroidDevice,
    AndroidDeviceManager,
    AndroidEnvironmentRequirements,
    AppleDevice,
    AppleDeviceManager,
    BaseCommand,
    BootMode,
    CommandLineUtils,
    CommandRequirements,
    CommonUtils,
    FlagsConfigType,
    IOSEnvironmentRequirements,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';
import { z } from 'zod';
import { DeviceOperationResultSchema, DeviceOperationResultType, DeviceSchema } from '../schema/device.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'device-start');

export class Start extends BaseCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly examples = messages.getMessages('examples');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.JsonFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.OutputFormatFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevelFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.PlatformFlag, true),
        target: Flags.string({
            char: 't',
            description: messages.getMessage('flags.target.description'),
            required: true,
            validate: (target: string) => target && target.trim().length > 0
        }),
        writablesystem: Flags.boolean({
            char: 'w',
            description: messages.getMessage('flags.writablesystem.description'),
            required: false,
            default: false
        })
    };

    protected _commandName = 'force:lightning:local:device:start';

    private get platform(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.platform as string;
    }
    private get target(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.target as string;
    }
    private get writablesystem(): boolean {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.writablesystem as boolean;
    }

    protected static getOutputSchema(): z.ZodTypeAny {
        return DeviceOperationResultSchema;
    }

    public async run(): Promise<DeviceOperationResultType | void> {
        this.logger.info(`Device Start command invoked for ${this.platform}`);

        if (this.jsonEnabled()) {
            // if in JSON mode, just execute the start command and return the device
            const device = await this.executeDeviceStart();
            const deviceInfo = DeviceSchema.parse(device);
            const message = CommandLineUtils.platformFlagIsAndroid(this.platform)
                ? this.getAndroidSuccessMessage(device as AndroidDevice)
                : this.getIOSSuccessMessage();
            return {
                device: deviceInfo,
                success: true,
                message
            };
        }

        // do the RequirementProcessor.execute if not in JSON mode
        await RequirementProcessor.execute(this.commandRequirements).then(() => {
            // execute the start command
            this.logger.info('Setup requirements met, continuing with Device Start');
            return this.executeDeviceStart();
        });
    }

    protected populateCommandRequirements(): void {
        const requirements: CommandRequirements = {};

        requirements.setup = CommandLineUtils.platformFlagIsAndroid(this.platform)
            ? new AndroidEnvironmentRequirements(this.logger)
            : new IOSEnvironmentRequirements(this.logger);

        this.commandRequirements = requirements;
    }

    private async executeDeviceStart(): Promise<AndroidDevice | AppleDevice> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(this.platform);

        const device = isAndroid
            ? await new AndroidDeviceManager().getDevice(this.target)
            : await new AppleDeviceManager().getDevice(this.target);

        if (!device) {
            return Promise.reject(messages.getMessage('error.target.doesNotExist', [this.target]));
        }

        if (!this.jsonEnabled()) {
            CommonUtils.startCliAction(
                messages.getMessage('device.start.action'),
                messages.getMessage('device.start.status', [this.target])
            );
        }

        if (isAndroid) {
            const avd = device as AndroidDevice;
            await avd.boot(true, this.writablesystem ? BootMode.systemWritableMandatory : BootMode.normal);
            if (!this.jsonEnabled()) {
                CommonUtils.stopCliAction(this.getAndroidSuccessMessage(device as AndroidDevice));
            }
        } else {
            await (device as AppleDevice).boot(true);
            if (!this.jsonEnabled()) {
                CommonUtils.stopCliAction(this.getIOSSuccessMessage());
            }
        }

        return device;
    }

    private getAndroidSuccessMessage(deviceInfo: AndroidDevice): string {
        return messages.getMessage('device.start.successStatus.android', [
            this.target,
            deviceInfo.emulatorPort(),
            this.writablesystem
        ]);
    }

    private getIOSSuccessMessage(): string {
        return messages.getMessage('device.start.successStatus.ios', [this.target]);
    }
}
