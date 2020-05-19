const ORIG_ANDROID_HOME = process.env.ANDROID_HOME;
const MOCK_ANDROID_HOME = '/mock-android-home';
process.env.ANDROID_HOME = MOCK_ANDROID_HOME;

import { AndroidSDKUtils } from '../AndroidUtils';
import { AndroidMockData } from './AndroidMockData';

const myGenericVersionsCommandBlockMock = jest.fn((): string => {
    return 'mock version 1.0';
});

const myGenericVersionsCommandBlockMockThrows = jest.fn((): string => {
    throw new Error('Command not found!');
});

const myCommandBlockMock = jest.fn((): string => {
    return AndroidMockData.mockRawPacakgesString;
});

const badBlockMock = jest.fn((): string => {
    return AndroidMockData.badMockRawPacakagesString;
});

describe('Android utils', () => {
    beforeEach(() => {
        myCommandBlockMock.mockClear();
        badBlockMock.mockClear();
        AndroidSDKUtils.clearCaches();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('Should attempt to look for java 8 (using sdkmanager)', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMock
        );
        await AndroidSDKUtils.isJava8Installed();
        expect(myGenericVersionsCommandBlockMock).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/tools/bin/sdkmanager --version',
            true
        );
    });

    test('Should attempt to look for android sdk tools (sdkmanager)', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMock
        );
        await AndroidSDKUtils.fetchAndroidSDKToolsLocation();
        expect(myGenericVersionsCommandBlockMock).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/tools/bin/sdkmanager --version',
            false
        );
    });

    test('Should attempt to look for android sdk tools (sdkmanager)', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMockThrows
        );
        AndroidSDKUtils.fetchAndroidSDKToolsLocation().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to look for android sdk platform tools', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMock
        );
        await AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation();
        expect(myGenericVersionsCommandBlockMock).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/platform-tools/adb --version'
        );
    });

    test('Should attempt to look for android sdk platform tools', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMockThrows
        );
        AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation().catch(
            (error) => {
                expect(error).toBeTruthy();
            }
        );
    });

    test('Should attempt to invoke the sdkmanager for installed packages', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/tools/bin/sdkmanager --list'
        );
    });

    test('Should attempt to invoke the sdkmanager and get installed packages', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(packages.size == AndroidMockData.mockRawStringPackageLength);
    });

    test('Should attempt to invoke the sdkmanager and retrieve an empty list for a bad sdkmanager list', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        const packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(packages.size != 0);
    });

    test('Should have no cache before first list packages call', async () => {
        expect(AndroidSDKUtils.isCached()).toBeFalsy();
    });

    test('Should establish cache on first call', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(AndroidSDKUtils.isCached()).toBeTruthy();
    });

    test('Should utilize cache for subsequent calls', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        let packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledTimes(1);
    });

    test('Should rebuild cache after clear in subsequent calls', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        let packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        AndroidSDKUtils.clearCaches();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledTimes(2);
    });

    test('Should rebuild cache after clear in subsequent calls', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        let packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        AndroidSDKUtils.clearCaches();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledTimes(2);
    });

    test('Should Find a preferred Android package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const apiPackage = await AndroidSDKUtils.findRequiredAndroidAPIPackage();
        expect(apiPackage !== null && apiPackage.description !== null);
    });

    test('Should not find a preferred Android package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        AndroidSDKUtils.findRequiredAndroidAPIPackage().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should Find a preferred Android build tools package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const apiPackage = await AndroidSDKUtils.findRequiredBuildToolsPackage();
        expect(apiPackage !== null && apiPackage.description !== null);
    });

    test('Should not find a preferred Android build tools package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        AndroidSDKUtils.findRequiredBuildToolsPackage().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should Find a preferred Android emulator package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const apiPackage = await AndroidSDKUtils.findRequiredEmulatorImages();
        expect(apiPackage !== null && apiPackage.description !== null);
    });

    test('Should not find a preferred Android build tools package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        AndroidSDKUtils.findRequiredEmulatorImages().catch((error) => {
            expect(error).toBeTruthy();
        });
    });
});
