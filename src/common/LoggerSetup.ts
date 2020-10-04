/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { AndroidSDKUtils } from './AndroidUtils';
import { CommonUtils } from './CommonUtils';
import { IOSUtils } from './IOSUtils';

export class LoggerSetup {
    public static async initializePluginLoggers(): Promise<void> {
        await AndroidSDKUtils.initializeLogger();
        await IOSUtils.initializeLogger();
        await CommonUtils.initializeLogger();
        return Promise.resolve();
    }
}
