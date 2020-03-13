import {createConnection} from "../index";
import {Connection} from "../connection/Connection";
import {ConnectionOptionsReader} from "../connection/ConnectionOptionsReader";
import * as yargs from "yargs";

const chalk = require("chalk");

/**
 * Synchronizes database schema with entities.
 */
export class SchemaSyncCommand implements yargs.CommandModule {
    command = "schema:sync";
    describe = "Synchronizes your entities with database schema. It runs schema update queries on all connections you have. " +
        "To run update queries on a concrete connection use -c option.";

    builder(args: yargs.Argv) {
        return args
            .option("c", {
                alias: "connection",
                default: "default",
                describe: "Name of the connection on which schema synchronization needs to to run."
            })
            .option("f", {
                alias: "config",
                default: "ormconfig",
                describe: "Name of the file with connection configuration."
            });
    }

    async handler(args: yargs.Arguments) {

        let connection: Connection|undefined = undefined;
        try {
            const connectionOptionsReader = new ConnectionOptionsReader({
                root: process.cwd(),
                configName: args.config as any
            });
            const connectionOptions = await connectionOptionsReader.get(args.connection as any);
            Object.assign(connectionOptions, {
                synchronize: false,
                migrationsRun: false,
                dropSchema: false,
                logging: ["query", "schema"]
            });
            connection = await createConnection(connectionOptions);
            await connection.synchronize();
            await connection.close();

            console.log(chalk.green("Schema syncronization finished successfully."));

        } catch (err) {
            if (connection) await (connection as Connection).close();

            console.log(chalk.black.bgRed("Error during schema synchronization:"));
            console.error(err);
            process.exit(1);
        }
    }
}
