/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfError } from '@salesforce/core';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import util from 'util';
import fs from 'fs';
import path from 'path';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'test-ui-mobile-run'
);

export class Run extends SfdxCommand {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ force:lightning:lwc:test:ui:mobile:run --config '/path/to/wdio.conf.js'`,
        `$ force:lightning:lwc:test:ui:mobile:run --config '/path/to/wdio.conf.js' --spec '/path/to/myTest.spec.js'`,
        `$ force:lightning:lwc:test:ui:mobile:run --config '/path/to/wdio.conf.js' --spec '/path/to/folderWithSpecs'`
    ];

    private static createError(stringId: string, ...param: any[]): SfError {
        let msg = messages.getMessage(stringId);
        if (param.length > 0) {
            msg = util.format(msg, param);
        }
        return new SfError(msg, 'lwc-dev-mobile', Run.examples);
    }

    public static flagsConfig = {
        config: flags.string({
            description: messages.getMessage('configFlagDescription'),
            char: 'f',
            required: true
        }),
        spec: flags.string({
            description: messages.getMessage('specFlagDescription'),
            char: 's',
            required: false
        })
    };

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Run.examples;
        return super
            .init()
            .then(() =>
                Logger.child('force:lightning:lwc:test:ui:mobile:run', {})
            )
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    public async run(): Promise<any> {
        this.logger.info(`UTAM run command invoked.`);

        const config = CommandLineUtils.resolveFlag(
            this.flags.config,
            ''
        ).trim();
        const configPath = path.normalize(
            CommonUtils.resolveUserHomePath(config)
        );
        if (!fs.existsSync(configPath)) {
            CommonUtils.stopCliAction();
            return Promise.reject(
                Run.createError('error:configFileDoesntExistDescription')
            );
        }

        let specs = '';
        const spec = CommandLineUtils.resolveFlag(this.flags.spec, '').trim();
        if (spec.length > 0) {
            const specPath = path.normalize(
                CommonUtils.resolveUserHomePath(spec)
            );
            if (!fs.existsSync(specPath)) {
                CommonUtils.stopCliAction();
                return Promise.reject(
                    Run.createError('error:specPathInvalidDescription')
                );
            }
            let specsArray = this.enumerateTestSpecs(specPath);
            specsArray = specsArray.map((spec) => `'${spec}'`);
            specs = specsArray.join(' ');
        }

        CommonUtils.startCliAction(messages.getMessage('runningUtamTest'));
        return await this.executeRunUtamTest(configPath, specs)
            .then((result) => {
                this.logger.info(
                    `UTAM test ran successfully:\n${result.stdout}`
                );

                // TODO: Output using console.log until we decide how to report back to sfdx.
                //
                // tslint:disable-next-line: no-console
                console.log(result.stdout);

                return Promise.resolve();
            })
            .catch((error) => {
                this.logger.warn(`Failed to run UTAM test: ${error}`);

                // TODO: Output using console.log until we decide how to report back to sfdx.
                //
                // tslint:disable-next-line: no-console
                console.log(error);

                return Promise.reject(
                    Run.createError('error:unexpectedErrorDescription', error)
                );
            })
            .finally(() => {
                CommonUtils.stopCliAction();
            });
    }

    private async executeRunUtamTest(
        configPath: string,
        specs: string
    ): Promise<any> {
        let cmd = `npx --no-install wdio '${configPath}'`;
        if (specs.length > 0) {
            // If the spec flag is set then honor that and use that test over
            // specs that are specified in the config.
            cmd = cmd + ` --spec ${specs}`;
        }

        return CommonUtils.executeCommandAsync(cmd);
    }

    /**
     * Recursively collects paths of test files given a starting point.
     * If a valid test file is selected as a starting point then it will
     * be the sole path returned in an array. Otherwise, the array returned
     * will be collection of files' paths including subfolders' files.
     *
     * @param path Path to a test file or a folder that contains tests.
     * @returns Array of paths to test files.
     */
    private enumerateTestSpecs(path: string): Array<string> {
        let files: Array<string> = [];
        const stat = fs.statSync(path);
        if (stat.isFile()) {
            files.push(`${path}`);
        } else {
            const items = fs.readdirSync(path, {
                withFileTypes: true
            });
            items.forEach(async (item) => {
                if (item.isDirectory()) {
                    files = [
                        ...files,
                        ...this.enumerateTestSpecs(`${path}/${item.name}`)
                    ];
                } else {
                    if (item.name.endsWith('.spec.js')) {
                        files.push(`${path}/${item.name}`);
                    }
                }
            });
        }
        return files;
    }
}
