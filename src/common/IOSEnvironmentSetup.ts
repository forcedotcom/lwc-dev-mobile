/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
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
            {
                checkFunction: this.isSupportedEnvironment,
                fulfilledMessage: `${messages.getMessage(
                    'ios:reqs:macos:fulfilledMessage'
                )}`,
                logger,
                title: `${messages.getMessage('ios:reqs:macos:title')}`,
                unfulfilledMessage: `${messages.getMessage(
                    'ios:reqs:macos:unfulfilledMessage'
                )}`
            },
            {
                checkFunction: this.isXcodeInstalled,
                fulfilledMessage: `${messages.getMessage(
                    'ios:reqs:xcode:fulfilledMessage'
                )}`,
                logger,
                title: `${messages.getMessage('ios:reqs:xcode:title')}`,
                unfulfilledMessage: `${messages.getMessage(
                    'ios:reqs:xcode:unfulfilledMessage'
                )}`
            },
            {
                checkFunction: this.hasSupportedSimulatorRuntime,
                fulfilledMessage: `${messages.getMessage(
                    'ios:reqs:simulator:fulfilledMessage'
                )}`,
                logger,
                title: `${messages.getMessage('ios:reqs:simulator:title')}`,
                unfulfilledMessage: `${messages.getMessage(
                    'ios:reqs:simulator:unfulfilledMessage'
                )}`
            }
        ];
        super.addRequirements(requirements);
    }

    public async isSupportedEnvironment(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        const unameCommand: string = '/usr/bin/uname';
        try {
            this.logger.info('Executing a check for supported environment');
            const { stdout } = await CommonUtils.executeCommandAsync(
                unameCommand
            );
            const unameOutput = stdout.trim();
            if (unameOutput === 'Darwin') {
                return new Promise<string>((resolve, reject) =>
                    resolve(requirement.fulfilledMessage)
                );
            } else {
                return new Promise<string>((resolve, reject) =>
                    reject(
                        util.format(requirement.unfulfilledMessage, unameOutput)
                    )
                );
            }
        } catch (unameError) {
            return new Promise<string>((resolve, reject) =>
                reject(
                    util.format(
                        requirement.unfulfilledMessage,
                        `command '${unameCommand}' failed: ${unameError}, error code: ${unameError.code}`
                    )
                )
            );
        }
    }

    public async isXcodeInstalled(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        const xcodeBuildCommand: string = 'xcodebuild -version';
        try {
            this.logger.info('Executing a check for Xcode environment');
            const { stdout, stderr } = await CommonUtils.executeCommandAsync(
                xcodeBuildCommand
            );
            if (stdout) {
                const xcodeDetails = `${stdout}`.trim().replace(/\n/gi, ' ');
                return new Promise<string>((resolve, reject) =>
                    resolve(
                        util.format(requirement.fulfilledMessage, xcodeDetails)
                    )
                );
            } else {
                return new Promise<string>((resolve, reject) =>
                    reject(
                        util.format(
                            requirement.unfulfilledMessage,
                            `${stderr || 'None'}`
                        )
                    )
                );
            }
        } catch (xcodeSelectError) {
            return new Promise<string>((resolve, reject) =>
                reject(
                    util.format(
                        requirement.unfulfilledMessage,
                        `${xcodeSelectError}, error code: ${xcodeSelectError.code}`
                    )
                )
            );
        }
    }

    public async hasSupportedSimulatorRuntime(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        try {
            this.logger.info('Executing a check for iOS runtimes');
            const supportedRuntimes = await IOSUtils.getSupportedRuntimes();
            if (supportedRuntimes.length > 0) {
                return Promise.resolve(
                    util.format(requirement.fulfilledMessage, supportedRuntimes)
                );
            } else {
                return Promise.reject(
                    util.format(
                        requirement.unfulfilledMessage,
                        `iOS-${iOSConfig.minSupportedRuntimeIOS}`
                    )
                );
            }
        } catch (supportedRuntimesError) {
            return Promise.reject(
                util.format(
                    requirement.unfulfilledMessage,
                    `iOS-${iOSConfig.minSupportedRuntimeIOS} error:${supportedRuntimesError}`
                )
            );
        }
    }
}

// Test!
// let envSetup = new IOSEnvironmentSetup();
// envSetup.executeSetup();
