import {createConnection} from "../index";
import {ConnectionOptionsReader} from "../connection/ConnectionOptionsReader";
import {Connection} from "../connection/Connection";
import * as process from "process";
import * as yargs from "yargs";

const chalk = require("chalk");

/**
 * Runs migration command.
 */
export class MigrationShowCommand implements yargs.CommandModule {

  command = "migration:show";
  describe = "Show all migrations and whether they have been run or not";

  builder(args: yargs.Argv) {
    return args
      .option("connection", {
        alias: "c",
        default: "default",
        describe: "Name of the connection on which run a query."
      })
      .option("config", {
        alias: "f",
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
        subscribers: [],
        synchronize: false,
        migrationsRun: false,
        dropSchema: false,
        logging: ["query", "error", "schema"]
      });
      connection = await createConnection(connectionOptions);
      const unappliedMigrations = await connection.showMigrations();
      await connection.close();

      // return error code if there are unapplied migrations for CI
      process.exit(unappliedMigrations ? 1 : 0);

    } catch (err) {
      if (connection) await (connection as Connection).close();

      console.log(chalk.black.bgRed("Error during migration show:"));
      console.error(err);
      process.exit(1);
    }
  }

}
