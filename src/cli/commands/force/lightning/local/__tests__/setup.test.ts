import Setup from '../setup';
import { BaseSetup, SetupTestResult } from '../../../../../../common/Requirements';
import * as Config from '@oclif/config';
import { Messages, Logger, LoggerLevel } from '@salesforce/core';
import { IOSEnvironmentSetup } from '../../../../../../common/IOSEnvironmentSetup';

describe('Setup Tests', () => {
    let setup: Setup;

    afterEach(() => {});

    beforeEach(() => {
          setup = new Setup([], new Config.Config(<Config.Options>{}));

    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('Checks that flags are passed correctly', async () => {
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags();
        setupMockExecIOS();
        const mockCall= jest.fn((value) => {return true});
        setup.validatePlatformValue = mockCall;
        await setup.run();
        return expect(mockCall).toHaveBeenCalledWith('ios');
    });

    test('Logger must be initialized and invoked', async () => {
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags();
        setupMockExecIOS();
        let loggerSpy = jest.spyOn(logger, 'info');
        await setup.run();
        return expect(loggerSpy).toHaveBeenCalled();
    });

    test('Checks that flags are passed correctly', async () => {
        let myExecImpl = setupMockExecIOS(); 
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags();
        
        await setup.run();
        expect(myExecImpl).toHaveBeenCalled();
      
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        return expect(Setup.description !== null ).toBeTruthy();
    });

    function setupFlags() {
        Object.defineProperty(setup, 'flags', {
            get: () => {
                return {'platform' : 'ios'};
            }
        });
    }

    function setupLogger(logger: Logger) {
        Object.defineProperty(setup, 'logger', {
            get: () => {
                return logger;
            },
            configurable: true,
            enumerable: false
        });
    }

    function setupMockExecIOS(): any  {
        let myExecImpl = jest.fn((setup): Promise<boolean> => {
            return new Promise((resolve, reject) => {
                if (setup instanceof IOSEnvironmentSetup) {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            });
          });

        setup.executeSetup = myExecImpl; 
        return myExecImpl; 
    }

});