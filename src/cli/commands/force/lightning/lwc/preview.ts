/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { AndroidLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidLauncher';
import {
    CommandLineUtils,
    FlagsConfigType
} from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import { IOSLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSLauncher';
import { PlatformConfig } from '@salesforce/lwc-dev-mobile-core/lib/common/PlatformConfig';
import {
    AndroidAppPreviewConfig,
    IOSAppPreviewConfig
} from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewConfigFile';
import { PreviewUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewUtils';
import {
    CommandRequirements,
    HasRequirements,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as configSchema from './previewConfigurationSchema.json';

import { createServer, LwrApp } from 'lwr';
import { LwrGlobalConfig } from '@lwrjs/types';
import {
    DirModuleRecord,
    LwrRoute,
    ServiceEntry
} from '@lwrjs/types/build/config';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'preview');

export class Preview extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static args = [{ name: 'file' }];

    public static examples = [
        `$ sfdx force:lightning:lwc:preview -p iOS -t LWCSim2 -n HelloWordComponent`,
        `$ sfdx force:lightning:lwc:preview -p Android -t LWCEmu2 -n HelloWordComponent`
    ];

    public static flagsConfig = {
        // flag with a value (-n, --name=VALUE)
        componentname: flags.string({
            char: 'n',
            description: messages.getMessage('componentnameFlagDescription'),
            required: true
        }),
        configfile: flags.string({
            char: 'f',
            description: messages.getMessage('configFileFlagDescription'),
            required: false
        }),
        confighelp: flags.help({
            default: false,
            description: messages.getMessage('configHelpFlagDescription'),
            required: false
        }),
        projectdir: flags.string({
            char: 'd',
            description: messages.getMessage('projectDirFlagDescription'),
            required: false
        }),
        target: flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
            required: false
        }),
        targetapp: flags.string({
            char: 'a',
            description: messages.getMessage('targetAppFlagDescription'),
            required: false
        }),
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.Platform, true)
    };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

    private deviceName: string = '';
    private componentName: string = '';
    private targetApp: string = '';
    private projectDir: string = '';
    private configFilePath: string = '';
    private appConfig:
        | IOSAppPreviewConfig
        | AndroidAppPreviewConfig
        | undefined;

    public async run(): Promise<any> {
        this.logger.info(`Preview command invoked for ${this.flags.platform}`);

        return this.validateInputParameters() // validate input
            .then(() => {
                return RequirementProcessor.execute(this.commandRequirements); // verify requirements
            })
            .then(() => {
                // then launch the preview if all validations have passed
                this.logger.info(
                    'Setup requirements met, continuing with preview'
                );
                return this.launchPreview();
            })
            .catch((error) => {
                this.logger.warn(`Preview failed for ${this.flags.platform}.`);
                return Promise.reject(error);
            });
    }

    // TODO: Preview command takes quite a few command flags/parameters compared to other commands.
    //       Furthermore, the flags need to be processed more than in other commands which
    //       makes validating them at flagConfig's "validate" method more difficult.
    //
    //       In the future refactoring we should seek to simplify validateInputParameters so that
    //       we can take advantage of flagConfig's "validate".
    private async validateInputParameters(): Promise<void> {
        const defaultDeviceName = CommandLineUtils.platformFlagIsIOS(
            this.flags.platform
        )
            ? PlatformConfig.iOSConfig().defaultSimulatorName
            : PlatformConfig.androidConfig().defaultEmulatorName;

        this.deviceName = CommandLineUtils.resolveFlag(
            this.flags.target,
            defaultDeviceName
        );

        this.componentName = CommandLineUtils.resolveFlag(
            this.flags.componentname,
            ''
        ).trim();

        this.targetApp = CommandLineUtils.resolveFlag(
            this.flags.targetapp,
            PreviewUtils.BROWSER_TARGET_APP
        );

        this.projectDir = CommonUtils.resolveUserHomePath(
            CommandLineUtils.resolveFlag(this.flags.projectdir, process.cwd())
        );

        const configFileName = CommonUtils.resolveUserHomePath(
            CommandLineUtils.resolveFlag(this.flags.configfile, '')
        );

        this.configFilePath = path.normalize(
            path.resolve(this.projectDir, configFileName)
        );

        const hasConfigFile =
            configFileName.length > 0 && fs.existsSync(this.configFilePath);

        const isBrowserTargetApp = PreviewUtils.isTargetingBrowser(
            this.targetApp
        );

        this.logger.debug('Validating Preview command inputs.');

        // check if user provided a config file when targetapp=browser
        // and warn them that the config file will be ignored.
        if (isBrowserTargetApp && hasConfigFile) {
            this.logger.warn(
                messages.getMessage('ignoringConfigFileFlagDescription')
            );
        }

        if (this.componentName.length === 0) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage(
                        'error:invalidComponentNameFlagsDescription'
                    ),
                    'lwc-dev-mobile',
                    Preview.examples
                )
            );
        }

        if (isBrowserTargetApp === false && hasConfigFile === false) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage(
                        'error:invalidConfigFile:missingDescription',
                        [this.configFilePath]
                    ),
                    'lwc-dev-mobile',
                    Preview.examples
                )
            );
        }

        if (isBrowserTargetApp === false && hasConfigFile === true) {
            // 1. validate config file against schema
            const validationResult = await PreviewUtils.validateConfigFileWithSchema(
                this.configFilePath,
                configSchema
            );
            if (validationResult.passed === false) {
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidConfigFile:genericDescription',
                            [this.configFilePath, validationResult.errorMessage]
                        ),
                        'lwc-dev-mobile',
                        Preview.examples
                    )
                );
            }

            // 2. validate that a matching app configuration is included in the config file
            const configFileContent = PreviewUtils.loadConfigFile(
                this.configFilePath
            );
            this.appConfig = configFileContent.getAppConfig(
                this.flags.platform,
                this.targetApp
            );
            if (this.appConfig === undefined) {
                const errMsg = messages.getMessage(
                    'error:invalidConfigFile:missingAppConfigDescription',
                    [this.targetApp, this.flags.platform]
                );
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidConfigFile:genericDescription',
                            [this.configFilePath, errMsg]
                        ),
                        'lwc-dev-mobile',
                        Preview.examples
                    )
                );
            }
        }

        return Promise.resolve();
    }

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Preview.examples;
        return super
            .init()
            .then(() => Logger.child('force:lightning:lwc:preview', {}))
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    protected _help(): never {
        const isCommandHelp =
            this.argv.filter(
                (v) => v.toLowerCase() === '-h' || v.toLowerCase() === '--help'
            ).length > 0;

        if (isCommandHelp) {
            super._help();
        } else {
            const message = messages.getMessage('configFileHelpDescription');
            // tslint:disable-next-line: no-console
            console.log(`${message}`);
        }

        return this.exit(0);
    }

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const requirements: CommandRequirements = {};
            requirements.setup = CommandLineUtils.platformFlagIsAndroid(
                this.flags.platform
            )
                ? new AndroidEnvironmentRequirements(
                      this.logger,
                      this.flags.apilevel
                  )
                : new IOSEnvironmentRequirements(this.logger);
            this._requirements = requirements;
        }

        return this._requirements;
    }

    private async launchPreview(): Promise<void> {
        // At this point all of the inputs/parameters have been verified and parsed so we can just use them.

        let appBundlePath: string | undefined;

        if (
            PreviewUtils.isTargetingBrowser(this.targetApp) === false &&
            this.appConfig
        ) {
            try {
                CommonUtils.startCliAction(
                    messages.getMessage('previewAction'),
                    messages.getMessage('previewFetchAppBundleStatus')
                );
                appBundlePath = PreviewUtils.getAppBundlePath(
                    path.dirname(this.configFilePath),
                    this.appConfig
                );
            } catch (error) {
                CommonUtils.stopCliAction(
                    messages.getMessage('previewFetchAppBundleFailureStatus')
                );
                return Promise.reject(error);
            }
        }

        if (CommandLineUtils.platformFlagIsIOS(this.flags.platform)) {
            const config =
                this.appConfig && (this.appConfig as IOSAppPreviewConfig);
            return this.launchIOS(
                this.deviceName,
                this.componentName,
                this.projectDir,
                appBundlePath,
                this.targetApp,
                config
            );
        } else {
            const config =
                this.appConfig && (this.appConfig as AndroidAppPreviewConfig);
            return this.launchAndroid(
                this.deviceName,
                this.componentName,
                this.projectDir,
                appBundlePath,
                this.targetApp,
                config
            );
        }
    }

    private async launchIOS(
        deviceName: string,
        componentName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: IOSAppPreviewConfig | undefined
    ): Promise<void> {
        const launcher = new IOSLauncher(deviceName);

        return this.startLwrServer(
            componentName,
            projectDir
        ).then((serverPort) =>
            launcher.launchPreview(
                componentName,
                projectDir,
                appBundlePath,
                targetApp,
                appConfig,
                serverPort
            )
        );
    }

    private async launchAndroid(
        deviceName: string,
        componentName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: AndroidAppPreviewConfig | undefined
    ): Promise<void> {
        const launcher = new AndroidLauncher(deviceName);

        return this.startLwrServer(
            componentName,
            projectDir
        ).then((serverPort) =>
            launcher.launchPreview(
                componentName,
                projectDir,
                appBundlePath,
                targetApp,
                appConfig,
                serverPort
            )
        );
    }

    private async startLwrServer(
        componentName: string,
        projectDir: string
    ): Promise<string> {
        const lwrApp = createServer(
            this.getMergedLwrConfig(componentName, projectDir)
        );

        const runtimeConfig = lwrApp.getConfig();

        return lwrApp
            .listen(() => {
                // tslint:disable-next-line: no-console
                console.log(
                    `Listening on port ${runtimeConfig.port} ( mode = ${runtimeConfig.serverMode} , type = ${runtimeConfig.serverType} )`
                );
                this.setServerIdleTimeout(lwrApp);
            })
            .then(() => {
                return Promise.resolve(`${runtimeConfig.port}`);
            });
    }

    private getModifiedModuleProviders(): ServiceEntry[] {
        // We have to jump through the hoop of creating a temporary instance of an LwrApp because
        // DEFAULT_MODULE_PROVIDERS which is defined in @lwrjs/core/src/env-config.ts is not exported.
        // Otherwise we could have just used DEFAULT_MODULE_PROVIDERS to get the default providers.
        const cacheDir = path.join(
            os.tmpdir(),
            '__temporary_cache_to_be_deleted__'
        );
        const tempServer = createServer({ cacheDir: cacheDir });
        const config = tempServer.getConfig();
        tempServer.close();

        // cleanup the fake cache folder that is created
        fs.rmdirSync(cacheDir, { recursive: true });

        // Use our custom provider as the first item in the list. If it cannot resolve then use the
        // rest of the default providers (all except lwc-module-provider which our custom provider replaces).
        const newProviders: ServiceEntry[] = [
            [
                path.resolve(
                    `${__dirname}/../../../../../common/CustomLwcModuleProvider.js`
                ),
                undefined
            ]
        ];
        config.moduleProviders.forEach((provider: ServiceEntry) => {
            if (provider[0] !== '@lwrjs/lwc-module-provider') {
                newProviders.push(provider);
            }
        });

        return newProviders;
    }

    private getMergedLwrConfig(componentName: string, projectDir: string) {
        const nextPort = this.getNextServerPort();
        const cacheDir = path.resolve(`${projectDir}/__lwr_cache__`);

        // Here we are doing 2 things:
        // 1. We are going to inject our own module provider b/c LWR requires the apps to provide their own npm packages
        // where as when the user using SFDX to create a project for LWC components, that project won't have any of the
        // packages needed by LWR. However our plugin does have those packages, but LWR does not seem to have a way of
        // allowing for a 'backup location' for looking up packages. So to work around that we create a custom module provider
        // that would attempt that resolving packages using the 'node_modules' of our plugin.
        //
        //
        // 2. We are explicitly removing @lwrjs/lwc-module-provider from the list of built-in providers that is provided by LWR
        // (and instead use our custom provider from #1 above which internally calls into @lwrjs/lwc-module-provider).
        // This is b/c @lwrjs/lwc-module-provider throws an exception when it cannot resolve a package (see https://sfdc.co/bFOXlQ).
        // But this seems to break the logic that LWR is using in LwrModuleRegistry.delegateGetModuleEntryOnServices() (see https://sfdc.co/bVPnkl)
        // In that function they loop over all of their providers and one-by-one ask each to resolve a module. If it cannot
        // resolve a module then they will go to the next provider and ask it to resolve the module, and so on. The logic there
        // is that if all of the providers can't resolve, only then an exception is thrown. But b/c @lwrjs/lwc-module-provider
        // throws an exception instead of returning undefined/null it breaks that logic and so the looping won't continue to the
        // other providers. In our custom provider we explicity wrap a try-catch around our call into @lwrjs/lwc-module-provider and
        // return undefined/null just so that this looping can continue.
        const moduleProviders = this.getModifiedModuleProviders();

        // e.g: /LWC-Mobile-Samples/HelloWorld/force-app/main/default/lwc/helloWorld
        const componentFullPath = path.resolve(
            path.join(projectDir, componentName)
        );

        // e.g: /LWC-Mobile-Samples/HelloWorld/force-app/main/default
        const twoLevelUp = path.resolve(path.join(componentFullPath, '../../'));

        // e.g: lwc/helloWorld
        const rootComponent = componentFullPath.replace(
            `${twoLevelUp}${path.sep}`,
            ''
        );

        const lwcModuleRecord: DirModuleRecord = {
            dir: twoLevelUp
        };

        const defaultLwrRoute: LwrRoute = {
            id: rootComponent,
            path: '/',
            rootComponent: rootComponent
        };

        try {
            // If the user has provided an LWR config file then take it and add our custom entries to it
            const lwrJsonConfig: LwrGlobalConfig = CommonUtils.loadJsonFromFile(
                path.resolve(path.join(projectDir, 'lwr.config.json'))
            ) as LwrGlobalConfig;

            if (!lwrJsonConfig.port && nextPort) {
                lwrJsonConfig.port = nextPort;
            }

            if (!lwrJsonConfig.rootDir) {
                lwrJsonConfig.rootDir = projectDir;
            }

            if (!lwrJsonConfig.cacheDir) {
                lwrJsonConfig.cacheDir = cacheDir;
            }

            if (!lwrJsonConfig.lwc) {
                lwrJsonConfig.lwc = {
                    modules: [lwcModuleRecord]
                };
            } else {
                lwrJsonConfig.lwc.modules.unshift(lwcModuleRecord);
            }

            if (!lwrJsonConfig.moduleProviders) {
                lwrJsonConfig.moduleProviders = moduleProviders;
            } else {
                lwrJsonConfig.moduleProviders.unshift(...moduleProviders);
            }

            if (!lwrJsonConfig.routes) {
                lwrJsonConfig.routes = [defaultLwrRoute];
            } else {
                lwrJsonConfig.routes.unshift(defaultLwrRoute);
            }

            return lwrJsonConfig;
        } catch {
            // the user didn't provide an LWR config file so just create a config containing only our custom entries
            const lwrGlobalConfig: LwrGlobalConfig = {
                rootDir: projectDir,
                cacheDir: cacheDir,
                lwc: {
                    modules: [lwcModuleRecord]
                },
                moduleProviders: moduleProviders,
                routes: [defaultLwrRoute]
            };

            if (nextPort) {
                lwrGlobalConfig.port = nextPort;
            }

            return lwrGlobalConfig;
        }
    }

    private setServerIdleTimeout(lwrApp: LwrApp, timeoutMinutes: number = 30) {
        // Ideally LWR should provide API for setting an idle timeout for the server.
        // But they currently don't have this feature so we jump through a little hoop
        // here to set an idle timeout detection mechanism. We do this b/c every time
        // the Preview command is invoked, it will launch a new server on a port and
        // we don't want to leave server processes running in the background on a
        // user's machine. So we add this detection and when a server is idle for a
        // given amount of time, we will then close its connection and exit the process.
        const server = lwrApp['server'];
        if (server) {
            let timer: NodeJS.Timeout;
            const timeoutMilliseconds = timeoutMinutes * 60 * 1000;
            server.on('request', () => {
                if (timer) {
                    clearTimeout(timer);
                }

                timer = setTimeout(async () => {
                    // tslint:disable-next-line: no-console
                    console.log(
                        `Server idle for ${timeoutMinutes} minutes... shutting down`
                    );
                    await lwrApp.close();
                    process.exit(0);
                }, timeoutMilliseconds);
            });
        }
    }

    private getNextServerPort(): number | undefined {
        try {
            // The LWR server can be launched either via our Preview command or manually by the user from command line. Following
            // the LWR Recipes examples, the user is encouraged to create a script file named start-server.mjs to be used for
            // launching LWR server but the user doesn't have to use that name and can use any other name that they like. Whether
            // the LWR server is launched by our Preview command or manually by the user, the bottom line is that Node is used to
            // launch the LWR server process. So to find out the ports that are used, we will go ahead and find the process IDs
            // for all running Node processes and then find the ports (if any) that those processes are using to avoid using
            // those same ports.
            //
            // The upside of this approach is that we're guaranteed not to clash with the ports used by another LWR server,
            // regardless of whether those processes were launched via our Preview command, or via start-server.mjs script
            // or another script file. The downside is that it goes through all Node processes even those that are not used
            // for launching LWR server instances, so it would take slightly longer to determine the next available port.
            const getProcessCommand =
                process.platform === 'win32'
                    ? 'wmic process where "CommandLine Like \'%node%\'" get ProcessId | findstr -v "ProcessId"'
                    : `ps -ax | grep node | grep -v grep | awk '{print $1}'`;

            const result = CommonUtils.executeCommandSync(getProcessCommand);
            const processIds = result.split('\n');
            const ports = this.getPortNumberForProcesses(processIds).sort();
            const largest = ports[ports.length - 1];
            if (largest) {
                return largest + 2;
            } else {
                return undefined;
            }
        } catch {
            return undefined;
        }
    }

    private getPortNumberForProcesses(processIds: string[]): number[] {
        let ports: number[] = [];
        try {
            let grepParams = '';
            let findstrParams = '';
            for (const pid of processIds) {
                if (pid.trim()) {
                    grepParams = grepParams + ` -e ${pid.trim()}`;
                    findstrParams = findstrParams + ` ${pid}`;
                }
            }

            // all used TCP ports: lsof -Pn -iTCP -sTCP:LISTEN | grep TCP
            const cmd =
                process.platform === 'win32'
                    ? `netstat -ano -p tcp | findstr "LISTENING" | findstr "${findstrParams}"` // TCP  0.0.0.0:3000  0.0.0.0  LISTENING  4636
                    : `lsof -Pn -i6 -sTCP:LISTEN | grep ${grepParams}`; // node  87475 username  35u  IPv6  0x78e419ed04835b59  0t0  TCP  *:3000 (LISTEN)
            const results = CommonUtils.executeCommandSync(cmd).split('\n');

            for (const result of results) {
                try {
                    let idxStart = result.indexOf('TCP') + 3;
                    idxStart = result.indexOf(':', idxStart) + 1;
                    const idxEnd = result.indexOf(' ', idxStart);
                    const portString = result.substring(idxStart, idxEnd);
                    const portNumber = parseInt(portString);
                    if (!Number.isNaN(portNumber)) {
                        ports.push(portNumber);
                    }
                } catch {}
            }
        } catch {}

        return ports;
    }
}
