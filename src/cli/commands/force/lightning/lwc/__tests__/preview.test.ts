import Preview from '../preview';
import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';

describe('Preview Tests', () => {

    let preview: Preview;

    afterEach(() => {});

    beforeEach(() => {
        preview = new Preview([], new Config.Config(<Config.Options>{}));

    });
    test('Checks that flags are passed correctly', async () => {
        setupFlags();
        setupLogger();
        const mockCall1= jest.fn((value) => {return true});
        const mockCall2= jest.fn((value) => {return true});
        const mockCall3= jest.fn((value) => {return true});
        preview.validateComponentPathValue = mockCall1;
        preview.validatePlatformValue = mockCall2;
        preview.validateTargetValue = mockCall3;
        await preview.run();
        expect(mockCall1).toHaveBeenCalledWith('componentpath');
        expect(mockCall2).toHaveBeenCalledWith('android');
        return expect(mockCall3).toHaveBeenCalledWith('sfdxemu');
    });

    function setupFlags() {
        Object.defineProperty(preview, 'flags', {
            get: () => {
                return {'platform' : 'android', 'target' :'sfdxemu', 'path' : 'componentpath'};
            }
        });
    }

    function setupLogger() {
        Object.defineProperty(preview, 'logger', {
            get: () => {
                return new Logger('test');
            },
            configurable: true,
            enumerable: false
        });
    }
});