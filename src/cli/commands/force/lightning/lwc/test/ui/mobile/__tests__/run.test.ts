/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Config } from '@oclif/core/lib/config';
import { Options } from '@oclif/core/lib/interfaces';
import { Logger, Messages } from '@salesforce/core';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { Run } from '../run';
import fs from 'fs';
import util from 'util';
import path from 'path';
import process from 'process';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'test-ui-mobile-run'
);

describe('Mobile UI Test Run Tests', () => {
    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        jest.spyOn(CommonUtils, 'startCliAction').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Validates config exists', async () => {
        const cmd = createCommand({
            config: 'config file does not exist'
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

    test('Validates spec exists', async () => {
        const cmd = createCommand({
            config: 'valid.config.js',
            spec: 'a path to invalid spec'
        });

        fs.existsSync = jest
            .fn()
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toContain(
                messages.getMessage('error:specPathInvalidDescription')
            );
        }
    });

    test('Validates correct npx wdio command gets called with a test spec', async () => {
        const config = 'wdio.config.js';
        const spec = 'mytest.spec.js';
        const cmd = createCommand({
            config: config,
            spec: spec
        });

        fs.existsSync = jest.fn().mockReturnValue(true);

        const npxWdioCommandSpy = jest.spyOn(
            CommonUtils,
            'executeCommandAsync'
        );
        const resolveOneSpec = jest.fn(() => {
            return Promise.resolve({ stdout: '', stderr: '' });
        });
        npxWdioCommandSpy.mockImplementationOnce(resolveOneSpec);

        jest.spyOn(fs, 'statSync').mockReturnValue({
            isFile: function () {
                return true;
            }
        } as fs.Stats);

        await cmd.init();
        await cmd.run();

        const configPath = path.join(process.cwd(), config);
        const specPath = path.join(process.cwd(), spec);
        expect(resolveOneSpec).toHaveBeenCalledWith(
            `npx --no-install wdio '${configPath}' --spec '${specPath}'`
        );
    });

    test('Validates correct npx wdio command gets called with a folder containing test specs', async () => {
        const config = 'wdio.config.js';

        const specTest0 = 'test0.spec.js';
        const specTest1 = 'test1.spec.js';
        const specFolder0 = 'testSpecFolder0';
        const specFolder1 = 'testSpecFolder1';
        const specFolder0Test0 = `${specFolder0}/${specTest0}`;
        const specFolder0Folder1Test0 = `${specFolder0}/${specFolder1}/${specTest0}`;
        const specFolder0Folder1Test1 = `${specFolder0}/${specFolder1}/${specTest1}`;

        // Going to assert on a virtual directory structure as modeled like below
        //
        // specFolder0
        // |-specTest0
        // |-specFolder1
        //   |-specTest0
        //   |-specTest1

        const cmd = createCommand({
            config: config,
            spec: specFolder0
        });

        fs.existsSync = jest.fn().mockReturnValue(true);

        const npxWdioCommandSpy = jest.spyOn(
            CommonUtils,
            'executeCommandAsync'
        );
        const resolveOneSpec = jest.fn(() => {
            return Promise.resolve({ stdout: '', stderr: '' });
        });
        npxWdioCommandSpy.mockImplementationOnce(resolveOneSpec);

        jest.spyOn(fs, 'statSync')
            .mockReturnValueOnce({
                isFile: function () {
                    return false;
                }
            } as fs.Stats)
            .mockReturnValue({
                isFile: function () {
                    return false;
                }
            } as fs.Stats);

        jest.spyOn(fs, 'readdirSync')
            .mockReturnValueOnce([
                {
                    name: specFolder1,
                    isDirectory: function () {
                        return true;
                    }
                },
                {
                    name: specTest0,
                    isDirectory: function () {
                        return false;
                    }
                }
            ] as Array<fs.Dirent>)
            .mockReturnValueOnce([
                {
                    name: specTest0,
                    isDirectory: function () {
                        return false;
                    }
                },
                {
                    name: specTest1,
                    isDirectory: function () {
                        return false;
                    }
                }
            ] as Array<fs.Dirent>);

        await cmd.init();
        await cmd.run();

        const configPath = path.join(process.cwd(), config);
        const spec0Path = path.join(process.cwd(), specFolder0Folder1Test0);
        const spec1Path = path.join(process.cwd(), specFolder0Folder1Test1);
        const spec2Path = path.join(process.cwd(), specFolder0Test0);

        expect(resolveOneSpec).toHaveBeenCalledWith(
            `npx --no-install wdio '${configPath}' --spec '${spec0Path}' '${spec1Path}' '${spec2Path}'`
        );
    });

    test('Catching error from running npx wdio command', async () => {
        const cmd = createCommand({
            config: 'wdio.config.js',
            spec: 'mytest.spec.js'
        });

        const unexpectedErrorMessage = 'UTAM test run failed';

        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            () => {
                return Promise.reject(unexpectedErrorMessage);
            }
        );

        fs.existsSync = jest.fn().mockReturnValue(true);

        const enumerateTestSpecsSpy = jest.spyOn(
            Run.prototype as any,
            'enumerateTestSpecs'
        );
        enumerateTestSpecsSpy.mockReturnValue([]);

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            console.log(error);
            expect((error as any).message).toContain(
                util.format(
                    messages.getMessage('error:unexpectedErrorDescription'),
                    unexpectedErrorMessage
                )
            );
        }
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-logger');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));

        const cmd = createCommand({
            config: './wdio.config.js',
            spec: './test.spec.js'
        });

        await cmd.init();
        expect(loggerSpy).toHaveBeenCalled();
    });

    function createCommand({ config, spec }: NamedParameters): Run {
        const args = [];

        if (config && config.length > 0) {
            args.push('--config');
            args.push(config);
        }

        if (spec && spec.length > 0) {
            args.push('--spec');
            args.push(spec);
        }

        const cmd = new Run(args, new Config({} as Options));

        return cmd;
    }
});

interface NamedParameters {
    config?: string;
    spec?: string;
}
