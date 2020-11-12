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
import { AndroidEnvironmentSetup } from '../AndroidEnvironmentSetup';
import { AndroidSDKUtils } from '../AndroidUtils';
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
    let andrEnvironment: AndroidEnvironmentSetup;

    beforeEach(() => {
        andrEnvironment = new AndroidEnvironmentSetup(logger);
    });

    afterEach(() => {
        myCommandBlockMock.mockClear();
        badBlockMock.mockClear();
    });

    test('Should resolve when ANDROID_HOME is set', async () => {
        jest.spyOn(AndroidSDKUtils, 'isAndroidSdkRootSet').mockImplementation(
            () => true
        );
        const aPromise = andrEnvironment
            .isAndroidSdkRootSet()
            .catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when ANDROID_HOME is not set', async () => {
        jest.spyOn(AndroidSDKUtils, 'isAndroidSdkRootSet').mockImplementation(
            () => false
        );
        const aPromise = andrEnvironment
            .isAndroidSdkRootSet()
            .catch(() => undefined);
        expect(aPromise).rejects;
    });

    test('Should resolve when Android sdk tools are present', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            () => MOCK_ANDROID_HOME
        );
        const aPromise = andrEnvironment
            .isAndroidSDKToolsInstalled()
            .catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when Android sdk tools are missing', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(() => {
            throw new Error('None');
        });
        const aPromise = andrEnvironment
            .isAndroidSDKToolsInstalled()
            .catch(() => undefined);
        expect(aPromise).rejects;
    });

    test('Should resolve when Android sdk platform tools are present', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            () => MOCK_ANDROID_HOME
        );
        const aPromise = andrEnvironment
            .isAndroidSDKPlatformToolsInstalled()
            .catch(() => undefined);
        expect(aPromise).resolves;
    });

    test('Should reject when Android sdk platform tools are missing', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(() => {
            throw new Error('None');
        });
        const aPromise = andrEnvironment
            .isAndroidSDKPlatformToolsInstalled()
            .catch(() => undefined);
        expect(aPromise).rejects;
    });
});
