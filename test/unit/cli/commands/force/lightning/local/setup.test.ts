/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TestContext } from '@salesforce/core/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import { RequirementProcessor } from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Setup } from '../../../../../../../src/cli/commands/force/lightning/local/setup.js';

describe('Setup Tests', () => {
    const $$ = new TestContext();
    let executeSetupMock: sinon.SinonStub<any[], any>;

    beforeEach(() => {
        executeSetupMock = stubMethod($$.SANDBOX, RequirementProcessor, 'execute');
        executeSetupMock.resolves(Promise.resolve());
    });

    afterEach(() => {
        $$.restore();
    });

    it('Should route to Setup in lwc-dev-mobile-core', async () => {
        await Setup.run(['-p', 'ios']);
        expect(executeSetupMock.called).to.be.true;
    });
});
