/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Setup as CoreSetup, RequirementCheckResultType } from '@salesforce/lwc-dev-mobile-core';

export class Setup extends CoreSetup {
    public async run(): Promise<RequirementCheckResultType | void> {
        return super.run();
    }
}
