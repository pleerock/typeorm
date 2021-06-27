import {Driver} from "../driver/Driver";
import {Repository} from "../repository/Repository";
import {EntitySubscriberInterface} from "../subscriber/EntitySubscriberInterface";
import {EntityTarget} from "../common/EntityTarget";
import {ObjectType} from "../common/ObjectType";
import {EntityManager} from "../entity-manager/EntityManager";
import {DefaultNamingStrategy} from "../naming-strategy/DefaultNamingStrategy";
import {CannotExecuteNotConnectedError} from "../error/CannotExecuteNotConnectedError";
import {CannotConnectAlreadyConnectedError} from "../error/CannotConnectAlreadyConnectedError";
import {TreeRepository} from "../repository/TreeRepository";
import {NamingStrategyInterface} from "../naming-strategy/NamingStrategyInterface";
import {EntityMetadata} from "../metadata/EntityMetadata";
import {Logger} from "../logger/Logger";
import {EntityMetadataNotFoundError} from "../error/EntityMetadataNotFoundError";
import {MigrationInterface} from "../migration/MigrationInterface";
import {MigrationExecutor} from "../migration/MigrationExecutor";
import {Migration} from "../migration/Migration";
import {MongoRepository} from "../repository/MongoRepository";
import {MongoDriver} from "../driver/mongodb/MongoDriver";
import {MongoEntityManager} from "../entity-manager/MongoEntityManager";
import {EntityMetadataValidator} from "../metadata-builder/EntityMetadataValidator";
import {ConnectionOptions} from "./ConnectionOptions";
import {QueryRunnerProviderAlreadyReleasedError} from "../error/QueryRunnerProviderAlreadyReleasedError";
import {EntityManagerFactory} from "../entity-manager/EntityManagerFactory";
import {DriverFactory} from "../driver/DriverFactory";
import {ConnectionMetadataBuilder} from "./ConnectionMetadataBuilder";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {LoggerFactory} from "../logger/LoggerFactory";
import {QueryResultCacheFactory} from "../cache/QueryResultCacheFactory";
import {QueryResultCache} from "../cache/QueryResultCache";
import {SqljsEntityManager} from "../entity-manager/SqljsEntityManager";
import {RelationLoader} from "../query-builder/RelationLoader";
import {RelationIdLoader} from "../query-builder/RelationIdLoader";
import {EntitySchema, ObjectLiteral} from "../";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {ObjectUtils} from "../util/ObjectUtils";
import {IsolationLevel} from "../driver/types/IsolationLevel";
import {AuroraDataApiDriver} from "../driver/aurora-data-api/AuroraDataApiDriver";
import {DriverUtils} from "../driver/DriverUtils";
import {ReplicationMode} from "../driver/types/ReplicationMode";

/**
 * Connection is a single database ORM connection to a specific database.
 * Its not required to be a database connection, depend on database type it can create connection pool.
 * You can have multiple connections to multiple databases in your application.
 */
export class Connection {

    // -------------------------------------------------------------------------
    // Public Readonly Properties
    // -------------------------------------------------------------------------

    /**
     * Connection name.
     */
    readonly name: string;

    /**
     * Connection options.
     */
    readonly options: ConnectionOptions;

    /**
     * Indicates if connection is initialized or not.
     */
    readonly isConnected: boolean;

    /**
     * Database driver used by this connection.
     */
    readonly driver: Driver;

    /**
     * EntityManager of this connection.
     */
    readonly manager: EntityManager;

    /**
     * Naming strategy used in the connection.
     */
    readonly namingStrategy: NamingStrategyInterface;

    /**
     * Logger used to log orm events.
     */
    readonly logger: Logger;

    /**
     * Migration instances that are registered for this connection.
     */
    readonly migrations: MigrationInterface[] = [];

    /**
     * Entity subscriber instances that are registered for this connection.
     */
    readonly subscribers: EntitySubscriberInterface<any>[] = [];

    /**
     * All entity metadatas that are registered for this connection.
     */
    readonly entityMetadatas: EntityMetadata[] = [];

    /**
     * Used to work with query result cache.
     */
    readonly queryResultCache?: QueryResultCache;

    /**
     * Used to load relations and work with lazy relations.
     */
    readonly relationLoader: RelationLoader;

    /**
     * Used to load relation ids of specific entity relations.
     */
    readonly relationIdLoader: RelationIdLoader;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(options: ConnectionOptions) {
        this.name = options.name || "default";
        this.options = options;
        this.logger = new LoggerFactory().create(this.options.logger, this.options.logging);
        this.driver = new DriverFactory().create(this);
        this.manager = this.createEntityManager();
        this.namingStrategy = options.namingStrategy || new DefaultNamingStrategy();
        this.queryResultCache = options.cache ? new QueryResultCacheFactory(this).create() : undefined;
        this.relationLoader = new RelationLoader(this);
        this.relationIdLoader = new RelationIdLoader(this);
        this.isConnected = false;
    }

    // -------------------------------------------------------------------------
    // Public Accessors
    // -------------------------------------------------------------------------

    /**
     * Gets the mongodb entity manager that allows to perform mongodb-specific repository operations
     * with any entity in this connection.
     *
     * Available only in mongodb connections.
     */
    get mongoManager(): MongoEntityManager {
        if (!(this.manager instanceof MongoEntityManager))
            throw new Error(`MongoEntityManager is only available for MongoDB databases.`);

        return this.manager as MongoEntityManager;
    }

    /**
     * Gets a sql.js specific Entity Manager that allows to perform special load and save operations
     *
     * Available only in connection with the sqljs driver.
     */
    get sqljsManager(): SqljsEntityManager {
        if (!(this.manager instanceof SqljsEntityManager))
            throw new Error(`SqljsEntityManager is only available for Sqljs databases.`);

        return this.manager as SqljsEntityManager;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Performs connection to the database.
     * This method should be called once on application bootstrap.
     * This method not necessarily creates database connection (depend on database type),
     * but it also can setup a connection pool with database to use.
     */
    async connect(): Promise<this> {
        if (this.isConnected)
            throw new CannotConnectAlreadyConnectedError(this.name);

        // connect to the database via its driver
        await this.driver.connect();

        // connect to the cache-specific database if cache is enabled
        if (this.queryResultCache)
            await this.queryResultCache.connect();

        // set connected status for the current connection
        ObjectUtils.assign(this, { isConnected: true });

        try {

            // build all metadatas registered in the current connection
            this.buildMetadatas();

            await this.driver.afterConnect();

            // if option is set - drop schema once connection is done
            if (this.options.dropSchema)
                await this.dropDatabase();

            // if option is set - automatically synchronize a schema
            if (this.options.synchronize)
                await this.synchronize();

            // if option is set - automatically synchronize a schema
            if (this.options.migrationsRun)
                await this.runMigrations({ transaction: this.options.migrationsTransactionMode });

        } catch (error) {

            // if for some reason build metadata fail (for example validation error during entity metadata check)
            // connection needs to be closed
            await this.close();
            throw error;
        }

        return this;
    }

    /**
     * Closes connection with the database.
     * Once connection is closed, you cannot use repositories or perform any operations except opening connection again.
     */
    async close(): Promise<void> {
        if (!this.isConnected)
            throw new CannotExecuteNotConnectedError(this.name);

        await this.driver.disconnect();

        // disconnect from the cache-specific database if cache was enabled
        if (this.queryResultCache)
            await this.queryResultCache.disconnect();

        ObjectUtils.assign(this, { isConnected: false });
    }

    /**
     * Creates database schema for all entities registered in this connection.
     * Can be used only after connection to the database is established.
     *
     * @param dropBeforeSync If set to true then it drops the database with all its tables and data
     */
    async synchronize(dropBeforeSync: boolean = false): Promise<void> {

        if (!this.isConnected)
            throw new CannotExecuteNotConnectedError(this.name);

        if (dropBeforeSync)
            await this.dropDatabase();

        const schemaBuilder = this.driver.createSchemaBuilder();
        await schemaBuilder.build();
    }

    /**
     * Drops the database and all its data.
     * Be careful with this method on production since this method will erase all your database tables and their data.
     * Can be used only after connection to the database is established.
     */
    // TODO rename
    async dropDatabase(): Promise<void> {
        const queryRunner = this.createQueryRunner();
        try {
            if (this.driver instanceof SqlServerDriver || this.driver instanceof MysqlDriver || this.driver instanceof AuroraDataApiDriver) {
                const databases: string[] = this.driver.database ? [this.driver.database] : [];
                this.entityMetadatas.forEach(metadata => {
                    if (metadata.database && databases.indexOf(metadata.database) === -1)
                        databases.push(metadata.database);
                });

                for (const database of databases) {
                    await queryRunner.clearDatabase(database);
                }
            } else {
                await queryRunner.clearDatabase();
            }
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Runs all pending migrations.
     * Can be used only after connection to the database is established.
     */
    async runMigrations(options?: { transaction?: "all" | "none" | "each" }): Promise<Migration[]> {
        if (!this.isConnected)
            throw new CannotExecuteNotConnectedError(this.name);

        const migrationExecutor = new MigrationExecutor(this);
        migrationExecutor.transaction = (options && options.transaction) || "all";

        const successMigrations = await migrationExecutor.executePendingMigrations();
        return successMigrations;
    }

    /**
     * Reverts last executed migration.
     * Can be used only after connection to the database is established.
     */
    async undoLastMigration(options?: { transaction?: "all" | "none" | "each" }): Promise<void> {

        if (!this.isConnected)
            throw new CannotExecuteNotConnectedError(this.name);

        const migrationExecutor = new MigrationExecutor(this);
        migrationExecutor.transaction = (options && options.transaction) || "all";

        await migrationExecutor.undoLastMigration();
    }

    /**
     * Lists all migrations and whether they have been run.
     * Returns true if there are pending migrations
     */
    async showMigrations(): Promise<boolean> {
        if (!this.isConnected) {
            throw new CannotExecuteNotConnectedError(this.name);
        }
        const migrationExecutor = new MigrationExecutor(this);
        return await migrationExecutor.showMigrations();
    }

    /**
     * Checks if entity metadata exist for the given entity class, target name or table name.
     */
    hasMetadata(target: EntityTarget<any>): boolean {
        return !!this.findMetadata(target);
    }

    /**
     * Gets entity metadata for the given entity class or schema name.
     */
    getMetadata(target: EntityTarget<any>): EntityMetadata {
        const metadata = this.findMetadata(target);
        if (!metadata)
            throw new EntityMetadataNotFoundError(target);

        return metadata;
    }

    /**
     * Gets repository for the given entity.
     */
    getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {
        return this.manager.getRepository(target);
    }

    /**
     * Gets tree repository for the given entity class or name.
     * Only tree-type entities can have a TreeRepository, like ones decorated with @Tree decorator.
     */
    getTreeRepository<Entity>(target: EntityTarget<Entity>): TreeRepository<Entity> {
        return this.manager.getTreeRepository(target);
    }

    /**
     * Gets mongodb-specific repository for the given entity class or name.
     * Works only if connection is mongodb-specific.
     */
    getMongoRepository<Entity>(target: EntityTarget<Entity>): MongoRepository<Entity> {
        if (!(this.driver instanceof MongoDriver))
            throw new Error(`You can use getMongoRepository only for MongoDB connections.`);

        return this.manager.getRepository(target) as any;
    }

    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     */
    getCustomRepository<T>(customRepository: ObjectType<T>): T {
        return this.manager.getCustomRepository(customRepository);
    }

    /**
     * Wraps given function execution (and all operations made there) into a transaction.
     * All database operations must be executed using provided entity manager.
     */
    async transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
    async transaction<T>(isolationLevel: IsolationLevel, runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
    async transaction<T>(
        isolationOrRunInTransaction: IsolationLevel | ((entityManager: EntityManager) => Promise<T>),
        runInTransactionParam?: (entityManager: EntityManager) => Promise<T>
    ): Promise<any> {
        return this.manager.transaction(
            isolationOrRunInTransaction as any,
            runInTransactionParam as any
        );
    }

    /**
     * Executes raw SQL query and returns raw database results.
     */
    async query(query: string, parameters?: any[], queryRunner?: QueryRunner, data?: ObjectLiteral): Promise<any> {
        if (this instanceof MongoEntityManager)
            throw new Error(`Queries aren't supported by MongoDB.`);

        if (queryRunner && queryRunner.isReleased)
            throw new QueryRunnerProviderAlreadyReleasedError();

        const usedQueryRunner = queryRunner || this.createQueryRunner();

        if (data) {
            ObjectUtils.assign(usedQueryRunner.data, data);
        }

        try {
            return await usedQueryRunner.query(query, parameters);  // await is needed here because we are using finally

        } finally {
            if (!queryRunner)
                await usedQueryRunner.release();
        }
    }

    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    createQueryBuilder<Entity>(entityClass: EntityTarget<Entity>, alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>;

    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    createQueryBuilder(queryRunner?: QueryRunner): SelectQueryBuilder<any>;

    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    createQueryBuilder<Entity>(entityOrRunner?: EntityTarget<Entity>|QueryRunner, alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity> {
        if (this instanceof MongoEntityManager)
            throw new Error(`Query Builder is not supported by MongoDB.`);

        if (alias) {
            const metadata = this.getMetadata(entityOrRunner as EntityTarget<Entity>);
            return new SelectQueryBuilder(this, queryRunner)
                .select(alias)
                .from(metadata.target, alias);

        } else {
            return new SelectQueryBuilder(this, entityOrRunner as QueryRunner|undefined);
        }
    }

    /**
     * Creates a query runner used for perform queries on a single database connection.
     * Using query runners you can control your queries to execute using single database connection and
     * manually control your database transaction.
     *
     * Mode is used in replication mode and indicates whatever you want to connect
     * to master database or any of slave databases.
     * If you perform writes you must use master database,
     * if you perform reads you can use slave databases.
     */
    createQueryRunner(mode: ReplicationMode = "master"): QueryRunner {
        const queryRunner = this.driver.createQueryRunner(mode);
        const manager = this.createEntityManager(queryRunner);
        Object.assign(queryRunner, { manager: manager });
        return queryRunner;
    }

    /**
     * Gets entity metadata of the junction table (many-to-many table).
     */
    getManyToManyMetadata(entityTarget: EntityTarget<any>, relationPropertyPath: string) {
        const relationMetadata = this.getMetadata(entityTarget).findRelationWithPropertyPath(relationPropertyPath);
        if (!relationMetadata)
            throw new Error(`Relation "${relationPropertyPath}" was not found in ${entityTarget} entity.`);
        if (!relationMetadata.isManyToMany)
            throw new Error(`Relation "${entityTarget}#${relationPropertyPath}" does not have a many-to-many relationship.` +
                `You can use this method only on many-to-many relations.`);

        return relationMetadata.junctionEntityMetadata;
    }

    /**
     * Creates an Entity Manager for the current connection with the help of the EntityManagerFactory.
     */
    createEntityManager(queryRunner?: QueryRunner): EntityManager {
        return new EntityManagerFactory().create(this, queryRunner);
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Finds exist entity metadata by the given entity class, target name or table name.
     */
    protected findMetadata(target: EntityTarget<any>): EntityMetadata|undefined {
        return this.entityMetadatas.find(metadata => {
            if (metadata.target === target)
                return true;
            if (target instanceof EntitySchema) {
                return metadata.name === target.options.name;
            }
            if (typeof target === "string") {
                if (target.indexOf(".") !== -1) {
                    return metadata.tablePath === target;
                } else {
                    return metadata.name === target || metadata.tableName === target;
                }
            }

            return false;
        });
    }

    /**
     * Builds metadatas for all registered classes inside this connection.
     */
    protected buildMetadatas(): void {

        const connectionMetadataBuilder = new ConnectionMetadataBuilder(this);
        const entityMetadataValidator = new EntityMetadataValidator();

        // create subscribers instances if they are not disallowed from high-level (for example they can disallowed from migrations run process)
        const subscribers = connectionMetadataBuilder.buildSubscribers(this.options.subscribers || []);
        ObjectUtils.assign(this, { subscribers: subscribers });

        // build entity metadatas
        const entityMetadatas = connectionMetadataBuilder.buildEntityMetadatas(this.options.entities || []);
        ObjectUtils.assign(this, { entityMetadatas: entityMetadatas });

        // create migration instances
        const migrations = connectionMetadataBuilder.buildMigrations(this.options.migrations || []);
        ObjectUtils.assign(this, { migrations: migrations });

        this.driver.database = this.getDatabaseName();

        // validate all created entity metadatas to make sure user created entities are valid and correct
        entityMetadataValidator.validateMany(this.entityMetadatas.filter(metadata => metadata.tableType !== "view"), this.driver);
    }

    // This database name property is nested for replication configs.
    protected getDatabaseName(): string {
        const options = this.options;
        switch (options.type) {
            case "mysql" :
            case "mariadb" :
            case "postgres":
            case "cockroachdb":
            case "mssql":
            case "oracle":
                return DriverUtils.buildDriverOptions(options.replication ? options.replication.master : options).database;
            case "mongodb":
                return DriverUtils.buildMongoDBDriverOptions(options).database;
            default:
                return DriverUtils.buildDriverOptions(options).database;
    }
}

}
