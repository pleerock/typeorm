/*!
 */
import "reflect-metadata";
import "zen-observable";
import {ConnectionManager} from "./connection/ConnectionManager";
import {Connection} from "./connection/Connection";
import {MetadataArgsStorage} from "./metadata-args/MetadataArgsStorage";
import {ConnectionOptions} from "./connection/ConnectionOptions";
import {getFromContainer} from "./container";
import {ObjectType} from "./common/ObjectType";
import {Repository} from "./repository/Repository";
import {EntityManager} from "./entity-manager/EntityManager";
import {PlatformTools} from "./platform/PlatformTools";
import {TreeRepository} from "./repository/TreeRepository";
import {MongoRepository} from "./repository/MongoRepository";
import {ConnectionOptionsReader} from "./connection/ConnectionOptionsReader";
import {PromiseUtils} from "./util/PromiseUtils";
import {MongoEntityManager} from "./entity-manager/MongoEntityManager";
import {SqljsEntityManager} from "./entity-manager/SqljsEntityManager";
import {SelectQueryBuilder} from "./query-builder/SelectQueryBuilder";
import {EntityTarget} from "./common/EntityTarget";

// -------------------------------------------------------------------------
// Commonly Used exports
// -------------------------------------------------------------------------

export * from "./container";
export * from "./common/ObjectType";
export * from "./common/EntityTarget";
export * from "./common/ObjectLiteral";
export * from "./common/DeepPartial";
export * from "./error/QueryFailedError";
export * from "./decorator/columns/Column";
export * from "./decorator/columns/CreateDateColumn";
export * from "./decorator/columns/DeleteDateColumn";
export * from "./decorator/columns/PrimaryGeneratedColumn";
export * from "./decorator/columns/PrimaryColumn";
export * from "./decorator/columns/UpdateDateColumn";
export * from "./decorator/columns/VersionColumn";
export * from "./decorator/columns/ViewColumn";
export * from "./decorator/columns/ObjectIdColumn";
export * from "./decorator/listeners/AfterInsert";
export * from "./decorator/listeners/AfterLoad";
export * from "./decorator/listeners/AfterRemove";
export * from "./decorator/listeners/AfterUpdate";
export * from "./decorator/listeners/BeforeInsert";
export * from "./decorator/listeners/BeforeRemove";
export * from "./decorator/listeners/BeforeUpdate";
export * from "./decorator/listeners/EventSubscriber";
export * from "./decorator/options/ColumnOptions";
export * from "./decorator/options/IndexOptions";
export * from "./decorator/options/JoinColumnOptions";
export * from "./decorator/options/JoinTableOptions";
export * from "./decorator/options/RelationOptions";
export * from "./decorator/options/EntityOptions";
export * from "./decorator/options/ValueTransformer";
export * from "./decorator/relations/JoinColumn";
export * from "./decorator/relations/JoinTable";
export * from "./decorator/relations/ManyToMany";
export * from "./decorator/relations/ManyToOne";
export * from "./decorator/relations/OneToMany";
export * from "./decorator/relations/OneToOne";
export * from "./decorator/relations/RelationCount";
export * from "./decorator/relations/RelationId";
export * from "./decorator/entity/Entity";
export * from "./decorator/entity/ChildEntity";
export * from "./decorator/entity/TableInheritance";
export * from "./decorator/entity-view/ViewEntity";
export * from "./decorator/tree/TreeLevelColumn";
export * from "./decorator/tree/TreeParent";
export * from "./decorator/tree/TreeChildren";
export * from "./decorator/tree/Tree";
export * from "./decorator/Index";
export * from "./decorator/Unique";
export * from "./decorator/Check";
export * from "./decorator/Exclusion";
export * from "./decorator/Generated";
export * from "./decorator/EntityRepository";
export * from "./find-options/operator/Any";
export * from "./find-options/operator/Between";
export * from "./find-options/operator/Equal";
export * from "./find-options/operator/In";
export * from "./find-options/operator/IsNull";
export * from "./find-options/operator/LessThan";
export * from "./find-options/operator/LessThanOrEqual";
export * from "./find-options/operator/Like";
export * from "./find-options/operator/ILike";
export * from "./find-options/operator/MoreThan";
export * from "./find-options/operator/MoreThanOrEqual";
export * from "./find-options/operator/Not";
export * from "./find-options/operator/Raw";
export * from "./find-options/operator/If";
export * from "./find-options/operator/Switch";
export * from "./find-options/FindOperator";
export * from "./find-options/FindOperatorType";
export * from "./find-options/OrderByCondition";
export * from "./find-options/FindOptionsUtils";
export * from "./logger/Logger";
export * from "./logger/AdvancedConsoleLogger";
export * from "./logger/SimpleConsoleLogger";
export * from "./logger/FileLogger";
export * from "./metadata/EntityMetadata";
export * from "./entity-manager/EntityManager";
export * from "./repository/AbstractRepository";
export * from "./repository/Repository";
export * from "./repository/BaseEntity";
export * from "./repository/TreeRepository";
export * from "./repository/MongoRepository";
export * from "./repository/RemoveOptions";
export * from "./repository/SaveOptions";
export * from "./schema-builder/table/TableCheck";
export * from "./schema-builder/table/TableColumn";
export * from "./schema-builder/table/TableExclusion";
export * from "./schema-builder/table/TableForeignKey";
export * from "./schema-builder/table/TableIndex";
export * from "./schema-builder/table/TableUnique";
export * from "./schema-builder/table/Table";
export * from "./driver/mongodb/typings";
export * from "./driver/types/DatabaseType";
export * from "./driver/sqlserver/MssqlParameter";
export * from "./typed-entity-schema";

export {ConnectionOptionsReader} from "./connection/ConnectionOptionsReader";
export {Connection} from "./connection/Connection";
export {ConnectionManager} from "./connection/ConnectionManager";
export {ConnectionOptions} from "./connection/ConnectionOptions";
export {Driver} from "./driver/Driver";
export {QueryBuilder} from "./query-builder/QueryBuilder";
export {SelectQueryBuilder} from "./query-builder/SelectQueryBuilder";
export {DeleteQueryBuilder} from "./query-builder/DeleteQueryBuilder";
export {InsertQueryBuilder} from "./query-builder/InsertQueryBuilder";
export {UpdateQueryBuilder} from "./query-builder/UpdateQueryBuilder";
export {RelationQueryBuilder} from "./query-builder/RelationQueryBuilder";
export {Brackets} from "./query-builder/Brackets";
export {WhereExpression} from "./query-builder/WhereExpression";
export {InsertResult} from "./query-builder/result/InsertResult";
export {UpdateResult} from "./query-builder/result/UpdateResult";
export {DeleteResult} from "./query-builder/result/DeleteResult";
export {QueryPartialEntity} from "./query-builder/QueryPartialEntity";
export {QueryDeepPartialEntity} from "./query-builder/QueryPartialEntity";
export {QueryRunner} from "./query-runner/QueryRunner";
export {EntityManager} from "./entity-manager/EntityManager";
export {MongoEntityManager} from "./entity-manager/MongoEntityManager";
export {Migration} from "./migration/Migration";
export {MigrationExecutor} from "./migration/MigrationExecutor";
export {MigrationInterface} from "./migration/MigrationInterface";
export {DefaultNamingStrategy} from "./naming-strategy/DefaultNamingStrategy";
export {NamingStrategyInterface} from "./naming-strategy/NamingStrategyInterface";
export {OldEntityFactory} from "./entity-factory/OldEntityFactory";
export {EntityFactoryInterface} from "./entity-factory/EntityFactoryInterface";
export {Repository} from "./repository/Repository";
export {TreeRepository} from "./repository/TreeRepository";
export {MongoRepository} from "./repository/MongoRepository";
export * from "./find-options/FindOptions";
export {InsertEvent} from "./subscriber/event/InsertEvent";
export {UpdateEvent} from "./subscriber/event/UpdateEvent";
export {RemoveEvent} from "./subscriber/event/RemoveEvent";
export {EntitySubscriberInterface} from "./subscriber/EntitySubscriberInterface";
export {BaseEntity} from "./repository/BaseEntity";
export {EntitySchema} from "./entity-schema/EntitySchema";
export {EntitySchemaColumnOptions} from "./entity-schema/EntitySchemaColumnOptions";
export {EntitySchemaIndexOptions} from "./entity-schema/EntitySchemaIndexOptions";
export {EntitySchemaRelationOptions} from "./entity-schema/EntitySchemaRelationOptions";
export {ColumnType} from "./driver/types/ColumnTypes";
export {PromiseUtils} from "./util/PromiseUtils";

// -------------------------------------------------------------------------
// Deprecated
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Commonly used functionality
// -------------------------------------------------------------------------

/**
 * Gets metadata args storage.
 */
export function getMetadataArgsStorage(): MetadataArgsStorage {
    // we should store metadata storage in a global variable otherwise it brings too much problems
    // one of the problem is that if any entity (or any other) will be imported before consumer will call
    // useContainer method with his own container implementation, that entity will be registered in the
    // old old container (default one post probably) and consumer will his entity.
    // calling useContainer before he imports any entity (or any other) is not always convenient.
    // another reason is that when we run migrations typeorm is being called from a global package
    // and it may load entities which register decorators in typeorm of local package
    // this leads to impossibility of usage of entities in migrations and cli related operations
    const globalScope = PlatformTools.getGlobalVariable();
    if (!globalScope.typeormMetadataArgsStorage)
        globalScope.typeormMetadataArgsStorage = new MetadataArgsStorage();

    return globalScope.typeormMetadataArgsStorage;
}

/**
 * Reads connection options stored in ormconfig configuration file.
 */
export async function getConnectionOptions(connectionName: string = "default"): Promise<ConnectionOptions> {
    return new ConnectionOptionsReader().get(connectionName);
}

/**
 * Gets a ConnectionManager which creates connections.
 */
export function getConnectionManager(): ConnectionManager {
    return getFromContainer(ConnectionManager);
}

/**
 * Creates a new connection and registers it in the manager.
 * Only one connection from ormconfig will be created (name "default" or connection without name).
 */
export async function createConnection(): Promise<Connection>;

/**
 * Creates a new connection from the ormconfig file with a given name.
 */
export async function createConnection(name: string): Promise<Connection>;

/**
 * Creates a new connection and registers it in the manager.
 */
export async function createConnection(options: ConnectionOptions): Promise<Connection>;

/**
 * Creates a new connection and registers it in the manager.
 *
 * If connection options were not specified, then it will try to create connection automatically,
 * based on content of ormconfig (json/js/yml/xml/env) file or environment variables.
 * Only one connection from ormconfig will be created (name "default" or connection without name).
 */
export async function createConnection(optionsOrName?: any): Promise<Connection> {
    const connectionName = typeof optionsOrName === "string" ? optionsOrName : "default";
    const options = optionsOrName instanceof Object ? optionsOrName : await getConnectionOptions(connectionName);
    return getConnectionManager().create(options).connect();
}

/**
 * Creates new connections and registers them in the manager.
 *
 * If connection options were not specified, then it will try to create connection automatically,
 * based on content of ormconfig (json/js/yml/xml/env) file or environment variables.
 * All connections from the ormconfig will be created.
 */
export async function createConnections(options?: ConnectionOptions[]): Promise<Connection[]> {
    if (!options)
        options = await new ConnectionOptionsReader().all();
    const connections = options.map(options => getConnectionManager().create(options));
    return PromiseUtils.runInSequence(connections, connection => connection.connect());
}

/**
 * Gets connection from the connection manager.
 * If connection name wasn't specified, then "default" connection will be retrieved.
 */
export function getConnection(connectionName: string = "default"): Connection {
    return getConnectionManager().get(connectionName);
}

/**
 * Gets entity manager from the connection.
 * If connection name wasn't specified, then "default" connection will be retrieved.
 */
export function getManager(connectionName: string = "default"): EntityManager {
    return getConnectionManager().get(connectionName).manager;
}

/**
 * Gets MongoDB entity manager from the connection.
 * If connection name wasn't specified, then "default" connection will be retrieved.
 */
export function getMongoManager(connectionName: string = "default"): MongoEntityManager {
    return getConnectionManager().get(connectionName).manager as MongoEntityManager;
}

/**
 * Gets Sqljs entity manager from connection name.
 * "default" connection is used, when no name is specified.
 * Only works when Sqljs driver is used.
 */
export function getSqljsManager(connectionName: string = "default"): SqljsEntityManager {
    return getConnectionManager().get(connectionName).manager as SqljsEntityManager;
}

/**
 * Gets repository for the given entity class.
 */
export function getRepository<Entity>(entityClass: EntityTarget<Entity>, connectionName: string = "default"): Repository<Entity> {
    return getConnectionManager().get(connectionName).getRepository<Entity>(entityClass);
}

/**
 * Creates a new connection without connection establishment.
 */
export function connection(options: ConnectionOptions) {
    return getConnectionManager().create(options);
}

/**
 * Gets tree repository for the given entity class.
 */
export function getTreeRepository<Entity>(entityClass: EntityTarget<Entity>, connectionName: string = "default"): TreeRepository<Entity> {
    return getConnectionManager().get(connectionName).getTreeRepository<Entity>(entityClass);
}

/**
 * Gets tree repository for the given entity class.
 */
export function getCustomRepository<T>(customRepository: ObjectType<T>, connectionName: string = "default"): T {
    return getConnectionManager().get(connectionName).getCustomRepository(customRepository);
}

/**
 * Gets mongodb repository for the given entity class or name.
 */
export function getMongoRepository<Entity>(entityClass: EntityTarget<Entity>, connectionName: string = "default"): MongoRepository<Entity> {
    return getConnectionManager().get(connectionName).getMongoRepository<Entity>(entityClass);
}

/**
 * Creates a new query builder.
 */
export function createQueryBuilder<Entity>(entityClass?: EntityTarget<Entity>, alias?: string, connectionName: string = "default"): SelectQueryBuilder<Entity> {
    if (entityClass) {
        return getRepository(entityClass, connectionName).createQueryBuilder(alias);
    }

    return getConnection(connectionName).createQueryBuilder();
}
