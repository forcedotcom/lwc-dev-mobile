/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import fs from 'fs';
import { Version } from './Common';
import { CommonUtils } from './CommonUtils';

export class AndroidPackages {
    public static parseRawPackagesString(
        rawStringInput: string
    ): AndroidPackages {
        const packages: AndroidPackages = new AndroidPackages();

        const installedPkgsHeader = 'installed packages:';
        const availablePkgsHeader = 'available packages:';
        const headerSeparator = '----\n';

        const lowerCaseRawInput = rawStringInput.toLowerCase();
        let startIndx = lowerCaseRawInput.indexOf(installedPkgsHeader);
        const endIndx = lowerCaseRawInput.indexOf(availablePkgsHeader);
        if (startIndx < 0 || endIndx <= startIndx) {
            return packages;
        }

        const sepIndx = lowerCaseRawInput.indexOf(headerSeparator, startIndx);
        startIndx =
            sepIndx > startIndx
                ? sepIndx + headerSeparator.length
                : startIndx + installedPkgsHeader.length;
        const rawString = rawStringInput.substring(startIndx, endIndx).trim();

        const pkgDefinitions = rawString.split('\n\n');
        for (const pkgDefinition of pkgDefinitions) {
            const lines = pkgDefinition.split('\n');
            const path = lines.length > 0 ? lines[0].trim() : '';
            if (
                path.startsWith('platforms;android-') ||
                path.startsWith('system-images;android-')
            ) {
                const pathName = path
                    .replace('platforms;', '')
                    .replace('system-images;', '');

                let apiVersionString = pathName.replace('android-', '');
                if (apiVersionString.indexOf(';') >= 0) {
                    apiVersionString = apiVersionString.substring(
                        0,
                        apiVersionString.indexOf(';')
                    );
                }
                const apiVersion = Version.from(apiVersionString);

                let description = CommonUtils.getValueForKey(
                    lines,
                    'description:'
                );
                if (description == null) {
                    description = '';
                }

                let location = CommonUtils.getValueForKey(
                    lines,
                    'installed location:'
                );
                if (location == null) {
                    location = '';
                }

                const pkg = new AndroidPackage(
                    pathName,
                    apiVersion,
                    description,
                    location
                );
                if (path.startsWith('platforms;android-')) {
                    packages.platforms.push(pkg);
                } else {
                    packages.systemImages.push(pkg);
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
            const name = CommonUtils.getValueForKey(avd, 'name:');
            const device = CommonUtils.getValueForKey(avd, 'device:');
            const path = CommonUtils.getValueForKey(avd, 'path:');
            const target = CommonUtils.getValueForKey(avd, 'target:');
            const api = CommonUtils.getValueForKey(avd, 'based on:');

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

    private static getDefinitionFromConfigFile(notLoadedAVD: string): string[] {
        const result: string[] = [];

        const split = notLoadedAVD.split('\n');
        const path = CommonUtils.getValueForKey(split, 'path:');
        const configPath = path != null ? `${path}/config.ini` : './config.ini';

        try {
            if (fs.existsSync(configPath)) {
                const data = fs
                    .readFileSync(configPath, 'utf8')
                    .toString()
                    .split('\n');

                const avdName = CommonUtils.getValueForKey(split, 'name:');
                if (avdName != null) {
                    result.push(`Name: ${avdName}`);
                }

                const avdPath = CommonUtils.getValueForKey(split, 'path:');
                if (avdPath != null) {
                    result.push(`Path: ${avdPath}`);
                }

                const deviceName = CommonUtils.getValueForKey(
                    data,
                    'hw.device.name'
                );
                if (deviceName != null) {
                    result.push(`Device: ${deviceName}`);
                }

                const target = CommonUtils.getValueForKey(data, 'tag.display');
                if (target != null) {
                    result.push(`Target: ${target}`);
                }

                let image = CommonUtils.getValueForKey(data, 'image.sysdir.1');
                if (image != null) {
                    image = image.replace('system-images/', '');
                    const parts = image.split('/').filter((v) => v);
                    if (parts.length > 1) {
                        const apiPkg = parts[0].replace(
                            'android-',
                            'Android API '
                        );

                        parts.shift();
                        const abi = parts.join('/');

                        result.push(`Based on: ${apiPkg}`);
                        result.push(`Tag/ABI: ${abi}`);
                    }
                }
            }
        } catch {
            // if we can't parse info about this AVD from its config file
            // afor ny reasons, just ignore and continue.
        }

        return result;
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
        this.deviceName = deviceName.replace(/\([^\(]*\)/, '').trim(); // eg. Nexus 5X (Google) --> Nexus 5X
        this.path = path.trim();
        this.target = target.replace(/\([^\(]*\)/, '').trim(); // eg. Google APIs (Google Inc.) --> Google APIs
        this.api = api.replace('Android', '').trim(); // eg. Android API 29 --> API 29
    }

    public toString(): string {
        return `${this.displayName}, ${this.deviceName}, ${this.api}`;
    }
}
