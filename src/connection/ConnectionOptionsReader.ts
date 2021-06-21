import appRootPath from "app-root-path";
import {ConnectionOptions} from "./ConnectionOptions";
import {PlatformTools} from "../platform/PlatformTools";
import {ConnectionOptionsEnvReader} from "./options-reader/ConnectionOptionsEnvReader";
import {ConnectionOptionsYmlReader} from "./options-reader/ConnectionOptionsYmlReader";
import {ConnectionOptionsXmlReader} from "./options-reader/ConnectionOptionsXmlReader";
import { isAbsolute } from "../util/PathUtils";

/**
 * Reads connection options from the ormconfig.
 * Can read from multiple file extensions including env, json, js, xml and yml.
 */
export class ConnectionOptionsReader {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(protected options?: {
        /**
         * Directory where ormconfig should be read from.
         * By default its your application root (where your app package.json is located).
         */
        root?: string,

        /**
         * Filename of the ormconfig configuration. By default its equal to "ormconfig".
         */
        configName?: string
    }) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Returns all connection options read from the ormconfig.
     */
    async all(): Promise<ConnectionOptions[]> {
        const options = await this.load();
        if (!options)
            throw new Error(`No connection options were found in any orm configuration files.`);

        return options;
    }

    /**
     * Gets a connection with a given name read from ormconfig.
     * If connection with such name would not be found then it throw error.
     */
    async get(name: string): Promise<ConnectionOptions> {
        const allOptions = await this.all();
        const targetOptions = allOptions.find(options => options.name === name || (name === "default" && !options.name));
        if (!targetOptions)
            throw new Error(`Cannot find connection ${name} because its not defined in any orm configuration files.`);

        return targetOptions;
    }

    /**
     * Checks if there is a TypeORM configuration file.
     */
    async has(name: string): Promise<boolean> {
        const allOptions = await this.load();
        if (!allOptions)
            return false;

        const targetOptions = allOptions.find(options => options.name === name || (name === "default" && !options.name));
        return !!targetOptions;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Loads all connection options from a configuration file.
     *
     * todo: get in count NODE_ENV somehow
     */
    protected async load(): Promise<ConnectionOptions[]|undefined> {
        let connectionOptions: ConnectionOptions|ConnectionOptions[]|undefined = undefined;

        const fileFormats = ["env", "js", "cjs", "ts", "json", "yml", "yaml", "xml"];

        // Detect if baseFilePath contains file extension
        const possibleExtension = this.baseFilePath.substr(this.baseFilePath.lastIndexOf("."));
        const fileExtension = fileFormats.find(extension => `.${extension}` === possibleExtension);

        // try to find any of following configuration formats
        const foundFileFormat = fileExtension || fileFormats.find(format => {
            return PlatformTools.fileExist(this.baseFilePath + "." + format);
        });

        // Determine config file name
        const configFile = fileExtension ? this.baseFilePath : this.baseFilePath + "." + foundFileFormat;

        // if .env file found then load all its variables into process.env using dotenv package
        if (foundFileFormat === "env") {
            PlatformTools.dotenv(configFile);
        } else if (PlatformTools.fileExist(this.baseDirectory + "/.env")) {
            PlatformTools.dotenv(this.baseDirectory + "/.env");
        }

        // try to find connection options from any of available sources of configuration
        if (PlatformTools.getEnvVariable("TYPEORM_CONNECTION") || PlatformTools.getEnvVariable("TYPEORM_URL")) {
            connectionOptions = await new ConnectionOptionsEnvReader().read();

        } else if (foundFileFormat === "js" || foundFileFormat === "cjs" || foundFileFormat === "ts") {
            const configModule = await require(configFile);

            if (configModule && "__esModule" in configModule && "default" in configModule) {
                connectionOptions = configModule.default;
            } else {
                connectionOptions = configModule;
            }

        } else if (foundFileFormat === "json") {
            connectionOptions = require(configFile);

        } else if (foundFileFormat === "yml") {
            connectionOptions = await new ConnectionOptionsYmlReader().read(configFile);

        } else if (foundFileFormat === "yaml") {
            connectionOptions = await new ConnectionOptionsYmlReader().read(configFile);

        } else if (foundFileFormat === "xml") {
            connectionOptions = await new ConnectionOptionsXmlReader().read(configFile);
        }

        // normalize and return connection options
        if (connectionOptions) {
            return this.normalizeConnectionOptions(connectionOptions);
        }

        return undefined;
    }

    /**
     * Normalize connection options.
     */
    protected normalizeConnectionOptions(connectionOptions: ConnectionOptions|ConnectionOptions[]): ConnectionOptions[] {
        if (!(Array.isArray(connectionOptions)))
            connectionOptions = [connectionOptions];

        connectionOptions.forEach(options => {

            options.baseDirectory = this.baseDirectory;

            if (options.entities) {
                const entities = (options.entities as any[]).map(entity => {
                    if (typeof entity === "string" && entity.substr(0, 1) !== "/")
                        return this.baseDirectory + "/" + entity;

                    return entity;
                });
                Object.assign(connectionOptions, { entities: entities });
            }
            if (options.subscribers) {
                const subscribers = (options.subscribers as any[]).map(subscriber => {
                    if (typeof subscriber === "string" && subscriber.substr(0, 1) !== "/")
                        return this.baseDirectory + "/" + subscriber;

                    return subscriber;
                });
                Object.assign(connectionOptions, { subscribers: subscribers });
            }
            if (options.migrations) {
                const migrations = (options.migrations as any[]).map(migration => {
                    if (typeof migration === "string" && migration.substr(0, 1) !== "/")
                        return this.baseDirectory + "/" + migration;

                    return migration;
                });
                Object.assign(connectionOptions, { migrations: migrations });
            }

            // make database path file absolute in sqlite
            if (options.type === "sqlite" || options.type === "better-sqlite3") {
                if (typeof options.database === "string" &&
                    !isAbsolute(options.database) &&
                    options.database !== ":memory:") {
                    Object.assign(options, {
                        database: this.baseDirectory + "/" + options.database
                    });
                }
            }
        });

        return connectionOptions;
    }

    /**
     * Gets directory where configuration file should be located and configuration file name.
     */
    protected get baseFilePath(): string {
        return this.baseDirectory + "/" + this.baseConfigName;
    }

    /**
     * Gets directory where configuration file should be located.
     */
    protected get baseDirectory(): string {
        if (this.options && this.options.root)
            return this.options.root;

        return appRootPath.path;
    }

    /**
     * Gets configuration file name.
     */
    protected get baseConfigName(): string {
        if (this.options && this.options.configName)
            return this.options.configName;

        return "ormconfig";
    }

}
