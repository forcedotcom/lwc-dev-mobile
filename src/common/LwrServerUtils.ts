/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { createServer, LwrApp } from 'lwr';
import { LwrGlobalConfig } from '@lwrjs/types';
import {
    DirModuleRecord,
    LwrRoute,
    ServiceEntry
} from '@lwrjs/types/build/config';

import fs from 'fs';
import path from 'path';
import os from 'os';

const defaultServerTimeout = 30 * 60 * 1000; // 30 minutes

export class LwrServerUtils {
    public static async startLwrServer(
        componentName: string,
        projectDir: string,
        idleTimeout: number = defaultServerTimeout,
        exitOnIdle: boolean = true
    ): Promise<string> {
        const lwrApp = createServer(
            LwrServerUtils.getMergedLwrConfig(componentName, projectDir)
        );

        const runtimeConfig = lwrApp.getConfig();

        return lwrApp
            .listen(() => {
                // tslint:disable-next-line: no-console
                console.log(
                    `Listening on port ${runtimeConfig.port} ( mode = ${runtimeConfig.serverMode} , type = ${runtimeConfig.serverType} )`
                );
                LwrServerUtils.setServerIdleTimeout(lwrApp, idleTimeout, () => {
                    if (exitOnIdle) {
                        process.exit(0); // kill the process on server timeout
                    }
                });
            })
            .then(() => {
                return Promise.resolve(`${runtimeConfig.port}`);
            });
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
        // that would attempt at resolving packages using the 'node_modules' of our plugin.
        //
        //
        // 2. Due to bug W-9230056 we are using our internal LWC Module provider in place of the default LWC module provider from LWR
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

        let config: LwrGlobalConfig = {};
        try {
            // If the user has provided an LWR config file then take it and add our custom entries to it
            config = CommonUtils.loadJsonFromFile(
                path.resolve(path.join(projectDir, 'lwr.config.json'))
            ) as LwrGlobalConfig;
        } catch {
            // ignore and continue
        }

        if (!config.port && nextPort) {
            config.port = nextPort;
        }

        if (!config.rootDir) {
            config.rootDir = projectDir;
        }

        if (!config.cacheDir) {
            config.cacheDir = cacheDirectory;
        }

        if (!config.lwc) {
            config.lwc = {
                modules: [lwcModuleRecord]
            };
        } else {
            config.lwc.modules.unshift(lwcModuleRecord);
        }

        if (!config.moduleProviders) {
            config.moduleProviders = modifiedModuleProviders;
        } else {
            config.moduleProviders.unshift(...modifiedModuleProviders);
        }

        if (!config.routes) {
            config.routes = [defaultLwrRoute];
        } else {
            config.routes.unshift(defaultLwrRoute);
        }

        return config;
    }

    public static setServerIdleTimeout(
        app: LwrApp,
        timeout: number,
        callback: () => void
    ): void {
        // Ideally LWR should provide API for setting an idle timeout for the server.
        // But they currently don't have this feature so we jump through a little hoop
        // here to set an idle timeout detection mechanism. We do this b/c every time
        // the Preview command is invoked, it will launch a new server on a port and
        // we don't want to leave server processes running in the background on a
        // user's machine. So we add this detection and when a server is idle for a
        // given amount of time, we will then close its connection and exit the process.
        // tslint:disable:no-string-literal
        const server = app['server'];
        if (server) {
            let timer = LwrServerUtils.setTimeoutTimer(app, timeout, callback);
            server.on('request', () => {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = LwrServerUtils.setTimeoutTimer(app, timeout, callback);
            });
        }
    }

    public static getNextServerPort(): number | undefined {
        try {
            // Get a list of all TCP ports that are currently in use. Pick the highest port number
            // and then increment that by 2 to use as the new port for LWR server.
            const getUsedTCPPortsCommand =
                process.platform === 'win32'
                    ? 'netstat -ano -p tcp | findstr "LISTENING"' // output format: TCP  0.0.0.0:3000  0.0.0.0  LISTENING  4636
                    : 'lsof -Pn -iTCP -sTCP:LISTEN | grep TCP'; // output format: node  87475 username  35u  IPv6  0x78e419ed04835b59  0t0  TCP  *:3000 (LISTEN)

            const results = CommonUtils.executeCommandSync(
                getUsedTCPPortsCommand
            ).split('\n');

            const ports: number[] = [];
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
            ports.sort((a, b) => (a > b ? 1 : -1));
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

    private static getModifiedModuleProviders(): ServiceEntry[] {
        // We have to jump through the hoop of creating a temporary instance of an LwrApp because
        // DEFAULT_MODULE_PROVIDERS which is defined in @lwrjs/core/src/env-config.ts is not exported.
        // Otherwise we could have just used DEFAULT_MODULE_PROVIDERS to get the default providers.
        const cacheDirectory = path.join(
            os.tmpdir(),
            '__temporary_cache_to_be_deleted__'
        );
        const tempServer = createServer({
            cacheDir: cacheDirectory
        });
        const config = tempServer.getConfig();
        tempServer.close();

        // cleanup the fake cache folder that is created
        fs.rmdirSync(cacheDirectory, { recursive: true });

        // TODO: When bug W-9230056 is fixed, get rid of this mapping and just append our
        //       custom module provider directly to config.moduleProviders.
        const newProviders: ServiceEntry[] = config.moduleProviders.map(
            (provider) =>
                provider[0] === '@lwrjs/lwc-module-provider'
                    ? [
                          path.resolve(
                              `${__dirname}/InternalLwcModuleProvider.js`
                          ),
                          undefined
                      ]
                    : provider
        );
        newProviders.push([
            path.resolve(`${__dirname}/CustomLwcModuleProvider.js`),
            undefined
        ]);

        return newProviders;
    }

    private static setTimeoutTimer(
        lwrApp: LwrApp,
        timeoutMilliseconds: number,
        callback: () => void
    ): NodeJS.Timeout {
        return setTimeout(async () => {
            const timeoutSeconds = timeoutMilliseconds / 1000;

            // tslint:disable-next-line: no-console
            console.log(
                `Server idle for ${timeoutSeconds} seconds... shutting down`
            );

            await lwrApp.close();

            callback();
        }, timeoutMilliseconds);
    }
}
