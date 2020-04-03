import * as androidConfig from '../config/androidconfig.json';
import { AndroidPackage } from './AndroidTypes';
import childProcess, { ExecSyncOptions } from 'child_process';
import { Logger } from '@salesforce/core';
import { MapUtils } from './Common';
import path from 'path';
import util from 'util';

const execSync = childProcess.execSync;
const spawn = childProcess.spawn;
const exec = util.promisify(childProcess.exec);

export class AndroidSDKUtils {

    static ANDROID_HOME = process.env.ANDROID_HOME ? process.env.ANDROID_HOME : '';
    static EMULATOR_COMMAND = path.join(AndroidSDKUtils.ANDROID_HOME, 'emulator', 'emulator');
    static AVDMANAGER_COMMAND = path.join(AndroidSDKUtils.ANDROID_HOME, 'tools', 'bin',  'avdmanager');
    static ANDROID_LIST_TARGETS_COMMAND = AndroidSDKUtils.AVDMANAGER_COMMAND + ' list ' + 'target';
    static ANDROID_LIST_DEVICES_COMMAND = AndroidSDKUtils.AVDMANAGER_COMMAND + ' list ' + 'devices';
    static ANDROID_LIST_AVDS_COMMAND = AndroidSDKUtils.AVDMANAGER_COMMAND + ' list ' + 'avd';
    static ADB_SHELL_COMMAND = path.join(AndroidSDKUtils.ANDROID_HOME ,'platform-tools', 'adb');
    static ANDROID_SDK_MANAGER_NAME = 'sdkmanager';
    static ANDROID_SDK_MANAGER_CMD = path.join(AndroidSDKUtils.ANDROID_HOME, 'tools', 'bin', AndroidSDKUtils.ANDROID_SDK_MANAGER_NAME);
    static ANDROID_SDK_MANAGER_LIST_COMMAND = AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD + ' --list';
    static ANDROID_SDK_MANAGER_VERSION_COMMAND = AndroidSDKUtils.ANDROID_SDK_MANAGER_CMD + ' --version';
    static ADB_SHELL_COMMAND_VERSION = AndroidSDKUtils.ADB_SHELL_COMMAND + ' --version';

    private static logger: Logger = new Logger('force:lightning:mobile:android');

    private static packageCache: Map<string, AndroidPackage> = new Map();

    static setLogger(logger: Logger) {
        if (logger) {
            AndroidSDKUtils.logger = logger;
        }
    }

    static isCached(): boolean {
        return AndroidSDKUtils.packageCache.size > 0;
    }

    static executeCommand(command: string): string {
        return execSync(command, {stdio : ['ignore', 'pipe', 'ignore']}).toString();
    }

    static isAndroidHomeSet(): boolean {
        return process.env.ANDROID_HOME
            ? process.env.ANDROID_HOME.trim().length > 0
            : false;
    }

    static clearCaches() {
        AndroidSDKUtils.packageCache.clear();
    }

    static async isAndroidSDKToolsInstalled(): Promise<boolean> {
        return new Promise( async (resolve,reject) => {
            if (!AndroidSDKUtils.isAndroidHomeSet()) {
                reject(new Error('ANDROID_HOME is not set.'));
                return;
            }
            try {
                AndroidSDKUtils.executeCommand(AndroidSDKUtils.ANDROID_SDK_MANAGER_VERSION_COMMAND);
                resolve(true);
            } catch (err) {
               reject(err);
               return;
            }
        });
    }

    static async isAndroidSDKPlatformToolsInstalled(): Promise<boolean> {
        return new Promise( async (resolve,reject) => {
            if (!AndroidSDKUtils.isAndroidHomeSet()) {
                reject(new Error('ANDROID_HOME is not set.'));
                return;
            }
            try {
                let stdout = AndroidSDKUtils.executeCommand(AndroidSDKUtils.ADB_SHELL_COMMAND_VERSION);
                resolve(true);
            } catch (err) {
               reject(err);
               return;
            }
        });
    }

    static async fetchInstalledPackages(): Promise<Map<string, AndroidPackage>> {
        return new Promise<Map<string, AndroidPackage>>( (resolve, reject) => { 
            if (!AndroidSDKUtils.isAndroidHomeSet()) {
                reject(new Error('ANDROID_HOME is not set.'));
                return;
            }

            if (!AndroidSDKUtils.isCached()) {
                try {
                    let stdout = AndroidSDKUtils.executeCommand(AndroidSDKUtils.ANDROID_SDK_MANAGER_LIST_COMMAND);
                    if (stdout) {
                        let packages = AndroidPackage.parseRawString(stdout);
                        AndroidSDKUtils.packageCache = packages;
                    }
                } catch (err) {
                   reject(err);
                   return;
                }
            }
            resolve(AndroidSDKUtils.packageCache)
        });
   }

   static async findRequiredAndroidAPIPackage(): Promise<AndroidPackage> {
        return new Promise<AndroidPackage>( async (resolve, reject) => {
            try {
                let packages = await AndroidSDKUtils.fetchInstalledPackages();
                if (packages.size < 1) {
                    reject(new Error(`Could not find android api packages. Requires any one of these [${androidConfig.supportedRuntimes[0]} - ${androidConfig.supportedRuntimes[androidConfig.supportedRuntimes.length - 1]}]`));
                    return;
                }

                let filteredList: Array<string> = androidConfig.supportedRuntimes.filter((runtimeString) =>  packages.get('platforms;' + runtimeString) !== null);
                if (filteredList.length < 1) {
                    reject(new Error(`Could not locate a matching android api package. Requires any one of these [${androidConfig.supportedRuntimes[0]} - ${androidConfig.supportedRuntimes[androidConfig.supportedRuntimes.length - 1]}]`));
                    return;
                }
                // use the first one.
                let androidPackage = packages.get('platforms;' + filteredList[0]);
                resolve(androidPackage);
                return;

            } catch (error) {
                reject(new Error(`Could not find android api packages. ${error.errorMessage}`));
            }
        });
    }

    static async findRequiredBuildToolsPackage(): Promise<AndroidPackage> {
        return new Promise<AndroidPackage>( async (resolve, reject) => {
            try {
                let packages = await AndroidSDKUtils.fetchInstalledPackages();
                let matchingKeys: Array<string> = [];
                
                let range = `${androidConfig.supportedBuildTools[0]}.x.y-${androidConfig.supportedBuildTools[androidConfig.supportedBuildTools.length - 1]}.x.y`;   
                let versionRegex = androidConfig.supportedBuildTools.reduce((previous , current) => `${previous}|${current}`);
                packages.forEach( (value,key) => { 
                    // look for 29.x.y or 28.x.y and so on
                    if (key.match(`(build-tools;(${versionRegex}))[.][0-5][.][0-5]`) !== null) {
                        matchingKeys.push(key);
                    }
                });

                if (matchingKeys.length < 1) {
                    reject(new Error(`Could not locate a matching build tools package. Requires any one of these [${range}]`));
                    return;
                }

                matchingKeys.sort();
                matchingKeys.reverse();
                
                // use the first one.
                let androidPackage = packages.get(matchingKeys[0]);
                resolve(androidPackage);
                return;

            } catch (error) {
                reject(new Error(`Could not find build tools packages. ${error.errorMessage}`));
            }
        });
    }

    static async findRequiredEmulatorImages(): Promise<AndroidPackage> {
        return new Promise<AndroidPackage>( async (resolve, reject) => {
            try {
                let packages = await AndroidSDKUtils.fetchInstalledPackages();
                let installedAndroidPacakge = await AndroidSDKUtils.findRequiredAndroidAPIPackage();
                let matchingKeys: Array<string> = [];
                let platformAPI = installedAndroidPacakge.platformAPI();
                let imagesRegex = androidConfig.supportedImages.reduce((previous , current) => `${platformAPI};${previous}|${platformAPI};${current}`);

                packages.forEach( (value,key) => { 
                    if (key.match(`(system-images;(${imagesRegex}))`) !== null) {
                        matchingKeys.push(key);
                    }
                });
                if (matchingKeys.length < 1) {
                    reject(new Error(`Could not locate an emulator image. Requires any one of these [${androidConfig.supportedImages.join(',')} for ${[platformAPI]}]`));
                    return;
                }

                matchingKeys.sort();
                matchingKeys.reverse();

                // use the first one.
                let androidPackage = packages.get(matchingKeys[0]);
                resolve(androidPackage);
                return;

            } catch (error) {
                reject(new Error(`Could not find android emulator packages. ${error.errorMessage}`));
            }
        });
    }
}

 //AndroidSDKUtils.testMethod().then();


