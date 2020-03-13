import * as yargs from "yargs";

const exec = require("child_process").exec;

/**
 * Shows typeorm version.
 */
export class VersionCommand implements yargs.CommandModule {
    command = "version";
    describe = "Prints TypeORM version this project uses.";

    async handler() {

        const localNpmList = await VersionCommand.executeCommand("npm list --depth=0");
        const localMatches = localNpmList.match(/ typeorm@(.*)\n/);
        const localNpmVersion = (localMatches && localMatches[1] ? localMatches[1] : "").replace(/"invalid"/gi, "").trim();

        const globalNpmList = await VersionCommand.executeCommand("npm list -g --depth=0");
        const globalMatches = globalNpmList.match(/ typeorm@(.*)\n/);
        const globalNpmVersion = (globalMatches && globalMatches[1] ? globalMatches[1] : "").replace(/"invalid"/gi, "").trim();

        if (localNpmVersion) {
            console.log("Local installed version:", localNpmVersion);
        } else {
            console.log("No local installed TypeORM was found.");
        }
        if (globalNpmVersion) {
            console.log("Global installed TypeORM version:", globalNpmVersion);
        } else {
            console.log("No global installed was found.");
        }

        if (localNpmVersion && globalNpmVersion && localNpmVersion !== globalNpmVersion) {
            console.log("To avoid issues with CLI please make sure your global and local TypeORM versions match, " +
                "or you are using locally installed TypeORM instead of global one.");
        }
    }

    protected static executeCommand(command: string) {
        return new Promise<string>((ok, fail) => {
            exec(command, (error: any, stdout: any, stderr: any) => {
                if (stdout) return ok(stdout);
                if (stderr) return ok(stderr);
                if (error) return fail(error);
                ok("");
            });
        });
    }

}
