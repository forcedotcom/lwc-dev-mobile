import * as childProcess from 'child_process';
import { cat } from 'shelljs';

const execSync = childProcess.execSync;
const spawn = childProcess.spawn;
type StdioOptions = childProcess.StdioOptions;
export class CommonUtils {
    public static executeCommand(
        command: string,
        stdioOptions: StdioOptions = ['ignore', 'pipe', 'ignore']
    ): string {
        return execSync(command, {
            stdio: stdioOptions
        }).toString();
    }

    public static async isLwcServerPluginInstalled(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const command = 'sfdx force:lightning:lwc:start --help';
            try {
                CommonUtils.executeCommand(command).toString();
                resolve();
            } catch {
                // Error: command force:lightning:lwc:start not found
                reject(new Error());
            }
        });
    }
}
