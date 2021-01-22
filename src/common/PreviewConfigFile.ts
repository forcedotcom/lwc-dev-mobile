/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { CommandLineUtils } from './Common';

export class PreviewConfigFile {
    public apps!: {
        ios?: IOSAppPreviewConfig[];
        android?: AndroidAppPreviewConfig[];
    };

    public getAppConfig(
        platform: string,
        targetApp: string
    ): IOSAppPreviewConfig | AndroidAppPreviewConfig | undefined {
        const appConfigs = CommandLineUtils.platformFlagIsIOS(platform)
            ? this.apps.ios || []
            : this.apps.android || [];

        const config = appConfigs.find(
            (appConfig) => appConfig.id === targetApp
        );

        return config;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class LaunchArgument {
    public name!: string;
    public value!: string;
}

// tslint:disable-next-line: max-classes-per-file
class BaseAppPreviewConfig {
    public id!: string;
    public name!: string;
    // tslint:disable-next-line: variable-name
    public get_app_bundle?: string;
    // tslint:disable-next-line: variable-name
    public launch_arguments?: LaunchArgument[];
    // tslint:disable-next-line: variable-name
    public preview_server_enabled?: boolean;
}

// tslint:disable-next-line: max-classes-per-file
export class IOSAppPreviewConfig extends BaseAppPreviewConfig {}

// tslint:disable-next-line: max-classes-per-file
export class AndroidAppPreviewConfig extends BaseAppPreviewConfig {
    public activity!: string;
}
