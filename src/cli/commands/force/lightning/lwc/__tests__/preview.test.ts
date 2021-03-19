/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as Config from '@oclif/config';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { Setup } from '@salesforce/lwc-dev-mobile-core/lib/cli/commands/force/lightning/local/setup';
import { AndroidLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidLauncher';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSLauncher';
import { PreviewUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewUtils';
import fs from 'fs';
import {
    LwcServerIsRunningRequirement,
    LwcServerPluginInstalledRequirement,
    Preview
} from '../preview';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'preview');

const passedSetupMock = jest.fn(() => {
    return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
});

const failedSetupMock = jest.fn(() => {
    return Promise.reject(new SfdxError('Mock Failure in tests!'));
});

const iosLaunchPreview = jest.fn(() => Promise.resolve());
const androidLaunchPreview = jest.fn(() => Promise.resolve());

const sampleConfigFile = `
{
    "apps": {
    "ios": [
        {
            "id": "com.salesforce.test",
            "name": "Test App",
            "get_app_bundle": "configure_ios_test_app.ts",
            "preview_server_enabled": true
        }
    ],
    "android": [
        {
            "id": "com.salesforce.test",
            "name": "Test App",
            "get_app_bundle": "configure_android_test_app.ts",
            "activity": ".MainActivity",
            "preview_server_enabled": true
        }
    ]
    }
}
`;

describe('Preview Tests', () => {
    beforeEach(() => {
        jest.spyOn(Setup.prototype, 'run').mockImplementation(passedSetupMock);

        jest.spyOn(IOSLauncher.prototype, 'launchPreview').mockImplementation(
            iosLaunchPreview
        );

        jest.spyOn(
            AndroidLauncher.prototype,
            'launchPreview'
        ).mockImplementation(androidLaunchPreview);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Validates component name flag', async () => {
        const preview = makePreview('', 'android', 'sfdxdebug');
        try {
            await preview.run(true);
        } catch (error) {
            expect(error.message).toBe(
                messages.getMessage(
                    'error:invalidComponentNameFlagsDescription'
                )
            );
        }
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        await preview.run(true);
        expect(androidLaunchPreview).toHaveBeenCalled();
    });

    test('Checks that launch for target platform for iOS is invoked', async () => {
        const preview = makePreview('compname', 'ios', 'sfdxdebug');
        await preview.run(true);
        expect(iosLaunchPreview).toHaveBeenCalled();
    });

    test('Checks that setup is invoked', async () => {
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        await preview.run(true);
        expect(passedSetupMock).toHaveBeenCalled();
        expect(androidLaunchPreview).toHaveBeenCalled();
    });

    test('Preview should throw an error if setup fails', async () => {
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        jest.spyOn(Setup.prototype, 'run').mockImplementation(failedSetupMock);

        try {
            await preview.run(true);
        } catch (error) {
            expect(error instanceof SfdxError).toBeTruthy();
        }

        expect(failedSetupMock).toHaveBeenCalled();
    });

    test('Preview should throw an error if server is not installed', async () => {
        const logger = new Logger('test-preview');
        const cmdMock = jest.fn(
            (): Promise<{ stdout: string; stderr: string }> =>
                Promise.reject(new Error('test error'))
        );

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            cmdMock
        );
        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(() => {
            throw new Error('test error');
        });

        const requirement = new LwcServerPluginInstalledRequirement(logger);
        requirement
            .checkFunction()
            .then(() => fail('should have thrown an error'))
            // tslint:disable-next-line: no-empty
            .catch((error) => {
                expect(error.message).toBe(
                    messages.getMessage(
                        'reqs:serverInstalled:unfulfilledMessage'
                    )
                );
            });
    });

    test('Preview should throw an error if server is not running', async () => {
        const logger = new Logger('test-preview');
        const cmdMock = jest.fn(
            (): Promise<{ stdout: string; stderr: string }> =>
                Promise.reject(new Error('test error'))
        );

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
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

    test('Attempts to launch preview for native app', async () => {
        const preview = makePreview(
            'compname',
            'ios',
            'sfdxdebug',
            '/path/to/root',
            'myConfig.json',
            'com.salesforce.test'
        );

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);

        jest.spyOn(
            PreviewUtils,
            'validateConfigFileWithSchema'
        ).mockReturnValue(
            Promise.resolve({ errorMessage: null, passed: true })
        );

        jest.spyOn(PreviewUtils, 'getAppBundlePath').mockReturnValue(
            '/path/to/app/bundle'
        );

        jest.spyOn(CommonUtils, 'loadJsonFromFile').mockReturnValue(
            JSON.parse(sampleConfigFile)
        );

        const appConfig = PreviewUtils.loadConfigFile(
            'myConfig.json'
        ).getAppConfig('ios', 'com.salesforce.test');

        await preview.run(true);
        expect(iosLaunchPreview).toHaveBeenCalledWith(
            'compname',
            '/path/to/root',
            '/path/to/app/bundle',
            'com.salesforce.test',
            appConfig,
            '3333'
        );
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-preview');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));
        const preview = makePreview('compname', 'android', 'sfdxdebug');
        await preview.run(true);
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Preview.description !== null).toBeTruthy();
    });

    function makePreview(
        componentName: string,
        platform: string,
        target: string,
        projectdir?: string,
        configfile?: string,
        targetapp?: string
    ): Preview {
        const args = ['-n', componentName, '-p', platform, '-t', target];

        if (projectdir) {
            args.push('-d');
            args.push(projectdir);
        }

        if (configfile) {
            args.push('-f');
            args.push(configfile);
        }

        if (targetapp) {
            args.push('-a');
            args.push(targetapp);
        }

        const preview = new Preview(
            args,
            new Config.Config(({} as any) as Config.Options)
        );

        return preview;
    }
});
