/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Logger } from '@salesforce/core';
import { CommonUtils } from '../../common/CommonUtils';

const logger: Logger = new Logger('force:lightning:local:setup');
export const hook = async (options: { id: string }) => {
    const command = 'sfdx plugins:install @salesforce/lwc-dev-server';
    try {
        await CommonUtils.isLwcServerPluginInstalled();
        logger.info('sfdx server plugin detected.');
    } catch {
        logger.info('sfdx server plugin was not detected.');
        try {
            logger.info(`Installing sfdx server plugin.... ${command}`);
            CommonUtils.executeCommand(command, [
                'inherit',
                'inherit',
                'inherit'
            ]).toString();
            logger.info('sfdx server plugin installed.');
        } catch (error) {
            logger.error(`sfdx server plugin installion failed. ${error}`);
        }
    }
};
