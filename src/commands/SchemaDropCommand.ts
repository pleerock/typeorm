import {createConnection} from "../index";
import {Connection} from "../connection/Connection";
import {ConnectionOptionsReader} from "../connection/ConnectionOptionsReader";
import * as yargs from "yargs";

const chalk = require("chalk");

/**
 * Drops all tables of the database from the given connection.
 */
export class SchemaDropCommand implements yargs.CommandModule {
    command = "schema:drop";
    describe = "Drops all tables in the database on your default connection. " +
        "To drop table of a concrete connection's database use -c option.";

    builder(args: yargs.Argv) {
        return args
            .option("c", {
                alias: "connection",
                default: "default",
                describe: "Name of the connection on which to drop all tables."
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
            await connection.dropDatabase();
            await connection.close();

            console.log(chalk.green("Database schema has been successfully dropped."));

        } catch (err) {
            if (connection) await (connection as Connection).close();

            console.log(chalk.black.bgRed("Error during schema drop:"));
            console.error(err);
            process.exit(1);
        }
    }
}
