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
import { BaseSetup, Requirement } from './Requirements';

export class AndroidEnvironmentSetup extends BaseSetup {
    constructor(logger: Logger) {
        super(logger);
        const requirements = [
            new AndroidSDKRootSetRequirement(this.setupMessages, this.logger),
            new Java8AvailableRequirement(this.setupMessages, this.logger),
            new AndroidSDKToolsInstalledRequirement(
                this.setupMessages,
                this.logger
            ),
            new AndroidSDKPlatformToolsInstalledRequirement(
                this.setupMessages,
                this.logger
            ),
            new PlatformAPIPackageRequirement(this.setupMessages, this.logger),
            new EmulatorImagesRequirement(this.setupMessages, this.logger)
        ];
        super.addRequirements(requirements);
    }
}

// tslint:disable-next-line: max-classes-per-file
export class AndroidSDKRootSetRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('android:reqs:androidhome:title');
        this.fulfilledMessage = messages.getMessage(
            'android:reqs:androidhome:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'android:reqs:androidhome:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const root = AndroidSDKUtils.getAndroidSdkRoot();
            if (root) {
                resolve(
                    AndroidSDKUtils.convertToUnixPath(
                        util.format(
                            this.fulfilledMessage,
                            root.rootSource,
                            root.rootLocation
                        )
                    )
                );
            } else {
                reject(this.unfulfilledMessage);
            }
        });
    }
}

// tslint:disable-next-line: max-classes-per-file
export class Java8AvailableRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage(
            'android:reqs:androidsdkprerequisitescheck:title'
        );
        this.fulfilledMessage = messages.getMessage(
            'android:reqs:androidsdkprerequisitescheck:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'android:reqs:androidsdkprerequisitescheck:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return AndroidSDKUtils.androidSDKPrerequisitesCheck()
            .then((result) => Promise.resolve(this.fulfilledMessage))
            .catch((error) =>
                Promise.reject(
                    util.format(this.unfulfilledMessage, error.message)
                )
            );
    }
}

// tslint:disable-next-line: max-classes-per-file
export class AndroidSDKToolsInstalledRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('android:reqs:cmdlinetools:title');
        this.fulfilledMessage = messages.getMessage(
            'android:reqs:cmdlinetools:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'android:reqs:cmdlinetools:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return AndroidSDKUtils.fetchAndroidCmdLineToolsLocation()
            .then((result) =>
                Promise.resolve(
                    AndroidSDKUtils.convertToUnixPath(
                        util.format(this.fulfilledMessage, result)
                    )
                )
            )
            .catch((error) => Promise.reject(this.unfulfilledMessage));
    }
}

// tslint:disable-next-line: max-classes-per-file
export class AndroidSDKPlatformToolsInstalledRequirement
    implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('android:reqs:platformtools:title');
        this.fulfilledMessage = messages.getMessage(
            'android:reqs:platformtools:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'android:reqs:platformtools:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation()
            .then((result) =>
                Promise.resolve(
                    AndroidSDKUtils.convertToUnixPath(
                        util.format(this.fulfilledMessage, result)
                    )
                )
            )
            .catch((error) => {
                if (error.status === 127) {
                    return Promise.reject(
                        new Error(
                            'Platform tools not found. Expected at ' +
                                AndroidSDKUtils.getAndroidPlatformTools() +
                                '.'
                        )
                    );
                } else {
                    return Promise.reject(
                        util.format(
                            this.unfulfilledMessage,
                            androidConfig.minSupportedRuntimeAndroid
                        )
                    );
                }
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
export class PlatformAPIPackageRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('android:reqs:platformapi:title');
        this.fulfilledMessage = messages.getMessage(
            'android:reqs:platformapi:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'android:reqs:platformapi:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return AndroidSDKUtils.findRequiredAndroidAPIPackage()
            .then((result) =>
                Promise.resolve(
                    util.format(this.fulfilledMessage, result.platformAPI)
                )
            )
            .catch((error) =>
                Promise.reject(
                    util.format(
                        this.unfulfilledMessage,
                        androidConfig.minSupportedRuntimeAndroid
                    )
                )
            );
    }
}

// tslint:disable-next-line: max-classes-per-file
export class EmulatorImagesRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('android:reqs:emulatorimages:title');
        this.fulfilledMessage = messages.getMessage(
            'android:reqs:emulatorimages:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'android:reqs:emulatorimages:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return AndroidSDKUtils.findRequiredEmulatorImages()
            .then((result) =>
                Promise.resolve(util.format(this.fulfilledMessage, result.path))
            )
            .catch((error) =>
                Promise.reject(
                    util.format(
                        this.unfulfilledMessage,
                        androidConfig.supportedImages.join(',')
                    )
                )
            );
    }
}
