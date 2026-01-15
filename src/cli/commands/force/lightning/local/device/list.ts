/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import chalk from 'chalk';
import archy from 'archy';
import { Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { z } from 'zod';

import {
    AndroidDevice,
    AndroidDeviceManager,
    AppleDevice,
    AppleDeviceManager,
    BaseCommand,
    CommandLineUtils,
    CommonUtils,
    FlagsConfigType,
    PerformanceMarkers,
    PlatformConfig,
    Version
} from '@salesforce/lwc-dev-mobile-core';
import { DeviceListSchema } from '../../../../../schema/device.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'device-list');

export class List extends BaseCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly examples = messages.getMessages('examples');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.JsonFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.OutputFormatFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevelFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.PlatformFlag, true),
        ostype: Flags.string({
            description: messages.getMessage('flags.ostype.description'),
            required: false,
            options: ['default', 'all'],
            helpValue: 'default|all'
        })
    };

    protected _commandName = 'force:lightning:local:device:list';

    private perfMarker = PerformanceMarkers.getByName(PerformanceMarkers.FETCH_DEVICES_MARKER_KEY)!;

    private get platform(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.platform as string;
    }

    private get ostype(): string | undefined {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.ostype as string | undefined;
    }

    protected static getOutputSchema(): z.ZodTypeAny {
        return DeviceListSchema;
    }

    public async run(): Promise<AndroidDevice[] | AppleDevice[]> {
        this.logger.info(`Device List command invoked for ${this.platform}`);

        if (!this.jsonEnabled()) {
            CommonUtils.startCliAction(
                messages.getMessage('device.list.action'),
                messages.getMessage('device.list.status')
            );
        }
        performance.mark(this.perfMarker.startMarkName);

        let devices: AndroidDevice[] | AppleDevice[] = [];

        if (CommandLineUtils.platformFlagIsAndroid(this.platform)) {
            if (this.ostype === undefined) {
                devices = await new AndroidDeviceManager().enumerateDevices();
            } else if (this.ostype === 'all') {
                devices = await new AndroidDeviceManager().enumerateDevices(null);
            } else if (this.ostype === 'default') {
                devices = await new AndroidDeviceManager().enumerateDevices([
                    {
                        osType: 'default',
                        minOSVersion: Version.from(PlatformConfig.androidConfig().minSupportedRuntime)!
                    }
                ]);
            }
        } else {
            devices = await new AppleDeviceManager().enumerateDevices();
        }

        performance.mark(this.perfMarker.endMarkName);
        if (!this.jsonEnabled()) {
            CommonUtils.stopCliAction();
            this.showDeviceList(devices);
        }

        return devices;
    }

    private showDeviceList(devices: AndroidDevice[] | AppleDevice[]): void {
        let duration = 0;

        const obs = new PerformanceObserver((items, observer) => {
            duration = items.getEntries()[0].duration / 1000;
            performance.clearMarks();
            observer.disconnect();
        });
        obs.observe({ entryTypes: ['measure'] });

        performance.measure(this.perfMarker.name, this.perfMarker.startMarkName, this.perfMarker.endMarkName);

        const tree = {
            label: `DeviceList (${duration.toFixed(3)} sec)`,
            nodes: devices.flatMap((device) => chalk.bold.green(device.toString()))
        };

        // eslint-disable-next-line no-console
        console.log(archy(tree));
    }
}
