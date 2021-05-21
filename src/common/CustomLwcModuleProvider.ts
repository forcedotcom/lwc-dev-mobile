import { AbstractModuleId, FsModuleEntry, ProviderContext } from '@lwrjs/types';
import LwcModuleProvider from '@lwrjs/lwc-module-provider';
import path from 'path';

// Note: LwcModuleProviderOptions is defined in @lwrjs/lwc-module-provider
//       but is not exported so we have to redefine it here again.
interface LwcModuleProviderOptions {
    disableCaching?: boolean;
}

export default class CustomLwcModuleProvider extends LwcModuleProvider {
    constructor(
        options: LwcModuleProviderOptions | undefined,
        context: ProviderContext
    ) {
        // Go to the directory in our plug-in that contains the 'node_modules' folder.
        // Override the rootDir to be this location and use it to resolve the npm modules that LWR requests.
        const newRootDir = path.resolve(`${__dirname}/../../`);

        // The new context is the exact copy of the old context except that its rootDir value is different.
        // We need to take the approach of defining a new context b/c ProviderContext type is readonly and
        // we cannot just reassign a new rootDir value to it.
        const newContext: ProviderContext = {
            compiler: context.compiler,
            appObserver: context.appObserver,
            appEmitter: context.appEmitter,
            moduleRegistry: context.moduleRegistry,
            resourceRegistry: context.resourceRegistry,
            viewRegistry: context.viewRegistry,
            assetRegistry: context.assetRegistry,
            config: {
                modules: context.config.modules,
                routes: context.config.routes,
                errorRoutes: context.config.errorRoutes,
                rootDir: newRootDir,
                contentDir: context.config.contentDir,
                layoutsDir: context.config.layoutsDir,
                cacheDir: context.config.cacheDir
            },
            runtimeEnvironment: context.runtimeEnvironment
        };

        super(options, newContext);

        this.name = 'custom-lwc-module-provider';
    }

    async getModuleEntry(
        moduleId: AbstractModuleId
    ): Promise<FsModuleEntry | undefined> {
        try {
            const result = await super.getModuleEntry(moduleId);
            return Promise.resolve(result);
        } catch {
            // tslint:disable-next-line: no-console
            console.log(
                `CustomLwcModuleProvider is unable to resolve module '${moduleId.specifier}' for '${moduleId.importer}'... Skipping and deferring to other providers to resolve.`
            );
            return Promise.resolve(undefined);
        }
    }
}
