import childProcess from 'child_process';
import { IOSMockData } from './IOSMockData';
import { XcodeUtils } from '../IOSUtils';

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

describe('IOS utils tests', () => {
    beforeEach(() => {
        myCommandRouterBlock.mockClear();
        badBlockMock.mockClear();
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
});
