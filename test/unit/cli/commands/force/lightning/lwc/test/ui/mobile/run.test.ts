/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import fs from 'node:fs';
import { Logger, Messages } from '@salesforce/core';
import { TestContext } from '@salesforce/core/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Run } from '../../../../../../../../../../src/cli/commands/force/lightning/lwc/test/ui/mobile/run.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

describe('Mobile UI Test Run Tests', () => {
    const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'test-ui-mobile-run');
    const $$ = new TestContext();

    afterEach(() => {
        $$.restore();
    });

    it('Fails if config file is does not exist', async () => {
        try {
            await Run.run(['--config', 'blah']);
        } catch (error) {
            expect(error)
                .to.be.an('error')
                .with.property('message', messages.getMessage('error.configFile.pathInvalid', ['blah']));
        }
    });

    it('Fails if spec file is does not exist', async () => {
        const npxWdioCommandMock = stubMethod($$.SANDBOX, fs, 'existsSync');
        npxWdioCommandMock.onCall(0).returns(true);
        npxWdioCommandMock.onCall(1).returns(false);
        try {
            await Run.run(['--config', './wdio.conf.js', '--spec', 'blah']);
        } catch (error) {
            expect(error)
                .to.be.an('error')
                .with.property('message', messages.getMessage('error.spec.pathInvalid', ['blah']));
        }
    });

    it('Calls the correct npx wdio command with a test spec', async () => {
        const quote = process.platform === 'win32' ? '"' : "'";
        const config = 'wdio.config.js';
        const spec = 'mytest.spec.js';

        stubMethod($$.SANDBOX, fs, 'existsSync').returns(true);
        stubMethod($$.SANDBOX, CommonUtils, 'enumerateFiles').returns([spec]);
        const npxWdioCommandMock = stubMethod($$.SANDBOX, CommonUtils, 'spawnCommandAsync');
        npxWdioCommandMock.resolves({ stdout: '', stderr: '' });

        await Run.run(['--config', config, '--spec', spec]);

        expect(
            npxWdioCommandMock.calledWith(
                'npx',
                ['--no-install', 'wdio', `${quote}${config}${quote}`, '--spec', `${quote}${spec}${quote}`],
                ['inherit', 'inherit', 'inherit']
            )
        ).to.be.true;
    });

    it('Catches error when npx wdio command fails', async () => {
        const errorMessage = 'UTAM test run failed';

        stubMethod($$.SANDBOX, fs, 'existsSync').returns(true);
        stubMethod($$.SANDBOX, CommonUtils, 'enumerateFiles').returns([]);
        const npxWdioCommandMock = stubMethod($$.SANDBOX, CommonUtils, 'spawnCommandAsync');
        npxWdioCommandMock.rejects(new Error(errorMessage));

        try {
            await Run.run(['--config', 'wdio.config.js', '--spec', 'mytest.spec.js']);
        } catch (error) {
            expect(error)
                .to.be.an('error')
                .with.property('message', messages.getMessage('error.unexpected', [errorMessage]));
        }
    });

    it('Logger must be initialized and invoked', async () => {
        const loggerMock = stubMethod($$.SANDBOX, Logger.prototype, 'info');
        stubMethod($$.SANDBOX, fs, 'existsSync').returns(true);
        stubMethod($$.SANDBOX, CommonUtils, 'enumerateFiles').returns([]);
        stubMethod($$.SANDBOX, CommonUtils, 'spawnCommandAsync').resolves();
        await Run.run(['--config', 'wdio.config.js', '--spec', 'mytest.spec.js']);
        expect(loggerMock.called).to.be.true;
    });

    it('Messages folder should be loaded', async () => {
        expect(!Run.summary).to.be.false;
    });
});
