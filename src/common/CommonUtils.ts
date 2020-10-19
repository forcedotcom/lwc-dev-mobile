/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as childProcess from 'child_process';

import { Logger } from '@salesforce/core';

const execSync = childProcess.execSync;
const spawn = childProcess.spawn;
type StdioOptions = childProcess.StdioOptions;

const LOGGER_NAME = 'force:lightning:mobile:common';

export class CommonUtils {
    public static async initializeLogger(): Promise<void> {
        CommonUtils.logger = await Logger.child(LOGGER_NAME);
        return Promise.resolve();
    }

    public static executeCommand(
        command: string,
        stdioOptions: StdioOptions = ['ignore', 'pipe', 'ignore']
    ): string {
        CommonUtils.logger.debug(`Executing command: '${command}'.`);
        try {
            return execSync(command, {
                stdio: stdioOptions
            }).toString();
        } catch (error) {
            CommonUtils.logger.error(`Error executing command '${command}':`);
            CommonUtils.logger.error(`${error}`);
            throw error;
        }
    }

    public static async isLwcServerPluginInstalled(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const command = 'sfdx force:lightning:lwc:start --help';
            try {
                CommonUtils.executeCommand(command);
                resolve();
            } catch {
                // Error: command force:lightning:lwc:start not found
                reject(new Error());
            }
        });
    }

    private static logger: Logger = new Logger(LOGGER_NAME);
}
