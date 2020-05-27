import { ActionBase } from 'cli-ux';
import 'jest-chain';
import 'jest-extended';
import { XcodeUtils } from '../IOSUtils';
import { IOSMockData } from './IOSMockData';

const DEVICE_TYPE_PREFIX = 'com.apple.CoreSimulator.SimDeviceType';
const RUNTIME_TYPE_PREFIX = 'com.apple.CoreSimulator.SimRuntime';

const myCommandRouterBlock = jest.fn(
    (command: string): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve) => {
            resolve({
                stderr: 'mockError',
                stdout:
                    command.indexOf('devicetypes') < 0
                        ? JSON.stringify(IOSMockData.mockRuntimes)
                        : JSON.stringify(IOSMockData.mockRuntimeDeviceTypes)
            });
        });
    }
);

const badBlockMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve) => {
            resolve({ stdout: '{[}', stderr: 'mockError' });
        });
    }
);

const launchCommandMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve) => {
            resolve({
                stderr: 'mockError',
                stdout: 'Done'
            });
        });
    }
);
const launchCommandThrowsMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        throw new Error(' Mock Error');
    }
);

const launchCommandThrowsAlreadryBootedMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve) => {
            resolve({
                stderr: 'The device is cannot boot state: booted',
                stdout: 'Done'
            });
        });
    }
);

const resolvedBoolPromiseBlock = jest.fn(
    (): Promise<boolean> => {
        return Promise.resolve(true);
    }
);

// tslint:disable-next-line: class-name
class mockSpinner extends ActionBase {
    // tslint:disable-next-line: no-empty
    public start(): void {}
}

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
        expect(myCommandRouterBlock).toHaveBeenCalled();
    });

    test('Should attempt to invoke the xcrun for booting a device', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        const udid = 'MOCKUDID';
        await XcodeUtils.bootDevice(udid);
        expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl boot ${udid}`
        );
    });

    test('Should attempt to invoke the xcrun but fail booting a device', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        const udid = 'MOCKUDID';
        return XcodeUtils.bootDevice(udid).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to create a new device', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        const simName = 'MOCKSIM';
        const deviceType = 'MOCK-DEVICE';
        const runtimeType = 'MOCK-SIM';
        await XcodeUtils.createNewDevice(simName, deviceType, runtimeType);
        expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl create ${simName} ${DEVICE_TYPE_PREFIX}.${deviceType} ${RUNTIME_TYPE_PREFIX}.${runtimeType}`
        );
    });

    test('Should attempt to invoke xcrun to boot device but resolve if device is already Booted', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsAlreadryBootedMock
        );
        const udid = 'MOCKUDID';
        return XcodeUtils.bootDevice(udid).then((result) =>
            expect(result).toBeTruthy()
        );
    });

    test('Should wait for the device to boot', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        const udid = 'MOCKUDID';
        return XcodeUtils.waitUntilDeviceIsReady(udid).then((result) =>
            expect(result).toBeTruthy()
        );
    });

    test('Should wait for the device to boot and fail if error is encountered', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        const udid = 'MOCKUDID';
        return XcodeUtils.waitUntilDeviceIsReady(udid).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should launch the simulator app', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        await XcodeUtils.launchSimulatorApp();
        expect(launchCommandMock).toHaveBeenCalledWith(`open -a Simulator`);
    });

    test('Should reject if launch of simulator app fails', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        return XcodeUtils.launchSimulatorApp().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to launch url in a booted simulator and resolve.', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        const url = 'mock.url';
        const udid = 'MOCK-UDID';
        await XcodeUtils.launchURLInBootedSimulator(url, udid);
        expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl openurl "${url}" ${udid}`
        );
    });

    test('Should attempt to launch url in a booted simulator and reject if error is encountered.', async () => {
        jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        const url = 'mock.url';
        const udid = 'MOCK-UDID';
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
                    returnedValues.length ===
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
        return XcodeUtils.getSupportedDevices().then((returnedValues) => {
            expect(
                returnedValues !== null && returnedValues.length > 0
            ).toBeTruthy();
        });
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

        await XcodeUtils.openUrlInNativeBrowser(
            'MOCK-UDID',
            'mock.url',
            new mockSpinner()
        );
        expect(launchSimApp).toHaveBeenCalledBefore(bootDevice);
        expect(bootDevice).toHaveBeenCalledBefore(waitUntilReady);
        expect(waitUntilReady).toHaveBeenCalledBefore(launchURLInSim);
    });
});
