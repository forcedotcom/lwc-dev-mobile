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
import * as childProcess from 'child_process';
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

    public async run(): Promise<void> {
        this.logger.info(`UTAM run command invoked.`);

        const config = CommandLineUtils.resolveFlag(
            this.flags.config,
            ''
        ).trim();
        const configPath = path.normalize(
            CommonUtils.resolveUserHomePath(config)
        );
        if (!fs.existsSync(configPath)) {
            return Promise.reject(
                Run.createError('error:configFileDoesntExistDescription')
            );
        }

        let specs: string[] = [];
        const spec = CommandLineUtils.resolveFlag(this.flags.spec, '').trim();
        if (spec.length > 0) {
            const specPath = path.normalize(
                CommonUtils.resolveUserHomePath(spec)
            );
            if (!fs.existsSync(specPath)) {
                return Promise.reject(
                    Run.createError('error:specPathInvalidDescription')
                );
            }
            // Get all files ending with .JS or .js since some operating
            // systems are case sensitive on file names/extensions.
            specs = CommonUtils.enumerateFiles(
                specPath,
                new RegExp('^.*\\.((j|J)(s|S))$')
            );
        }

        CommonUtils.startCliAction(messages.getMessage('runningUtamTest'));
        return this.executeRunUtamTest(configPath, specs)
            .then(() => {
                this.logger.info(`UTAM test ran successfully`);
                return Promise.resolve();
            })
            .catch((error) => {
                this.logger.warn(`Failed to run UTAM test: ${error}`);

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
        specs: string[]
    ): Promise<{ stdout: string; stderr: string }> {
        const quote = process.platform === 'win32' ? '"' : "'";
        const cmd = 'npx';
        const args = ['--no-install', 'wdio', `${quote}${configPath}${quote}`];
        if (specs.length > 0) {
            // If the spec flag is set then honor that and use that test over
            // specs that are specified in the config. We wrap the path to each
            // spec file in quotes in case the path has whitespace.
            const specsArray = specs.map((spec) => `${quote}${spec}${quote}`);
            args.push('--spec');
            args.push(...specsArray);
        }

        const stdioOptions: childProcess.StdioOptions = [
            'inherit',
            'inherit',
            'inherit'
        ]; // have the child process report its STDIO back to the host process
        return CommonUtils.spawnCommandAsync(cmd, args, stdioOptions);
    }
}
