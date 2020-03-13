import {ConnectionOptionsReader} from "../connection/ConnectionOptionsReader";
import {CommandUtils} from "./CommandUtils";
import {camelCase} from "../util/StringUtils";
import * as yargs from "yargs";

const chalk = require("chalk");

/**
 * Creates a new migration file.
 */
export class MigrationCreateCommand implements yargs.CommandModule {

    command = "migration:create";
    describe = "Creates a new migration file.";
    aliases = "migrations:create";

    builder(args: yargs.Argv) {
        return args
            .option("c", {
                alias: "connection",
                default: "default",
                describe: "Name of the connection on which run a query."
            })
            .option("n", {
                alias: "name",
                describe: "Name of the migration class.",
                demand: true
            })
            .option("d", {
                alias: "dir",
                describe: "Directory where migration should be created."
            })
            .option("f", {
                alias: "config",
                default: "ormconfig",
                describe: "Name of the file with connection configuration."
            });
    }

    async handler(args: yargs.Arguments) {
        if (args._[0] === "migrations:create") {
            console.log("'migrations:create' is deprecated, please use 'migration:create' instead");
        }

        try {
            const timestamp = new Date().getTime();
            const fileContent = MigrationCreateCommand.getTemplate(args.name as any, timestamp);
            const filename = timestamp + "-" + args.name + ".ts";
            let directory = args.dir;

            // if directory is not set then try to open tsconfig and find default path there
            if (!directory) {
                try {
                    const connectionOptionsReader = new ConnectionOptionsReader({
                        root: process.cwd(),
                        configName: args.config as any
                    });
                    const connectionOptions = await connectionOptionsReader.get(args.connection as any);
                    directory = connectionOptions.cli ? connectionOptions.cli.migrationsDir : undefined;
                } catch (err) { }
            }

            const path = process.cwd() + "/" + (directory ? (directory + "/") : "") + filename;
            await CommandUtils.createFile(path, fileContent);
            console.log(`Migration ${chalk.blue(path)} has been generated successfully.`);

        } catch (err) {
            console.log(chalk.black.bgRed("Error during migration creation:"));
            console.error(err);
            process.exit(1);
        }
    }

    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------

    /**
     * Gets contents of the migration file.
     */
    protected static getTemplate(name: string, timestamp: number): string {
        return `import {MigrationInterface, QueryRunner} from "typeorm";

export class ${camelCase(name, true)}${timestamp} implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
`;
    }

}
