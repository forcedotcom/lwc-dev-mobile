
import childProcess from 'child_process';
import { XcodeUtils } from '../IOSUtils';

const mockRuntimes = {
  "runtimes": [{
    "version": "13.3",
    "bundlePath": "mockruntime",
    "isAvailable": true,
    "name": "iOS 13.3",
    "identifier": "com.apple.CoreSimulator.SimRuntime.iOS-13-3",
    "buildversion": "17C45"
  },
  {
    "version": "13.2",
    "bundlePath": "mockruntime",
    "isAvailable": true,
    "name": "iOS 13.2",
    "identifier": "com.apple.CoreSimulator.SimRuntime.iOS-13-2",
    "buildversion": "17C46"
  },
  {
    "version": "13.3",
    "bundlePath": "mockruntime",
    "isAvailable": true,
    "name": "tvOS 13.3",
    "identifier": "com.apple.CoreSimulator.SimRuntime.tvOS-13-3",
    "buildversion": "17K446"
  },
  {
    "version": "6.1.1",
    "bundlePath": "mockruntime",
    "isAvailable": true,
    "name": "watchOS 6.1",
    "identifier": "com.apple.CoreSimulator.SimRuntime.watchOS-6-1",
    "buildversion": "17S445"
  }
  ]
};

let myCommandBlockMock = jest.fn((): Promise<{ stdout: string, stderr: string }> => {
  return new Promise((resolve, reject) => {
    resolve({ stdout: JSON.stringify(mockRuntimes), stderr: 'mockError' });
  });
});

let badBlockMock = jest.fn((): Promise<{ stdout: string, stderr: string }> => {
  return new Promise((resolve, reject) => {
    resolve({ stdout: "{[}", stderr: 'mockError' });
  });
});

describe('IOS utils tests', () => {

  beforeEach(() => {
      myCommandBlockMock.mockClear();
      badBlockMock.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Should attempt to invoke the xcrun for fetching sim runtimes', async () => {
    jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(myCommandBlockMock);
    await XcodeUtils.getSimulatorRuntimes();
    return expect(myCommandBlockMock).toHaveBeenCalled();
  });

  test('Should attempt to invoke the xcrun for fetching sim runtimes and return an array of values', async () => {
    jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(myCommandBlockMock);
    return XcodeUtils.getSimulatorRuntimes().then((returnedValues) => {
      expect(returnedValues !== null && returnedValues.length == mockRuntimes.runtimes.length).toBeTruthy();
    });

  });

  test('Should handle Bad JSON', async () => {
    jest.spyOn(XcodeUtils, 'executeCommand').mockImplementation(badBlockMock);
    return XcodeUtils.getSimulatorRuntimes().catch(error => {
      expect(error).toBeTruthy();
    });

  });

});