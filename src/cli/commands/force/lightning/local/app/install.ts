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
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'app-install');

export class Install extends BaseCommand {
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
            required: true,
            validate: (val: string) => val && val.trim().length > 0
        }),
        appbundlepath: Flags.string({
            char: 'a',
            description: messages.getMessage('flags.appBundlePath.description'),
            required: true,
            validate: (val: string) => val && val.trim().length > 0
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

    public async run(): Promise<void> {
        this.logger.info(`app install command invoked for ${this.platform}`);

        return RequirementProcessor.execute(this.commandRequirements)
            .then(() => {
                // environment requirements met, continue with app install
                this.logger.info('Setup requirements met, continuing with app install');
                CommonUtils.startCliAction(
                    messages.getMessage('app.install.action'),
                    messages.getMessage('app.install.status', [this.appBundlePath, this.target])
                );
                return this.executeAppInstall();
            })
            .then(() => {
                const message = messages.getMessage('app.install.successStatus', [this.appBundlePath, this.target]);
                CommonUtils.stopCliAction(message);
            })
            .catch((error: Error) => {
                this.logger.warn(`App Install failed for ${this.platform} - ${error.message}`);
                CommonUtils.stopCliAction(messages.getMessage('app.install.failureStatus'));
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

    private async executeAppInstall(): Promise<void> {
        const deviceManager = CommandLineUtils.platformFlagIsAndroid(this.platform)
            ? new AndroidDeviceManager()
            : new AppleDeviceManager();
        const device = await deviceManager.getDevice(this.target);

        if (!device) {
            return Promise.reject(messages.getMessage('error.target.doesNotExist', [this.target]));
        }

        await device.boot(true);
        await device.installApp(this.appBundlePath);
    }
}
