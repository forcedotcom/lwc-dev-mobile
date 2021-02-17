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
                ? 'wmic process where "CommandLine Like \'%force:lightning:lwc:start%\'" get CommandLine  | findstr -v "wmic"'
                : 'ps -ax | grep force:lightning:lwc:start | grep -v grep';

        try {
            const result = CommonUtils.executeCommand(getProcessCommand).trim();
            const portPattern = 'force:lightning:lwc:start -p';
            const startIndex = result.indexOf(portPattern);
            let port = CommonUtils.DEFAULT_LWC_SERVER_PORT;
            if (startIndex > 0) {
                const endIndex = result.indexOf(
                    '\n',
                    startIndex + portPattern.length
                );
                if (endIndex > startIndex) {
                    port = result.substring(
                        startIndex + portPattern.length,
                        endIndex
                    );
                } else {
                    port = result.substr(startIndex + portPattern.length);
                }
            }
            return port.trim();
        } catch (error) {
            CommonUtils.logger.warn(
                `Unable to determine server port: ${error}`
            );
            return undefined;
        }
    }

    private static logger: Logger = new Logger(LOGGER_NAME);
}
