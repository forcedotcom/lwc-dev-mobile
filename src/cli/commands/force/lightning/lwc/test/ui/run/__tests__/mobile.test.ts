/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Config } from '@oclif/core/lib/config';
import { Options } from '@oclif/core/lib/interfaces';
import { Logger, Messages, SfError } from '@salesforce/core';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { RequirementProcessor } from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import { Mobile } from '../mobile';
import fs from 'fs';
import util from 'util';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'test-ui-run-mobile'
);

const passedSetupMock = jest.fn(() => {
    return Promise.resolve();
});

const failedSetupMock = jest.fn(() => {
    return Promise.reject(new SfError('Mock Failure in tests!'));
});

describe('Mobile UI Test Run Tests', () => {
    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        jest.spyOn(CommonUtils, 'startCliAction').mockImplementation(() => {});
        jest.spyOn(RequirementProcessor, 'execute').mockImplementation(
            passedSetupMock
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Validates platform flag', async () => {
        const cmd1 = createCommand({ platform: 'blah' });
        try {
            await cmd1.init();
            await cmd1.run();
        } catch (error) {
            expect((error as any).message).toContain(
                messages.getMessage('error:invalidPlatformFlagsDescription')
            );
        }

        const cmd2 = createCommand({ platform: ' ' });
        try {
            await cmd2.init();
            await cmd2.run();
        } catch (error) {
            expect((error as any).message).toContain(
                messages.getMessage('error:invalidPlatformFlagsDescription')
            );
        }
    });

    // test('Validate config and spec flags', async () => {
    //     const cmd = createCommand({
    //         platform: 'iOS',
    //         config: '',
    //         spec: ''
    //     });

    //     try {
    //         await cmd.init();
    //         await cmd.run();
    //     } catch (error) {
    //         expect((error as any).message).toContain(
    //             messages.getMessage('error:invalidConfigFlagDescription')
    //         );
    //         expect((error as any).message).toContain(
    //             messages.getMessage('error:invalidSpecFlagDescription')
    //         );
    //     }
    // });

    // test('Validates spec flag', async () => {
    //     const cmd = createCommand({
    //         platform: 'Android',
    //         spec: ' '
    //     });
    //     try {
    //         await cmd.init();
    //         await cmd.run();
    //     } catch (error) {
    //         expect((error as any).message).toContain(
    //             messages.getMessage('error:invalidSpecFlagDescription')
    //         );
    //     }
    // });

    test('WDIO check fails with invalid return value', async () => {
        const cmd = createCommand({
            platform: 'iOS',
            spec: 'mytest.spec.js',
            config: 'wdio.config.js'
        });

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            () => {
                return Promise.resolve({ stdout: '', stderr: '' });
            }
        );

        fs.existsSync = jest.fn().mockImplementation(() => {
            return true;
        });

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toContain(
                messages.getMessage('error:wdioIsntInstalledDescription')
            );
        }
    });

    test('WDIO check fails with unexpected error', async () => {
        const cmd = createCommand({
            platform: 'iOS',
            spec: 'mytest.spec.js',
            config: 'wdio.config.js'
        });

        const unexpectedErrorMessage = 'check failed';
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            () => {
                return Promise.reject(unexpectedErrorMessage);
            }
        );



        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            const formattedErrorMessage = util.format(
                messages.getMessage('error:unexpectedErrorDescription'),
                unexpectedErrorMessage
            );

            expect((error as any).message).toContain(formattedErrorMessage);
        }
    });

    test('Invalid path to config file fails', async () => {
        const cmd = createCommand({
            platform: 'iOS',
            spec: 'mytest.spec.js',
            config: 'wdio.config.js'
        });

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            () => {
                return Promise.resolve({ stdout: 'v1.22.4', stderr: '' });
            }
        );

        fs.existsSync = jest.fn().mockImplementation(() => {
            return false;
        });

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toContain(
                messages.getMessage('error:configFileDoesntExistDescription')
            );
        }
    });

    test('Invalid path to spec file fails', async () => {
        const cmd = createCommand({
            platform: 'iOS',
            spec: 'mytest.spec.js',
            config: 'wdio.config.js'
        });

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            () => {
                return Promise.resolve({ stdout: 'v1.22.4', stderr: '' });
            }
        );

        fs.existsSync = jest
            .fn()
            .mockImplementationOnce(() => {
                return true;
            })
            .mockImplementationOnce(() => {
                return false;
            });

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toContain(
                messages.getMessage('error:specFileDoesntExistDescription')
            );
        }
    });

    test('Catching error from running npx wdio command', async () => {
        const cmd = createCommand({
            platform: 'iOS',
            spec: 'mytest.spec.js',
            config: 'wdio.config.js'
        });

        const unexpectedErrorMessage = 'reject';

        jest.spyOn(CommonUtils, 'executeCommandAsync')
            .mockImplementationOnce(() => {
                return Promise.resolve({ stdout: 'v1.22.4', stderr: '' });
            })
            .mockImplementationOnce(() => {
                return Promise.reject(unexpectedErrorMessage);
            });

        fs.existsSync = jest.fn().mockImplementation(() => {
            return true;
        });

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toContain(
                util.format(
                    messages.getMessage('error:unexpectedErrorDescription'),
                    unexpectedErrorMessage
                )
            );
        }
    });

    test('Should throw an error if setup fails', async () => {
        const cmd = createCommand({
            platform: 'iOS',
            config: './wdio.config.js',
            spec: './test.spec.js'
        });

        jest.spyOn(RequirementProcessor, 'execute').mockImplementationOnce(
            failedSetupMock
        );

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect(error instanceof SfError).toBeTruthy();
        }

        expect(failedSetupMock).toHaveBeenCalled();
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-logger');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));

        const cmd = createCommand({
            platform: 'iOS',
            config: './wdio.config.js',
            spec: './test.spec.js'
        });

        jest.spyOn(CommonUtils, 'executeCommandAsync')
            .mockImplementationOnce(() => {
                return Promise.resolve({ stdout: 'v1.22.4', stderr: '' });
            })
            .mockImplementationOnce(() => {
                return Promise.resolve({ stdout: '', stderr: '' });
            });

        fs.existsSync = jest.fn().mockImplementation(() => {
            return true;
        });

        await cmd.init();
        await cmd.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    function createCommand({ platform, config, spec }: NamedParameters): Mobile {
        const args = [];

        if (platform && platform.length > 0) {
            args.push('-p');
            args.push(platform);
        }

        if (config && config.length > 0) {
            args.push('--config');
            args.push(config);
        }

        if (spec && spec.length > 0) {
            args.push('--spec');
            args.push(spec);
        }

        const cmd = new Mobile(args, new Config({} as Options));

        return cmd;
    }
});

interface NamedParameters {
    platform?: string;
    config?: string;
    spec?: string;
}
