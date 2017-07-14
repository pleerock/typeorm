import {createConnection} from "../index";
import {Connection} from "../connection/Connection";
import {ConnectionOptionsReader} from "../connection/ConnectionOptionsReader";
import {highlight} from "cli-highlight";
const chalk = require("chalk");

/**
 * Shows sql to be executed by schema:sync command.
 */
export class SchemaLogCommand {

    command = "schema:log";
    describe = "Shows sql to be executed by schema:sync command. It shows sql log only for your default connection. " +
        "To run update queries on a concrete connection use -c option.";

    builder(yargs: any) {
        return yargs
            .option("c", {
                alias: "connection",
                default: "default",
                describe: "Name of the connection of which schema sync log should be shown."
            })
            .option("cf", {
                alias: "config",
                default: "ormconfig",
                describe: "Name of the file with connection configuration."
            });
    }

    async handler(argv: any) {

        let connection: Connection|undefined = undefined;
        try {

            const connectionOptionsReader = new ConnectionOptionsReader({ root: process.cwd(), configName: argv.config });
            const connectionOptions = await connectionOptionsReader.get(argv.connection);
            Object.assign(connectionOptions, {
                dropSchemaOnConnection: false,
                autoSchemaSync: false,
                autoMigrationsRun: false,
                logging: { logQueries: false, logFailedQueryError: false, logSchemaCreation: false }
            });
            connection = await createConnection(connectionOptions);
            const sqls = await connection.logSyncSchema();
            if (sqls.length === 0) {
                console.log(chalk.yellow("Your schema is up to date - there are no queries to be executed by schema syncronization."));

            } else {
                const lengthSeparators = String(sqls.length).split("").map(char => "-").join("");
                console.log(chalk.yellow("---------------------------------------------------------------" + lengthSeparators));
                console.log(chalk.yellow.bold(`-- Schema syncronization will execute following sql queries (${chalk.white(sqls.length)}):`));
                console.log(chalk.yellow("---------------------------------------------------------------" + lengthSeparators));

                sqls.forEach(sql => {
                    let sqlString = typeof sql === "string" ? sql : sql.up;
                    sqlString = sqlString.trim();
                    sqlString = sqlString.substr(-1) === ";" ? sqlString : sqlString + ";";
                    console.log(highlight(sqlString));
                });
            }

        } catch (err) {
            console.log(chalk.black.bgRed("Error during schema synchronization:"));
            console.error(err);
            // throw err;

        } finally {
            if (connection)
                await connection.close();
        }
    }
}