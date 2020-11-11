/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const ORIG_ANDROID_HOME = process.env.ANDROID_HOME;
const MOCK_ANDROID_HOME = '/mock-android-home';
process.env.ANDROID_HOME = MOCK_ANDROID_HOME;

import { AndroidPackages } from '../AndroidTypes';
import { AndroidMockData } from './AndroidMockData';

const myCommandBlockMock = jest.fn((): string => {
    return AndroidMockData.mockRawPackagesString;
});

const badBlockMock = jest.fn((): string => {
    return AndroidMockData.badMockRawPackagesString;
});

describe('Android types tests', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.ANDROID_HOME = MOCK_ANDROID_HOME;
    });

    afterEach(() => {
        process.env.ANDROID_HOME = ORIG_ANDROID_HOME;
        jest.restoreAllMocks();
    });

    test('Android Package class should correctly parse a raw string', async () => {
        const packages = AndroidPackages.parseRawPackagesString(
            AndroidMockData.mockRawPackagesString
        );
        expect(
            packages.platforms.length + packages.systemImages.length ===
                AndroidMockData.mockRawStringPackageLength
        ).toBeTrue();
    });

    test('Android Package class should correctly parse a raw string initialize members', async () => {
        const packages = AndroidPackages.parseRawPackagesString(
            AndroidMockData.mockRawPackagesString
        );
        const platformPkg = packages.platforms.find((pkg) =>
            pkg.path.match('android-30')
        );
        const sysImagePkg = packages.systemImages.find((pkg) =>
            pkg.path.match('android-29')
        );

        expect(
            platformPkg &&
                platformPkg.path !== null &&
                platformPkg.description != null &&
                sysImagePkg &&
                sysImagePkg.path !== null &&
                sysImagePkg.description != null
        ).toBeTrue();
    });

    test('Android Package class should return and empty list for a bad string', async () => {
        const packages = AndroidPackages.parseRawPackagesString(
            AndroidMockData.badMockRawPackagesString
        );
        expect(packages.isEmpty()).toBeTrue();
    });
});
