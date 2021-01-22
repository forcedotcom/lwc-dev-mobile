/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import {
    AndroidAppPreviewConfig,
    IOSAppPreviewConfig,
    PreviewConfigFile
} from './PreviewConfigFile';

const NAMESPACE = 'com.salesforce.mobile-tooling';

export interface ValidationResult {
    errorMessage: string | null;
    passed: boolean;
}

export class PreviewUtils {
    public static BROWSER_TARGET_APP = 'browser';
    public static COMPONENT_NAME_ARG_PREFIX = `${NAMESPACE}.componentname`;
    public static PROJECT_DIR_ARG_PREFIX = `${NAMESPACE}.projectdir`;
    public static SERVER_PORT_PREFIX = `${NAMESPACE}.serverport`;
    public static SERVER_ADDRESS_PREFIX = `${NAMESPACE}.serveraddress`;

    public static isTargetingBrowser(targetApp: string): boolean {
        return (
            targetApp.trim().toLowerCase() === PreviewUtils.BROWSER_TARGET_APP
        );
    }

    public static useLwcServerForPreviewing(
        targetApp: string,
        appConfig: IOSAppPreviewConfig | AndroidAppPreviewConfig | undefined
    ): boolean {
        return (
            PreviewUtils.isTargetingBrowser(targetApp) ||
            (appConfig !== undefined &&
                appConfig.preview_server_enabled === true)
        );
    }

    public static prefixRouteIfNeeded(compName: string): string {
        if (compName.toLowerCase().startsWith('c/')) {
            return compName;
        }
        return 'c/' + compName;
    }

    public static async validateConfigFileWithSchema(
        configFile: string,
        schema: object
    ): Promise<ValidationResult> {
        try {
            const configFileJson = PreviewUtils.getConfigFileAsJson(configFile);

            const ajv = new Ajv({ allErrors: true });
            const validationResult = await ajv.validate(schema, configFileJson);
            const hasError = ajv.errors ? ajv.errors.length > 0 : false;
            const errorText = ajv.errors ? ajv.errorsText() : '';
            const isValid = validationResult === true && hasError === false;
            return Promise.resolve({
                errorMessage: errorText,
                passed: isValid
            });
        } catch (err) {
            return Promise.resolve({
                errorMessage: err,
                passed: false
            });
        }
    }

    public static getConfigFileAsJson(file: string): any {
        const fileContent = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(fileContent);
        return json;
    }

    public static loadConfigFile(file: string): PreviewConfigFile {
        const json = PreviewUtils.getConfigFileAsJson(file);
        const configFile = Object.assign(new PreviewConfigFile(), json);
        return configFile;
    }

    public static getAppBundlePath(
        basePath: string,
        appConfig: IOSAppPreviewConfig | AndroidAppPreviewConfig
    ): string | undefined {
        if (appConfig.get_app_bundle) {
            const module = require(path.resolve(
                basePath,
                appConfig.get_app_bundle
            ));
            return module.run();
        } else {
            return undefined;
        }
    }
}
