/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, Messages } from '@salesforce/core';
import { TestContext } from '@salesforce/core/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import { IOSUtils, RequirementProcessor } from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Create } from '../../../../../../../../src/cli/commands/force/lightning/local/device/create.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

describe('Create Tests', () => {
    const $$ = new TestContext();
    let executeSetupMock: sinon.SinonStub<any[], any>;

    beforeEach(() => {
        executeSetupMock = stubMethod($$.SANDBOX, RequirementProcessor, 'execute');
        executeSetupMock.resolves(Promise.resolve());
    });

    afterEach(() => {
        $$.restore();
    });

    it('Logger must be initialized and invoked', async () => {
        const loggerMock = stubMethod($$.SANDBOX, Logger.prototype, 'info');
        stubMethod($$.SANDBOX, IOSUtils, 'createNewDevice').resolves('TestUDID');
        await Create.run(['-p', 'ios', '-n', 'MyNewVirtualDevice', '-d', 'iPhone-8']);
        expect(loggerMock.called).to.be.true;
    });

    it('Messages folder should be loaded', async () => {
        expect(!Create.summary).to.be.false;
    });
});
