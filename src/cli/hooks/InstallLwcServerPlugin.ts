/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import fs from 'fs';
import { CommonUtils } from '../../common/CommonUtils';

const logger: Logger = new Logger('force:lightning:local:setup');
export const hook = async (options: { id: string; outputFile: string }) => {
    const command = 'sfdx plugins:install @salesforce/lwc-dev-server';
    try {
        await CommonUtils.isLwcServerPluginInstalled();
        logger.info('sfdx server plugin detected.');
        saveResultToOutputFile(options.outputFile, true);
    } catch {
        logger.info('sfdx server plugin was not detected.');
        try {
            logger.info(`Installing sfdx server plugin.... ${command}`);
            CommonUtils.executeCommand(command, ['inherit', 'pipe', 'inherit']);
            logger.info('sfdx server plugin installed.');
            saveResultToOutputFile(options.outputFile, true);
        } catch (error) {
            logger.error(`sfdx server plugin installion failed. ${error}`);
            saveResultToOutputFile(options.outputFile, false);
        }
    }
};

function saveResultToOutputFile(outputFile: string, result: boolean) {
    try {
        fs.writeFileSync(outputFile, `lwc-dev-server-installed=${result}`);
    } catch {
        // ignore and continue
    }
}
