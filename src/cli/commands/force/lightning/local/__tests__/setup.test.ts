/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Config } from '@oclif/core/lib/config';
import { Options } from '@oclif/core/lib/interfaces';
import {
    CommonUtils,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';
import { Setup } from '../setup';

describe('Setup Tests', () => {
    let passedSetupMock: jest.Mock<any, [], any>;

    beforeEach(() => {
        passedSetupMock = jest.fn(() => {
            return Promise.resolve();
        });

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        jest.spyOn(CommonUtils, 'startCliAction').mockImplementation(() => {});
        jest.spyOn(RequirementProcessor, 'execute').mockImplementation(
            passedSetupMock
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Should route to Setup in lwc-dev-mobile-core', async () => {
        const setup = new Setup(['-p', 'ios'], new Config({} as Options));
        await setup.init();
        await setup.run();
        expect(passedSetupMock).toHaveBeenCalled();
    });
});
