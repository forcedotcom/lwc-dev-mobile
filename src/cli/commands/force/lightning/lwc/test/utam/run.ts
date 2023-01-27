/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import {
    CommandLineUtils,
    FlagsConfigType
} from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import {
    RequirementProcessor,
    HasRequirements,
    CommandRequirements
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import util from 'util';
import fs from 'fs';
import path from 'path';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'test-utam-run'
);

export class Run extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ force:lightning:lwc:test:utam:run -p iOS --config '/path/to/wdio.conf.js' --spec '/path/to/myTest.spec.js'`,
        `$ force:lightning:lwc:test:utam:run -p Android --config '/path/to/wdio.conf.js' --spec '/path/to/myTest.spec.js'`
    ];

    public static cmd = `npx wdio --version`;

    private static createError(stringId: string): SfError {
        return new SfError(
            messages.getMessage(stringId),
            'lwc-dev-mobile',
            Run.examples
        );
    }

    public static flagsConfig = {
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.Platform, true),
        config: flags.string({
            description: messages.getMessage('configFlagDescription'),
            required: true,
            validate: (wdioConfig) => {
                if (wdioConfig && wdioConfig.trim().length > 0) {
                    return true;
                } else {
                    throw Run.createError('error:invalidConfigFlagDescription');
                }
            }
        }),
        spec: flags.string({
            description: messages.getMessage('specFlagDescription'),
            required: true,
            validate: (testPath) => {
                if (testPath && testPath.trim().length > 0) {
                    return true;
                } else {
                    throw Run.createError('error:invalidSpecFlagDescription');
                }
            }
        })
    };

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const requirements: CommandRequirements = {};
            requirements.setup = CommandLineUtils.platformFlagIsAndroid(
                this.flags.platform
            )
                ? new AndroidEnvironmentRequirements(this.logger)
                : new IOSEnvironmentRequirements(this.logger);
            this._requirements = requirements;
        }

        return this._requirements;
    }

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Run.examples;
        return super
            .init()
            .then(() => Logger.child('force:lightning:lwc:test:utam:run', {}))
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    public async run(): Promise<any> {
        this.logger.info(`UTAM run command invoked.`);

        return RequirementProcessor.execute(this.commandRequirements)
            .then(async () => {
                this.logger.info(
                    `Setup requirements met, continuing with running a UTAM test.`
                );
                return this.executeWdioAvailabilityCheck();
            })
            .then(() => {
                this.logger.info(
                    `WDIO installation verified. Running npx wdio command.`
                );
                return this.executeRunUtamTest();
            })
            .catch((error) => {
                this.logger.warn(`Failed to run a UTAM test - ${error}`);
                return Promise.reject(error);
            });
    }

    private async executeRunUtamTest(): Promise<any> {
        CommonUtils.startCliAction(messages.getMessage('runningUtamTest'));

        const config = CommandLineUtils.resolveFlag(this.flags.config, '');
        const configPath = path.normalize(
            path.resolve(CommonUtils.resolveUserHomePath(config))
        );

        if (!fs.existsSync(configPath)) {
            CommonUtils.stopCliAction();
            return Promise.reject(
                new SfError(
                    messages.getMessage(
                        'error:configFileDoesntExistDescription'
                    ),
                    'lwc-dev-mobile',
                    Run.examples
                )
            );
        }

        const spec = CommandLineUtils.resolveFlag(this.flags.spec, '');
        const specPath = path.normalize(
            path.resolve(CommonUtils.resolveUserHomePath(spec))
        );

        if (!fs.existsSync(specPath)) {
            CommonUtils.stopCliAction();
            return Promise.reject(
                new SfError(
                    messages.getMessage('error:specFileDoesntExistDescription'),
                    'lwc-dev-mobile',
                    Run.examples
                )
            );
        }

        const cmd = `npx wdio '${configPath}' --spec '${specPath}'`;

        return CommonUtils.executeCommandAsync(cmd)
            .then((result) => {
                console.log(result.stdout);
                CommonUtils.stopCliAction();
                return Promise.resolve();
            })
            .catch((error) => {
                CommonUtils.stopCliAction();
                return Promise.reject(
                    new SfError(
                        util.format(
                            messages.getMessage(
                                'error:unexpectedErrorDescription'
                            ),
                            error
                        ),
                        'lwc-dev-mobile',
                        Run.examples
                    )
                );
            });
    }

    private async executeWdioAvailabilityCheck(): Promise<any> {
        CommonUtils.startCliAction(messages.getMessage('checkWdio'));

        return CommonUtils.executeCommandAsync(Run.cmd)
            .then((result) => {
                // Version string observed by running "npx wdio --version" were in the format of
                // "v1.22.34" of "1.22.34". The following regular expression will match both versions.
                const regexValidVersion = /^v?(\d+\.)(\d+\.)(\d+)$/;
                const exists = result.stdout.trim().match(regexValidVersion);
                CommonUtils.stopCliAction();
                if (exists) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(
                        new SfError(
                            messages.getMessage(
                                'error:wdioIsntInstalledDescription'
                            ),
                            'lwc-dev-mobile',
                            Run.examples
                        )
                    );
                }
            })
            .catch((error) => {
                CommonUtils.stopCliAction();
                return Promise.reject(
                    new SfError(
                        util.format(
                            messages.getMessage(
                                'error:unexpectedErrorDescription'
                            ),
                            error
                        ),
                        'lwc-dev-mobile',
                        Run.examples
                    )
                );
            });
    }
}
