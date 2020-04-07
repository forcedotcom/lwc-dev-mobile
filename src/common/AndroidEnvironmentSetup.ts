import { Logger, Messages } from '@salesforce/core';
import * as nodeUtil from 'util';
import * as androidConfig from '../config/androidconfig.json';
import { AndroidSDKUtils } from './AndroidUtils';
import * as reqs from './Requirements';

export class AndroidEnvironmentSetup extends reqs.BaseSetup {
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
                title: messages.getMessage('android:reqs:androidhome:title'),
                checkFunction: this.isAndroidHomeSet,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:androidhome:fulfilledMessage'
                ),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:androidhome:unfulfilledMessage'
                ),
                logger
            },
            {
                title: messages.getMessage('android:reqs:sdktools:title'),
                checkFunction: this.isAndroidSDKToolsInstalled,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:sdktools:fulfilledMessage'
                ),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:sdktools:unfulfilledMessage'
                ),
                logger
            },
            {
                title: messages.getMessage('android:reqs:platformtools:title'),
                checkFunction: this.isAndroidSDKPlatformToolsInstalled,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:platformtools:fulfilledMessage'
                ),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:platformtools:unfulfilledMessage'
                ),
                logger
            },
            {
                title: messages.getMessage('android:reqs:platformapi:title'),
                checkFunction: this.hasRequiredPlatformAPIPackage,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:platformapi:fulfilledMessage'
                ),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:platformapi:unfulfilledMessage'
                ),
                logger
            },
            {
                title: messages.getMessage('android:reqs:emulatorimages:title'),
                checkFunction: this.hasRequiredEmulatorImages,
                fulfilledMessage: messages.getMessage(
                    'android:reqs:emulatorimages:fulfilledMessage'
                ),
                unfulfilledMessage: messages.getMessage(
                    'android:reqs:emulatorimages:unfulfilledMessage'
                ),
                logger
            }
        ];
    }

    public async isAndroidHomeSet(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (AndroidSDKUtils.isAndroidHomeSet()) {
                resolve(
                    nodeUtil.format(
                        this.fulfilledMessage,
                        AndroidSDKUtils.androidHome
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
                    resolve(nodeUtil.format(this.fulfilledMessage, result))
                )
                .catch((error) =>
                    reject(
                        nodeUtil.format(
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
                    resolve(nodeUtil.format(this.fulfilledMessage, result));
                })
                .catch((error) => {
                    reject(
                        nodeUtil.format(
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
                        nodeUtil.format(
                            this.fulfilledMessage,
                            result.platformAPI
                        )
                    )
                )
                .catch((error) =>
                    reject(
                        nodeUtil.format(
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
                    resolve(nodeUtil.format(this.fulfilledMessage, result.path))
                )
                .catch((error) =>
                    reject(
                        nodeUtil.format(
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
