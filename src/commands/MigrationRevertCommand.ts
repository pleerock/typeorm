import {createConnection} from "../index";
import {ConnectionOptionsReader} from "../connection/ConnectionOptionsReader";
import {Connection} from "../connection/Connection";
import * as yargs from "yargs";

const chalk = require("chalk");

/**
 * Reverts last migration command.
 */
export class MigrationRevertCommand implements yargs.CommandModule {

    command = "migration:revert";
    describe = "Reverts last executed migration.";
    aliases = "migrations:revert";

    builder(args: yargs.Argv) {
        return args
            .option("c", {
                alias: "connection",
                default: "default",
                describe: "Name of the connection on which run a query."
            })
            .option("transaction", {
                alias: "t",
                default: "default",
                describe: "Indicates if transaction should be used or not for migration revert. Enabled by default."
            })
            .option("f", {
                alias: "config",
                default: "ormconfig",
                describe: "Name of the file with connection configuration."
            });
    }

    async handler(args: yargs.Arguments) {
        if (args._[0] === "migrations:revert") {
            console.log("'migrations:revert' is deprecated, please use 'migration:revert' instead");
        }

        let connection: Connection|undefined = undefined;
        try {
            const connectionOptionsReader = new ConnectionOptionsReader({
                root: process.cwd(),
                configName: args.config as any
            });
            const connectionOptions = await connectionOptionsReader.get(args.connection as any);
            Object.assign(connectionOptions, {
                subscribers: [],
                synchronize: false,
                migrationsRun: false,
                dropSchema: false,
                logging: ["query", "error", "schema"]
            });
            connection = await createConnection(connectionOptions);

            const options = {
                transaction: "all" as "all" | "none" | "each",
            };

            switch (args.t) {
                case "all":
                    options.transaction = "all";
                    break;
                case "none":
                case "false":
                    options.transaction = "none";
                    break;
                case "each":
                    options.transaction = "each";
                    break;
                default:
                    // noop
            }

            await connection.undoLastMigration(options);
            await connection.close();

        } catch (err) {
            if (connection) await (connection as Connection).close();

            console.log(chalk.black.bgRed("Error during migration revert:"));
            console.error(err);
            process.exit(1);
        }
    }

}
