import childProcess from 'child_process';
import util from 'util';
const exec = util.promisify(childProcess.exec);

const XCRUN_CMD = '/usr/bin/xcrun';

export class XcodeUtils {
    public static async executeCommand(
        command: string
    ): Promise<{ stdout: string; stderr: string }> {
        return exec(command);
    }

    public static async getSimulatorRuntimes(): Promise<string[]> {
        const runtimesCmd = `${XCRUN_CMD} simctl list --json runtimes`;
        const runtimeMatchRegex = /.*SimRuntime\.((iOS|watchOS|tvOS)-[\d\-]+)$/;
        const RUNTIMES_KEY = 'runtimes';
        const ID_KEY = 'identifier';

        try {
            const { stdout } = await XcodeUtils.executeCommand(runtimesCmd);
            const runtimesObj: any = JSON.parse(stdout);
            const runtimes: any[] = runtimesObj[RUNTIMES_KEY] || [];
            let filteredRuntimes = runtimes.filter((entry) => {
                return entry[ID_KEY] && entry[ID_KEY].match(runtimeMatchRegex);
            });
            filteredRuntimes = filteredRuntimes.map((entry) => {
                return (entry[ID_KEY] as string).replace(
                    runtimeMatchRegex,
                    '$1'
                );
            });
            return new Promise<string[]>((resolve, reject) =>
                resolve(filteredRuntimes)
            );
        } catch (runtimesError) {
            return new Promise<string[]>((resolve, reject) =>
                reject(
                    `The command '${runtimesCmd}' failed: ${runtimesError}, error code: ${runtimesError.code}`
                )
            );
        }
    }
}

// XcodeUtils.iosRuntimes().then((runtimesArray) => {
//     console.log(`runtimesArray: ${JSON.stringify(runtimesArray)}`);
// });
