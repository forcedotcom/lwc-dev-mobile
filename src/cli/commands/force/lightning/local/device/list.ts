/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Messages } from '@salesforce/core';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { BaseCommand } from '@salesforce/lwc-dev-mobile-core/lib/common/BaseCommand';
import {
    CommandLineUtils,
    FlagsConfigType
} from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import { PerformanceMarkers } from '@salesforce/lwc-dev-mobile-core/lib/common/PerformanceMarkers';
import chalk from 'chalk';
import { ux } from '@oclif/core';
import { performance, PerformanceObserver } from 'perf_hooks';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'device-list'
);

export class List extends BaseCommand {
    protected _commandName = 'sfdx force:lightning:local:device:list';

    public static readonly description =
        messages.getMessage('commandDescription');

    public static readonly examples = [
        `sfdx force:lightning:local:device:list -p iOS`,
        `sfdx force:lightning:local:device:list -p Android`
    ];

    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.Json, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevel, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.Platform, true)
    };

    private perfMarker = PerformanceMarkers.getByName(
        PerformanceMarkers.FETCH_DEVICES_MARKER_KEY
    )!;

    public async run(): Promise<any> {
        this.logger.info(
            `Device List command invoked for ${this.flagValues.platform}`
        );

        return CommandLineUtils.platformFlagIsIOS(this.flagValues.platform)
            ? this.iOSDeviceList()
            : this.androidDeviceList();
    }

    private async iOSDeviceList(): Promise<any> {
        CommonUtils.startCliAction(
            messages.getMessage('deviceListAction'),
            messages.getMessage('deviceListStatus')
        );
        performance.mark(this.perfMarker.startMarkName);
        const result = await IOSUtils.getSupportedSimulators();
        performance.mark(this.perfMarker.endMarkName);
        CommonUtils.stopCliAction();
        this.showDeviceList(result);
        return Promise.resolve(result);
    }

    private async androidDeviceList(): Promise<any> {
        CommonUtils.startCliAction(
            messages.getMessage('deviceListAction'),
            messages.getMessage('deviceListStatus')
        );
        performance.mark(this.perfMarker.startMarkName);
        const result = await AndroidUtils.fetchEmulators();
        performance.mark(this.perfMarker.endMarkName);
        CommonUtils.stopCliAction();
        this.showDeviceList(result);
        return Promise.resolve(result);
    }

    private showDeviceList(list: any[]) {
        let duration = 0;

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
        const tree = ux.tree();
        tree.insert(message);
        const rootNode = tree.nodes[message];
        list.forEach((item) => {
            rootNode.insert(chalk.bold.green(item));
        });
        tree.display();
    }
}
