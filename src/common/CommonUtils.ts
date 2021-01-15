/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as childProcess from 'child_process';

import { Logger } from '@salesforce/core';

const execSync = childProcess.execSync;
type StdioOptions = childProcess.StdioOptions;

const LOGGER_NAME = 'force:lightning:mobile:common';

export class CommonUtils {
    public static DEFAULT_LWC_SERVER_PORT = '3333';

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

    public static getLwcServerPort(): string | undefined {
        const getProcessCommand =
            process.platform === 'win32'
                ? 'wmic process where "CommandLine Like \'%force:lightning:lwc:start%\'" get CommandLine  | findstr "sfdx.js"'
                : "ps -ax | grep 'force:lightning:lwc:start' | grep 'sfdx.js' | grep -v grep";

        try {
            const result = CommonUtils.executeCommand(getProcessCommand).trim();
            // The result of the above command would be in the form of [ "........./sfdx.js" "force:lightning:lwc:start" ]
            // when no port is specified, or in the form of [ "........./sfdx.js" "force:lightning:lwc:start" "-p" "1234" ]
            // when a port is specified.

            let port = CommonUtils.DEFAULT_LWC_SERVER_PORT;
            const pIndex = result.indexOf('-p');
            if (pIndex > 0) {
                port = result
                    .substr(pIndex + 2)
                    .replace(/"/gi, '')
                    .trim();
            }
            return port;
        } catch {
            // If we got here it's b/c the grep command fails on empty set,
            // which means that the server is not running
            return undefined;
        }
    }

    public static getValueForKey(array: string[], key: string): string | null {
        for (const item of array) {
            const trimmed = item.trim();

            if (trimmed.toLowerCase().startsWith(key.toLowerCase())) {
                const value = trimmed.substring(key.length + 1).trim(); // key.length + 1 to skip over key/value separator
                return value;
            }
        }
        return null;
    }

    private static logger: Logger = new Logger(LOGGER_NAME);
}
