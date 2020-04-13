import childProcess from 'child_process';
import 'jest-extended';
import 'jest-chain';
import { IOSMockData } from './IOSMockData';
import { XcodeUtils } from '../IOSUtils';
import { resolve } from 'dns';

const DEVICE_TYPE_PREFIX = 'com.apple.CoreSimulator.SimDeviceType';
const RUNTIME_TYPE_PREFIX = 'com.apple.CoreSimulator.SimRuntime';

const myCommandRouterBlock = jest.fn(
    (command: string): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
            resolve({
                stdout:
                    command.indexOf('devices') < 0
                        ? JSON.stringify(IOSMockData.mockRuntimes)
                        : JSON.stringify(IOSMockData.mockRuntimeDevices),
                stderr: 'mockError'
            });
        });
    }
);

const badBlockMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
            resolve({ stdout: '{[}', stderr: 'mockError' });
        });
    }
);

const launchCommandMock = jest.fn(
    (command: string): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
            resolve({
                stdout: 'Done',
                stderr: 'mockError'
            });
        });
    }
);
const launchCommandThrowsMock = jest.fn(
    (command: string): Promise<{ stdout: string; stderr: string }> => {
        throw new Error(' Mock Error');
    }
);

const launchCommandThrowsAlreadryBootedMock = jest.fn(
    (command: string): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
            resolve({
                stdout: 'Done',
                stderr: 'The device is cannot boot state: booted'
            });
        });
    }
);

const resolvedBoolPromiseBlock = jest.fn(
    (...args: any[]): Promise<boolean> => {
        return Promise.resolve(true);
    }
);

describe('IOS utils tests', () => {
    beforeEach(() => {
        myCommandRouterBlock.mockClear();
        launchCommandMock.mockClear();
        badBlockMock.mockClear();
        launchCommandThrowsMock.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Should attempt to invoke the xcrun for fetching sim runtimes', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            myCommandRouterBlock
        );
        await XcodeUtils.getSimulatorRuntimes();
        return expect(myCommandRouterBlock).toHaveBeenCalled();
    });

    test('Should attempt to invoke the xcrun for booting a device', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        let udid = 'MOCKUDID';
        await XcodeUtils.bootDevice(udid);
        return expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl boot ${udid}`
        );
    });

    test('Should attempt to invoke the xcrun but fail booting a device', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        let udid = 'MOCKUDID';
        return XcodeUtils.bootDevice(udid).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to create a new device', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        let simName = 'MOCKSIM';
        let deviceType = 'MOCK-DEVICE';
        let runtimeType = 'MOCK-SIM';
        await XcodeUtils.createNewDevice(simName, deviceType, runtimeType);
        return expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl create ${simName} ${DEVICE_TYPE_PREFIX}.${deviceType} ${RUNTIME_TYPE_PREFIX}.${runtimeType}`
        );
    });

    test('Should attempt to invoke xcrun to boot device but resolve if device is already Booted', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsAlreadryBootedMock
        );
        let udid = 'MOCKUDID';
        return XcodeUtils.bootDevice(udid).then((result) =>
            expect(result).toBeTruthy()
        );
    });

    test('Should wait for the device to boot', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        let udid = 'MOCKUDID';
        return XcodeUtils.waitUntilDeviceIsReady(udid).then((result) =>
            expect(result).toBeTruthy()
        );
    });

    test('Should wait for the device to boot and fail if error is encountered', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        let udid = 'MOCKUDID';
        return XcodeUtils.waitUntilDeviceIsReady(udid).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should launch the simulator app', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        let udid = 'MOCKUDID';
        await XcodeUtils.launchSimulatorApp();
        return expect(launchCommandMock).toHaveBeenCalledWith(
            `open -a Simulator`
        );
    });

    test('Should reject if launch of simulator app fails', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        let udid = 'MOCKUDID';
        return XcodeUtils.launchSimulatorApp().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to launch url in a booted simulator and resolve.', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        let url = 'mock.url';
        let udid = 'MOCK-UDID';
        await XcodeUtils.launchURLInBootedSimulator(url, udid);
        return expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl openurl "${url}" ${udid}`
        );
    });

    test('Should attempt to launch url in a booted simulator and reject if error is encountered.', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        let url = 'mock.url';
        let udid = 'MOCK-UDID';
        return XcodeUtils.launchURLInBootedSimulator(url, udid).catch(
            (error) => {
                expect(error).toBeTruthy();
            }
        );
    });

    test('Should attempt to invoke the xcrun for fetching sim runtimes and return an array of values', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            myCommandRouterBlock
        );
        return XcodeUtils.getSimulatorRuntimes().then((returnedValues) => {
            expect(
                returnedValues !== null &&
                    returnedValues.length ==
                        IOSMockData.mockRuntimes.runtimes.length
            ).toBeTruthy();
        });
    });

    test('Should attempt to invoke the xcrun for fetching sim runtimes and return white listed values', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            myCommandRouterBlock
        );
        return XcodeUtils.getSupportedRuntimes().then((returnedValues) => {
            expect(
                returnedValues !== null && returnedValues.length > 0
            ).toBeTruthy();
        });
    });

    test('Should attempt to invoke the xcrun for fetching sim runtimes and return white listed values', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            myCommandRouterBlock
        );
        return XcodeUtils.getSupportedDevicesThatMatch().then(
            (returnedValues) => {
                expect(
                    returnedValues !== null && returnedValues.length > 0
                ).toBeTruthy();
            }
        );
    });

    test('Should handle Bad JSON', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        return XcodeUtils.getSimulatorRuntimes().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Open URL Invocation sequence test', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            myCommandRouterBlock
        );
        const launchSimApp = jest
            .fn()
            .mockImplementation(resolvedBoolPromiseBlock);
        const bootDevice = jest
            .fn()
            .mockImplementation(resolvedBoolPromiseBlock);
        const waitUntilReady = jest
            .fn()
            .mockImplementation(resolvedBoolPromiseBlock);
        const launchURLInSim = jest
            .fn()
            .mockImplementation(resolvedBoolPromiseBlock);

        jest.spyOn(XcodeUtils, 'launchSimulatorApp').mockImplementation(
            launchSimApp
        );
        jest.spyOn(XcodeUtils, 'waitUntilDeviceIsReady').mockImplementation(
            waitUntilReady
        );
        jest.spyOn(XcodeUtils, 'launchURLInBootedSimulator').mockImplementation(
            launchURLInSim
        );
        jest.spyOn(XcodeUtils, 'bootDevice').mockImplementation(bootDevice);

        await XcodeUtils.openUrlInNativeBrowser('MOCK-UDID', 'mock.url');
        expect(launchSimApp).toHaveBeenCalledBefore(bootDevice);
        expect(bootDevice).toHaveBeenCalledBefore(waitUntilReady);
        expect(waitUntilReady).toHaveBeenCalledBefore(launchURLInSim);
    });
});
