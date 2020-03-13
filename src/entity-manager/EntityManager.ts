import * as Observable from "zen-observable";
import { DeepPartial } from "../common/DeepPartial";
import { EntityTarget } from "../common/EntityTarget";
import { ObjectType } from "../common/ObjectType";
import { Connection } from "../connection/Connection";
import { ObjectID } from "../driver/mongodb/typings";
import { IsolationLevel } from "../driver/types/IsolationLevel";
import { FindExtraOptions, FindOptions, FindOptionsWhere } from "../find-options/FindOptions";
import { QueryDeepPartialEntity } from "../query-builder/QueryPartialEntity";
import { DeleteResult } from "../query-builder/result/DeleteResult";
import { InsertResult } from "../query-builder/result/InsertResult";
import { UpdateResult } from "../query-builder/result/UpdateResult";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { QueryRunner } from "../query-runner/QueryRunner";
import { MongoRepository } from "../repository/MongoRepository";
import { RemoveOptions } from "../repository/RemoveOptions";
import { Repository } from "../repository/Repository";
import { SaveOptions } from "../repository/SaveOptions";
import { TreeRepository } from "../repository/TreeRepository";
import { EntitySchema } from "..";

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export type EntityManager = {

    /**
     * Can be used to determine what object type is used.
     */
    readonly typeof: "EntityManager"

    /**
     * Connection used by this entity manager.
     */
    readonly connection: Connection;

    /**
     * Custom query runner to be used for operations in this entity manager.
     * Used only in non-global entity manager.
     */
    readonly queryRunner?: QueryRunner;

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;

    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    transaction<T>(isolationLevel: IsolationLevel, runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;

    /**
     * Executes raw SQL query and returns raw database results.
     */
    query(query: string, parameters?: any[]): Promise<any>;

    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    createQueryBuilder<Entity>(entityClass: EntityTarget<Entity>, alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>;

    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    createQueryBuilder(queryRunner?: QueryRunner): SelectQueryBuilder<any>;

    /**
     * Checks if entity has an id.
     */
    hasId(entity: any): boolean;

    /**
     * Checks if entity of given schema name has an id.
     */
    hasId(target: Function|string, entity: any): boolean;

    /**
     * Gets entity mixed id.
     */
    getId(entity: any): any;

    /**
     * Gets entity mixed id.
     */
    getId(target: Function|string, entity: any): any;

    /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that present in entity schema.
     */
    create<Entity>(entityClass: EntityTarget<Entity>, plainObject?: DeepPartial<Entity>): Entity;

    /**
     * Creates a new entities and copies all entity properties from given objects into their new entities.
     * Note that it copies only properties that present in entity schema.
     */
    create<Entity>(entityClass: EntityTarget<Entity>, plainObjects?: DeepPartial<Entity>[]): Entity[];

    /**
     * Merges two entities into one new entity.
     */
    merge<Entity>(entityClass: EntityTarget<Entity>, mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity;

    /**
     * Creates a new entity from the given plan javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     */
    preload<Entity>(entityClass: EntityTarget<Entity>, entityLike: DeepPartial<Entity>): Promise<Entity|undefined>;

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity>(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity>(entity: Entity, options?: SaveOptions): Promise<Entity>;

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(entity: Entity, options?: RemoveOptions): Promise<Entity>;

    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(targetOrEntity: EntityTarget<Entity>, entity: Entity, options?: RemoveOptions): Promise<Entity>;

    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(entity: Entity[], options?: RemoveOptions): Promise<Entity>;

    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(targetOrEntity: EntityTarget<Entity>, entity: Entity[], options?: RemoveOptions): Promise<Entity[]>;

    /**
     * Records the delete date of all given entities.
     */
    softRemove<Entity>(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;

    /**
     * Records the delete date of a given entity.
     */
    softRemove<Entity>(entity: Entity, options?: SaveOptions): Promise<Entity>;

    /**
     * Records the delete date of all given entities.
     */
    softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: ObjectType<Entity>|EntitySchema<Entity>, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Records the delete date of a given entity.
     */
    softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: ObjectType<Entity>|EntitySchema<Entity>, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Records the delete date of all given entities.
     */
    softRemove<T>(targetOrEntity: string, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Records the delete date of a given entity.
     */
    softRemove<T>(targetOrEntity: string, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Recovers all given entities.
     */
    recover<Entity>(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;

    /**
     * Recovers a given entity.
     */
    recover<Entity>(entity: Entity, options?: SaveOptions): Promise<Entity>;

    /**
     * Recovers all given entities.
     */
    recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: ObjectType<Entity>|EntitySchema<Entity>, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Recovers a given entity.
     */
    recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: ObjectType<Entity>|EntitySchema<Entity>, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Recovers all given entities.
     */
    recover<T>(targetOrEntity: string, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Recovers a given entity.
     */
    recover<T>(targetOrEntity: string, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    insert<Entity>(target: EntityTarget<Entity>, entity: QueryDeepPartialEntity<Entity>|(QueryDeepPartialEntity<Entity>[])): Promise<InsertResult>;

    /**
     * Updates entity partially. Entity can be found by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    update<Entity>(target: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult>;

    /**
     * Deletes entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    delete<Entity>(targetOrEntity: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>): Promise<DeleteResult>;

    /**
     * Records the delete date of entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    softDelete<Entity>(targetOrEntity: ObjectType<Entity> | EntitySchema<Entity> | string, criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | any): Promise<UpdateResult>;

    /**
     * Restores entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    restore<Entity>(targetOrEntity: ObjectType<Entity> | EntitySchema<Entity> | string, criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | any): Promise<UpdateResult>;

    /**
     * Counts entities that match given find options or conditions.
     * Useful for pagination.
     */
    count<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>, options?: FindExtraOptions): Promise<number>;

    /**
     * Finds entities that match given options.
     */
    find<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities that match given conditions.
     */
    find<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>): Promise<Entity[]>;

    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Promise<[Entity[], number]>;

    /**
     * Finds entities that match given conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>): Promise<[Entity[], number]>;

    /**
     * Finds entities with ids.
     * Optionally find options can be applied.
     */
    findByIds<Entity>(entityClass: EntityTarget<Entity>, ids: any[], options?: FindOptions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities with ids.
     * Optionally conditions can be applied.
     */
    findByIds<Entity>(entityClass: EntityTarget<Entity>, ids: any[], conditions?: FindOptionsWhere<Entity>): Promise<Entity[]>;

    /**
     * Finds first entity that matches given find options.
     */
    findOne<Entity>(entityClass: EntityTarget<Entity>, id?: string|number|Date|ObjectID, options?: FindOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given find options.
     */
    findOne<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given conditions.
     */
    findOne<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>, options?: FindOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given find options or rejects the returned promise on error.
     */
    findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, id?: string|number|Date|ObjectID, options?: FindOptions<Entity>): Promise<Entity>;

    /**
     * Finds first entity that matches given find options or rejects the returned promise on error.
     */
    findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Promise<Entity>;

    /**
     * Finds first entity that matches given conditions or rejects the returned promise on error.
     */
    findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>, options?: FindOptions<Entity>): Promise<Entity>;

    /**
     * Finds entities that match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observe<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Observable<Entity[]>;

    /**
     * Finds entities that match given conditions and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observe<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>): Observable<Entity[]>;

    /**
     * Finds entities and count that match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeManyAndCount<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Observable<[Entity[], number]>;

    /**
     * Finds entities and count that match given conditions and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeManyAndCount<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>): Observable<[Entity[], number]>;

    /**
     * Finds entity that match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeOne<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Observable<Entity>;

    /**
     * Finds entity that match given conditions and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeOne<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>): Observable<Entity>;

    /**
     * Gets the entities count match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeCount<Entity>(entityClass: EntityTarget<Entity>, options?: FindOptions<Entity>): Observable<number>;

    /**
     * Gets the entities count match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeCount<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>): Observable<number>;

    /**
     * Clears all the data from the given table (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    clear<Entity>(entityClass: EntityTarget<Entity>): Promise<void>

    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    increment<Entity>(entityClass: EntityTarget<Entity>,
                            conditions: FindOptionsWhere<Entity>,
                            propertyPath: string,
                            value: number | string): Promise<UpdateResult>;
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    decrement<Entity>(entityClass: EntityTarget<Entity>,
                            conditions: FindOptionsWhere<Entity>,
                            propertyPath: string,
                            value: number | string): Promise<UpdateResult>;

    /**
     * Gets repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity>;

    /**
     * Gets tree repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getTreeRepository<Entity>(target: EntityTarget<Entity>): TreeRepository<Entity>;

    /**
     * Gets mongodb repository for the given entity class.
     */
    getMongoRepository<Entity>(target: EntityTarget<Entity>): MongoRepository<Entity>;

    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     *
     * @deprecated
     */
    getCustomRepository<T>(customRepository: ObjectType<T>): T;

    /**
     * Releases all resources used by entity manager.
     * This is used when entity manager is created with a single query runner,
     * and this single query runner needs to be released after job with entity manager is done.
     */
    release(): Promise<void>;

};
