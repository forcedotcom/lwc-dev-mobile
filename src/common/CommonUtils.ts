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

    public static getLwcServerPort(): string | undefined {
        // The LWC server runs a few processes in the background, one of which is hardcoded
        // to run on port 9856. So we can see whether the LWC server is running by checking
        // whether there is a process that is using port 9856. Then we can check to see what
        // other port is that process listening to, and that would be the server port.

        const isWindows = process.platform === 'win32';

        const getServerPIDCommand = isWindows
            ? 'netstat -vanpo tcp | findstr ":9856"'
            : 'netstat -vanp tcp | grep "*.9856"';
        let serverPID = '';
        try {
            const result = CommonUtils.executeCommand(getServerPIDCommand);
            const parts = result.split(' ').filter((i) => i);

            if (isWindows) {
                // On Windows the result would be something like below:
                //    Proto  Local Address      Foreign Address       State               PID
                //    TCP    0.0.0.0:9856       0.0.0.0:0             LISTENING           12468
                if (parts.length >= 5) {
                    serverPID = parts[4].trim();
                }
            } else {
                // On Mac the result would be something like below:
                //    Proto  Recv-Q  Send-Q  Local Address  Foreign Address  (state)  rhiwat  shiwat  pid    epid  state   options
                //    tcp46       0       0  *.9856         *.*              LISTEN   131072  131072  37515     0  0x0100  0x00000106
                if (parts.length >= 12) {
                    serverPID = parts[8].trim();
                }
            }
        } catch (error) {
            // if we got here then it means that server is not running
        }

        if (serverPID === '') {
            // Did not detect server to be running so no port number to return
            return undefined;
        }

        const getServerPort = isWindows
            ? `netstat -vanpo tcp | findstr "${serverPID}" | findstr /v /c:":9856"`
            : `netstat -vanp tcp | grep "${serverPID}" | grep -v "*.9856"`;

        try {
            const result = CommonUtils.executeCommand(getServerPort);
            const parts = result.split(' ').filter((i) => i);

            if (isWindows) {
                // On Windows the result would be something like below:
                //    Proto  Local Address      Foreign Address       State               PID
                //    TCP    0.0.0.0:3000       0.0.0.0:0             LISTENING           12468
                if (parts.length >= 5) {
                    return parts[1].replace('0.0.0.0:', '').trim();
                }
            } else {
                // On Mac the result would be something like below:
                //    Proto  Recv-Q  Send-Q  Local Address  Foreign Address  (state)  rhiwat  shiwat  pid    epid  state   options
                //    tcp46       0       0  *.3000         *.*              LISTEN   131072  131072  37515     0  0x0100  0x00000106
                if (parts.length >= 12) {
                    return parts[3].replace('*.', '').trim();
                }
            }
        } catch (error) {
            CommonUtils.logger.error(
                `Error executing command '${getServerPort}':`
            );
            CommonUtils.logger.error(`${error}`);
        }

        return undefined;
    }

    private static logger: Logger = new Logger(LOGGER_NAME);
}
