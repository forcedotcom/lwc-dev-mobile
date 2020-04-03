import os from 'os';

export class AndroidPackage {
    path: string;
    version: string;
    description: string;
    location: string;

    constructor(path: string, version: string, description: string, location: string) {
        this.path = path;
        this.version = version;
        this.description = description;
        this.location = location;
    }

    platformAPI(): string {
        let platformApi = '';
        if (this.path.startsWith('platforms') || this.path.startsWith('system-images')) {
            let tokens: string[] = this.path.split(';');
            if (tokens.length > 1) {
                return tokens[1];
            }
        }
        return platformApi;
    }

    static parseRawString(rawStringInput: string): Map<string, AndroidPackage> {
        let startIndx = rawStringInput.toLowerCase().indexOf('installed packages:', 0);
        let endIndx = rawStringInput.toLowerCase().indexOf('available packages:', startIndx);
        let rawString = rawStringInput.substring(startIndx, endIndx);
        let packages: Map<string, AndroidPackage> = new Map();

        //Installed packages:
        let lines = rawString.split(os.EOL);
        if (lines.length > 0) {
            let i = 0;
            for (; i < lines.length; i++) {
                if (lines[i].toLowerCase().indexOf('path') > -1) {
                    i = i + 2; // skip ---- and header
                    break; // start of installed packages
                }
            }

            for (; i < lines.length; i++) {
                let rawStringSplits: Array<string> = lines[i].split('|');
                if (rawStringSplits.length > 1) {
                    let path = rawStringSplits[0].trim();
                    let version = rawStringSplits[1].trim();
                    let description = rawStringSplits[2].trim();
                    let locationOfPack = '';

                    if (rawStringSplits.length > 2) {
                        locationOfPack = rawStringSplits[3].trim();
                    }
                    packages.set(path, new AndroidPackage( path, version, description, locationOfPack));
                }

                if (lines[i].indexOf('Available Packages:') > -1) {
                    break;
                }
            }
        }
        return packages;
    }
}
