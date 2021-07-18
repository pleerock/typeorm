import { ObjectId } from "mongodb";
import {Repository} from "./Repository";
import {getConnection} from "../globals";
import {FindConditions} from "../find-options/FindConditions";
import {DeepPartial} from "../common/DeepPartial";
import {SaveOptions} from "./SaveOptions";
import {FindOneOptions} from "../find-options/FindOneOptions";
import {RemoveOptions} from "./RemoveOptions";
import {FindManyOptions} from "../find-options/FindManyOptions";
import {Connection} from "../connection/Connection";
import {ObjectType} from "../common/ObjectType";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {InsertResult} from "../query-builder/result/InsertResult";
import {UpdateResult} from "../query-builder/result/UpdateResult";
import {DeleteResult} from "../query-builder/result/DeleteResult";
import {ObjectUtils} from "../util/ObjectUtils";
import {QueryDeepPartialEntity} from "../query-builder/QueryPartialEntity";

/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export class BaseEntity {

    // -------------------------------------------------------------------------
    // Private Static Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used in all static methods of the BaseEntity.
     */
    // @ts-ignore: Unused variable which is actually used
    private static usedConnection?: Connection;

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Checks if entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    hasId(): boolean {
        return (this.constructor as any).getRepository().hasId(this);
    }

    /**
     * Saves current entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save(options?: SaveOptions): Promise<this> {
        return (this.constructor as any).getRepository().save(this, options);
    }

    /**
     * Removes current entity from the database.
     */
    remove(options?: RemoveOptions): Promise<this> {
        return (this.constructor as any).getRepository().remove(this, options);
    }

    /**
     * Records the delete date of current entity.
     */
    softRemove(options?: SaveOptions): Promise<this> {
        return (this.constructor as any).getRepository().softRemove(this, options);
    }

    /**
     * Recovers a given entity in the database.
     */
    recover(options?: SaveOptions): Promise<this> {
        return (this.constructor as any).getRepository().recover(this, options);
    }

    /**
     * Reloads entity data from the database.
     */
    async reload(): Promise<void> {
        const base: any = this.constructor;
        const newestEntity: BaseEntity = await base.getRepository().findOneOrFail(base.getId(this));

        ObjectUtils.assign(this, newestEntity);
    }

    // -------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------

    /**
     * Sets connection to be used by entity.
     */
    static useConnection(connection: Connection) {
        this.usedConnection = connection;
    }

    /**
     * Gets current entity's Repository.
     */
    static getRepository<T extends BaseEntity>(this: ObjectType<T>): Repository<T> {
        const connection: Connection = (this as any).usedConnection || getConnection();
        return connection.getRepository<T>(this);
    }

    /**
     * Returns object that is managed by this repository.
     * If this repository manages entity from schema,
     * then it returns a name of that schema instead.
     */
    static get target(): Function|string {
        return this.getRepository().target;
    }

    /**
     * Checks entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    static hasId(entity: BaseEntity): boolean {
        return this.getRepository().hasId(entity);
    }

    /**
     * Gets entity mixed id.
     */
    static getId<T extends BaseEntity>(this: ObjectType<T>, entity: T): any {
        return (this as any).getRepository().getId(entity);
    }

    /**
     * Creates a new query builder that can be used to build a sql query.
     */
    static createQueryBuilder<T extends BaseEntity>(this: ObjectType<T>, alias?: string): SelectQueryBuilder<T> {
        return (this as any).getRepository().createQueryBuilder(alias);
    }

    /**
     * Creates a new entity instance.
     */
    static create<T extends BaseEntity>(this: ObjectType<T>): T;

    /**
     * Creates a new entities and copies all entity properties from given objects into their new entities.
     * Note that it copies only properties that present in entity schema.
     */
    static create<T extends BaseEntity>(this: ObjectType<T>, entityLikeArray: DeepPartial<T>[]): T[];

    /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that present in entity schema.
     */
    static create<T extends BaseEntity>(this: ObjectType<T>, entityLike: DeepPartial<T>): T;
   /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that present in entity schema.
     */
    static create<T extends BaseEntity>(this: ObjectType<T>, entityOrEntities?: any): T {
        return (this as any).getRepository().create(entityOrEntities);
    }

    /**
     * Merges multiple entities (or entity-like objects) into a given entity.
     */
    static merge<T extends BaseEntity>(this: ObjectType<T>, mergeIntoEntity: T, ...entityLikes: DeepPartial<T>[]): T {
        return (this as any).getRepository().merge(mergeIntoEntity, ...entityLikes);
    }

    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     *
     * Note that given entity-like object must have an entity id / primary key to find entity by.
     * Returns undefined if entity with given id was not found.
     */
    static preload<T extends BaseEntity>(this: ObjectType<T>, entityLike: DeepPartial<T>): Promise<T|undefined> {
        return (this as any).getRepository().preload(entityLike);
    }

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    static save<T extends BaseEntity>(this: ObjectType<T>, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    static save<T extends BaseEntity>(this: ObjectType<T>, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Saves one or many given entities.
     */
    static save<T extends BaseEntity>(this: ObjectType<T>, entityOrEntities: T|T[], options?: SaveOptions): Promise<T|T[]> {
        return (this as any).getRepository().save(entityOrEntities as any, options);
    }

    /**
     * Removes a given entities from the database.
     */
    static remove<T extends BaseEntity>(this: ObjectType<T>, entities: T[], options?: RemoveOptions): Promise<T[]>;

    /**
     * Removes a given entity from the database.
     */
    static remove<T extends BaseEntity>(this: ObjectType<T>, entity: T, options?: RemoveOptions): Promise<T>;

    /**
     * Removes one or many given entities.
     */
    static remove<T extends BaseEntity>(this: ObjectType<T>, entityOrEntities: T|T[], options?: RemoveOptions): Promise<T|T[]> {
        return (this as any).getRepository().remove(entityOrEntities as any, options);
    }

    /**
     * Records the delete date of all given entities.
     */
    static softRemove<T extends BaseEntity>(this: ObjectType<T>, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Records the delete date of a given entity.
     */
    static softRemove<T extends BaseEntity>(this: ObjectType<T>, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Records the delete date of one or many given entities.
     */
    static softRemove<T extends BaseEntity>(this: ObjectType<T>, entityOrEntities: T|T[], options?: SaveOptions): Promise<T|T[]> {
        return (this as any).getRepository().softRemove(entityOrEntities as any, options);
    }

    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     */
    static insert<T extends BaseEntity>(this: ObjectType<T>, entity: QueryDeepPartialEntity<T>|QueryDeepPartialEntity<T>[], options?: SaveOptions): Promise<InsertResult> {
        return (this as any).getRepository().insert(entity, options);
    }

    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    static update<T extends BaseEntity>(this: ObjectType<T>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectId|ObjectId[]|FindConditions<T>, partialEntity: QueryDeepPartialEntity<T>, options?: SaveOptions): Promise<UpdateResult> {
        return (this as any).getRepository().update(criteria, partialEntity, options);
    }

    /**
     * Deletes entities by a given criteria.
     * Unlike remove method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    static delete<T extends BaseEntity>(this: ObjectType<T>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectId|ObjectId[]|FindConditions<T>, options?: RemoveOptions): Promise<DeleteResult> {
        return (this as any).getRepository().delete(criteria, options);
    }

    /**
     * Counts entities that match given options.
     */
    static count<T extends BaseEntity>(this: ObjectType<T>, options?: FindManyOptions<T>): Promise<number>;

    /**
     * Counts entities that match given conditions.
     */
    static count<T extends BaseEntity>(this: ObjectType<T>, conditions?: FindConditions<T>): Promise<number>;

    /**
     * Counts entities that match given find options or conditions.
     */
    static count<T extends BaseEntity>(this: ObjectType<T>, optionsOrConditions?: FindManyOptions<T>|FindConditions<T>): Promise<number> {
        return (this as any).getRepository().count(optionsOrConditions as any);
    }

    /**
     * Finds entities that match given options.
     */
    static find<T extends BaseEntity>(this: ObjectType<T>, options?: FindManyOptions<T>): Promise<T[]>;

    /**
     * Finds entities that match given conditions.
     */
    static find<T extends BaseEntity>(this: ObjectType<T>, conditions?: FindConditions<T>): Promise<T[]>;

    /**
     * Finds entities that match given find options or conditions.
     */
    static find<T extends BaseEntity>(this: ObjectType<T>, optionsOrConditions?: FindManyOptions<T>|FindConditions<T>): Promise<T[]> {
        return (this as any).getRepository().find(optionsOrConditions as any);
    }

    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    static findAndCount<T extends BaseEntity>(this: ObjectType<T>, options?: FindManyOptions<T>): Promise<[ T[], number ]>;

    /**
     * Finds entities that match given conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    static findAndCount<T extends BaseEntity>(this: ObjectType<T>, conditions?: FindConditions<T>): Promise<[ T[], number ]>;

    /**
     * Finds entities that match given find options or conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    static findAndCount<T extends BaseEntity>(this: ObjectType<T>, optionsOrConditions?: FindManyOptions<T>|FindConditions<T>): Promise<[ T[], number ]> {
        return (this as any).getRepository().findAndCount(optionsOrConditions as any);
    }

    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    static findByIds<T extends BaseEntity>(this: ObjectType<T>, ids: any[], options?: FindManyOptions<T>): Promise<T[]>;

    /**
     * Finds entities by ids.
     * Optionally conditions can be applied.
     */
    static findByIds<T extends BaseEntity>(this: ObjectType<T>, ids: any[], conditions?: FindConditions<T>): Promise<T[]>;

    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    static findByIds<T extends BaseEntity>(this: ObjectType<T>, ids: any[], optionsOrConditions?: FindManyOptions<T>|FindConditions<T>): Promise<T[]> {
        return (this as any).getRepository().findByIds(ids, optionsOrConditions as any);
    }

    /**
     * Finds first entity that matches given options.
     */
    static findOne<T extends BaseEntity>(this: ObjectType<T>, id?: string|number|Date|ObjectId, options?: FindOneOptions<T>): Promise<T|undefined>;

    /**
     * Finds first entity that matches given options.
     */
    static findOne<T extends BaseEntity>(this: ObjectType<T>, options?: FindOneOptions<T>): Promise<T|undefined>;

    /**
     * Finds first entity that matches given conditions.
     */
    static findOne<T extends BaseEntity>(this: ObjectType<T>, conditions?: FindConditions<T>, options?: FindOneOptions<T>): Promise<T|undefined>;

    /**
     * Finds first entity that matches given conditions.
     */
    static findOne<T extends BaseEntity>(this: ObjectType<T>, optionsOrConditions?: string|number|Date|ObjectId|FindOneOptions<T>|FindConditions<T>, maybeOptions?: FindOneOptions<T>): Promise<T|undefined> {
        return (this as any).getRepository().findOne(optionsOrConditions as any, maybeOptions);
    }

    /**
     * Finds first entity that matches given options.
     */
    static findOneOrFail<T extends BaseEntity>(this: ObjectType<T>, id?: string|number|Date|ObjectId, options?: FindOneOptions<T>): Promise<T>;

    /**
     * Finds first entity that matches given options.
     */
    static findOneOrFail<T extends BaseEntity>(this: ObjectType<T>, options?: FindOneOptions<T>): Promise<T>;

    /**
     * Finds first entity that matches given conditions.
     */
    static findOneOrFail<T extends BaseEntity>(this: ObjectType<T>, conditions?: FindConditions<T>, options?: FindOneOptions<T>): Promise<T>;

    /**
     * Finds first entity that matches given conditions.
     */
    static findOneOrFail<T extends BaseEntity>(this: ObjectType<T>, optionsOrConditions?: string|number|Date|ObjectId|FindOneOptions<T>|FindConditions<T>, maybeOptions?: FindOneOptions<T>): Promise<T> {
        return (this as any).getRepository().findOneOrFail(optionsOrConditions as any, maybeOptions);
    }

    /**
     * Executes a raw SQL query and returns a raw database results.
     * Raw query execution is supported only by relational databases (MongoDB is not supported).
     */
    static query<T extends BaseEntity>(this: ObjectType<T>, query: string, parameters?: any[]): Promise<any> {
        return (this as any).getRepository().query(query, parameters);
    }

    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     */
    static clear<T extends BaseEntity>(this: ObjectType<T>, ): Promise<void> {
        return (this as any).getRepository().clear();
    }

}
