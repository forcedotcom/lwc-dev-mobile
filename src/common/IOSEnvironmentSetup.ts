/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, Messages } from '@salesforce/core';
import childProcess from 'child_process';
import util from 'util';
import iOSConfig from '../config/iosconfig.json';
import { IOSUtils } from './IOSUtils';
import { BaseSetup } from './Requirements';

const exec = util.promisify(childProcess.exec);

export class IOSEnvironmentSetup extends BaseSetup {
    public static executeCommand(
        command: string
    ): Promise<{ stdout: string; stderr: string }> {
        return IOSUtils.executeCommand(command);
    }

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
        const unameCommand: string = '/usr/bin/uname';
        try {
            this.logger.info('Executing a check for supported environment');
            const { stdout } = await IOSEnvironmentSetup.executeCommand(
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

    public async isXcodeInstalled(): Promise<string> {
        const xcodeSelectCommand: string = '/usr/bin/xcode-select -p';
        try {
            this.logger.info('Executing a check for Xcode environment');
            const { stdout, stderr } = await IOSEnvironmentSetup.executeCommand(
                xcodeSelectCommand
            );
            if (stdout) {
                const developmentLibraryPath = `${stdout}`.trim();
                return new Promise<string>((resolve, reject) =>
                    resolve(
                        util.format(
                            this.fulfilledMessage,
                            developmentLibraryPath
                        )
                    )
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

    public async hasSupportedSimulatorRuntime(): Promise<string> {
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
