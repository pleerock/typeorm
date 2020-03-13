import {EntitySchema} from "../entity-schema/EntitySchema";
import {LoggerOptions} from "../logger/LoggerOptions";
import {NamingStrategyInterface} from "../naming-strategy/NamingStrategyInterface";
import {DatabaseType} from "../driver/types/DatabaseType";
import {Logger} from "../logger/Logger";
import {EntityFactoryInterface} from "../entity-factory/EntityFactoryInterface";
import {MappedEntitySchemaProperty} from "../typed-entity-schema/typed-entity-schema-types";
import {Connection} from "./Connection";
import {QueryResultCache} from "../cache/QueryResultCache";

/**
 * BaseConnectionOptions is set of connection options shared by all database types.
 */
export interface BaseConnectionOptions {

    /**
     * Database type. This value is required.
     */
    readonly type: DatabaseType;

    /**
     * Connection name. If connection name is not given then it will be called "default".
     * Different connections must have different names.
     */
    readonly name?: string;

    /**
     * Entities to be loaded for this connection.
     * Accepts both entity classes and directories where from entities need to be loaded.
     * Directories support glob patterns.
     */
    readonly entities?: ((Function|string|EntitySchema<any>))[] | { [key: string]: Function|string|EntitySchema<any> };

    /**
     * Subscribers to be loaded for this connection.
     * Accepts both subscriber classes and directories where from subscribers need to be loaded.
     * Directories support glob patterns.
     */
    readonly subscribers?: (Function|string)[] | { [key: string]: Function|string };

    /**
     * Migrations to be loaded for this connection.
     * Accepts both migration classes and directories where from migrations need to be loaded.
     * Directories support glob patterns.
     */
    readonly migrations?: (Function|string)[] | { [key: string]: Function|string };

    /**
     * Migrations table name, in case of different name from "migrations".
     * Accepts single string name.
     */
    readonly migrationsTableName?: string;

    /**
     * Transaction mode for migrations to run in
     */
    readonly migrationsTransactionMode?: "all" | "none" | "each";

    /**
     * Naming strategy to be used to name tables and columns in the database.
     */
    readonly namingStrategy?: NamingStrategyInterface;

    /**
     * Entity factory to be used for this connection.
     * If this options is set, TypeOrm will use the provided factory to create instance of entities.
     */
    readonly entityFactory?: EntityFactoryInterface;

    /**
     * Used to map missing entity schema data.
     */
    readonly mappedEntitySchemaProperties?: MappedEntitySchemaProperty[];

    /**
     * Logging options.
     */
    readonly logging?: LoggerOptions;

    /**
     * Logger instance used to log queries and events in the ORM.
     */
    readonly logger?: "advanced-console"|"simple-console"|"file"|"debug"|Logger;

    /**
     * Maximum number of milliseconds query should be executed before logger log a warning.
     */
    readonly maxQueryExecutionTime?: number;

    /**
     * Indicates if database schema should be auto created on every application launch.
     * Be careful with this option and don't use this in production - otherwise you can lose production data.
     * This option is useful during debug and development.
     * Alternative to it, you can use CLI and run schema:sync command.
     *
     * Note that for MongoDB database it does not create schema, because MongoDB is schemaless.
     * Instead, it syncs just by creating indices.
     */
    readonly synchronize?: boolean;

    /**
     * Indicates if migrations should be auto run on every application launch.
     * Alternative to it, you can use CLI and run migrations:run command.
     */
    readonly migrationsRun?: boolean;

    /**
     * Drops the schema each time connection is being established.
     * Be careful with this option and don't use this in production - otherwise you'll lose all production data.
     * This option is useful during debug and development.
     */
    readonly dropSchema?: boolean;

    /**
     * Prefix to use on all tables (collections) of this connection in the database.
     */
    readonly entityPrefix?: string;

    /**
     * Extra connection options to be passed to the underlying driver.
     *
     * todo: deprecate this and move all database-specific types into hts own connection options object.
     */
    readonly extra?: any;

    /**
     * Allows to setup cache options.
     */
    readonly cache?: boolean|{

        /**
         * Type of caching.
         *
         * - "database" means cached values will be stored in the separate table in database. This is default value.
         * - "redis" means cached values will be stored inside redis. You must provide redis connection options.
         */
        readonly type?: "database" | "redis" | "ioredis" | "ioredis/cluster"; // todo: add mongodb and other cache providers as well in the future

        /**
         * Factory function for custom cache providers that implement QueryResultCache.
         */
        readonly provider?: (connection: Connection) => QueryResultCache;

        /**
         * Configurable table name for "database" type cache.
         * Default value is "query-result-cache"
         */
        readonly tableName?: string;

        /**
         * Used to provide redis connection options.
         */
        readonly options?: any;

        /**
         * If set to true then queries (using find methods and QueryBuilder's methods) will always be cached.
         */
        readonly alwaysEnabled?: boolean;

        /**
         * Time in milliseconds in which cache will expire.
         * This can be setup per-query.
         * Default value is 1000 which is equivalent to 1 second.
         */
        readonly duration?: number;

    };

    /**
     * CLI settings.
     */
    readonly cli?: {

        /**
         * Directory where entities should be created by default.
         */
        readonly entitiesDir?: string;

        /**
         * Directory where migrations should be created by default.
         */
        readonly migrationsDir?: string;

        /**
         * Directory where subscribers should be created by default.
         */
        readonly subscribersDir?: string;

    };

    /**
     * Optionally applied "typename" to the model.
     * If set, then each hydrated model will have this property with the target model / entity name inside.
     *
     * (works like a discriminator property).
     */
    readonly typename?: string;

}
