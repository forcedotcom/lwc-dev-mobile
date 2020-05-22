/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const ORIG_ANDROID_HOME = process.env.ANDROID_HOME;
const MOCK_ANDROID_HOME = '/mock-android-home';
process.env.ANDROID_HOME = MOCK_ANDROID_HOME;

import { AndroidPackage } from '../AndroidTypes';
import { AndroidMockData } from './AndroidMockData';
import { AndroidSDKUtils } from '../AndroidUtils';

let myCommandBlockMock = jest.fn((): string => {
    return AndroidMockData.mockRawPacakgesString;
});

let badBlockMock = jest.fn((): string => {
    return AndroidMockData.badMockRawPacakagesString;
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
        let packages = AndroidPackage.parseRawPackagesString(
            AndroidMockData.mockRawPacakgesString
        );
        expect(
            packages !== null &&
                packages.size == AndroidMockData.mockRawStringPackageLength
        );
    });

    test('Android Package class should correctly parse a raw string initialize members', async () => {
        let packages: Map<
            string,
            AndroidPackage
        > = AndroidPackage.parseRawPackagesString(
            AndroidMockData.mockRawPacakgesString
        );
        let pack: AndroidPackage | undefined = packages.get(
            'build-tools;28.0.3'
        );
        expect(
            packages.size == AndroidMockData.mockRawStringPackageLength &&
                pack &&
                pack.path !== null &&
                pack.description !== null
        );
    });

    test('Android Package class should return and empty list for  a bad string', async () => {
        let packages = AndroidPackage.parseRawPackagesString(
            AndroidMockData.badMockRawPacakagesString
        );
        expect(packages !== null && packages.size == 0);
    });
});
