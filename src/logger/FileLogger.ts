import {LoggerOptions} from "./LoggerOptions";
import {QueryRunner} from "../query-runner/QueryRunner";
import {Logger} from "./Logger";
import {PlatformTools} from "../platform/PlatformTools";

/**
 * Performs logging of the events in TypeORM.
 * This version of logger logs everything into ormlogs.log file.
 */
export class FileLogger implements Logger {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private options?: LoggerOptions) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Logs query and parameters used in it.
     */
    async logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
        if (this.options === "all" || this.options === true || (this.options instanceof Array && this.options.indexOf("query") !== -1)) {
            const sql = query + (parameters && parameters.length ? " -- PARAMETERS: " + this.stringifyParams(parameters) : "");
            await this.write("[QUERY]: " + sql);
        }
    }

    /**
     * Logs query that is failed.
     */
    async logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner) {
        if (this.options === "all" || this.options === true || (this.options instanceof Array && this.options.indexOf("error") !== -1)) {
            const sql = query + (parameters && parameters.length ? " -- PARAMETERS: " + this.stringifyParams(parameters) : "");
            await this.write([
                `[FAILED QUERY]: ${sql}`,
                `[QUERY ERROR]: ${error}`
            ]);
        }
    }

    /**
     * Logs query that is slow.
     */
    async logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
        const sql = query + (parameters && parameters.length ? " -- PARAMETERS: " + this.stringifyParams(parameters) : "");
        await this.write(`[SLOW QUERY: ${time} ms]: ` + sql);
    }

    /**
     * Logs events from the schema build process.
     */
    async logSchemaBuild(message: string, queryRunner?: QueryRunner) {
        if (this.options === "all" || (this.options instanceof Array && this.options.indexOf("schema") !== -1)) {
            await this.write(message);
        }
    }

    /**
     * Logs events from the migrations run process.
     */
    async logMigration(message: string, queryRunner?: QueryRunner) {
        await this.write(message);
    }

    /**
     * Perform logging using given logger, or by default to the console.
     * Log has its own level and message.
     */
    async log(level: "log"|"info"|"warn", message: any, queryRunner?: QueryRunner) {
        switch (level) {
            case "log":
                if (this.options === "all" || (this.options instanceof Array && this.options.indexOf("log") !== -1))
                    await this.write("[LOG]: " + message);
                break;
            case "info":
                if (this.options === "all" || (this.options instanceof Array && this.options.indexOf("info") !== -1))
                    await this.write("[INFO]: " + message);
                break;
            case "warn":
                if (this.options === "all" || (this.options instanceof Array && this.options.indexOf("warn") !== -1))
                    await this.write("[WARN]: " + message);
                break;
        }
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Writes given strings into the log file.
     */
    protected write(strings: string|string[]) {
        strings = strings instanceof Array ? strings : [strings];
        const basePath = PlatformTools.load("app-root-path").path;
        strings = (strings as string[]).map(str => "[" + new Date().toISOString() + "]" + str);
        return PlatformTools.appendFile(basePath + "/ormlogs.log", strings.join("\r\n") + "\r\n");
    }

    /**
     * Converts parameters to a string.
     * Sometimes parameters can have circular objects and therefor we are handle this case too.
     */
    protected stringifyParams(parameters: any[]) {
        try {
            return JSON.stringify(parameters);

        } catch (error) { // most probably circular objects in parameters
            return parameters;
        }
    }

}
