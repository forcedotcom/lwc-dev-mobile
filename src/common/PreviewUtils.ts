/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import Ajv from 'ajv';
import fs from 'fs';
import { CommandLineUtils } from './Common';
import { JsonUtils } from './JsonUtils';

export interface ValidationResult {
    errorMessage: string | null;
    passed: boolean;
}

export class PreviewUtils {
    public static BROWSER_TARGET_APP = 'browser';
    public static COMPONENT_NAME_ARG_PREFIX = 'componentname';
    public static PROJECT_DIR_ARG_PREFIX = 'projectdir';

    public static CONFIG_FILE_APPS_KEY = 'apps';
    public static CONFIG_FILE_ID_KEY = 'id';
    public static CONFIG_FILE_GET_APP_BUNDLE_KEY = 'get_app_bundle';
    public static CONFIG_FILE_LAUNCH_ARGUMENTS_KEY = 'launch_arguments';
    public static CONFIG_FILE_NAME_KEY = 'name';
    public static CONFIG_FILE_VALUE_KEY = 'value';
    public static CONFIG_FILE_ACTIVITY_KEY = 'activity';

    public static isTargetingBrowser(targetApp: string): boolean {
        return (
            targetApp.trim().toLowerCase() === PreviewUtils.BROWSER_TARGET_APP
        );
    }

    public static prefixRouteIfNeeded(compName: string): string {
        if (compName.toLowerCase().startsWith('c/')) {
            return compName;
        }
        return 'c/' + compName;
    }

    public static async validateConfigFileWithSchema(
        configFileJson: any,
        schema: object
    ): Promise<ValidationResult> {
        try {
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

    public static getAppLaunchArguments(
        json: any,
        platform: string,
        targetApp: string
    ): Map<string, string> {
        const launchArguments: Map<string, string> = new Map();

        const appDefinition = PreviewUtils.getAppConfig(
            json,
            platform,
            targetApp
        );

        const args = JsonUtils.getKeyValueIgnoringKeyCase(
            appDefinition,
            PreviewUtils.CONFIG_FILE_LAUNCH_ARGUMENTS_KEY
        ) as [];

        if (args) {
            args.forEach((arg) => {
                const name = JsonUtils.getKeyValueIgnoringKeyCase(
                    arg,
                    PreviewUtils.CONFIG_FILE_NAME_KEY
                ) as string;

                const value = JsonUtils.getKeyValueIgnoringKeyCase(
                    arg,
                    PreviewUtils.CONFIG_FILE_VALUE_KEY
                ) as string;

                launchArguments.set(name, value);
            });
        }

        return launchArguments;
    }

    public static getAppLaunchActivity(json: any, targetApp: string): string {
        const appDefinition = PreviewUtils.getAppConfig(
            json,
            CommandLineUtils.ANDROID_FLAG,
            targetApp
        );

        const activity = JsonUtils.getKeyValueIgnoringKeyCase(
            appDefinition,
            PreviewUtils.CONFIG_FILE_ACTIVITY_KEY
        ) as string;

        return activity;
    }

    public static getAppConfig(
        json: any,
        platform: string,
        targetApp: string
    ): any {
        const apps = JsonUtils.getKeyValueIgnoringKeyCase(
            json,
            PreviewUtils.CONFIG_FILE_APPS_KEY
        );

        const platformApps = apps
            ? (JsonUtils.getKeyValueIgnoringKeyCase(apps, platform) as [])
            : undefined;

        const appConfig = platformApps
            ? platformApps.find((app) => {
                  const match = JsonUtils.getKeyValueIgnoringKeyCase(
                      app,
                      PreviewUtils.CONFIG_FILE_ID_KEY
                  ) as string;
                  return match === targetApp;
              })
            : undefined;

        return appConfig;
    }
}
