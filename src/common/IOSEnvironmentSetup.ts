import * as reqs from './Requirements';
import { XcodeUtils } from './IOSUtils';
import { Messages, Logger } from '@salesforce/core';
import util from 'util';
import childProcess from 'child_process';
import * as iOSConfig from '../config/iosconfig.json';

const exec = util.promisify(childProcess.exec);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'setup');

export class IOSEnvironmentSetup extends reqs.BaseSetup {

    //NOTE: The following properties are just place holders to help with typescript compile.
    private title: string = '';
    private fulfilledMessage: string = '';
    private unfulfilledMessage: string = '';
    
    constructor(logger: Logger) {
        super(logger);
        super.requirements = [
            {
                title: `${messages.getMessage('ios:reqs:macos:title')}`,
                checkFunction: this.isSupportedEnvironment,
                fulfilledMessage: `${messages.getMessage('ios:reqs:macos:fulfilledMessage')}`,
                unfulfilledMessage:`${messages.getMessage('ios:reqs:macos:unfulfilledMessage')}`,
                logger: logger   
            },
            {
                title: `${messages.getMessage('ios:reqs:xcode:title')}`,
                checkFunction: this.isXcodeInstalled,
                fulfilledMessage: `${messages.getMessage('ios:reqs:xcode:fulfilledMessage')}`,
                unfulfilledMessage:
                `${messages.getMessage('ios:reqs:xcode:unfulfilledMessage')}`,
                logger: logger  
            },
            {
                title: `${messages.getMessage('ios:reqs:simulator:title')}`,
                checkFunction: this.hasSupportedSimulatorRuntime,
                fulfilledMessage:
                `${messages.getMessage('ios:reqs:simulator:fulfilledMessage')}`,
                unfulfilledMessage: `${messages.getMessage('ios:reqs:simulator:unfulfilledMessage')}`,
                logger: logger  
            }
        ];
    }

    static executeCommand(command: string): Promise<{stdout: string, stderr: string}> {
        return XcodeUtils.executeCommand(command);
    }

    async isSupportedEnvironment(): Promise<string> {
        const unameCommand: string = '/usr/bin/uname';
        try {
            this.logger.info('Executing a check for supported environment');
            const { stdout } = await IOSEnvironmentSetup.executeCommand(unameCommand);
            const unameOutput = stdout.trim();
            if (unameOutput === 'Darwin') {
                return new Promise<string>((resolve, reject) =>
                    resolve(this.fulfilledMessage)
                );
            } else {
                return new Promise<string>((resolve, reject) =>
                    reject(
                        `'${unameOutput}' ${this.unfulfilledMessage}`
                    )
                );
            }
        } catch (unameError) {
            return new Promise<string>((resolve, reject) =>
                reject(
                    `${this.unfulfilledMessage} The command '${unameCommand}' failed: ${unameError}, error code: ${unameError.code}`
                )
            );
        }
    }

    async isXcodeInstalled(): Promise<string> {
        const xcodeSelectCommand: string = '/usr/bin/xcode-select -p';
        try {
            this.logger.info('Executing a check for Xcode environment');
            const { stdout, stderr } = await IOSEnvironmentSetup.executeCommand(xcodeSelectCommand);
            if (stdout) {
                const developmentLibraryPath = `${stdout}`.trim();
                return new Promise<string>((resolve, reject) =>
                    resolve(
                        `${this.fulfilledMessage}: ${developmentLibraryPath}`
                    )
                );
            } else {
                return new Promise<string>((resolve, reject) =>
                    reject(
                        `${this.unfulfilledMessage} Error output: ${stderr ||
                            'None'}`
                    )
                );
            }
        } catch (xcodeSelectError) {
            return new Promise<string>((resolve, reject) =>
                reject(
                    `${this.unfulfilledMessage}: ${xcodeSelectError}, error code: ${xcodeSelectError.code}`
                )
            );
        }
    }

    async hasSupportedSimulatorRuntime(): Promise<string> {
        try {
            this.logger.info('Executing a check for iOS runtimes');
            const configuredRuntimes = await XcodeUtils.getSimulatorRuntimes();
            const supportedRuntimes: Array<string> =
            iOSConfig.supportedRuntimes;
            let rtIntersection = supportedRuntimes.filter(supportedRuntime => {
                const responsiveRuntime = configuredRuntimes.find(
                    configuredRuntime =>
                        configuredRuntime.startsWith(supportedRuntime)
                );
                return responsiveRuntime !== undefined;
            });
            if (rtIntersection.length > 0) {
                return new Promise<string>((resolve, reject) =>
                    resolve(
                        `${this.fulfilledMessage} ${rtIntersection}.`
                    )
                );
            } else {
                return new Promise<string>((resolve, reject) =>
                    reject(
                        `${this.unfulfilledMessage} ${supportedRuntimes}.`
                    )
                );
            }
        } catch (supportedRuntimesError) {
            return new Promise<string>((resolve, reject) =>
                reject(`${this.unfulfilledMessage}. Error retrieving supported runtimes: ${supportedRuntimesError}`
                )
            );
        }
    }
}

// Test!
// let envSetup = new IOSEnvironmentSetup();
// envSetup.executeSetup();
