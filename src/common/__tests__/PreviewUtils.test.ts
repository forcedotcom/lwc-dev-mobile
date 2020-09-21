/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as configSchema from '../../cli/commands/force/lightning/lwc/previewConfigurationSchema.json';
import {
    AndroidAppPreviewConfig,
    IOSAppPreviewConfig
} from '../PreviewConfigFile';
import { PreviewUtils } from '../PreviewUtils';

describe('Preview utils tests', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Checks for targetting browser or app', async () => {
        expect(PreviewUtils.isTargetingBrowser('browser')).toBeTrue();
        expect(PreviewUtils.isTargetingBrowser('com.mock.app')).toBeFalse();
    });

    test('Config validation fails when app id is not defined', async () => {
        const json = '{"apps": {"ios": [{"name": "LWC Test App"}]}}';
        const configFileJson = JSON.parse(json);
        jest.spyOn(PreviewUtils, 'getConfigFileAsJson').mockReturnValue(
            configFileJson
        );

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            'myConfig.json',
            configSchema
        );

        expect(validationResult.passed).toBeFalse();
        expect(validationResult.errorMessage).toBe(
            "data.apps.ios[0] should have required property 'id'"
        );
    });

    test('Config validation fails when app name is not defined', async () => {
        const json = '{"apps": {"ios": [{"id": "com.salesforce.Test"}]}}';
        const configFileJson = JSON.parse(json);
        jest.spyOn(PreviewUtils, 'getConfigFileAsJson').mockReturnValue(
            configFileJson
        );

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            'myConfig.json',
            configSchema
        );

        expect(validationResult.passed).toBeFalse();
        expect(validationResult.errorMessage).toBe(
            "data.apps.ios[0] should have required property 'name'"
        );
    });

    test('Config validation fails when launch arguments is not defined as key/value pair', async () => {
        const json = `
        {
            "apps": {
                "ios": [
                    {
                        "id": "com.salesforce.Test",
                        "name": "LWC Test App",
                        "launch_arguments": [
                            { "name": "arg1", "value": "val1" },
                            { "name": "arg2" }
                          ]
                    }
                ]
            }
        }`;
        const configFileJson = JSON.parse(json);
        jest.spyOn(PreviewUtils, 'getConfigFileAsJson').mockReturnValue(
            configFileJson
        );

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            'myConfig.json',
            configSchema
        );

        expect(validationResult.passed).toBeFalse();
        expect(validationResult.errorMessage).toBe(
            "data.apps.ios[0].launch_arguments[1] should have required property 'value'"
        );
    });

    test('Config validation fails when activity is not defined for an android app', async () => {
        const json = `
        {
            "apps": {
                "android": [
                    {
                        "id": "com.salesforce.Test",
                        "name": "LWC Test App"
                    }
                ]
            }
        }`;
        const configFileJson = JSON.parse(json);
        jest.spyOn(PreviewUtils, 'getConfigFileAsJson').mockReturnValue(
            configFileJson
        );

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            'myConfig.json',
            configSchema
        );

        expect(validationResult.passed).toBeFalse();
        expect(validationResult.errorMessage).toBe(
            "data.apps.android[0] should have required property 'activity'"
        );
    });

    test('Can retrieve launch arguments from config file', async () => {
        const json = `
        {
            "apps": {
                "ios": [
                    {
                        "id": "com.salesforce.Test",
                        "name": "LWC Test App",
                        "launch_arguments": [
                            { "name": "arg1", "value": "val1" },
                            { "name": "arg2", "value": "val2" }
                          ]
                    }
                ]
            }
        }`;
        const configFileJson = JSON.parse(json);
        jest.spyOn(PreviewUtils, 'getConfigFileAsJson').mockReturnValue(
            configFileJson
        );

        const configFile = PreviewUtils.loadConfigFile('myConfig.json');
        const appConfig = configFile.getAppConfig(
            'ios',
            'com.salesforce.Test'
        ) as IOSAppPreviewConfig;

        const args = appConfig.launch_arguments || new Map();
        const arr = Array.from(args);
        expect(arr.length).toBe(2);
        expect(arr[0]).toStrictEqual({ name: 'arg1', value: 'val1' });
        expect(arr[1]).toStrictEqual({ name: 'arg2', value: 'val2' });
    });

    test('Can retrieve launch activity from config file', async () => {
        const json = `
        {
            "apps": {
                "android": [
                    {
                        "id": "com.salesforce.Test",
                        "name": "LWC Test App",
                        "activity": ".MyActivity"
                    }
                ]
            }
        }`;
        const configFileJson = JSON.parse(json);
        jest.spyOn(PreviewUtils, 'getConfigFileAsJson').mockReturnValue(
            configFileJson
        );

        const configFile = PreviewUtils.loadConfigFile('myConfig.json');
        const appConfig = configFile.getAppConfig(
            'android',
            'com.salesforce.Test'
        ) as AndroidAppPreviewConfig;

        expect(appConfig.activity).toBe('.MyActivity');
    });
});
