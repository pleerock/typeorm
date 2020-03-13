import {Connection} from "../../src/connection/Connection";
import {ConnectionOptions} from "../../src/connection/ConnectionOptions";
import {PostgresDriver} from "../../src/driver/postgres/PostgresDriver";
import {SqlServerDriver} from "../../src/driver/sqlserver/SqlServerDriver";
import {DatabaseType} from "../../src/driver/types/DatabaseType";
import {EntitySchema} from "../../src/entity-schema/EntitySchema";
import {createConnections} from "../../src/index";
import {NamingStrategyInterface} from "../../src/naming-strategy/NamingStrategyInterface";
import {PromiseUtils} from "../../src/util/PromiseUtils";
import {EntityFactoryInterface} from "../../src/entity-factory/EntityFactoryInterface";
import {QueryResultCache} from "../../src/cache/QueryResultCache";

/**
 * Interface in which data is stored in ormconfig.json of the project.
 */
export type TestingConnectionOptions = ConnectionOptions & {

    /**
     * Indicates if this connection should be skipped.
     */
    skip?: boolean;

    /**
     * If set to true then tests for this driver wont run until implicitly defined "enabledDrivers" section.
     */
    disabledIfNotEnabledImplicitly?: boolean;

};

/**
 * Options used to create a connection for testing purposes.
 */
export interface TestingOptions {

    /**
     * Dirname of the test directory.
     * If specified, entities will be loaded from that directory.
     */
    __dirname?: string;

    /**
     * Connection name to be overridden.
     * This can be used to create multiple connections with single connection configuration.
     */
    name?: string;

    /**
     * List of enabled drivers for the given test suite.
     */
    enabledDrivers?: DatabaseType[];

    /**
     * Entities needs to be included in the connection for the given test suite.
     */
    entities?: (string|Function|EntitySchema<any>)[];


    /**
     * Migrations needs to be included in connection for the given test suite.
     */
    migrations?: string[];

    /**
     * Subscribers needs to be included in the connection for the given test suite.
     */
    subscribers?: string[]|Function[];

    /**
     * Entity factory needs to be included in the connection for the given test suite.
     */
    entityFactory?: EntityFactoryInterface;

    /**
     * Indicates if schema sync should be performed or not.
     */
    schemaCreate?: boolean;

    /**
     * Indicates if schema should be dropped on connection setup.
     */
    dropSchema?: boolean;

    /**
     * Enables or disables logging.
     */
    logging?: boolean;

    /**
     * Schema name used for postgres driver.
     */
    schema?: string;

    /**
     * Naming strategy defines how auto-generated names for such things like table name, or table column gonna be
     * generated.
     */
    namingStrategy?: NamingStrategyInterface;

    /**
     * Schema name used for postgres driver.
     */
    cache?: boolean | {

        /**
         * Type of caching.
         *
         * - "database" means cached values will be stored in the separate table in database. This is default value.
         * - "mongodb" means cached values will be stored in mongodb database. You must provide mongodb connection options.
         * - "redis" means cached values will be stored inside redis. You must provide redis connection options.
         */
        readonly type?: "database" | "redis" | "ioredis" | "ioredis/cluster"; // todo: add mongodb and other cache providers as well in the future

        /**
         * Factory function for custom cache providers that implement QueryResultCache.
         */
        readonly provider?: (connection: Connection) => QueryResultCache;

        /**
         * Used to provide mongodb / redis connection options.
         */
        options?: any;

        /**
         * If set to true then queries (using find methods and QueryBuilder's methods) will always be cached.
         */
        alwaysEnabled?: boolean;

        /**
         * Time in milliseconds in which cache will expire.
         * This can be setup per-query.
         * Default value is 1000 which is equivalent to 1 second.
         */
        duration?: number;

    };

    /**
     * Options that may be specific to a driver.
     * They are passed down to the enabled drivers.
     */
    driverSpecific?: Object;
}

/**
 * Creates a testing connection options for the given driver type based on the configuration in the ormconfig.json
 * and given options that can override some of its configuration for the test-specific use case.
 */
export function setupSingleTestingConnection(driverType: DatabaseType, options: TestingOptions): ConnectionOptions|undefined {

    const testingConnections = setupTestingConnections({
        name: options.name ? options.name : undefined,
        entities: options.entities ? options.entities : [],
        subscribers: options.subscribers ? options.subscribers : [],
        dropSchema: options.dropSchema ? options.dropSchema : false,
        schemaCreate: options.schemaCreate ? options.schemaCreate : false,
        enabledDrivers: [driverType],
        cache: options.cache,
        schema: options.schema ? options.schema : undefined,
        namingStrategy: options.namingStrategy ? options.namingStrategy : undefined
    });
    if (!testingConnections.length)
        return undefined;

    return testingConnections[0];
}


/**
 * Loads test connection options from ormconfig.json file.
 */
export function getTypeOrmConfig(): TestingConnectionOptions[] {
    try {

        try {
            return require(__dirname + "/../../../../ormconfig.json");

        } catch (err) {
            return require(__dirname + "/../../ormconfig.json");
        }

    } catch (err) {
        throw new Error(`Cannot find ormconfig.json file in the root of the project. To run tests please create ormconfig.json file` +
            ` in the root of the project (near ormconfig.json.dist, you need to copy ormconfig.json.dist into ormconfig.json` +
            ` and change all database settings to match your local environment settings).`);
    }
}

/**
 * Creates a testing connections options based on the configuration in the ormconfig.json
 * and given options that can override some of its configuration for the test-specific use case.
 */
export function setupTestingConnections(options?: TestingOptions): ConnectionOptions[] {
    const ormConfigConnectionOptionsArray = getTypeOrmConfig();

    if (!ormConfigConnectionOptionsArray.length)
        throw new Error(`No connections setup in ormconfig.json file. Please create configurations for each database type to run tests.`);

    return ormConfigConnectionOptionsArray
        .filter(connectionOptions => {
            if (connectionOptions.skip === true)
                return false;

            if (options && options.enabledDrivers && options.enabledDrivers.length)
                return options.enabledDrivers.indexOf(connectionOptions.type!) !== -1; // ! is temporary

            if (connectionOptions.disabledIfNotEnabledImplicitly === true)
                return false;

            return true;
        })
        .map(connectionOptions => {
            let newOptions: any = Object.assign({}, connectionOptions as ConnectionOptions, {
                name: options && options.name ? options.name : connectionOptions.name,
                entities: options && options.entities ? options.entities : [],
                migrations: options && options.migrations ? options.migrations : [],
                subscribers: options && options.subscribers ? options.subscribers : [],
                dropSchema: options && options.dropSchema !== undefined ? options.dropSchema : false,
                cache: options ? options.cache : undefined,
            });
            if (options && options.driverSpecific)
                newOptions = Object.assign({}, options.driverSpecific, newOptions);
            if (options && options.schemaCreate)
                newOptions.synchronize = options.schemaCreate;
            if (options && options.schema)
                newOptions.schema = options.schema;
            if (options && options.logging !== undefined)
                newOptions.logging = options.logging;
            if (options && options.__dirname)
                newOptions.entities = [options.__dirname + "/entity/*{.js,.ts}"];
            if (options && options.__dirname)
                newOptions.migrations = [options.__dirname + "/migration/*{.js,.ts}"];
            if (options && options.namingStrategy)
                newOptions.namingStrategy = options.namingStrategy;
            if (options && options.entityFactory)
                newOptions.entityFactory = options.entityFactory;
            return newOptions;
        });
}

/**
 * Creates a testing connections based on the configuration in the ormconfig.json
 * and given options that can override some of its configuration for the test-specific use case.
 */
export async function createTestingConnections(options?: TestingOptions): Promise<Connection[]> {
    const connections = await createConnections(setupTestingConnections(options));
    await Promise.all(connections.map(async connection => {
        // create new databases
        const databases: string[] = [];
        connection.entityMetadatas.forEach(metadata => {
            if (metadata.database && databases.indexOf(metadata.database) === -1)
                databases.push(metadata.database);
        });

        const queryRunner = connection.createQueryRunner();
        await PromiseUtils.runInSequence(databases, database => {
            if (!(connection.driver instanceof PostgresDriver))
                return queryRunner.createDatabase(database, true);

            return Promise.resolve();
        });

        // create new schemas
        if (connection.driver instanceof PostgresDriver || connection.driver instanceof SqlServerDriver) {
            const schemaPaths: string[] = [];
            connection.entityMetadatas
                .filter(entityMetadata => !!entityMetadata.schemaPath)
                .forEach(entityMetadata => {
                    const existSchemaPath = schemaPaths.find(path => path === entityMetadata.schemaPath);
                    if (!existSchemaPath)
                        schemaPaths.push(entityMetadata.schemaPath!);
                });

            const schema = connection.driver.options.schema;
            if (schema && schemaPaths.indexOf(schema) === -1)
                schemaPaths.push(schema);

            await PromiseUtils.runInSequence(schemaPaths, schemaPath => queryRunner.createSchema(schemaPath, true));
        }

        await queryRunner.release();
    }));

    return connections;
}

/**
 * Closes testing connections if they are connected.
 */
export function closeTestingConnections(connections: Connection[]) {
    return Promise.all(connections.map(connection => connection && connection.isConnected ? connection.close() : undefined));
}

/**
 * Reloads all databases for all given connections.
 */
export function reloadTestingDatabases(connections: Connection[]) {
    return Promise.all(connections.map(connection => connection.synchronize(true)));
}

/**
 * Generates random text array with custom length.
 */
export function generateRandomText(length: number): string {
    let text = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i <= length; i++ )
        text += characters.charAt(Math.floor(Math.random() * characters.length));

    return text;
}

export function sleep(ms: number): Promise<void> {
    return new Promise<void>(ok => {
        setTimeout(ok, ms);
    });
}
