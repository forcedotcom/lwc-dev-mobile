/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as configSchema from '../../cli/commands/force/lightning/lwc/previewConfigurationSchema.json';
import { PreviewUtils } from '../PreviewUtils';

describe('Preview utils tests', () => {
    test('Checks for targetting browser or app', async () => {
        expect(PreviewUtils.isTargetingBrowser('browser')).toBeTrue();
        expect(PreviewUtils.isTargetingBrowser('com.mock.app')).toBeFalse();
    });

    test('Config validation fails when app id is not defined', async () => {
        const json = '{"apps": {"ios": [{"name": "LWC Test App"}]}}';
        const configFileJson = JSON.parse(json);

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            configFileJson,
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

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            configFileJson,
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

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            configFileJson,
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

        const validationResult = await PreviewUtils.validateConfigFileWithSchema(
            configFileJson,
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

        const launchArguments = PreviewUtils.getAppLaunchArguments(
            configFileJson,
            'ios',
            'com.salesforce.Test'
        );

        const arr = Array.from(launchArguments);

        expect(arr.length).toBe(2);
        expect(arr[0]).toStrictEqual(['arg1', 'val1']);
        expect(arr[1]).toStrictEqual(['arg2', 'val2']);
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

        const launchActivity = PreviewUtils.getAppLaunchActivity(
            configFileJson,
            'com.salesforce.Test'
        );

        expect(launchActivity).toBe('.MyActivity');
    });
});
