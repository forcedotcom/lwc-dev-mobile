/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import {
    AndroidDeviceManager,
    AndroidEnvironmentRequirements,
    AppleDeviceManager,
    BaseCommand,
    CommandLineUtils,
    CommandRequirements,
    CommonUtils,
    FlagsConfigType,
    IOSEnvironmentRequirements,
    LaunchArgument,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'app-launch');

export class Launch extends BaseCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly examples = messages.getMessages('examples');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.JsonFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevelFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.PlatformFlag, true),
        target: Flags.string({
            char: 't',
            description: messages.getMessage('flags.target.description'),
            required: true
        }),
        bundleid: Flags.string({
            char: 'i',
            description: messages.getMessage('flags.bundleId.description'),
            required: true
        }),
        arguments: Flags.string({
            char: 'e',
            description: messages.getMessage('flags.launchArguments.description'),
            required: false,
            validate: (val: string) => {
                if (!val) return true;

                try {
                    const json: unknown = JSON.parse(val);

                    // Verify it's an array
                    if (!Array.isArray(json)) {
                        return false;
                    }

                    // Verify each element complies with LaunchArgument type
                    for (const arg of json) {
                        if (typeof arg !== 'object' || arg === null) {
                            return false;
                        }

                        // Check for required properties
                        if (
                            !('name' in arg) ||
                            typeof (arg as Record<string, unknown>).name !== 'string' ||
                            !('value' in arg) ||
                            typeof (arg as Record<string, unknown>).value !== 'string'
                        ) {
                            return false;
                        }
                    }

                    return true;
                } catch (error) {
                    return false;
                }
            }
        }),
        appbundlepath: Flags.string({
            char: 'a',
            description: messages.getMessage('flags.appBundlePath.description'),
            required: false
        })
    };

    protected _commandName = 'force:lightning:local:app:install';

    private get platform(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.platform as string;
    }

    private get target(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.target as string;
    }

    private get appBundlePath(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.appbundlepath as string;
    }

    private get arguments(): LaunchArgument[] | undefined {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const argumentsValue = this.flagValues.arguments as string | undefined;
        if (!argumentsValue) return undefined;
        if (argumentsValue.trim().length === 0) return undefined;

        return JSON.parse(argumentsValue) as LaunchArgument[];
    }

    private get bundleId(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.bundleid as string;
    }

    public async run(): Promise<void> {
        this.logger.info(`app launch command invoked for ${this.platform}`);

        return RequirementProcessor.execute(this.commandRequirements)
            .then(() => {
                // environment requirements met, continue with app launch
                this.logger.info('Setup requirements met, continuing with app launch');
                CommonUtils.startCliAction(
                    messages.getMessage('app.launch.action'),
                    messages.getMessage('app.launch.status', [this.bundleId, this.target])
                );
                return this.executeAppLaunch();
            })
            .then(() => {
                const message = messages.getMessage('app.launch.successStatus', [this.bundleId, this.target]);
                CommonUtils.stopCliAction(message);
            })
            .catch((error: Error) => {
                this.logger.warn(`App launch failed for ${this.platform} - ${error.message}`);
                CommonUtils.stopCliAction(messages.getMessage('app.launch.failureStatus'));
                return Promise.reject(error);
            });
    }

    protected populateCommandRequirements(): void {
        const requirements: CommandRequirements = {};

        // check environment is setup correctly for the platform
        requirements.setup = CommandLineUtils.platformFlagIsAndroid(this.platform)
            ? new AndroidEnvironmentRequirements(this.logger)
            : new IOSEnvironmentRequirements(this.logger);

        this.commandRequirements = requirements;
    }

    private async executeAppLaunch(): Promise<void> {
        const deviceManager = CommandLineUtils.platformFlagIsAndroid(this.platform)
            ? new AndroidDeviceManager()
            : new AppleDeviceManager();
        const device = await deviceManager.getDevice(this.target);

        if (!device) {
            return Promise.reject(messages.getMessage('error.target.doesNotExist', [this.target]));
        }

        await device.boot(true);
        await device.launchApp(this.bundleId, this.arguments, this.appBundlePath);
    }
}
