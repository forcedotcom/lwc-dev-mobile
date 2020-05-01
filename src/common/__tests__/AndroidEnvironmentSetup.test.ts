const ORIG_ANDROID_HOME = process.env.ANDROID_HOME;
const MOCK_ANDROID_HOME = '/mock-android-home';
process.env.ANDROID_HOME = MOCK_ANDROID_HOME;

import { AndroidPackage } from '../AndroidTypes';
import { AndroidMockData } from './AndroidMockData';
import { AndroidSDKUtils } from '../AndroidUtils';
import { AndroidEnvironmentSetup } from '../AndroidEnvironmentSetup';
import { Messages, Logger } from '@salesforce/core';

let myCommandBlockMock = jest.fn((): string => {
    return AndroidMockData.mockRawPacakgesString;
});

let badBlockMock = jest.fn((): string => {
    return AndroidMockData.badMockRawPacakagesString;
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
        jest.spyOn(AndroidSDKUtils, 'isAndroidHomeSet').mockImplementation(
            () => true
        );
        let aPromise = andrEnvironment.isAndroidHomeSet().catch((error) => {});
        expect(aPromise).resolves;
    });

    test('Should reject when ANDROID_HOME is not set', async () => {
        jest.spyOn(AndroidSDKUtils, 'isAndroidHomeSet').mockImplementation(
            () => false
        );
        let aPromise = andrEnvironment.isAndroidHomeSet().catch((error) => {});
        expect(aPromise).rejects;
    });

    test('Should resolve when Android sdk tools are present', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            () => MOCK_ANDROID_HOME
        );
        let aPromise = andrEnvironment
            .isAndroidSDKToolsInstalled()
            .catch((error) => {});
        expect(aPromise).resolves;
    });

    test('Should reject when Android sdk tools are missing', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(() => {
            throw new Error('None');
        });
        let aPromise = andrEnvironment
            .isAndroidSDKToolsInstalled()
            .catch((error) => {});
        expect(aPromise).rejects;
    });

    test('Should resolve when Android sdk platform tools are present', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            () => MOCK_ANDROID_HOME
        );
        let aPromise = andrEnvironment
            .isAndroidSDKPlatformToolsInstalled()
            .catch((error) => {});
        expect(aPromise).resolves;
    });

    test('Should reject when Android sdk platform tools are missing', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(() => {
            throw new Error('None');
        });
        let aPromise = andrEnvironment
            .isAndroidSDKPlatformToolsInstalled()
            .catch((error) => {});
        expect(aPromise).rejects;
    });
});
