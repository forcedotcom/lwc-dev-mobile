/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { ActionBase } from 'cli-ux';
import 'jest-chain';
import 'jest-extended';
import { CommonUtils } from '../CommonUtils';
import { IOSUtils } from '../IOSUtils';
import { PreviewUtils } from '../PreviewUtils';
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
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            myCommandRouterBlock
        );
        await IOSUtils.getSimulatorRuntimes();
        expect(myCommandRouterBlock).toHaveBeenCalled();
    });

    test('Should attempt to invoke the xcrun for booting a device', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandMock
        );
        const udid = 'MOCKUDID';
        await IOSUtils.bootDevice(udid);
        expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl boot ${udid}`
        );
    });

    test('Should attempt to invoke the xcrun but fail booting a device', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandThrowsMock
        );
        const udid = 'MOCKUDID';
        return IOSUtils.bootDevice(udid).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to create a new device', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandMock
        );
        const simName = 'MOCKSIM';
        const deviceType = 'MOCK-DEVICE';
        const runtimeType = 'MOCK-SIM';
        await IOSUtils.createNewDevice(simName, deviceType, runtimeType);
        expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl create '${simName}' ${DEVICE_TYPE_PREFIX}.${deviceType} ${RUNTIME_TYPE_PREFIX}.${runtimeType}`
        );
    });

    test('Should attempt to invoke xcrun to boot device but resolve if device is already Booted', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandThrowsAlreadryBootedMock
        );
        const udid = 'MOCKUDID';
        return IOSUtils.bootDevice(udid).then((result) =>
            expect(result).toBeTruthy()
        );
    });

    test('Should wait for the device to boot', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandMock
        );
        const udid = 'MOCKUDID';
        return IOSUtils.waitUntilDeviceIsReady(udid).then((result) =>
            expect(result).toBeTruthy()
        );
    });

    test('Should wait for the device to boot and fail if error is encountered', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandThrowsMock
        );
        const udid = 'MOCKUDID';
        return IOSUtils.waitUntilDeviceIsReady(udid).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should launch the simulator app', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandMock
        );
        await IOSUtils.launchSimulatorApp();
        expect(launchCommandMock).toHaveBeenCalledWith(`open -a Simulator`);
    });

    test('Should reject if launch of simulator app fails', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandThrowsMock
        );
        return IOSUtils.launchSimulatorApp().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to launch url in a booted simulator and resolve.', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandMock
        );
        const url = 'mock.url';
        const udid = 'MOCK-UDID';
        await IOSUtils.launchURLInBootedSimulator(url, udid);
        expect(launchCommandMock).toHaveBeenCalledWith(
            `/usr/bin/xcrun simctl openurl "${url}" ${udid}`
        );
    });

    test('Should attempt to launch url in a booted simulator and reject if error is encountered.', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandThrowsMock
        );
        const url = 'mock.url';
        const udid = 'MOCK-UDID';
        return IOSUtils.launchURLInBootedSimulator(url, udid).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to launch native app in a booted simulator and resolve.', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandMock
        );

        const udid = 'MOCK-UDID';
        const compName = 'mock.compName';
        const projectDir = '/mock/path';
        const targetApp = 'com.mock.app';
        const targetAppArgs = [
            { name: 'arg1', value: 'val1' },
            { name: 'arg2', value: 'val2' }
        ];
        const launchArgs =
            `${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}=${compName}` +
            ` ${PreviewUtils.PROJECT_DIR_ARG_PREFIX}=${projectDir}` +
            ` arg1=val1 arg2=val2`;

        await IOSUtils.launchAppInBootedSimulator(
            udid,
            compName,
            projectDir,
            undefined,
            targetApp,
            targetAppArgs,
            undefined,
            undefined
        );

        expect(launchCommandMock).toBeCalledTimes(2);

        expect(launchCommandMock).nthCalledWith(
            1,
            `/usr/bin/xcrun simctl terminate "${udid}" ${targetApp}`
        );

        expect(launchCommandMock).nthCalledWith(
            2,
            `/usr/bin/xcrun simctl launch "${udid}" ${targetApp} ${launchArgs}`
        );
    });

    test('Should attempt to launch native app in a booted simulator and reject if error is encountered.', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandThrowsMock
        );
        const udid = 'MOCK-UDID';
        const compName = 'mock.compName';
        const projectDir = '/mock/path';
        const targetApp = 'com.mock.app';
        const targetAppArgs = [
            { name: 'arg1', value: 'val1' },
            { name: 'arg2', value: 'val2' }
        ];
        return IOSUtils.launchAppInBootedSimulator(
            udid,
            compName,
            projectDir,
            undefined,
            targetApp,
            targetAppArgs,
            undefined,
            undefined
        ).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('SShould attempt to install native app then launch it.', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            launchCommandMock
        );

        const udid = 'MOCK-UDID';
        const compName = 'mock.compName';
        const projectDir = '/mock/path';
        const appBundlePath = '/mock/path/MyTestApp.app';
        const targetApp = 'com.mock.app';
        const targetAppArgs = [
            { name: 'arg1', value: 'val1' },
            { name: 'arg2', value: 'val2' }
        ];
        const launchArgs =
            `${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}=${compName}` +
            ` ${PreviewUtils.PROJECT_DIR_ARG_PREFIX}=${projectDir}` +
            ` arg1=val1 arg2=val2`;

        await IOSUtils.launchAppInBootedSimulator(
            udid,
            compName,
            projectDir,
            appBundlePath,
            targetApp,
            targetAppArgs,
            undefined,
            undefined
        );

        expect(launchCommandMock).toBeCalledTimes(3);

        expect(launchCommandMock).nthCalledWith(
            1,
            `/usr/bin/xcrun simctl install ${udid} '${appBundlePath.trim()}'`
        );

        expect(launchCommandMock).nthCalledWith(
            2,
            `/usr/bin/xcrun simctl terminate "${udid}" ${targetApp}`
        );

        expect(launchCommandMock).nthCalledWith(
            3,
            `/usr/bin/xcrun simctl launch "${udid}" ${targetApp} ${launchArgs}`
        );
    });

    test('Should attempt to invoke the xcrun for fetching sim runtimes and return an array of values', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            myCommandRouterBlock
        );
        return IOSUtils.getSimulatorRuntimes().then((returnedValues) => {
            expect(
                returnedValues !== null &&
                    returnedValues.length ===
                        IOSMockData.mockRuntimes.runtimes.length
            ).toBeTruthy();
        });
    });

    test('Should attempt to invoke the xcrun for fetching sim runtimes and return white listed values', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            myCommandRouterBlock
        );
        return IOSUtils.getSupportedRuntimes().then((returnedValues) => {
            expect(
                returnedValues !== null && returnedValues.length > 0
            ).toBeTruthy();
        });
    });

    test('Should attempt to invoke the xcrun for fetching sim runtimes and return white listed values', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            myCommandRouterBlock
        );
        return IOSUtils.getSupportedDevices().then((returnedValues) => {
            expect(
                returnedValues !== null && returnedValues.length > 0
            ).toBeTruthy();
        });
    });

    test('Should handle Bad JSON', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            badBlockMock
        );
        return IOSUtils.getSimulatorRuntimes().catch((error) => {
            expect(error).toBeTruthy();
        });
    });
});
