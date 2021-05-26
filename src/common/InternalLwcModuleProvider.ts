/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

//
// TODO: When bug W-9230056 is fixed, delete this file.
//

import { AbstractModuleId, FsModuleEntry, ProviderContext } from '@lwrjs/types';
import LwcModuleProvider from '@lwrjs/lwc-module-provider';

// Note: LwcModuleProviderOptions is defined in @lwrjs/lwc-module-provider
//       but is not exported so we have to redefine it here again.
interface LwcModuleProviderOptions {
    disableCaching?: boolean;
}

export default class InternalLwcModuleProvider extends LwcModuleProvider {
    constructor(
        options: LwcModuleProviderOptions | undefined,
        context: ProviderContext
    ) {
        super(options, context);
        this.name = 'Internal-lwc-module-provider';
    }

    async getModuleEntry(
        moduleId: AbstractModuleId
    ): Promise<FsModuleEntry | undefined> {
        try {
            const result = await super.getModuleEntry(moduleId);
            return Promise.resolve(result);
        } catch {
            return Promise.resolve(undefined);
        }
    }
}
