/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import util from 'util';

import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';

import { AndroidEnvironmentSetup } from '../../../../../common/AndroidEnvironmentSetup';
import { CommandLineUtils } from '../../../../../common/Common';
import { IOSEnvironmentSetup } from '../../../../../common/IOSEnvironmentSetup';
import { LoggerSetup } from '../../../../../common/LoggerSetup';
import { BaseSetup, SetupTestResult } from '../../../../../common/Requirements';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'setup');

export default class Setup extends SfdxCommand {
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
        `sfdx force:lightning:local:setup -p iOS`,
        `sfdx force:lightning:local:setup -p Android`
    ];

    public async run(): Promise<any> {
        if (!CommandLineUtils.platformFlagIsValid(this.flags.platform)) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage('error:invalidInputFlagsDescription'),
                    'lwc-dev-mobile',
                    this.examples
                )
            );
        }
        this.logger.info(`Setup Command called for ${this.flags.platform}`);
        const setup = this.setup();
        const result = await this.executeSetup(setup);
        if (!result.hasMetAllRequirements) {
            const actions = result.tests
                .filter((test) => !test.hasPassed)
                .map((test) => test.message);
            return Promise.reject(
                new SfdxError(
                    util.format(
                        messages.getMessage('error:setupFailed'),
                        this.flags.platform
                    ),
                    'lwc-dev-mobile',
                    actions
                )
            );
        }
        return Promise.resolve(result);
    }

    public executeSetup(setup: BaseSetup): Promise<SetupTestResult> {
        return setup.executeSetup();
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:setup', {});
        this.logger = logger;
        await LoggerSetup.initializePluginLoggers();
    }

    protected setup(): BaseSetup {
        let setup: BaseSetup = ({} as any) as BaseSetup; // should not be the case due to prior validation.
        if (CommandLineUtils.platformFlagIsAndroid(this.flags.platform)) {
            setup = new AndroidEnvironmentSetup(this.logger);
        } else if (CommandLineUtils.platformFlagIsIOS(this.flags.platform)) {
            setup = new IOSEnvironmentSetup(this.logger);
        }
        return setup;
    }
}
