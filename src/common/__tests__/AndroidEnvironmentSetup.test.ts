/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const ORIG_ANDROID_HOME = process.env.ANDROID_HOME;
// tslint:disable: no-unused-expression
const MOCK_ANDROID_HOME = '/mock-android-home';
process.env.ANDROID_HOME = MOCK_ANDROID_HOME;

import { Logger, Messages } from '@salesforce/core';
import {
    AndroidEnvironmentSetup,
    AndroidSDKPlatformToolsInstalledRequirement,
    AndroidSDKRootSetRequirement,
    AndroidSDKToolsInstalledRequirement,
    EmulatorImagesRequirement,
    Java8AvailableRequirement,
    PlatformAPIPackageRequirement
} from '../AndroidEnvironmentSetup';
import { AndroidPackage } from '../AndroidTypes';
import { AndroidSDKRootSource, AndroidSDKUtils } from '../AndroidUtils';
import { CommonUtils } from '../CommonUtils';
import { Version } from '../Common';
import { AndroidMockData } from './AndroidMockData';

const myCommandBlockMock = jest.fn((): string => {
    return AndroidMockData.mockRawPackagesString;
});

const badBlockMock = jest.fn((): string => {
    return AndroidMockData.badMockRawPackagesString;
});

Messages.importMessagesDirectory(__dirname);
const logger = new Logger('test');

describe('Android enviroment setup tests', () => {
    let androidEnvironment: AndroidEnvironmentSetup;

    beforeEach(() => {
        androidEnvironment = new AndroidEnvironmentSetup(logger);
    });

    afterEach(() => {
        myCommandBlockMock.mockClear();
        badBlockMock.mockClear();
    });

    test('Should resolve when Android SDK root is set', async () => {
        jest.spyOn(AndroidSDKUtils, 'getAndroidSdkRoot').mockImplementation(
            () => {
                return {
                    rootLocation: '/mock-android-home',
                    rootSource: AndroidSDKRootSource.androidHome
                };
            }
        );
        const requirement = new AndroidSDKRootSetRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when Android SDK root is not set', async () => {
        jest.spyOn(AndroidSDKUtils, 'getAndroidSdkRoot').mockImplementation(
            () => undefined
        );
        const requirement = new AndroidSDKRootSetRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).rejects;
    });

    test('Should resolve when Android sdk tools are present', async () => {
        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(
            () => MOCK_ANDROID_HOME
        );
        const requirement = new AndroidSDKToolsInstalledRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when Android sdk tools are missing', async () => {
        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(() => {
            throw new Error('None');
        });
        const requirement = new AndroidSDKToolsInstalledRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).rejects;
    });

    test('Should resolve when Android sdk platform tools are present', async () => {
        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(
            () => MOCK_ANDROID_HOME
        );
        const requirement = new AndroidSDKPlatformToolsInstalledRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when Android sdk platform tools are missing', async () => {
        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(() => {
            throw new Error('None');
        });
        const requirement = new AndroidSDKPlatformToolsInstalledRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).rejects;
    });

    test('Should resolve when Java 8 is available', async () => {
        jest.spyOn(
            AndroidSDKUtils,
            'androidSDKPrerequisitesCheck'
        ).mockImplementation(() => Promise.resolve(''));
        const requirement = new Java8AvailableRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when Java 8 is not available', async () => {
        jest.spyOn(
            AndroidSDKUtils,
            'androidSDKPrerequisitesCheck'
        ).mockImplementation(() => Promise.reject(''));
        const requirement = new Java8AvailableRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).rejects;
    });

    test('Should resolve when required platform API packages are present', async () => {
        jest.spyOn(
            AndroidSDKUtils,
            'findRequiredAndroidAPIPackage'
        ).mockImplementation(() =>
            Promise.resolve(
                new AndroidPackage('', new Version(0, 0, 0), '', '')
            )
        );
        const requirement = new PlatformAPIPackageRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when required platform API packages are not present', async () => {
        jest.spyOn(
            AndroidSDKUtils,
            'findRequiredAndroidAPIPackage'
        ).mockImplementation(() => Promise.reject(''));
        const requirement = new PlatformAPIPackageRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).rejects;
    });

    test('Should resolve when required emulator images are available', async () => {
        jest.spyOn(
            AndroidSDKUtils,
            'findRequiredEmulatorImages'
        ).mockImplementation(() =>
            Promise.resolve(
                new AndroidPackage('', new Version(0, 0, 0), '', '')
            )
        );
        const requirement = new EmulatorImagesRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when Java 8 is not available', async () => {
        jest.spyOn(
            AndroidSDKUtils,
            'findRequiredEmulatorImages'
        ).mockImplementation(() => Promise.reject(''));
        const requirement = new EmulatorImagesRequirement(
            androidEnvironment.setupMessages,
            logger
        );
        const aPromise = requirement.checkFunction().catch(() => undefined);
        expect(aPromise).rejects;
    });
});
