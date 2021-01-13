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
import { CommonUtils } from './CommonUtils';
import { BaseSetup, Requirement } from './Requirements';

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
                    'android:reqs:cmdlinetools:fulfilledMessage'
                ),
                logger,
                title: messages.getMessage('android:reqs:cmdlinetools:title'),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:cmdlinetools:unfulfilledMessage'
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

    public async isJava8Available(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.androidSDKPrerequisitesCheck()
                .then((result) => {
                    resolve(requirement.fulfilledMessage);
                })
                .catch((error) => {
                    reject(
                        util.format(
                            requirement.unfulfilledMessage,
                            error.message
                        )
                    );
                });
        });
    }

    public async isAndroidSdkRootSet(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        return new Promise<string>((resolve, reject) => {
            const root = AndroidSDKUtils.getAndroidSdkRoot();
            if (root) {
                resolve(
                    AndroidSDKUtils.convertToUnixPath(
                        util.format(
                            requirement.fulfilledMessage,
                            root.rootSource,
                            root.rootLocation
                        )
                    )
                );
            } else {
                reject(requirement.unfulfilledMessage);
            }
        });
    }

    public async isAndroidSDKToolsInstalled(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.fetchAndroidCmdLineToolsLocation()
                .then((result) =>
                    resolve(
                        AndroidSDKUtils.convertToUnixPath(
                            util.format(requirement.fulfilledMessage, result)
                        )
                    )
                )
                .catch((error) => reject(requirement.unfulfilledMessage));
        });
    }

    public async isAndroidSDKPlatformToolsInstalled(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation()
                .then((result) => {
                    resolve(
                        AndroidSDKUtils.convertToUnixPath(
                            util.format(requirement.fulfilledMessage, result)
                        )
                    );
                })
                .catch((error) => {
                    if (error.status === 127) {
                        reject(
                            new Error(
                                'Platform tools not found. Expected at ' +
                                    AndroidSDKUtils.getAndroidPlatformTools() +
                                    '.'
                            )
                        );
                    }
                    reject(
                        util.format(
                            requirement.unfulfilledMessage,
                            androidConfig.minSupportedRuntimeAndroid
                        )
                    );
                });
        });
    }

    public async hasRequiredPlatformAPIPackage(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.findRequiredAndroidAPIPackage()
                .then((result) =>
                    resolve(
                        util.format(
                            requirement.fulfilledMessage,
                            result.platformAPI
                        )
                    )
                )
                .catch((error) =>
                    reject(
                        util.format(
                            requirement.unfulfilledMessage,
                            androidConfig.minSupportedRuntimeAndroid
                        )
                    )
                );
        });
    }

    public async hasRequiredEmulatorImages(): Promise<string> {
        const requirement = CommonUtils.castAsRequirement(this);
        return new Promise<string>((resolve, reject) => {
            AndroidSDKUtils.findRequiredEmulatorImages()
                .then((result) =>
                    resolve(
                        util.format(requirement.fulfilledMessage, result.path)
                    )
                )
                .catch((error) =>
                    reject(
                        util.format(
                            requirement.unfulfilledMessage,
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
