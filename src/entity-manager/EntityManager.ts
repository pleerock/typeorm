import {Connection} from "../connection/Connection";
import {FindManyOptions} from "../find-options/FindManyOptions";
import {EntityTarget} from "../common/EntityTarget";
import {ObjectType} from "../common/ObjectType";
import {EntityNotFoundError} from "../error/EntityNotFoundError";
import {QueryRunnerProviderAlreadyReleasedError} from "../error/QueryRunnerProviderAlreadyReleasedError";
import {FindOneOptions} from "../find-options/FindOneOptions";
import {DeepPartial} from "../common/DeepPartial";
import {RemoveOptions} from "../repository/RemoveOptions";
import {SaveOptions} from "../repository/SaveOptions";
import {NoNeedToReleaseEntityManagerError} from "../error/NoNeedToReleaseEntityManagerError";
import {MongoRepository} from "../repository/MongoRepository";
import {TreeRepository} from "../repository/TreeRepository";
import {Repository} from "../repository/Repository";
import {FindOptionsUtils} from "../find-options/FindOptionsUtils";
import {PlainObjectToNewEntityTransformer} from "../query-builder/transformer/PlainObjectToNewEntityTransformer";
import {PlainObjectToDatabaseEntityTransformer} from "../query-builder/transformer/PlainObjectToDatabaseEntityTransformer";
import {CustomRepositoryNotFoundError} from "../error/CustomRepositoryNotFoundError";
import {EntitySchema, getMetadataArgsStorage, ObjectLiteral} from "../index";
import {AbstractRepository} from "../repository/AbstractRepository";
import {CustomRepositoryCannotInheritRepositoryError} from "../error/CustomRepositoryCannotInheritRepositoryError";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {MongoDriver} from "../driver/mongodb/MongoDriver";
import {RepositoryNotFoundError} from "../error/RepositoryNotFoundError";
import {RepositoryNotTreeError} from "../error/RepositoryNotTreeError";
import {RepositoryFactory} from "../repository/RepositoryFactory";
import {TreeRepositoryNotSupportedError} from "../error/TreeRepositoryNotSupportedError";
import {QueryDeepPartialEntity} from "../query-builder/QueryPartialEntity";
import {EntityPersistExecutor} from "../persistence/EntityPersistExecutor";
import {ObjectID} from "../driver/mongodb/typings";
import {InsertResult} from "../query-builder/result/InsertResult";
import {UpdateResult} from "../query-builder/result/UpdateResult";
import {DeleteResult} from "../query-builder/result/DeleteResult";
import {FindConditions} from "../find-options/FindConditions";
import {IsolationLevel} from "../driver/types/IsolationLevel";
import {ObjectUtils} from "../util/ObjectUtils";

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export class EntityManager {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by this entity manager.
     */
    readonly connection: Connection;

    /**
     * Custom query runner to be used for operations in this entity manager.
     * Used only in non-global entity manager.
     */
    readonly queryRunner?: QueryRunner;

    /**
     * Stores temporarily user data
     * Useful for sharing data with subscribers/logger.
     */
     data?: ObjectLiteral;

    // -------------------------------------------------------------------------
    // Protected Properties
    // -------------------------------------------------------------------------

    /**
     * Once created and then reused by en repositories.
     */
    protected repositories: Repository<any>[] = [];

    /**
     * Plain to object transformer used in create and merge operations.
     */
    protected plainObjectToEntityTransformer = new PlainObjectToNewEntityTransformer();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection, queryRunner?: QueryRunner) {
        this.connection = connection;
        if (queryRunner) {
            this.queryRunner = queryRunner;
            // dynamic: this.queryRunner = manager;
            ObjectUtils.assign(this.queryRunner, { manager: this });
        }
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    async transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;

    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    async transaction<T>(isolationLevel: IsolationLevel, runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;

    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    async transaction<T>(
        isolationOrRunInTransaction: IsolationLevel | ((entityManager: EntityManager) => Promise<T>),
        runInTransactionParam?: (entityManager: EntityManager) => Promise<T>
    ): Promise<T> {

        const isolation = typeof isolationOrRunInTransaction === "string" ? isolationOrRunInTransaction : undefined;
        const runInTransaction = typeof isolationOrRunInTransaction === "function" ? isolationOrRunInTransaction : runInTransactionParam;

        if (!runInTransaction) {
            throw new Error(`Transaction method requires callback in second paramter if isolation level is supplied.`);
        }

        if (this.connection.driver instanceof MongoDriver)
            throw new Error(`Transactions aren't supported by MongoDB.`);

        if (this.queryRunner && this.queryRunner.isReleased)
            throw new QueryRunnerProviderAlreadyReleasedError();

        if (this.queryRunner && this.queryRunner.isTransactionActive)
            throw new Error(`Cannot start transaction because its already started`);

        const queryRunner = this.obtainQueryRunner();
        try {
            if (isolation) {
                await queryRunner.startTransaction(isolation);
              } else {
                await queryRunner.startTransaction();
              }
            const result = await runInTransaction(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;

        } catch (err) {
            try { // we throw original error even if rollback thrown an error
                await queryRunner.rollbackTransaction();
            } catch (rollbackError) { }
            throw err;

        } finally {
            if (!this.queryRunner) // if we used a new query runner provider then release it
                await queryRunner.release();
        }
    }

    /**
     * Executes raw SQL query and returns raw database results.
     */
    async query(query: string, parameters?: any[]): Promise<any> {
        return this.connection.query(query, parameters, this.queryRunner, this.data);
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
    createQueryBuilder<Entity>(entityClass?: EntityTarget<Entity>|QueryRunner, alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity> {
        let queryBuilder: SelectQueryBuilder<Entity>;
        if (alias) {
            queryBuilder = this.connection.createQueryBuilder(entityClass as EntityTarget<Entity>, alias, queryRunner || this.queryRunner);

        } else {
            queryBuilder = this.connection.createQueryBuilder(entityClass as QueryRunner|undefined || queryRunner || this.queryRunner);
        }
        if (this.data) {
            queryBuilder.data = this.data;
        }
        return queryBuilder;
    }

    /**
     * Checks if entity has an id.
     */
    hasId(entity: any): boolean;

    /**
     * Checks if entity of given schema name has an id.
     */
    hasId(target: Function|string, entity: any): boolean;

    /**
     * Checks if entity has an id by its Function type or schema name.
     */
    hasId(targetOrEntity: any|Function|string, maybeEntity?: any): boolean {
        const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        const metadata = this.connection.getMetadata(target);
        return metadata.hasId(entity);
    }

    /**
     * Gets entity mixed id.
     */
    getId(entity: any): any;

    /**
     * Gets entity mixed id.
     */
    getId(target: EntityTarget<any>, entity: any): any;

    /**
     * Gets entity mixed id.
     */
    getId(targetOrEntity: any|EntityTarget<any>, maybeEntity?: any): any {
        const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        const metadata = this.connection.getMetadata(target);
        return metadata.getEntityIdMixedMap(entity);
    }

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
     * Creates a new entity instance or instances.
     * Can copy properties from the given object into new entities.
     */
    create<Entity>(entityClass: EntityTarget<Entity>, plainObjectOrObjects?: DeepPartial<Entity>|DeepPartial<Entity>[]): Entity|Entity[] {
        const metadata = this.connection.getMetadata(entityClass);

        if (!plainObjectOrObjects)
            return metadata.create(this.queryRunner);

        if (Array.isArray(plainObjectOrObjects))
            return plainObjectOrObjects.map(plainEntityLike => this.create(entityClass as any, plainEntityLike));

        const mergeIntoEntity = metadata.create(this.queryRunner);
        this.plainObjectToEntityTransformer.transform(mergeIntoEntity, plainObjectOrObjects, metadata, true);
        return mergeIntoEntity;
    }

    /**
     * Merges two entities into one new entity.
     */
    merge<Entity>(entityClass: EntityTarget<Entity>, mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity { // todo: throw exception if entity manager is released
        const metadata = this.connection.getMetadata(entityClass);
        entityLikes.forEach(object => this.plainObjectToEntityTransformer.transform(mergeIntoEntity, object, metadata));
        return mergeIntoEntity;
    }

    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     */
    async preload<Entity>(entityClass: EntityTarget<Entity>, entityLike: DeepPartial<Entity>): Promise<Entity|undefined> {
        const metadata = this.connection.getMetadata(entityClass);
        const plainObjectToDatabaseEntityTransformer = new PlainObjectToDatabaseEntityTransformer(this.connection.manager);
        const transformedEntity = await plainObjectToDatabaseEntityTransformer.transform(entityLike, metadata);
        if (transformedEntity)
            return this.merge(entityClass as any, transformedEntity as Entity, entityLike);

        return undefined;
    }

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
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options: SaveOptions & { reload: false }): Promise<T[]>;

    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;

    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options: SaveOptions & { reload: false }): Promise<T>;

    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options?: SaveOptions): Promise<T & Entity>;

    /**
     * Saves a given entity in the database.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: (T|T[])|EntityTarget<Entity>, maybeEntityOrOptions?: T|T[], maybeOptions?: SaveOptions): Promise<T|T[]> {

        // normalize mixed parameters
        let target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity as Function|string : undefined;
        const entity: T|T[] = target ? maybeEntityOrOptions as T|T[] : targetOrEntity as T|T[];
        const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

        if (target instanceof EntitySchema)
            target = target.options.name;

        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);

        const executorOptions = this.addDataToExecutorOptions(options);

        // execute save operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "save", target, entity, executorOptions)
            .execute()
            .then(() => entity);
    }

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
     * Removes a given entity from the database.
     */
    remove<Entity>(targetOrEntity: (Entity|Entity[])|EntityTarget<Entity>, maybeEntityOrOptions?: Entity|Entity[], maybeOptions?: RemoveOptions): Promise<Entity|Entity[]> {

        // normalize mixed parameters
        const target = (arguments.length > 1 && (targetOrEntity instanceof Function || typeof targetOrEntity === "string")) ? targetOrEntity as Function|string : undefined;
        const entity: Entity|Entity[] = target ? maybeEntityOrOptions as Entity|Entity[] : targetOrEntity as Entity|Entity[];
        const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);

        const executorOptions = this.addDataToExecutorOptions(options);

        // execute save operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "remove", target, entity, executorOptions)
            .execute()
            .then(() => entity);
    }

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
    softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Records the delete date of a given entity.
     */
    softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Records the delete date of one or many given entities.
     */
    softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: (T|T[])|EntityTarget<Entity>, maybeEntityOrOptions?: T|T[], maybeOptions?: SaveOptions): Promise<T|T[]> {

        // normalize mixed parameters
        let target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity as Function|string : undefined;
        const entity: T|T[] = target ? maybeEntityOrOptions as T|T[] : targetOrEntity as T|T[];
        const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

        if (target instanceof EntitySchema)
            target = target.options.name;

        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);

        const executorOptions = this.addDataToExecutorOptions(options);

        // execute soft-remove operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "soft-remove", target, entity, executorOptions)
            .execute()
            .then(() => entity);
    }

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
    recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options?: SaveOptions): Promise<T[]>;

    /**
     * Recovers a given entity.
     */
    recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options?: SaveOptions): Promise<T>;

    /**
     * Recovers one or many given entities.
     */
    recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: (T|T[])|EntityTarget<Entity>, maybeEntityOrOptions?: T|T[], maybeOptions?: SaveOptions): Promise<T|T[]> {

        // normalize mixed parameters
        let target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity as Function|string : undefined;
        const entity: T|T[] = target ? maybeEntityOrOptions as T|T[] : targetOrEntity as T|T[];
        const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

        if (target instanceof EntitySchema)
            target = target.options.name;

        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);

        const executorOptions = this.addDataToExecutorOptions(options);

        // execute recover operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "recover", target, entity, executorOptions)
            .execute()
            .then(() => entity);
    }

    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    async insert<Entity>(target: EntityTarget<Entity>, entity: QueryDeepPartialEntity<Entity>|(QueryDeepPartialEntity<Entity>[])): Promise<InsertResult> {
        return this.createQueryBuilder()
            .insert()
            .into(target)
            .values(entity)
            .execute();
    }

    /**
     * Updates entity partially. Entity can be found by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    update<Entity>(target: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|any, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult> {

        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {

            return Promise.reject(new Error(`Empty criteria(s) are not allowed for the update method.`));
        }

        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {

            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .whereInIds(criteria)
                .execute();

        } else {
            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .where(criteria)
                .execute();
        }
    }

    /**
     * Deletes entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    delete<Entity>(targetOrEntity: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|any): Promise<DeleteResult> {

        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {

            return Promise.reject(new Error(`Empty criteria(s) are not allowed for the delete method.`));
        }

        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {

            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();

        } else {
            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    }

    /**
     * Records the delete date of entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    softDelete<Entity>(targetOrEntity: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|any): Promise<UpdateResult> {

        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {

            return Promise.reject(new Error(`Empty criteria(s) are not allowed for the delete method.`));
        }

        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {

            return this.createQueryBuilder()
                .softDelete()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();

        } else {
            return this.createQueryBuilder()
                .softDelete()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    }

    /**
     * Restores entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    restore<Entity>(targetOrEntity: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|any): Promise<UpdateResult> {

        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {

            return Promise.reject(new Error(`Empty criteria(s) are not allowed for the delete method.`));
        }

        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {

            return this.createQueryBuilder()
                .restore()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();

        } else {
            return this.createQueryBuilder()
                .restore()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    }

    /**
     * Counts entities that match given options.
     * Useful for pagination.
     */
    count<Entity>(entityClass: EntityTarget<Entity>, options?: FindOneOptions<Entity>): Promise<number>;

    /**
     * Counts entities that match given options.
     * Useful for pagination.
     */
    count<Entity>(entityClass: EntityTarget<Entity>, options?: FindManyOptions<Entity>): Promise<number>;

    /**
     * Counts entities that match given conditions.
     * Useful for pagination.
     */
    count<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindConditions<Entity>): Promise<number>;

    /**
     * Counts entities that match given find options or conditions.
     * Useful for pagination.
     */
    async count<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindConditions<Entity>|FindOneOptions<Entity>|FindManyOptions<Entity>): Promise<number> {
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder(entityClass, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
        return FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions).getCount();
    }

    /**
     * Finds entities that match given options.
     */
    find<Entity>(entityClass: EntityTarget<Entity>, options?: FindManyOptions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities that match given conditions.
     */
    find<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindConditions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities that match given find options or conditions.
     */
    async find<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindManyOptions<Entity>|FindConditions<Entity>): Promise<Entity[]> {
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder<Entity>(entityClass as any, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);

        if (!FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
            FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);

        return FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions).getMany();
    }

    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount<Entity>(entityClass: EntityTarget<Entity>, options?: FindManyOptions<Entity>): Promise<[Entity[], number]>;

    /**
     * Finds entities that match given conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindConditions<Entity>): Promise<[Entity[], number]>;

    /**
     * Finds entities that match given find options and conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    async findAndCount<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindConditions<Entity>|FindManyOptions<Entity>): Promise<[Entity[], number]> {
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder<Entity>(entityClass as any, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);

        if (!FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
            FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);

        return FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions).getManyAndCount();
    }

    /**
     * Finds entities with ids.
     * Optionally find options can be applied.
     */
    findByIds<Entity>(entityClass: EntityTarget<Entity>, ids: any[], options?: FindManyOptions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities with ids.
     * Optionally conditions can be applied.
     */
    findByIds<Entity>(entityClass: EntityTarget<Entity>, ids: any[], conditions?: FindConditions<Entity>): Promise<Entity[]>;

    /**
     * Finds entities with ids.
     * Optionally find options or conditions can be applied.
     */
    async findByIds<Entity>(entityClass: EntityTarget<Entity>, ids: any[], optionsOrConditions?: FindConditions<Entity>|FindManyOptions<Entity>): Promise<Entity[]> {

        // if no ids passed, no need to execute a query - just return an empty array of values
        if (!ids.length)
            return Promise.resolve([]);
        const metadata = this.connection.getMetadata(entityClass);
        const qb = this.createQueryBuilder<Entity>(entityClass as any, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
        FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);

        if (!FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
            FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);

        return qb.andWhereInIds(ids).getMany();
    }

    /**
     * Finds first entity that matches given find options.
     */
    findOne<Entity>(entityClass: EntityTarget<Entity>, id?: string|number|Date|ObjectID, options?: FindOneOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given find options.
     */
    findOne<Entity>(entityClass: EntityTarget<Entity>, options?: FindOneOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given conditions.
     */
    findOne<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindConditions<Entity>, options?: FindOneOptions<Entity>): Promise<Entity|undefined>;

    /**
     * Finds first entity that matches given conditions.
     */
    async findOne<Entity>(entityClass: EntityTarget<Entity>, idOrOptionsOrConditions?: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOneOptions<Entity>|FindConditions<Entity>, maybeOptions?: FindOneOptions<Entity>): Promise<Entity|undefined> {

        let findOptions: FindManyOptions<any>|FindOneOptions<any>|undefined = undefined;
        if (FindOptionsUtils.isFindOneOptions(idOrOptionsOrConditions)) {
            findOptions = idOrOptionsOrConditions;
        } else if (maybeOptions && FindOptionsUtils.isFindOneOptions(maybeOptions)) {
            findOptions = maybeOptions;
        }

        let options: ObjectLiteral|undefined = undefined;
        if (idOrOptionsOrConditions instanceof Object && !FindOptionsUtils.isFindOneOptions(idOrOptionsOrConditions))
            options = idOrOptionsOrConditions as ObjectLiteral;

        const metadata = this.connection.getMetadata(entityClass);
        let alias: string = metadata.name;
        if (findOptions && findOptions.join) {
            alias = findOptions.join.alias;

        } else if (maybeOptions && FindOptionsUtils.isFindOneOptions(maybeOptions) && maybeOptions.join) {
            alias = maybeOptions.join.alias;
        }
        const qb = this.createQueryBuilder<Entity>(entityClass as any, alias);

        if (!findOptions || findOptions.loadEagerRelations !== false)
            FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias!.metadata);

        const passedId = typeof idOrOptionsOrConditions === "string" || typeof idOrOptionsOrConditions === "number" || (idOrOptionsOrConditions as any) instanceof Date;

        if (!passedId) {
            findOptions = {
                ...(findOptions || {}),
                take: 1,
            };
        }

        FindOptionsUtils.applyOptionsToQueryBuilder(qb, findOptions);

        if (options) {
            qb.where(options);

        } else if (passedId) {
            qb.andWhereInIds(metadata.ensureEntityIdMap(idOrOptionsOrConditions));
        }

        return qb.getOne();
    }

    /**
     * Finds first entity that matches given find options or rejects the returned promise on error.
     */
    findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, id?: string|number|Date|ObjectID, options?: FindOneOptions<Entity>): Promise<Entity>;

    /**
     * Finds first entity that matches given find options or rejects the returned promise on error.
     */
    findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, options?: FindOneOptions<Entity>): Promise<Entity>;

    /**
     * Finds first entity that matches given conditions or rejects the returned promise on error.
     */
    findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindConditions<Entity>, options?: FindOneOptions<Entity>): Promise<Entity>;

    /**
     * Finds first entity that matches given conditions or rejects the returned promise on error.
     */
    async findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, idOrOptionsOrConditions?: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOneOptions<Entity>|FindConditions<Entity>, maybeOptions?: FindOneOptions<Entity>): Promise<Entity> {
        return this.findOne<Entity>(entityClass as any, idOrOptionsOrConditions as any, maybeOptions).then((value) => {
            if (value === undefined) {
                return Promise.reject(new EntityNotFoundError(entityClass, idOrOptionsOrConditions));
            }
            return Promise.resolve(value);
        });
    }

    /**
     * Clears all the data from the given table (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    async clear<Entity>(entityClass: EntityTarget<Entity>): Promise<void> {
        const metadata = this.connection.getMetadata(entityClass);
        const queryRunner = this.obtainQueryRunner();
        try {
            return await queryRunner.clearTable(metadata.tablePath); // await is needed here because we are using finally

        } finally {
            if (!this.queryRunner)
                await queryRunner.release();
        }
    }

    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    async increment<Entity>(entityClass: EntityTarget<Entity>,
                            conditions: any,
                            propertyPath: string,
                            value: number | string): Promise<UpdateResult> {

        const metadata = this.connection.getMetadata(entityClass);
        const column = metadata.findColumnWithPropertyPath(propertyPath);
        if (!column)
            throw new Error(`Column ${propertyPath} was not found in ${metadata.targetName} entity.`);

        if (isNaN(Number(value)))
            throw new Error(`Value "${value}" is not a number.`);

        // convert possible embeded path "social.likes" into object { social: { like: () => value } }
        const values: QueryDeepPartialEntity<Entity> = propertyPath
            .split(".")
            .reduceRight(
                (value, key) => ({ [key]: value }) as any,
                () => this.connection.driver.escape(column.databaseName) + " + " + value
            );

        return this
            .createQueryBuilder<Entity>(entityClass as any, "entity")
            .update(entityClass)
            .set(values)
            .where(conditions)
            .execute();
    }

    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    async decrement<Entity>(entityClass: EntityTarget<Entity>,
                            conditions: any,
                            propertyPath: string,
                            value: number | string): Promise<UpdateResult> {

        const metadata = this.connection.getMetadata(entityClass);
        const column = metadata.findColumnWithPropertyPath(propertyPath);
        if (!column)
            throw new Error(`Column ${propertyPath} was not found in ${metadata.targetName} entity.`);

        if (isNaN(Number(value)))
            throw new Error(`Value "${value}" is not a number.`);

        // convert possible embeded path "social.likes" into object { social: { like: () => value } }
        const values: QueryDeepPartialEntity<Entity> = propertyPath
            .split(".")
            .reduceRight(
                (value, key) => ({ [key]: value }) as any,
                () => this.connection.driver.escape(column.databaseName) + " - " + value
            );

        return this
            .createQueryBuilder<Entity>(entityClass as any, "entity")
            .update(entityClass)
            .set(values)
            .where(conditions)
            .execute();
    }

    /**
     * Gets repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {

        // throw exception if there is no repository with this target registered
        if (!this.connection.hasMetadata(target))
            throw new RepositoryNotFoundError(this.connection.name, target);

        // find already created repository instance and return it if found
        const metadata = this.connection.getMetadata(target);
        const repository = this.repositories.find(repository => repository.metadata === metadata);
        if (repository)
            return repository;

        // if repository was not found then create it, store its instance and return it
        const newRepository = new RepositoryFactory().create(this, metadata, this.queryRunner);
        this.repositories.push(newRepository);
        return newRepository;
    }

    /**
     * Gets tree repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getTreeRepository<Entity>(target: EntityTarget<Entity>): TreeRepository<Entity> {

        // tree tables aren't supported by some drivers (mongodb)
        if (this.connection.driver.treeSupport === false)
            throw new TreeRepositoryNotSupportedError(this.connection.driver);

        // check if repository is real tree repository
        const repository = this.getRepository(target);
        if (!(repository instanceof TreeRepository))
            throw new RepositoryNotTreeError(target);

        return repository;
    }

    /**
     * Gets mongodb repository for the given entity class.
     */
    getMongoRepository<Entity>(target: EntityTarget<Entity>): MongoRepository<Entity> {
        return this.connection.getMongoRepository<Entity>(target);
    }

    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     */
    getCustomRepository<T>(customRepository: ObjectType<T>): T {
        const entityRepositoryMetadataArgs = getMetadataArgsStorage().entityRepositories.find(repository => {
            return repository.target === (customRepository instanceof Function ? customRepository : (customRepository as any).constructor);
        });
        if (!entityRepositoryMetadataArgs)
            throw new CustomRepositoryNotFoundError(customRepository);

        const entityMetadata = entityRepositoryMetadataArgs.entity ? this.connection.getMetadata(entityRepositoryMetadataArgs.entity) : undefined;
        const entityRepositoryInstance = new (entityRepositoryMetadataArgs.target as any)(this, entityMetadata);

        // NOTE: dynamic access to protected properties. We need this to prevent unwanted properties in those classes to be exposed,
        // however we need these properties for internal work of the class
        if (entityRepositoryInstance instanceof AbstractRepository) {
            if (!(entityRepositoryInstance as any)["manager"])
                (entityRepositoryInstance as any)["manager"] = this;
        }
        if (entityRepositoryInstance instanceof Repository) {
            if (!entityMetadata)
                throw new CustomRepositoryCannotInheritRepositoryError(customRepository);

            (entityRepositoryInstance as any)["manager"] = this;
            (entityRepositoryInstance as any)["metadata"] = entityMetadata;
        }

        return entityRepositoryInstance;
    }

    /**
     * Releases all resources used by entity manager.
     * This is used when entity manager is created with a single query runner,
     * and this single query runner needs to be released after job with entity manager is done.
     */
    async release(): Promise<void> {
        if (!this.queryRunner)
            throw new NoNeedToReleaseEntityManagerError();

        return this.queryRunner.release();
    }

    /**
     * Obtains or creates query runner used to execute sql queries inside this query builder.
     */
     protected obtainQueryRunner() {
        // if query runner is already defined in this class, it means this entity manager was already created for a single connection
        // if its not defined we create a new query runner - single connection where we'll execute all our operations
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        if (this.data) ObjectUtils.assign(queryRunner.data, this.data);
        return queryRunner;
    }

    /**
     * Add temporary user data to executor save options, if defined on this class
     */
    protected addDataToExecutorOptions(options?: SaveOptions): SaveOptions | undefined {
        if (this.data) {
            options = options || {};
            options.data = options.data || {};
            ObjectUtils.assign(options.data, this.data);
        }
        return options;
    }
}
