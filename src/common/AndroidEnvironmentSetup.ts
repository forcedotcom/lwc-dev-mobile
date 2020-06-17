/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, Messages } from '@salesforce/core';
import util from 'util';
import androidConfig from '../config/androidconfig.json';
import { AndroidSDKUtils } from './AndroidUtils';
import { BaseSetup } from './Requirements';

export class AndroidEnvironmentSetup extends BaseSetup {
    // NOTE: The following properties are just place holders to help with typescript compile.
    private title: string = '';
    private fulfilledMessage: string = '';
    private unfulfilledMessage: string = '';
    private setupMessages = Messages.loadMessages(
        '@salesforce/lwc-dev-mobile',
        'setup'
    );
    constructor(logger: Logger) {
        super(logger);
        const messages = this.setupMessages;
        super.requirements = [
            {
                checkFunction: this.isAndroidHomeSet,
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
    }

    public async isJava8Available(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.androidSDKPrerequisitesCheck()
                .then((result) => {
                    resolve(this.fulfilledMessage);
                })
                .catch((error) => {
                    reject(util.format(this.unfulfilledMessage, error));
                });
        });
    }

    public async isAndroidHomeSet(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (AndroidSDKUtils.isAndroidHomeSet()) {
                resolve(
                    AndroidSDKUtils.convertToUnixPath(
                        util.format(
                            this.fulfilledMessage,
                            AndroidSDKUtils.androidHome
                        )
                    )
                );
            } else {
                reject(this.unfulfilledMessage);
            }
        });
    }

    public async isAndroidSDKToolsInstalled(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.fetchAndroidSDKToolsLocation()
                .then((result) =>
                    resolve(
                        AndroidSDKUtils.convertToUnixPath(
                            util.format(this.fulfilledMessage, result)
                        )
                    )
                )
                .catch((error) =>
                    reject(
                        util.format(
                            this.unfulfilledMessage,
                            androidConfig.supportedRuntimes[0],
                            androidConfig.supportedRuntimes[
                                androidConfig.supportedRuntimes.length - 1
                            ]
                        )
                    )
                );
        });
    }

    public async isAndroidSDKPlatformToolsInstalled(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation()
                .then((result) => {
                    resolve(
                        AndroidSDKUtils.convertToUnixPath(
                            util.format(this.fulfilledMessage, result)
                        )
                    );
                })
                .catch((error) => {
                    reject(
                        util.format(
                            this.unfulfilledMessage,
                            androidConfig.supportedRuntimes[0],
                            androidConfig.supportedRuntimes[
                                androidConfig.supportedRuntimes.length - 1
                            ]
                        )
                    );
                });
        });
    }

    public async hasRequiredPlatformAPIPackage(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.findRequiredAndroidAPIPackage()
                .then((result) =>
                    resolve(
                        util.format(this.fulfilledMessage, result.platformAPI)
                    )
                )
                .catch((error) =>
                    reject(
                        util.format(
                            this.unfulfilledMessage,
                            androidConfig.supportedRuntimes[0],
                            androidConfig.supportedRuntimes[
                                androidConfig.supportedRuntimes.length - 1
                            ]
                        )
                    )
                );
        });
    }

    public async hasRequiredEmulatorImages(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.findRequiredEmulatorImages()
                .then((result) =>
                    resolve(util.format(this.fulfilledMessage, result.path))
                )
                .catch((error) =>
                    reject(
                        util.format(
                            this.unfulfilledMessage,
                            androidConfig.supportedImages.join(',')
                        )
                    )
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
