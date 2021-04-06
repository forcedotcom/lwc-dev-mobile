/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Logger } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import { getPlatformSetupRequirements } from '../setupRequirementsUtil';

const logger = new Logger('test-logger');

describe('Setup Requirements Util Tests', () => {
    test('Should get iOS setup requirements', async () => {
        const requirements = getPlatformSetupRequirements(
            logger,
            CommandLineUtils.IOS_FLAG
        );
        expect(requirements instanceof IOSEnvironmentRequirements).toBeTruthy();
    });

    test('Should get Android setup requirements', async () => {
        const requirements = getPlatformSetupRequirements(
            logger,
            CommandLineUtils.ANDROID_FLAG
        );
        expect(
            requirements instanceof AndroidEnvironmentRequirements
        ).toBeTruthy();
    });
});
