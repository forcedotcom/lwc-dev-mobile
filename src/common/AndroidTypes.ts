/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Version } from './Common';

export class AndroidPackages {
    public static parseRawPackagesString(
        rawStringInput: string
    ): AndroidPackages {
        const startIndx = rawStringInput
            .toLowerCase()
            .indexOf('installed packages:', 0);
        const endIndx = rawStringInput
            .toLowerCase()
            .indexOf('available packages:', startIndx);
        const rawString = rawStringInput.substring(startIndx, endIndx);
        const packages: AndroidPackages = new AndroidPackages();

        // Installed packages:
        const lines = rawString.split('\n');
        if (lines.length > 0) {
            let i = 0;
            for (; i < lines.length; i++) {
                if (lines[i].toLowerCase().indexOf('path') > -1) {
                    i = i + 2; // skip ---- and header
                    break; // start of installed packages
                }
            }

            for (; i < lines.length; i++) {
                const rawStringSplits: string[] = lines[i].split('|');
                if (rawStringSplits.length > 1) {
                    const path = rawStringSplits[0].trim();
                    if (
                        path.startsWith('platforms;android-') ||
                        path.startsWith('system-images;android-')
                    ) {
                        const pathName = path
                            .replace('platforms;', '')
                            .replace('system-images;', '');
                        let versionString = pathName.replace('android-', '');
                        if (versionString.indexOf(';') >= 0) {
                            versionString = versionString.substring(
                                0,
                                versionString.indexOf(';')
                            );
                        }
                        const version = Version.from(versionString);
                        const description = rawStringSplits[2].trim();
                        const locationOfPack =
                            rawStringSplits.length > 2
                                ? rawStringSplits[3].trim()
                                : '';
                        const pkg = new AndroidPackage(
                            pathName,
                            version,
                            description,
                            locationOfPack
                        );
                        if (path.startsWith('platforms;android-')) {
                            packages.platforms.push(pkg);
                        } else {
                            packages.systemImages.push(pkg);
                        }
                    }
                }

                if (lines[i].indexOf('Available Packages:') > -1) {
                    break;
                }
            }
        }
        return packages;
    }

    public platforms: AndroidPackage[] = [];
    public systemImages: AndroidPackage[] = [];

    public isEmpty(): boolean {
        return this.platforms.length < 1 && this.systemImages.length < 1;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class AndroidPackage {
    get platformAPI(): string {
        const tokens: string[] = this.path.split(';');
        return tokens.length > 0 ? tokens[0] : '';
    }

    get platformEmulatorImage(): string {
        const tokens: string[] = this.path.split(';');
        return tokens.length > 1 ? tokens[1] : '';
    }

    get abi(): string {
        const tokens: string[] = this.path.split(';');
        return tokens.length > 2 ? tokens[2] : '';
    }

    public path: string;
    public version: Version;
    public description: string;
    public location: string;

    constructor(
        path: string,
        version: Version,
        description: string,
        location: string
    ) {
        this.path = path;
        this.version = version;
        this.description = description;
        this.location = location;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class AndroidVirtualDevice {
    public static parseRawString(rawString: string): AndroidVirtualDevice[] {
        const avds = AndroidVirtualDevice.getAvdDefinitions(rawString);
        const devices: AndroidVirtualDevice[] = [];

        for (const avd of avds) {
            const name = AndroidVirtualDevice.getValueForKey(avd, 'name:');
            const device = AndroidVirtualDevice.getValueForKey(avd, 'device:');
            const path = AndroidVirtualDevice.getValueForKey(avd, 'path:');
            const target = AndroidVirtualDevice.getValueForKey(avd, 'target:');
            const api = AndroidVirtualDevice.getValueForKey(avd, 'based on:');

            if (name && device && path && target && api) {
                devices.push(
                    new AndroidVirtualDevice(name, device, path, target, api)
                );
            }
        }

        return devices;
    }

    /*
       When we run 'avdmanager list avd' it returns the results (along with any erros)
       as raw string in the following format:

        Available Android Virtual Devices:
            <device definition>
        ---------
            <device definition>
        ---------
            <device definition>

        The following Android Virtual Devices could not be loaded:
            <device error info>
        ---------
            <device error info>
        ---------
            <device error info>

       In the following method, we parse the raw string result and break it up into
       <device definition> chunks, and skip the <device error info> sections
    */
    private static getAvdDefinitions(rawString: string): string[][] {
        // get rid of the error sections (if any)
        const errIdx = rawString.indexOf('\n\n');
        const cleanedRawString =
            errIdx > 0 ? rawString.substring(0, errIdx - 1) : rawString;

        const lowerCasedRawString = cleanedRawString.toLowerCase();
        let position = 0;
        const results: string[][] = [];

        // now parse the device definition sections
        while (position !== -1) {
            const startIdx = lowerCasedRawString.indexOf('name:', position);
            let endIdx = -1;

            if (startIdx > -1) {
                const sepIdx = lowerCasedRawString.indexOf('---', startIdx);
                endIdx = sepIdx > -1 ? sepIdx - 1 : -1;

                let chunk =
                    endIdx > -1
                        ? cleanedRawString.substring(startIdx, endIdx)
                        : cleanedRawString.substring(startIdx);
                chunk = chunk.replace('Tag/ABI:', '\nTag/ABI:'); // put ABI info on a line of its own
                const split = chunk.split('\n');
                results.push(split);
            }

            position = endIdx;
        }

        return results;
    }

    private static getValueForKey(array: string[], key: string): string | null {
        for (const item of array) {
            const trimmed = item.trim();

            if (trimmed.toLowerCase().startsWith(key.toLowerCase())) {
                const value = trimmed.substring(key.length + 1).trim(); // key.length + 1 to skip over ':' separator
                return value;
            }
        }
        return null;
    }

    public name: string;
    public displayName: string;
    public deviceName: string;
    public path: string;
    public target: string;
    public api: string;

    constructor(
        name: string,
        deviceName: string,
        path: string,
        target: string,
        api: string
    ) {
        this.name = name;
        this.displayName = name.replace(/[_-]/gi, ' ').trim(); // eg. Pixel_XL --> Pixel XL, tv-emulator --> tv emulator
        this.deviceName = deviceName.replace(/\([^\(]*\)/gi, '').trim(); // eg. Nexus 5X (Google) --> Nexus 5X
        this.path = path.trim();
        this.target = target.replace(/\([^\(]*\)/gi, '').trim(); // eg. Google APIs (Google Inc.) --> Google APIs
        this.api = api.trim();
    }

    public toString(): string {
        return `${this.displayName}, ${this.deviceName}, ${this.api}`;
    }
}
