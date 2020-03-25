import Setup from '../setup';
import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';

describe('Setup Tests', () => {
    let setup: Setup;

    afterEach(() => {});

    beforeEach(() => {
        setup = new Setup([], new Config.Config(<Config.Options>{}));

    });

    test('Checks that flags are passed correctly', async () => {
        setupLogger();
        setupFlags();
        const mockCall= jest.fn((value) => {return true});
        setup.validatePlatformValue = mockCall;
        await setup.run();
        return expect(mockCall).toHaveBeenCalledWith('android');
    });

    function setupFlags() {
        Object.defineProperty(setup, 'flags', {
            get: () => {
                return {'platform' : 'android'};
            }
        });
    }

    function setupLogger() {
        Object.defineProperty(setup, 'logger', {
            get: () => {
                return new Logger('test');
            },
            configurable: true,
            enumerable: false
        });
    }
});