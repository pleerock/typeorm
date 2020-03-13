import {DeepPartial} from "../common/DeepPartial";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {ObjectID} from "../driver/mongodb/typings";
import {EntityManager} from "../entity-manager/EntityManager";
import {FindOptions, FindOptionsWhere} from "../find-options/FindOptions";
import {EntityMetadata} from "../metadata/EntityMetadata";
import {DeleteResult} from "../query-builder/result/DeleteResult";
import {UpdateResult} from "../query-builder/result/UpdateResult";
import {InsertResult} from "../query-builder/result/InsertResult";
import {QueryDeepPartialEntity} from "../query-builder/QueryPartialEntity";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {QueryRunner} from "../query-runner/QueryRunner";
import {RemoveOptions} from "./RemoveOptions";
import {SaveOptions} from "./SaveOptions";
import * as Observable from "zen-observable";

/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
export type Repository<Entity extends ObjectLiteral> = {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Can be used to determine what object type is used.
     */
    readonly typeof: "Repository" | "MongoRepository" | "TreeRepository"

    /**
     * Entity Manager used by this repository.
     */
    readonly manager: EntityManager;

    /**
     * Query runner provider used for this repository.
     */
    readonly queryRunner?: QueryRunner;

    /**
     * Returns object that is managed by this repository.
     * If this repository manages entity from schema,
     * then it returns a name of that schema instead.
     */
    readonly target: Function | string

    /**
     * If entity's metadata is bound to some specific instance (class or function),
     * this property will contain it. It can be used to initiate new instances of that class or function.
     * When entity is defined using entity schema without target,
     * TypeORM will create a POJO, and this property will be undefined.
     */
    // readonly instance?: Function // todo: implement later

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Entity metadata of the entity current repository manages.
     */
    getMetadata(): EntityMetadata;

    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    createQueryBuilder(alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>

    /**
     * Checks if entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    hasId(entity: Entity): boolean

    /**
     * Gets entity mixed id.
     */
    getId(entity: Entity): any

    /**
     * Creates a new entity instance.
     */
    create(): Entity;

    /**
     * Creates a new entities and copies all entity properties from given objects into their new entities.
     * Note that it copies only properties that present in entity schema.
     */
    create(entityLikeArray: DeepPartial<Entity>[]): Entity[];

    /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that present in entity schema.
     */
    create(entityLike: DeepPartial<Entity>): Entity;

    /**
     * Merges multiple entities (or entity-like objects) into a given entity.
     */
    merge(mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity

    /**
     * Creates a new entity from the given plan javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     *
     * Note that given entity-like object must have an entity id / primary key to find entity by.
     * Returns undefined if entity with given id was not found.
     */
    preload(entityLike: DeepPartial<Entity>): Promise<Entity|undefined>

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & { reload: false }): Promise<T[]>;

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;

    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & { reload: false }): Promise<T>;

    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;

    /**
     * Removes a given entities from the database.
     */
    remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;

    /**
     * Removes a given entity from the database.
     */
    remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;

    /**
    /**
     * Records the delete date of all given entities.
     */
    softRemove<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & { reload: false }): Promise<T[]>;

    /**
     * Records the delete date of all given entities.
     */
    softRemove<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;

    /**
     * Records the delete date of a given entity.
     */
    softRemove<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & { reload: false }): Promise<T>;

    /**
     * Records the delete date of a given entity.
     */
    softRemove<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;

    /**
     * Recovers all given entities in the database.
     */
    recover<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & { reload: false }): Promise<T[]>;

    /**
     * Recovers all given entities in the database.
     */
    recover<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;

    /**
     * Recovers a given entity in the database.
     */
    recover<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & { reload: false }): Promise<T>;

    /**
     * Recovers a given entity in the database.
     */
    recover<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;

    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     */
    insert(entity: QueryDeepPartialEntity<Entity>|(QueryDeepPartialEntity<Entity>[])): Promise<InsertResult>

    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    update(criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult>

    /**
     * Deletes entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    delete(criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>): Promise<DeleteResult>

    /**
     * Records the delete date of entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    softDelete(criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>): Promise<UpdateResult>

    /**
     * Restores entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    restore(criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>): Promise<UpdateResult>

    /**
     * Counts entities that match given options.
     */
    count(options?: FindOptions<Entity>): Promise<number>;

    /**
     * Counts entities that match given conditions.
     */
    count(conditions?: FindOptionsWhere<Entity>): Promise<number>;

    /**
     * Finds entities that match given options.
     */
    find(options?: FindOptions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities that match given conditions.
     */
    find(conditions?: FindOptionsWhere<Entity>): Promise<Entity[]>;

    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(options?: FindOptions<Entity>): Promise<[ Entity[], number ]>;

    /**
     * Finds entities that match given conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(conditions?: FindOptionsWhere<Entity>): Promise<[ Entity[], number ]>;

    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    findByIds(ids: any[], options?: FindOptions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities by ids.
     * Optionally conditions can be applied.
     */
    findByIds(ids: any[], conditions?: FindOptionsWhere<Entity>): Promise<Entity[]>;

    /**
     * Finds first entity that matches given options.
     */
    findOne(id?: string|number|Date|ObjectID, options?: FindOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given options.
     */
    findOne(options?: FindOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given conditions.
     */
    findOne(conditions?: FindOptionsWhere<Entity>, options?: FindOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given options.
     */
    findOneOrFail(id?: string|number|Date|ObjectID, options?: FindOptions<Entity>): Promise<Entity>;

    /**
     * Finds first entity that matches given options.
     */
    findOneOrFail(options?: FindOptions<Entity>): Promise<Entity>;

    /**
     * Finds first entity that matches given conditions.
     */
    findOneOrFail(conditions?: FindOptionsWhere<Entity>, options?: FindOptions<Entity>): Promise<Entity>;

    /**
     * Finds entities that match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observe<Entity>(options?: FindOptions<Entity>): Observable<Entity[]>;

    /**
     * Finds entities that match given conditions and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observe<Entity>(conditions?: FindOptionsWhere<Entity>): Observable<Entity[]>;

    /**
     * Finds entities and count that match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeManyAndCount<Entity>(options?: FindOptions<Entity>): Observable<[Entity[], number]>;

    /**
     * Finds entities and count that match given conditions and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeManyAndCount<Entity>(conditions?: FindOptionsWhere<Entity>): Observable<[Entity[], number]>;

    /**
     * Finds entity that match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeOne<Entity>(options?: FindOptions<Entity>): Observable<Entity>;

    /**
     * Finds entity that match given conditions and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeOne<Entity>(conditions?: FindOptionsWhere<Entity>): Observable<Entity>;

    /**
     * Gets the entities count match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeCount<Entity>(options?: FindOptions<Entity>): Observable<number>;

    /**
     * Gets the entities count match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observeCount<Entity>(conditions?: FindOptionsWhere<Entity>): Observable<number>;

    /**
     * Executes a raw SQL query and returns a raw database results.
     * Raw query execution is supported only by relational databases (MongoDB is not supported).
     */
    query(query: string, parameters?: any[]): Promise<any>

    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    clear(): Promise<void>

    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    increment(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number|string): Promise<UpdateResult>

    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    decrement(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number|string): Promise<UpdateResult>

    /**
     * Extends repository with provided functions.
     */
    extend<CustomRepository>(custom: CustomRepository & ThisType<Repository<Entity> & CustomRepository>): Repository<Entity> & CustomRepository

};
