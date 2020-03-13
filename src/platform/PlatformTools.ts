import * as path from "path";
import * as fs from "fs";
import {highlight, Theme} from "cli-highlight";

export {ReadStream} from "fs";
export {EventEmitter} from "events";
export {Readable, Writable} from "stream";

const chalk = require("chalk");

/**
 * Platform-specific tools.
 */
export class PlatformTools {

    /**
     * Type of the currently running platform.
     */
    static type: "browser"|"node" = "node";

    /**
     * Gets global variable where global stuff can be stored.
     */
    static getGlobalVariable(): any {
        return global;
    }

    /**
     * Loads ("require"-s) given file or package.
     * This operation only supports on node platform
     */
    static load(name: string): any {

        // if name is not absolute or relative, then try to load package from the node_modules of the directory we are currently in
        // this is useful when we are using typeorm package globally installed and it accesses drivers
        // that are not installed globally

        try {

            // switch case to explicit require statements for webpack compatibility.

            switch (name) {

                /**
                * mongodb
                */
                case "mongodb":
                    return require("mongodb");

                /**
                * hana
                */
                case "@sap/hdbext":
                    return require("@sap/hdbext");

                /**
                * mysql
                */
                case "mysql":
                    return require("mysql");

                case "mysql2":
                    return require("mysql2");

                /**
                * oracle
                */
                case "oracledb":
                    return require("oracledb");

                /**
                * postgres
                */
                case "pg":
                    return require("pg");

                case "pg-native":
                    return require("pg-native");

                case "pg-query-stream":
                    return require("pg-query-stream");

                /**
                * redis
                */
                case "redis":
                    return require("redis");

                /**
                 * ioredis
                 */
                case "ioredis":
                case "ioredis/cluster":
                    return require("ioredis");

                /**
                * sqlite
                */
                case "sqlite3":
                    return require("sqlite3");

                /**
                * sql.js
                */
                case "sql.js":
                    return require("sql.js");

                /**
                * sqlserver
                */
                case "mssql":
                    return require("mssql");

                /**
                * other modules
                */
                case "mkdirp":
                    return require("mkdirp");

                case "path":
                    return require("path");

                case "debug":
                    return require("debug");

                case "app-root-path":
                    return require("app-root-path");

                case "glob":
                    return require("glob");

                case "typeorm-aurora-data-api-driver":
                    return require("typeorm-aurora-data-api-driver");
                /**
                * default
                */
                default:
                    return require(name);

            }

        } catch (err) {
            if (!path.isAbsolute(name) && name.substr(0, 2) !== "./" && name.substr(0, 3) !== "../") {
                return require(path.resolve(process.cwd() + "/node_modules/" + name));
            }

            throw err;
        }
    }

    /**
     * Normalizes given path. Does "path.normalize".
     */
    static pathNormalize(pathStr: string): string {
        return path.normalize(pathStr);
    }

    /**
     * Gets file extension. Does "path.extname".
     */
    static pathExtname(pathStr: string): string {
        return path.extname(pathStr);
    }

    /**
     * Resolved given path. Does "path.resolve".
     */
    static pathResolve(pathStr: string): string {
        return path.resolve(pathStr);
    }

    /**
     * Synchronously checks if file exist. Does "fs.existsSync".
     */
    static fileExist(pathStr: string): boolean {
        return fs.existsSync(pathStr);
    }

    static readFileSync(filename: string): Buffer {
        return fs.readFileSync(filename);
    }

    static appendFileSync(filename: string, data: any): void {
        fs.appendFileSync(filename, data);
    }

    static async writeFile(path: string, data: any): Promise<void> {
        return new Promise<void>((ok, fail) => {
            fs.writeFile(path, data, (err) => {
                if (err) fail(err);
                ok();
            });
        });
    }

    /**
     * Gets environment variable.
     */
    static getEnvVariable(name: string): any {
        return process.env[name];
    }

    /**
     * Highlights sql string to be print in the console.
     */
    static highlightSql(sql: string) {
        const theme: Theme = {
            "keyword": chalk.blueBright,
            "literal": chalk.blueBright,
            "string": chalk.white,
            "type": chalk.magentaBright,
            "built_in": chalk.magentaBright,
            "comment": chalk.gray,
        };
        return highlight(sql, { theme: theme, language: "sql" });
    }

    /**
     * Highlights json string to be print in the console.
     */
    static highlightJson(json: string) {
        return highlight(json, { language: "json" });
    }

    /**
     * Logging functions needed by AdvancedConsoleLogger
     */
    static logInfo(prefix: string, info: any) {
        console.log(chalk.gray.underline(prefix), info);
    }

    static logError(prefix: string, error: any) {
        console.log(chalk.underline.red(prefix), error);
    }

    static logWarn(prefix: string, warning: any) {
        console.log(chalk.underline.yellow(prefix), warning);
    }

    static log(message: string) {
        console.log(chalk.underline(message));
    }

    static warn(message: string) {
        return chalk.yellow(message);
    }
}
