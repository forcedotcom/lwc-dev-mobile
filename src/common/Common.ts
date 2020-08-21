/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
export class MapUtils {
    public static filter<K, V>(
        map: Map<K, V>,
        predicate: (k: K, v: V) => boolean
    ) {
        const aMap = new Map<K, V>();
        if (map == null) {
            return aMap;
        }
        const entries = Array.from(map.entries());
        for (const [key, value] of entries) {
            if (predicate(key, value) === true) {
                aMap.set(key, value);
            }
        }
        return aMap;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class SetUtils {
    public static filter<V>(set: Set<V>, predicate: (v: V) => boolean) {
        const aSet = new Set<V>();
        if (set == null) {
            return aSet;
        }
        const entries = Array.from(set.entries());
        for (const [value] of entries) {
            if (predicate(value) === true) {
                aSet.add(value);
            }
        }
        return aSet;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class CommandLineUtils {
    public static IOS_FLAG = 'ios';
    public static ANDROID_FLAG = 'android';

    public static platformFlagIsIOS(input: string): boolean {
        if (input) {
            return input.toLowerCase() === CommandLineUtils.IOS_FLAG;
        }
        return false;
    }

    public static platformFlagIsAndroid(input: string): boolean {
        if (input) {
            return input.toLowerCase() === CommandLineUtils.ANDROID_FLAG;
        }
        return false;
    }

    public static platformFlagIsValid(platformFlag: string) {
        return (
            CommandLineUtils.platformFlagIsIOS(platformFlag) ||
            CommandLineUtils.platformFlagIsAndroid(platformFlag)
        );
    }

    public static resolveFlag(flag: any, defaultValue: string): string {
        const resolvedFlag = flag as string;
        if (resolvedFlag && resolvedFlag.length > 0) {
            return resolvedFlag;
        } else {
            return defaultValue;
        }
    }
}

// tslint:disable-next-line: max-classes-per-file
export class PreviewUtils {
    public static BROWSER_TARGET_APP = 'browser';

    public static isTargetingBrowser(targetApp: string): boolean {
        return (
            targetApp.trim().toLowerCase() === PreviewUtils.BROWSER_TARGET_APP
        );
    }

    public static getFormattedLaunchArgs(
        platformFlag: string,
        compName: string,
        projectDir: string,
        targetAppArguments: string
    ): string {
        const CUSTOM_ARGS_PREFIX = 'customargs';
        const COMPONENT_NAME_ARG_PREFIX = 'componentname';
        const PROJECT_DIR_ARG_PREFIX = 'projectdir';

        let formattedArgs = '';

        if (CommandLineUtils.platformFlagIsIOS(platformFlag)) {
            formattedArgs =
                `${COMPONENT_NAME_ARG_PREFIX}=${compName}` +
                ` ${PROJECT_DIR_ARG_PREFIX}=${projectDir}`;
            if (targetAppArguments.length > 0) {
                formattedArgs += ` ${CUSTOM_ARGS_PREFIX}=${targetAppArguments}`;
            }
        } else if (CommandLineUtils.platformFlagIsAndroid(platformFlag)) {
            formattedArgs =
                `--es "${COMPONENT_NAME_ARG_PREFIX}" "${compName}"` +
                ` --es "${PROJECT_DIR_ARG_PREFIX}" "${projectDir}"`;
            if (targetAppArguments.length > 0) {
                formattedArgs += ` --es "${CUSTOM_ARGS_PREFIX}" "${targetAppArguments}"`;
            }
        }

        return formattedArgs;
    }

    public static getComponentPreviewUrl(
        platformFlag: string,
        compName: string
    ): string {
        const compPath = PreviewUtils.prefixRouteIfNeeded(compName);

        if (CommandLineUtils.platformFlagIsIOS(platformFlag)) {
            return `http://localhost:3333/lwc/preview/${compPath}`;
        } else {
            return `http://10.0.2.2:3333/lwc/preview/${compPath}`;
        }
    }

    private static prefixRouteIfNeeded(compName: string): string {
        if (compName.toLowerCase().startsWith('c/')) {
            return compName;
        }
        return 'c/' + compName;
    }
}
