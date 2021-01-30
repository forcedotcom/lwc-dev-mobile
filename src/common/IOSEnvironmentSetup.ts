/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, Messages } from '@salesforce/core';
import util from 'util';
import iOSConfig from '../config/iosconfig.json';
import { CommonUtils } from './CommonUtils';
import { IOSUtils } from './IOSUtils';
import { BaseSetup, Requirement } from './Requirements';

export class IOSEnvironmentSetup extends BaseSetup {
    constructor(logger: Logger) {
        super(logger);
        const requirements = [
            new SupportedEnvironmentRequirement(
                this.setupMessages,
                this.logger
            ),
            new XcodeInstalledRequirement(this.setupMessages, this.logger),
            new SupportedSimulatorRuntimeRequirement(
                this.setupMessages,
                this.logger
            )
        ];
        super.addRequirements(requirements);
    }
}

// tslint:disable-next-line: max-classes-per-file
export class SupportedEnvironmentRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('ios:reqs:macos:title');
        this.fulfilledMessage = messages.getMessage(
            'ios:reqs:macos:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'ios:reqs:macos:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        this.logger.info('Executing a check for supported environment');
        const unameCommand: string = '/usr/bin/uname';
        return CommonUtils.executeCommandAsync(unameCommand)
            .then((result) => {
                const output = result.stdout.trim();
                if (output === 'Darwin') {
                    return Promise.resolve(this.fulfilledMessage);
                } else {
                    return Promise.reject(
                        util.format(this.unfulfilledMessage, output)
                    );
                }
            })
            .catch((error) => {
                return Promise.reject(
                    util.format(
                        this.unfulfilledMessage,
                        `command '${unameCommand}' failed: ${error}, error code: ${error.code}`
                    )
                );
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
export class XcodeInstalledRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('ios:reqs:xcode:title');
        this.fulfilledMessage = messages.getMessage(
            'ios:reqs:xcode:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'ios:reqs:xcode:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        this.logger.info('Executing a check for Xcode environment');
        const xcodeBuildCommand: string = 'xcodebuild -version';
        return CommonUtils.executeCommandAsync(xcodeBuildCommand)
            .then((result) => {
                if (result.stdout && result.stdout.length > 0) {
                    const xcodeDetails = result.stdout
                        .trim()
                        .replace(/\n/gi, ' ');
                    return Promise.resolve(
                        util.format(this.fulfilledMessage, xcodeDetails)
                    );
                } else {
                    return Promise.reject(
                        util.format(
                            this.unfulfilledMessage,
                            `${result.stderr || 'None'}`
                        )
                    );
                }
            })
            .catch((error) => {
                return Promise.reject(
                    util.format(
                        this.unfulfilledMessage,
                        `${error}, error code: ${error.code}`
                    )
                );
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
export class SupportedSimulatorRuntimeRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('ios:reqs:simulator:title');
        this.fulfilledMessage = messages.getMessage(
            'ios:reqs:simulator:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'ios:reqs:simulator:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        this.logger.info('Executing a check for iOS runtimes');
        return IOSUtils.getSupportedRuntimes()
            .then((supportedRuntimes) => {
                if (supportedRuntimes.length > 0) {
                    return Promise.resolve(
                        util.format(this.fulfilledMessage, supportedRuntimes)
                    );
                } else {
                    return Promise.reject(
                        util.format(
                            this.unfulfilledMessage,
                            `iOS-${iOSConfig.minSupportedRuntimeIOS}`
                        )
                    );
                }
            })
            .catch((error) => {
                return Promise.reject(
                    util.format(
                        this.unfulfilledMessage,
                        `iOS-${iOSConfig.minSupportedRuntimeIOS} error:${error}`
                    )
                );
            });
    }
}
