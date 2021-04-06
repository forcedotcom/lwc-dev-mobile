import { RequirementList } from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { Logger } from '@salesforce/core';

export function getPlatformSetupRequirements(
    logger: Logger,
    platform: string,
    apiLevel?: string
): RequirementList {
    return CommandLineUtils.platformFlagIsAndroid(platform)
        ? new AndroidEnvironmentRequirements(logger, apiLevel)
        : new IOSEnvironmentRequirements(logger);
}
