/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as Config from '@oclif/config';
import { Logger, SfdxError } from '@salesforce/core';
import { Setup } from '@salesforce/lwc-dev-mobile-core/lib/cli/commands/force/lightning/local/setup';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { LwcServerIsRunningRequirement, Preview } from '../preview';

const myPreviewCommandBlockMock = jest.fn(() => Promise.resolve());

const passedSetupMock = jest.fn(() => {
    return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
});

const failedSetupMock = jest.fn(() => {
    return Promise.reject(new SfdxError('Mock Failure in tests!'));
});

describe('Preview Tests', () => {
    beforeEach(() => {
        jest.spyOn(Setup.prototype, 'run').mockImplementation(passedSetupMock);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Checks that Comp Name flag is received', async () => {
        const compPathCallValidationlMock = jest.fn(() => {
            return Promise.resolve();
        });
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        preview.validateInputParameters = compPathCallValidationlMock;
        await preview.run();
        expect(compPathCallValidationlMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform  for Android is invoked', async () => {
        const targetAndroidCallMock = jest.fn(() => Promise.resolve());
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        preview.launchPreview = targetAndroidCallMock;
        await preview.run();
        expect(targetAndroidCallMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform  for iOS is invoked', async () => {
        const preview = makePreview('compname', 'ios', 'sfdxdebug');
        const targetIOSCallMock = jest.fn(() => Promise.resolve());
        preview.launchPreview = targetIOSCallMock;
        await preview.run();
        expect(targetIOSCallMock).toHaveBeenCalled();
    });

    test('Checks that setup is invoked', async () => {
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        await preview.run();
        expect(passedSetupMock);
    });

    test('Preview should throw an error if setup fails', async () => {
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        jest.spyOn(Setup.prototype, 'run').mockImplementation(failedSetupMock);

        try {
            await preview.run();
        } catch (error) {
            expect(error instanceof SfdxError).toBeTruthy();
        }

        expect(failedSetupMock).toHaveBeenCalled();
    });

    test('Preview should throw an error if server is not running', async () => {
        const logger = new Logger('test-preview');
        const cmdMock = jest.fn((): string => {
            throw new Error('test error');
        });

        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(
            cmdMock
        );
        const requirement = new LwcServerIsRunningRequirement(logger);
        requirement
            .checkFunction()
            .then(() => fail('should have thrown an error'))
            // tslint:disable-next-line: no-empty
            .catch(() => {});
    });

    test('Preview should default to use server port 3333', async () => {
        const logger = new Logger('test-preview');
        const cmdMock = jest.fn(
            (): Promise<{ stdout: string; stderr: string }> =>
                Promise.resolve({
                    stderr: '',
                    stdout:
                        'path/to/bin/node /path/to/bin/sfdx.js force:lightning:lwc:start'
                })
        );

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            cmdMock
        );
        const requirement = new LwcServerIsRunningRequirement(logger);
        const portMessage = (await requirement.checkFunction()).trim();
        const port = portMessage.match(/\d+/);
        expect(port !== null && port[0] === '3333').toBe(true);
    });

    test('Preview should use specified server port', async () => {
        const logger = new Logger('test-preview');
        const specifiedPort = '3456';
        const cmdMock = jest.fn(
            (): Promise<{ stdout: string; stderr: string }> =>
                Promise.resolve({
                    stderr: '',
                    stdout: `path/to/bin/node /path/to/bin/sfdx.js force:lightning:lwc:start -p ${specifiedPort}`
                })
        );

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            cmdMock
        );
        const requirement = new LwcServerIsRunningRequirement(logger);
        const portMessage = (await requirement.checkFunction()).trim();
        const port = portMessage.match(/\d+/);
        expect(port !== null && port[0] === specifiedPort).toBe(true);
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-preview');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        await preview.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Preview.description !== null).toBeTruthy();
    });

    function makePreview(
        componentname: string,
        platform: string,
        target: string
    ): Preview {
        const preview = new Preview(
            ['-n', componentname, '-p', platform, '-t', target],
            new Config.Config(({} as any) as Config.Options)
        );
        preview.launchPreview = myPreviewCommandBlockMock;

        return preview;
    }
});
