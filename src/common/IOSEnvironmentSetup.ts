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
import { BaseSetup, TestResultMessage } from './Requirements';

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

    public async isSupportedEnvironment(): Promise<TestResultMessage> {
        const unameCommand: string = '/usr/bin/uname';
        try {
            this.logger.info('Executing a check for supported environment');
            const { stdout } = await IOSEnvironmentSetup.executeCommand(
                unameCommand
            );
            const unameOutput = stdout.trim();
            if (unameOutput === 'Darwin') {
                return new Promise<TestResultMessage>((resolve, reject) =>
                    resolve({ main: this.fulfilledMessage })
                );
            } else {
                return new Promise<TestResultMessage>((resolve, reject) =>
                    reject({
                        main: util.format(this.unfulfilledMessage, unameOutput)
                    })
                );
            }
        } catch (unameError) {
            return new Promise<TestResultMessage>((resolve, reject) =>
                reject({
                    main: util.format(
                        this.unfulfilledMessage,
                        `command '${unameCommand}' failed: ${unameError}, error code: ${unameError.code}`
                    )
                })
            );
        }
    }

    public async isXcodeInstalled(): Promise<TestResultMessage> {
        const xcodeBuildCommand: string = 'xcodebuild -version';
        try {
            this.logger.info('Executing a check for Xcode environment');
            const { stdout, stderr } = await IOSEnvironmentSetup.executeCommand(
                xcodeBuildCommand
            );
            if (stdout) {
                const xcodeDetails = `${stdout}`.trim().replace(/\n/gi, ' ');
                return new Promise<TestResultMessage>((resolve, reject) =>
                    resolve({
                        main: util.format(this.fulfilledMessage, xcodeDetails)
                    })
                );
            } else {
                return new Promise<TestResultMessage>((resolve, reject) =>
                    reject({
                        main: util.format(
                            this.unfulfilledMessage,
                            `${stderr || 'None'}`
                        )
                    })
                );
            }
        } catch (xcodeSelectError) {
            return new Promise<TestResultMessage>((resolve, reject) =>
                reject({
                    main: util.format(
                        this.unfulfilledMessage,
                        `${xcodeSelectError}, error code: ${xcodeSelectError.code}`
                    )
                })
            );
        }
    }

    public async hasSupportedSimulatorRuntime(): Promise<TestResultMessage> {
        try {
            this.logger.info('Executing a check for iOS runtimes');
            const supportedRuntimes = await IOSUtils.getSupportedRuntimes();
            if (supportedRuntimes.length > 0) {
                return Promise.resolve({
                    main: util.format(this.fulfilledMessage, supportedRuntimes)
                });
            } else {
                return Promise.reject({
                    main: util.format(
                        this.unfulfilledMessage,
                        `iOS-${iOSConfig.minSupportedRuntimeIOS}`
                    )
                });
            }
        } catch (supportedRuntimesError) {
            return Promise.reject({
                main: util.format(
                    this.unfulfilledMessage,
                    `iOS-${iOSConfig.minSupportedRuntimeIOS} error:${supportedRuntimesError}`
                )
            });
        }
    }
}

// Test!
// let envSetup = new IOSEnvironmentSetup();
// envSetup.executeSetup();
