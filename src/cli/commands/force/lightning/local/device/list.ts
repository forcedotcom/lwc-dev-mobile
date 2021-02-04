/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// tslint:disable: no-submodule-imports

import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { AndroidVirtualDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidTypes';
import { AndroidSDKUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { IOSSimulatorDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSTypes';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import { LoggerSetup } from '@salesforce/lwc-dev-mobile-core/lib/common/LoggerSetup';
import { PerformanceMarkers } from '@salesforce/lwc-dev-mobile-core/lib/common/PerformanceMarkers';
import chalk from 'chalk';
import cli from 'cli-ux';
import { performance, PerformanceObserver } from 'perf_hooks';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'devicelist'
);

export default class List extends SfdxCommand {
    public static description = messages.getMessage('commandDescription');

    public static readonly flagsConfig: FlagsConfig = {
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            longDescription: messages.getMessage('platformFlagDescription'),
            required: true
        })
    };

    public examples = [
        `sfdx force:lightning:local:device:list -p iOS`,
        `sfdx force:lightning:local:device:list -p Android`
    ];

    private perfMarker = PerformanceMarkers.getByName(
        PerformanceMarkers.FETCH_DEVICES_MARKER_KEY
    )!;

    public async run(): Promise<any> {
        const platform = this.flags.platform;
        this.logger.info(`Device List command invoked for ${platform}`);

        if (!CommandLineUtils.platformFlagIsValid(platform)) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage('error:invalidInputFlagsDescription'),
                    'lwc-dev-mobile',
                    this.examples
                )
            );
        }

        return CommandLineUtils.platformFlagIsIOS(platform)
            ? this.iOSDeviceList()
            : this.androidDeviceList();
    }

    public async iOSDeviceList(): Promise<IOSSimulatorDevice[]> {
        performance.mark(this.perfMarker.startMarkName);
        const result = await IOSUtils.getSupportedSimulators();
        performance.mark(this.perfMarker.endMarkName);
        this.showDeviceList(result);
        return Promise.resolve(result);
    }

    public async androidDeviceList(): Promise<AndroidVirtualDevice[]> {
        performance.mark(this.perfMarker.startMarkName);
        const result = await AndroidSDKUtils.fetchEmulators();
        performance.mark(this.perfMarker.endMarkName);
        this.showDeviceList(result);
        return Promise.resolve(result);
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:device:list', {});
        this.logger = logger;
        await LoggerSetup.initializePluginLoggers();
    }

    private showDeviceList(list: any[]) {
        let duration: number = 0;

        const obs = new PerformanceObserver((items, observer) => {
            duration = items.getEntries()[0].duration / 1000;
            performance.clearMarks();
            observer.disconnect();
        });
        obs.observe({ entryTypes: ['measure'] });

        performance.measure(
            this.perfMarker.name,
            this.perfMarker.startMarkName,
            this.perfMarker.endMarkName
        );

        const message = `DeviceList (${duration.toFixed(3)} sec)`;
        const tree = cli.tree();
        tree.insert(message);
        const rootNode = tree.nodes[message];
        list.forEach((item) => {
            rootNode.insert(chalk.bold.green(item));
        });
        tree.display();
    }
}
