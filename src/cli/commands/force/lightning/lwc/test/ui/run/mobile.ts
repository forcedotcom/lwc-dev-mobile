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
    Requirement,
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
    'test-ui-run-mobile'
);

export class Mobile extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ force:lightning:lwc:test:utam:run -p iOS --config '/path/to/wdio.conf.js' --spec '/path/to/myTest.spec.js'`,
        `$ force:lightning:lwc:test:utam:run -p Android --config '/path/to/wdio.conf.js' --spec '/path/to/myTest.spec.js'`
    ];

    private static createError(stringId: string): SfError {
        return new SfError(
            messages.getMessage(stringId),
            'lwc-dev-mobile',
            Mobile.examples
        );
    }

    public static flagsConfig = {
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.Platform, true),
        config: flags.string({
            description: messages.getMessage('configFlagDescription'),
            required: true
        }),
        spec: flags.string({
            description: messages.getMessage('specFlagDescription'),
            required: true
        })
    };

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const requirements: CommandRequirements = {};
            const isAndrod = CommandLineUtils.platformFlagIsAndroid(
                this.flags.platform
            );
            requirements.setup = isAndrod
                ? new AndroidEnvironmentRequirements(this.logger)
                : new IOSEnvironmentRequirements(this.logger);
            requirements.environment = {
                requirements: [
                    new WdioAvailabilityRequirement(this.logger),
                    new AppiumRequirement(this.logger),
                    new AppiumDriverRequirement(this.logger, isAndrod),
                    new AppiumServiceRequirement(this.logger)
                ],
                enabled: true
            };
            this._requirements = requirements;
        }

        return this._requirements;
    }

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Mobile.examples;
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

        const spec = CommandLineUtils.resolveFlag(this.flags.spec, '');
        if (spec.length === 0) {
            return Promise.reject(
                Mobile.createError('error:invalidSpecFlagDescription')
            );
        }

        const config = CommandLineUtils.resolveFlag(this.flags.config, '');
        if (config.length === 0) {
            return Promise.reject(
                Mobile.createError('error:invalidConfigFlagDescription')
            );
        }

        return RequirementProcessor.execute(this.commandRequirements)
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
                    Mobile.examples
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
                    Mobile.examples
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
                        Mobile.examples
                    )
                );
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
class AppiumServiceRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:appiumService:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:appiumService:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:appiumService:unfulfilledMessage'
    );
    public logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    // Check if Appium service is installed
    public async checkFunction(): Promise<string> {
        const cmd = `npm list @wdio/appium-service -p`;
        return CommonUtils.executeCommandAsync(cmd)
            .then((result) => {
                const returnValue = result.stdout.trim();

                // Running the command 'npm list @wdio/appium-service -p' will yield result:
                // <path>/node_modules/@wdio/appium-service
                // if the package is installed.
                if (
                    returnValue.length > 0 &&
                    returnValue.includes('@wdio/appium-service')
                ) {
                    return Promise.resolve(this.fulfilledMessage);
                } else {
                    return Promise.reject(this.unfulfilledMessage);
                }
            })
            .catch(() => {
                return Promise.reject(this.unfulfilledMessage);
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
class AppiumDriverRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:appiumDriver:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:appiumDriver:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:appiumDriver:unfulfilledMessage'
    );
    public logger: Logger;
    private isAndroid: boolean;

    constructor(logger: Logger, isAndroid: boolean) {
        this.logger = logger;
        this.isAndroid = isAndroid;
    }

    // Check if appropriate Appium driver is installed for the specified platform
    public async checkFunction(): Promise<string> {
        const cmd = `appium driver list --installed`;
        return CommonUtils.executeCommandAsync(cmd)
            .then((result) => {
                // The command to check which appium drivers are installed writes return values
                // to stderr instead of stdout.
                const returnValue = result.stderr;

                // Running the command 'appium driver list --installed' will yield result:
                // ✔ Listing installed drivers
                // - xcuitest@4.16.10 [installed (NPM)]
                // - uiautomator2@2.12.2 [installed (NPM)]
                if (this.isAndroid) {
                    const androidDriver = `uiautomator2`;
                    if (returnValue.includes(androidDriver)) {
                        return Promise.resolve(
                            util.format(this.fulfilledMessage, androidDriver)
                        );
                    } else {
                        return Promise.reject(this.unfulfilledMessage);
                    }
                } else {
                    const iOSDriver = `xcuitest`;
                    if (returnValue.includes(iOSDriver)) {
                        return Promise.resolve(
                            util.format(this.fulfilledMessage, iOSDriver)
                        );
                    } else {
                        return Promise.reject(
                            util.format(this.unfulfilledMessage, iOSDriver)
                        );
                    }
                }
            })
            .catch((error) => {
                return Promise.reject(
                    util.format(this.unfulfilledMessage, error)
                );
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
class AppiumRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:appium:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:appium:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:appium:unfulfilledMessage'
    );
    public logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    // Check if Appium is installed
    public async checkFunction(): Promise<string> {
        const cmd = `appium --version`;
        return CommonUtils.executeCommandAsync(cmd)
            .then((result) => {
                // Version string observed by running "appium --version" was in the format of
                // "2.0.0-beta.53". The following regular expression will match the version 2 and above
                // of appium, including the betas.
                const regexValidVersion = /^2(\.)(\d+\.)(\d+)/;
                const returnValue = result.stdout.trim();
                const exists = result.stdout.trim().match(regexValidVersion);
                if (exists) {
                    return Promise.resolve(
                        util.format(this.fulfilledMessage, returnValue)
                    );
                } else {
                    return Promise.reject(
                        util.format(this.unfulfilledMessage, returnValue)
                    );
                }
            })
            .catch((error) => {
                return Promise.reject(
                    util.format(this.unfulfilledMessage, error)
                );
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
class WdioAvailabilityRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:wdio:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:wdio:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:wdio:unfulfilledMessage'
    );
    public logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    // Check if WDIO is installed
    public async checkFunction(): Promise<string> {
        const cmd = `npx --no-install wdio --version`;
        return CommonUtils.executeCommandAsync(cmd)
            .then((result) => {
                // Version string observed by running "npx wdio --version" were in the format of
                // "v1.22.34" of "1.22.34". The following regular expression will match both versions.
                const regexValidVersion = /^v?(\d+\.)(\d+\.)(\d+)$/;
                const returnValue = result.stdout.trim();
                const exists = result.stdout.trim().match(regexValidVersion);
                if (exists) {
                    return Promise.resolve(
                        util.format(this.fulfilledMessage, returnValue)
                    );
                } else {
                    return Promise.reject(
                        util.format(this.unfulfilledMessage, returnValue)
                    );
                }
            })
            .catch((error) => {
                return Promise.reject(
                    util.format(this.unfulfilledMessage, error)
                );
            });
    }
}
