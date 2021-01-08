/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import util from 'util';
import androidConfig from '../config/androidconfig.json';
import { AndroidSDKUtils } from './AndroidUtils';
import { BaseSetup, TestResultMessage } from './Requirements';

export class AndroidEnvironmentSetup extends BaseSetup {
    constructor(logger: Logger) {
        super(logger);
        const messages = this.setupMessages;
        const requirements = [
            {
                checkFunction: this.isAndroidSdkRootSet,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:androidhome:fulfilledMessage'
                ),
                logger,
                title: messages.getMessage('android:reqs:androidhome:title'),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:androidhome:unfulfilledMessage'
                )
            },
            {
                checkFunction: this.isJava8Available,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:androidsdkprerequisitescheck:fulfilledMessage'
                ),
                logger,
                title: messages.getMessage(
                    'android:reqs:androidsdkprerequisitescheck:title'
                ),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:androidsdkprerequisitescheck:unfulfilledMessage'
                )
            },
            {
                checkFunction: this.isAndroidSDKToolsInstalled,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:sdktools:fulfilledMessage'
                ),
                logger,
                title: messages.getMessage('android:reqs:sdktools:title'),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:sdktools:unfulfilledMessage'
                )
            },
            {
                checkFunction: this.isAndroidSDKPlatformToolsInstalled,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:platformtools:fulfilledMessage'
                ),
                logger,
                title: messages.getMessage('android:reqs:platformtools:title'),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:platformtools:unfulfilledMessage'
                )
            },
            {
                checkFunction: this.hasRequiredPlatformAPIPackage,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:platformapi:fulfilledMessage'
                ),
                logger,
                title: messages.getMessage('android:reqs:platformapi:title'),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:platformapi:unfulfilledMessage'
                )
            },
            {
                checkFunction: this.hasRequiredEmulatorImages,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:emulatorimages:fulfilledMessage'
                ),
                logger,
                title: messages.getMessage('android:reqs:emulatorimages:title'),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:emulatorimages:unfulfilledMessage'
                )
            }
        ];
        super.addRequirements(requirements);
    }

    public async isJava8Available(): Promise<TestResultMessage> {
        return new Promise<TestResultMessage>((resolve, reject) => {
            AndroidSDKUtils.androidSDKPrerequisitesCheck()
                .then((result) => {
                    resolve({ main: this.fulfilledMessage });
                })
                .catch((error) => {
                    reject({
                        main: util.format(
                            this.unfulfilledMessage,
                            error.message
                        )
                    });
                });
        });
    }

    public async isAndroidSdkRootSet(): Promise<TestResultMessage> {
        return new Promise<TestResultMessage>((resolve, reject) => {
            const root = AndroidSDKUtils.getAndroidSdkRoot();
            if (root) {
                resolve({
                    main: AndroidSDKUtils.convertToUnixPath(
                        util.format(
                            this.fulfilledMessage,
                            root.rootSource,
                            root.rootLocation
                        )
                    )
                });
            } else {
                reject({ main: this.unfulfilledMessage });
            }
        });
    }

    public async isAndroidSDKToolsInstalled(): Promise<TestResultMessage> {
        return new Promise<TestResultMessage>((resolve, reject) => {
            AndroidSDKUtils.fetchAndroidSDKToolsLocation()
                .then((result) =>
                    resolve({
                        main: AndroidSDKUtils.convertToUnixPath(
                            util.format(this.fulfilledMessage, result)
                        )
                    })
                )
                .catch((error) =>
                    reject({
                        main: util.format(
                            this.unfulfilledMessage,
                            androidConfig.minSupportedRuntimeAndroid
                        )
                    })
                );
        });
    }

    public async isAndroidSDKPlatformToolsInstalled(): Promise<
        TestResultMessage
    > {
        return new Promise<TestResultMessage>((resolve, reject) => {
            AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation()
                .then((result) => {
                    resolve({
                        main: AndroidSDKUtils.convertToUnixPath(
                            util.format(this.fulfilledMessage, result)
                        )
                    });
                })
                .catch((error) => {
                    if (error.status === 127) {
                        reject({
                            main: new Error(
                                'Platform tools not found. Expected at ' +
                                    AndroidSDKUtils.getAndroidPlatformTools() +
                                    '.'
                            )
                        });
                    }
                    reject({
                        main: util.format(
                            this.unfulfilledMessage,
                            androidConfig.minSupportedRuntimeAndroid
                        )
                    });
                });
        });
    }

    public async hasRequiredPlatformAPIPackage(): Promise<TestResultMessage> {
        return new Promise<TestResultMessage>((resolve, reject) => {
            AndroidSDKUtils.findRequiredAndroidAPIPackage()
                .then((result) =>
                    resolve({
                        main: util.format(
                            this.fulfilledMessage,
                            result.platformAPI
                        )
                    })
                )
                .catch((error) =>
                    reject({
                        main: util.format(
                            this.unfulfilledMessage,
                            androidConfig.minSupportedRuntimeAndroid
                        )
                    })
                );
        });
    }

    public async hasRequiredEmulatorImages(): Promise<TestResultMessage> {
        return new Promise<TestResultMessage>((resolve, reject) => {
            AndroidSDKUtils.findRequiredEmulatorImages()
                .then((result) =>
                    resolve({
                        main: util.format(this.fulfilledMessage, result.path)
                    })
                )
                .catch((error) =>
                    reject({
                        main: util.format(
                            this.unfulfilledMessage,
                            androidConfig.supportedImages.join(',')
                        )
                    })
                );
        });
    }
}

// test!
// Messages.importMessagesDirectory(__dirname);
// let envSetup = new AndroidEnvironmentSetup(new Logger('test'));
// envSetup.executeSetup().then( (result) => {
//     console.log(result)
// }).catch( error => {
//     console.log(error)
// });
