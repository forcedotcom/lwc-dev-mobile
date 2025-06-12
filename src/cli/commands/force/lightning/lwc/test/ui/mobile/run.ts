/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import fs from 'node:fs';
import path from 'node:path';
import { Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { BaseCommand, CommandLineUtils, CommonUtils, FlagsConfigType } from '@salesforce/lwc-dev-mobile-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'test-ui-mobile-run');

export class Run extends BaseCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly examples = messages.getMessages('examples');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.JsonFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevelFlag, false),
        config: Flags.string({
            char: 'f',
            description: messages.getMessage('flags.config.description'),
            required: true,
            validate: (config: string) => config && config.trim().length > 0
        }),
        spec: Flags.string({
            description: messages.getMessage('flags.spec.description'),
            required: false,
            validate: (spec: string) => spec && spec.trim().length > 0
        })
    };

    protected _commandName = 'force:lightning:lwc:test:ui:mobile:run';

    private get configFlag(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.config, '').trim();
    }
    private get specFlag(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.spec, '').trim();
    }

    public async run(): Promise<void> {
        this.logger.info('Mobile UI Test Run command invoked.');

        const configPath = path.normalize(CommonUtils.resolveUserHomePath(this.configFlag));
        if (!fs.existsSync(configPath)) {
            return Promise.reject(this.createError(messages.getMessage('error.configFile.pathInvalid', [configPath])));
        }

        let specs: string[] = [];
        if (this.specFlag.length > 0) {
            const specPath = path.normalize(CommonUtils.resolveUserHomePath(this.specFlag));
            if (!fs.existsSync(specPath)) {
                return Promise.reject(this.createError(messages.getMessage('error.spec.pathInvalid', [specPath])));
            }
            // Get all files ending with .JS or .js since some operating
            // systems are case sensitive on file names/extensions.
            specs = CommonUtils.enumerateFiles(specPath, new RegExp('^.*\\.((j|J)(s|S))$'));
        }

        CommonUtils.startCliAction(messages.getMessage('runningUtamTest'));
        return this.executeRunUtamTest(configPath, specs)
            .then(() => {
                this.logger.info('Tests ran successfully');
                return Promise.resolve();
            })
            .catch((error: Error) => {
                this.logger.warn(`Failed to run tests: ${error.message}`);

                return Promise.reject(this.createError(messages.getMessage('error.unexpected', [error.message])));
            })
            .finally(() => {
                CommonUtils.stopCliAction();
            });
    }

    // eslint-disable-next-line class-methods-use-this
    private createError(message: string): SfError {
        return new SfError(message, 'lwc-dev-mobile', Run.examples);
    }

    // eslint-disable-next-line class-methods-use-this
    private async executeRunUtamTest(configPath: string, specs: string[]): Promise<{ stdout: string; stderr: string }> {
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

        // Have the child process inherit host process STDIO for reporting
        return CommonUtils.spawnCommandAsync(cmd, args, ['inherit', 'inherit', 'inherit']);
    }
}
