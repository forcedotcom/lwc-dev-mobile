import os from 'os';

export class AndroidPackage {
    get platformAPI(): string {
        const platformApi = '';
        if (
            this.path.startsWith('platforms') ||
            this.path.startsWith('system-images')
        ) {
            const tokens: string[] = this.path.split(';');
            if (tokens.length > 1) {
                return tokens[1];
            }
        }
        return platformApi;
    }

    get platformEmulatorImage(): string {
        const platformApi = '';
        if (
            this.path.startsWith('platforms') ||
            this.path.startsWith('system-images')
        ) {
            const tokens: string[] = this.path.split(';');
            if (tokens.length > 2) {
                return tokens[2];
            }
        }
        return platformApi;
    }

    public static parseRawString(
        rawStringInput: string
    ): Map<string, AndroidPackage> {
        const startIndx = rawStringInput
            .toLowerCase()
            .indexOf('installed packages:', 0);
        const endIndx = rawStringInput
            .toLowerCase()
            .indexOf('available packages:', startIndx);
        const rawString = rawStringInput.substring(startIndx, endIndx);
        const packages: Map<string, AndroidPackage> = new Map();

        // Installed packages:
        const lines = rawString.split(os.EOL);
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
                    const version = rawStringSplits[1].trim();
                    const description = rawStringSplits[2].trim();
                    let locationOfPack = '';

                    if (rawStringSplits.length > 2) {
                        locationOfPack = rawStringSplits[3].trim();
                    }
                    packages.set(
                        path,
                        new AndroidPackage(
                            path,
                            version,
                            description,
                            locationOfPack
                        )
                    );
                }

                if (lines[i].indexOf('Available Packages:') > -1) {
                    break;
                }
            }
        }
        return packages;
    }
    public path: string;
    public version: string;
    public description: string;
    public location: string;

    constructor(
        path: string,
        version: string,
        description: string,
        location: string
    ) {
        this.path = path;
        this.version = version;
        this.description = description;
        this.location = location;
    }
}
