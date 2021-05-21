/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { LwrApp } from 'lwr';
import { LwrGlobalConfig } from '@lwrjs/types';
import {
    DirModuleRecord,
    LwrRoute,
    ServiceEntry
} from '@lwrjs/types/build/config';

import fs from 'fs';
import path from 'path';
import os from 'os';

export class LwrServerUtils {
    public static async startLwrServer(
        componentName: string,
        projectDir: string
    ): Promise<string> {
        // Note: Instead of require('lwr') if we use an import statement at the top of this file the unit tests would fail
        //       to run with the following weird error message:
        //
        //    Cannot find module '@lwrjs/app-service/identity' from 'node_modules/@lwrjs/view-registry/build/cjs/utils.cjs'
        //
        //       This is the only reason why we reference createServer using a require statement instead of an import.
        const lwrApp = require('lwr').createServer(
            LwrServerUtils.getMergedLwrConfig(componentName, projectDir)
        );

        const runtimeConfig = lwrApp.getConfig();

        return lwrApp
            .listen(() => {
                // tslint:disable-next-line: no-console
                console.log(
                    `Listening on port ${runtimeConfig.port} ( mode = ${runtimeConfig.serverMode} , type = ${runtimeConfig.serverType} )`
                );
                LwrServerUtils.setServerIdleTimeout(lwrApp);
            })
            .then(() => {
                return Promise.resolve(`${runtimeConfig.port}`);
            });
    }

    public static getModifiedModuleProviders(): ServiceEntry[] {
        // We have to jump through the hoop of creating a temporary instance of an LwrApp because
        // DEFAULT_MODULE_PROVIDERS which is defined in @lwrjs/core/src/env-config.ts is not exported.
        // Otherwise we could have just used DEFAULT_MODULE_PROVIDERS to get the default providers.
        const cacheDirectory = path.join(
            os.tmpdir(),
            '__temporary_cache_to_be_deleted__'
        );
        const tempServer = require('lwr').createServer({
            cacheDir: cacheDirectory
        });
        const config = tempServer.getConfig();
        tempServer.close();

        // cleanup the fake cache folder that is created
        fs.rmdirSync(cacheDirectory, { recursive: true });

        // Use our custom provider as the first item in the list. If it cannot resolve then use the
        // rest of the default providers (all except lwc-module-provider which our custom provider replaces).
        const newProviders: ServiceEntry[] = [
            [path.resolve(`${__dirname}/CustomLwcModuleProvider.js`), undefined]
        ];
        config.moduleProviders.forEach((provider: ServiceEntry) => {
            if (provider[0] !== '@lwrjs/lwc-module-provider') {
                newProviders.push(provider);
            }
        });

        return newProviders;
    }

    public static getMergedLwrConfig(
        componentName: string,
        projectDir: string
    ): LwrGlobalConfig {
        const nextPort = LwrServerUtils.getNextServerPort();
        const cacheDirectory = path.resolve(`${projectDir}/__lwr_cache__`);

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
        const modifiedModuleProviders = LwrServerUtils.getModifiedModuleProviders();

        // e.g: /LWC-Mobile-Samples/HelloWorld/force-app/main/default/lwc/helloWorld
        const componentFullPath = path.resolve(
            path.join(projectDir, componentName)
        );

        // e.g: /LWC-Mobile-Samples/HelloWorld/force-app/main/default
        const twoLevelUp = path.resolve(path.join(componentFullPath, '../../'));

        // e.g: lwc/helloWorld
        const rootComp = componentFullPath.replace(
            `${twoLevelUp}${path.sep}`,
            ''
        );

        const lwcModuleRecord: DirModuleRecord = {
            dir: twoLevelUp
        };

        const defaultLwrRoute: LwrRoute = {
            id: rootComp,
            path: '/',
            rootComponent: rootComp
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
                lwrJsonConfig.cacheDir = cacheDirectory;
            }

            if (!lwrJsonConfig.lwc) {
                lwrJsonConfig.lwc = {
                    modules: [lwcModuleRecord]
                };
            } else {
                lwrJsonConfig.lwc.modules.unshift(lwcModuleRecord);
            }

            if (!lwrJsonConfig.moduleProviders) {
                lwrJsonConfig.moduleProviders = modifiedModuleProviders;
            } else {
                lwrJsonConfig.moduleProviders.unshift(
                    ...modifiedModuleProviders
                );
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
                cacheDir: cacheDirectory,
                lwc: {
                    modules: [lwcModuleRecord]
                },
                moduleProviders: modifiedModuleProviders,
                routes: [defaultLwrRoute]
            };

            if (nextPort) {
                lwrGlobalConfig.port = nextPort;
            }

            return lwrGlobalConfig;
        }
    }

    public static setServerIdleTimeout(
        lwrApp: LwrApp,
        timeoutMinutes: number = 30
    ) {
        // Ideally LWR should provide API for setting an idle timeout for the server.
        // But they currently don't have this feature so we jump through a little hoop
        // here to set an idle timeout detection mechanism. We do this b/c every time
        // the Preview command is invoked, it will launch a new server on a port and
        // we don't want to leave server processes running in the background on a
        // user's machine. So we add this detection and when a server is idle for a
        // given amount of time, we will then close its connection and exit the process.
        // tslint:disable:no-string-literal
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

    public static getNextServerPort(): number | undefined {
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
            const ports = LwrServerUtils.getPortNumberForProcesses(
                processIds
            ).sort();
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

    public static getPortNumberForProcesses(processIds: string[]): number[] {
        const ports: number[] = [];
        try {
            let grepParams = '';
            let findstrParams = '';
            for (const pid of processIds) {
                if (pid.trim()) {
                    grepParams = grepParams + ` -e ${pid.trim()}`;
                    findstrParams = findstrParams + ` ${pid.trim()}`;
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
                    const portNumber = parseInt(portString, 10);
                    if (!Number.isNaN(portNumber)) {
                        ports.push(portNumber);
                    }
                } catch {
                    // ignore and continue
                }
            }
        } catch {
            // ignore and continue
        }

        return ports;
    }
}
