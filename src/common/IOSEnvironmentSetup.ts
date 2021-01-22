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
        const messages = this.setupMessages;
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
        const unameCommand: string = '/usr/bin/uname';
        try {
            this.logger.info('Executing a check for supported environment');
            const { stdout } = await CommonUtils.executeCommandAsync(
                unameCommand
            );
            const unameOutput = stdout.trim();
            if (unameOutput === 'Darwin') {
                return new Promise<string>((resolve, reject) =>
                    resolve(this.fulfilledMessage)
                );
            } else {
                return new Promise<string>((resolve, reject) =>
                    reject(util.format(this.unfulfilledMessage, unameOutput))
                );
            }
        } catch (unameError) {
            return new Promise<string>((resolve, reject) =>
                reject(
                    util.format(
                        this.unfulfilledMessage,
                        `command '${unameCommand}' failed: ${unameError}, error code: ${unameError.code}`
                    )
                )
            );
        }
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
        const xcodeBuildCommand: string = 'xcodebuild -version';
        try {
            this.logger.info('Executing a check for Xcode environment');
            const { stdout, stderr } = await CommonUtils.executeCommandAsync(
                xcodeBuildCommand
            );
            if (stdout) {
                const xcodeDetails = `${stdout}`.trim().replace(/\n/gi, ' ');
                return new Promise<string>((resolve, reject) =>
                    resolve(util.format(this.fulfilledMessage, xcodeDetails))
                );
            } else {
                return new Promise<string>((resolve, reject) =>
                    reject(
                        util.format(
                            this.unfulfilledMessage,
                            `${stderr || 'None'}`
                        )
                    )
                );
            }
        } catch (xcodeSelectError) {
            return new Promise<string>((resolve, reject) =>
                reject(
                    util.format(
                        this.unfulfilledMessage,
                        `${xcodeSelectError}, error code: ${xcodeSelectError.code}`
                    )
                )
            );
        }
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
        try {
            this.logger.info('Executing a check for iOS runtimes');
            const supportedRuntimes = await IOSUtils.getSupportedRuntimes();
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
        } catch (supportedRuntimesError) {
            return Promise.reject(
                util.format(
                    this.unfulfilledMessage,
                    `iOS-${iOSConfig.minSupportedRuntimeIOS} error:${supportedRuntimesError}`
                )
            );
        }
    }
}

// Test!
// let envSetup = new IOSEnvironmentSetup();
// envSetup.executeSetup();
