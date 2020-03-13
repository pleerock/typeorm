import {DeepPartial} from "../common/DeepPartial";
import {ObjectType} from "../common/ObjectType";
import {Connection} from "../connection/Connection";
import {MongoDriver} from "../driver/mongodb/MongoDriver";
import {ObjectID} from "../driver/mongodb/typings";
import {OracleDriver} from "../driver/oracle/OracleDriver";
import {IsolationLevel} from "../driver/types/IsolationLevel";
import {CustomRepositoryCannotInheritRepositoryError} from "../error/CustomRepositoryCannotInheritRepositoryError";
import {CustomRepositoryNotFoundError} from "../error/CustomRepositoryNotFoundError";
import {EntityNotFoundError} from "../error/EntityNotFoundError";
import {NoNeedToReleaseEntityManagerError} from "../error/NoNeedToReleaseEntityManagerError";
import {QueryRunnerProviderAlreadyReleasedError} from "../error/QueryRunnerProviderAlreadyReleasedError";
import {TreeRepositoryNotSupportedError} from "../error/TreeRepositoryNotSupportedError";
import {QueryDeepPartialEntity} from "../query-builder/QueryPartialEntity";
import {FindExtraOptions, FindOptions, FindOptionsWhere} from "../find-options/FindOptions";
import {FindOptionsUtils} from "../find-options/FindOptionsUtils";
import { EntityManager, EntitySchema, getMetadataArgsStorage } from "../index";
import {ObserverExecutor} from "../observer/ObserverExecutor";
import {QueryObserver} from "../observer/QueryObserver";
import {EntityPersistExecutor} from "../persistence/EntityPersistExecutor";
import {DeleteResult} from "../query-builder/result/DeleteResult";
import {InsertResult} from "../query-builder/result/InsertResult";
import {UpdateResult} from "../query-builder/result/UpdateResult";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {PlainObjectToDatabaseEntityTransformer} from "../query-builder/transformer/PlainObjectToDatabaseEntityTransformer";
import {PlainObjectToNewEntityTransformer} from "../query-builder/transformer/PlainObjectToNewEntityTransformer";
import {QueryRunner} from "../query-runner/QueryRunner";
import {AbstractRepository} from "../repository/AbstractRepository";
import {MongoRepository} from "../repository/MongoRepository";
import {RemoveOptions} from "../repository/RemoveOptions";
import {Repository} from "../repository/Repository";
import {SaveOptions} from "../repository/SaveOptions";
import {TreeRepository} from "../repository/TreeRepository";
import {ObjectUtils} from "../util/ObjectUtils";
import * as Observable from "zen-observable";
import {createLiteralTreeRepository} from "../repository/LiteralTreeRepository";
import {EntityTarget} from "../common/EntityTarget";
import {createLiteralMongoRepository} from "../repository/LiteralMongoRepository";
import {createLiteralRepository} from "../repository/LiteralRepository";

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export function createLiteralEntityManager<Entity>({ connection, queryRunner }: {
    connection: Connection,
    queryRunner?: QueryRunner,
}): EntityManager {

    /**
     * Once created and then reused by repositories.
     */
    const repositories: Repository<any>[] = [];

    /**
     * Once created and then reused by repositories.
     */
    const treeRepositories: TreeRepository<any>[] = [];

    /**
     * Plain to object transformer used in create and merge operations.
     */
    const plainObjectToEntityTransformer = new PlainObjectToNewEntityTransformer();

    const manager: EntityManager = {
        typeof: "EntityManager",
        connection: connection,
        queryRunner: queryRunner,

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

            // if query runner is already defined in this class, it means this entity manager was already created for a single connection
            // if its not defined we create a new query runner - single connection where we'll execute all our operations
            const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");

            try {
                if (isolation) {
                    await queryRunner.startTransaction(isolation);
                } else {
                    await queryRunner.startTransaction();
                }
                const result = await runInTransaction(queryRunner.manager);
                await queryRunner.commitTransaction();
                await new ObserverExecutor(this.connection.observers).execute();
                return result;

            } catch (err) {
                try { // we throw original error even if rollback thrown an error
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) {
                }
                throw err;

            } finally {
                if (!this.queryRunner) // if we used a new query runner provider then release it
                    await queryRunner.release();
            }
        },

        async query(query: string, parameters?: any[]): Promise<any> {
            return this.connection.query(query, parameters, this.queryRunner);
        },

        createQueryBuilder<Entity>(entityClass?: EntityTarget<Entity> | QueryRunner, alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity> {
            if (alias) {
                return this.connection.createQueryBuilder(entityClass as EntitySchema<Entity> | string, alias, queryRunner || this.queryRunner);

            } else {
                return this.connection.createQueryBuilder(entityClass as QueryRunner | undefined || queryRunner || this.queryRunner);
            }
        },

        hasId(targetOrEntity: any | Function | string, maybeEntity?: any): boolean {
            const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
            const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
            const metadata = this.connection.getMetadata(target);
            return metadata.hasId(entity);
        },

        getId(targetOrEntity: any | Function | string, maybeEntity?: any): any {
            const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
            const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
            const metadata = this.connection.getMetadata(target);
            return metadata.getEntityIdMixedMap(entity);
        },

        create<Entity>(entityClass: EntityTarget<Entity>, plainObjectOrObjects?: DeepPartial<Entity> | DeepPartial<Entity>[]): Entity | Entity[] {
            const metadata = this.connection.getMetadata(entityClass);

            if (!plainObjectOrObjects)
                return metadata.create(this.queryRunner);

            if (Array.isArray(plainObjectOrObjects))
                return plainObjectOrObjects.map(plainEntityLike => this.create(entityClass as any, plainEntityLike));

            const mergeIntoEntity = metadata.create(this.queryRunner);
            plainObjectToEntityTransformer.transform(mergeIntoEntity, plainObjectOrObjects, metadata, true);
            return mergeIntoEntity;
        },

        merge<Entity>(entityClass: EntityTarget<Entity>, mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity { // todo: throw exception if entity manager is released
            const metadata = this.connection.getMetadata(entityClass);
            entityLikes.forEach(object => plainObjectToEntityTransformer.transform(mergeIntoEntity, object, metadata));
            return mergeIntoEntity;
        },

        async preload<Entity>(entityClass: EntityTarget<Entity>, entityLike: DeepPartial<Entity>): Promise<Entity | undefined> {
            const metadata = this.connection.getMetadata(entityClass);
            const plainObjectToDatabaseEntityTransformer = new PlainObjectToDatabaseEntityTransformer(this.connection.manager);
            const transformedEntity = await plainObjectToDatabaseEntityTransformer.transform(entityLike, metadata);
            if (transformedEntity)
                return this.merge(entityClass as any, transformedEntity as Entity, entityLike);

            return undefined;
        },

        save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: (T | T[]) | EntityTarget<Entity>, maybeEntityOrOptions?: T | T[], maybeOptions?: SaveOptions): Promise<T | T[]> {

            // normalize mixed parameters
            let target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity as Function | string : undefined;
            const entity: T | T[] = target ? maybeEntityOrOptions as T | T[] : targetOrEntity as T | T[];
            const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

            if (target instanceof EntitySchema)
                target = target.options.name;

            // if user passed empty array of entities then we don't need to do anything
            if (Array.isArray(entity) && entity.length === 0)
                return Promise.resolve(entity);

            // execute save operation
            return new EntityPersistExecutor(this.connection, this.queryRunner, "save", target, entity, options)
                .execute()
                .then(() => entity);
        },

        remove<Entity>(targetOrEntity: (Entity | Entity[]) | Function | string, maybeEntityOrOptions?: Entity | Entity[], maybeOptions?: RemoveOptions): Promise<Entity | Entity[]> {

            // normalize mixed parameters
            const target = (arguments.length > 1 && (targetOrEntity instanceof Function || typeof targetOrEntity === "string")) ? targetOrEntity as Function | string : undefined;
            const entity: Entity | Entity[] = target ? maybeEntityOrOptions as Entity | Entity[] : targetOrEntity as Entity | Entity[];
            const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

            // if user passed empty array of entities then we don't need to do anything
            if (Array.isArray(entity) && entity.length === 0)
                return Promise.resolve(entity);

            // execute save operation
            return new EntityPersistExecutor(this.connection, this.queryRunner, "remove", target, entity, options)
                .execute()
                .then(() => entity);
        },

        softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: (T | T[]) | ObjectType<Entity> | EntitySchema<Entity> | string, maybeEntityOrOptions?: T | T[], maybeOptions?: SaveOptions): Promise<T | T[]> {

            // normalize mixed parameters
            let target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity as Function | string : undefined;
            const entity: T | T[] = target ? maybeEntityOrOptions as T | T[] : targetOrEntity as T | T[];
            const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

            if (target instanceof EntitySchema)
                target = target.options.name;

            // if user passed empty array of entities then we don't need to do anything
            if (Array.isArray(entity) && entity.length === 0)
                return Promise.resolve(entity);

            // execute soft-remove operation
            return new EntityPersistExecutor(this.connection, this.queryRunner, "soft-remove", target, entity, options)
                .execute()
                .then(() => entity);
        },

        recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: (T | T[]) | ObjectType<Entity> | EntitySchema<Entity> | string, maybeEntityOrOptions?: T | T[], maybeOptions?: SaveOptions): Promise<T | T[]> {

            // normalize mixed parameters
            let target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity as Function | string : undefined;
            const entity: T | T[] = target ? maybeEntityOrOptions as T | T[] : targetOrEntity as T | T[];
            const options = target ? maybeOptions : maybeEntityOrOptions as SaveOptions;

            if (target instanceof EntitySchema)
                target = target.options.name;

            // if user passed empty array of entities then we don't need to do anything
            if (Array.isArray(entity) && entity.length === 0)
                return Promise.resolve(entity);

            // execute recover operation
            return new EntityPersistExecutor(this.connection, this.queryRunner, "recover", target, entity, options)
                .execute()
                .then(() => entity);
        },

        async insert<Entity>(target: EntityTarget<Entity>, entity: QueryDeepPartialEntity<Entity> | (QueryDeepPartialEntity<Entity>[])): Promise<InsertResult> {

            // TODO: Oracle does not support multiple values. Need to create another nice solution.
            if (this.connection.driver instanceof OracleDriver && Array.isArray(entity)) {
                const results = await Promise.all(entity.map(entity => this.insert(target, entity)));
                return results.reduce((mergedResult, result) => Object.assign(mergedResult, result), {} as InsertResult);
            }
            return this.createQueryBuilder()
                .insert()
                .into(target)
                .values(entity)
                .execute();
        },

        update<Entity>(target: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult> {

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
        },

        delete<Entity>(targetOrEntity: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>): Promise<DeleteResult> {

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
        },

        softDelete<Entity>(targetOrEntity: ObjectType<Entity> | EntitySchema<Entity> | string, criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | any): Promise<UpdateResult> {

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
        },

    restore<Entity>(targetOrEntity: ObjectType<Entity> | EntitySchema<Entity> | string, criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | any): Promise<UpdateResult> {

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
        },

        async count<Entity>(entityClass: EntityTarget<Entity>, conditions?: FindOptionsWhere<Entity>, options?: FindExtraOptions): Promise<number> {
            const metadata = this.connection.getMetadata(entityClass);
            const qb = this.createQueryBuilder(entityClass as any, metadata.name);

            qb.setFindOptions({
                where: conditions,
                options: options
            });

            return qb.getCount();
        },

        async find<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]> {
            const metadata = this.connection.getMetadata(entityClass);
            const qb = this.createQueryBuilder(entityClass as any, metadata.name);

            if (optionsOrConditions)
                qb.setFindOptions(FindOptionsUtils.isFindOptions(optionsOrConditions) ? optionsOrConditions as any : {where: optionsOrConditions});

            return qb.getMany();
        },

        async findAndCount<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<[Entity[], number]> {
            const metadata = this.connection.getMetadata(entityClass);
            const qb = this.createQueryBuilder(entityClass as any, metadata.name);

            if (optionsOrConditions)
                qb.setFindOptions(FindOptionsUtils.isFindOptions(optionsOrConditions) ? optionsOrConditions as any : {where: optionsOrConditions});

            return qb.getManyAndCount();
        },

        async findByIds<Entity>(entityClass: EntityTarget<Entity>, ids: any[], optionsOrConditions?: FindOptions<Entity> | any): Promise<Entity[]> {

            // if no ids passed, no need to execute a query - just return an empty array of values
            if (!ids.length)
                return Promise.resolve([]);

            const metadata = this.connection.getMetadata(entityClass);
            const qb = this.createQueryBuilder(entityClass as any, metadata.name);
            // FindOptionsUtils.applyFindOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);

            // todo: implement only-find options it later
            // let options: FindOptions<any> = { };
            // if (optionsOrConditions) {
            //     if (FindOptionsUtils.isFindOptions(optionsOrConditions)) {
            //         options = optionsOrConditions;
            //     } else {
            //         options = { where: optionsOrConditions };
            //     }
            // }
            // if (!options.where) {
            //     options.where = {  };
            // }
            // return qb.setFindOptions(optionsOrConditions).getMany();

            const findOptions: FindOptions<Entity> = {};
            if (FindOptionsUtils.isFindOptions(optionsOrConditions)) {
                Object.assign(findOptions, optionsOrConditions);
            } else if (optionsOrConditions) {
                Object.assign(findOptions, {where: optionsOrConditions});
            }

            // if (findOptions.where || metadata.primaryColumns.length > 1) {
            return qb
                .setFindOptions(findOptions)
                .andWhereInIds(ids)
                .getMany();
            // }

            // this is for optimization purpose
            // findOptions.where = {};
            // const primaryColumn = metadata.primaryColumns[0];
            // const normalizedIds = ids.map(id => {
            //     return typeof id === "object" ? primaryColumn.getEntityValue(id) : id;
            // });
            // primaryColumn.setEntityValue(findOptions.where, In(normalizedIds));

            // console.log("WHERE:", findOptions);
            // qb.setFindOptions(findOptions);
            // const results = await qb.getMany();
            // console.log("results", results);
            // return results;
        },

        findOne<Entity>(
            entityClass: EntityTarget<Entity>,
            idOrOptionsOrConditions?: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptions<Entity> | any,
            maybeOptions?: FindOptions<Entity>
        ): Promise<Entity | undefined> {

            let findOptions: FindOptions<any> | undefined = undefined;
            if (FindOptionsUtils.isFindOptions(idOrOptionsOrConditions)) {
                findOptions = idOrOptionsOrConditions;
            } else if (maybeOptions && FindOptionsUtils.isFindOptions(maybeOptions)) {
                findOptions = maybeOptions;
            }

            let options: FindOptionsWhere<Entity> | undefined = undefined;
            if (idOrOptionsOrConditions instanceof Object && !FindOptionsUtils.isFindOptions(idOrOptionsOrConditions))
                options = idOrOptionsOrConditions as FindOptionsWhere<Entity>;

            const metadata = this.connection.getMetadata(entityClass);
            const qb = this.createQueryBuilder(entityClass as any, metadata.name);

            // if (!findOptions || findOptions.loadEagerRelations !== false)
            //     FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias!.metadata);

            const findById = typeof idOrOptionsOrConditions === "string" || typeof idOrOptionsOrConditions === "number" || idOrOptionsOrConditions instanceof Date;

            if (!findById) {
                findOptions = {
                    ...(findOptions || {}),
                    take: 1,
                };
            }

            if (findOptions) {
                qb.setFindOptions(findOptions);
            }

            if (options) {
                qb.where(options);

            } else if (findById) {
                qb.andWhereInIds(metadata.ensureEntityIdMap(idOrOptionsOrConditions));
            }

            return qb.getOne();
        },

        async findOneOrFail<Entity>(entityClass: EntityTarget<Entity>, idOrOptionsOrConditions?: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptions<Entity> | any, maybeOptions?: FindOptions<Entity>): Promise<Entity> {
            return this.findOne(entityClass as any, idOrOptionsOrConditions as any, maybeOptions).then((value: any) => {
                if (value === undefined) {
                    return Promise.reject(new EntityNotFoundError(entityClass, idOrOptionsOrConditions));
                }
                return Promise.resolve(value);
            });
        },

        observe<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<Entity[]> {
            const metadata = this.connection.getMetadata(entityClass);
            return new QueryObserver(this.connection, "find", metadata, optionsOrConditions).observe();
        },

        observeManyAndCount<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<[Entity[], number]> {
            const metadata = this.connection.getMetadata(entityClass);
            return new QueryObserver(this.connection, "findAndCount", metadata, optionsOrConditions).observe();
        },

        observeOne<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<Entity> {
            const metadata = this.connection.getMetadata(entityClass);
            return new QueryObserver(this.connection, "findOne", metadata, optionsOrConditions).observe();
        },

        observeCount<Entity>(entityClass: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<number> {
            const metadata = this.connection.getMetadata(entityClass);
            return new QueryObserver(this.connection, "count", metadata, optionsOrConditions).observe();
        },

        async clear<Entity>(entityClass: EntityTarget<Entity>): Promise<void> {
            const metadata = this.connection.getMetadata(entityClass);
            const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");
            try {
                return await queryRunner.clearTable(metadata.tablePath); // await is needed here because we are using finally

            } finally {
                if (!this.queryRunner)
                    await queryRunner.release();
            }
        },

        async increment<Entity>(entityClass: EntityTarget<Entity>,
                                conditions: FindOptionsWhere<Entity>,
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
                    (value, key) => ({[key]: value}) as any,
                    () => this.connection.driver.escape(column.databaseName) + " + " + value
                );

            return this
                .createQueryBuilder(entityClass as any, "entity")
                .update(entityClass)
                .set(values)
                .where(conditions)
                .execute();
        },

        async decrement<Entity>(entityClass: EntityTarget<Entity>,
                                conditions: FindOptionsWhere<Entity>,
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
                    (value, key) => ({[key]: value}) as any,
                    () => this.connection.driver.escape(column.databaseName) + " - " + value
                );

            return this
                .createQueryBuilder(entityClass as any, "entity")
                .update(entityClass)
                .set(values)
                .where(conditions)
                .execute();
        },

        getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {

            // find already created repository instance and return it if found
            const repository = repositories.find(repository => repository.target === target);
            if (repository)
                return repository;

            // if repository was not found then create it, store its instance and return it
            if (this.connection.driver instanceof MongoDriver) {
                const newRepository = createLiteralMongoRepository({
                    manager: this as any,
                    target,
                    queryRunner: this.queryRunner,
                });
                repositories.push(newRepository);
                return newRepository;

            } else {
                const newRepository = createLiteralRepository({
                    manager: this,
                    target,
                    queryRunner: this.queryRunner,
                });
                repositories.push(newRepository);
                return newRepository;
            }
        },

        getTreeRepository<Entity>(target: EntityTarget<Entity>): TreeRepository<Entity> {

            // tree tables aren't supported by some drivers (mongodb)
            if (this.connection.driver.treeSupport === false)
                throw new TreeRepositoryNotSupportedError(this.connection.driver);

            // find already created repository instance and return it if found
            const repository = treeRepositories.find(repository => repository.target === target);
            if (repository)
                return repository;

            // check if repository is real tree repository
            const newRepository = createLiteralTreeRepository({
                manager: this,
                target,
                queryRunner: this.queryRunner,
            });
            treeRepositories.push(newRepository);
            return newRepository;
        },

        getMongoRepository<Entity>(target: EntityTarget<Entity>): MongoRepository<Entity> {
            return connection.getMongoRepository<Entity>(target);
        },

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
            } else {
                if (!entityMetadata)
                    throw new CustomRepositoryCannotInheritRepositoryError(customRepository);

                (entityRepositoryInstance as any)["manager"] = this;
                (entityRepositoryInstance as any)["metadata"] = entityMetadata;
            }

            return entityRepositoryInstance;
        },

        async release(): Promise<void> {
            if (!this.queryRunner)
                throw new NoNeedToReleaseEntityManagerError();

            return this.queryRunner.release();
        }

    };

    if (queryRunner) {
        // dynamic: this.queryRunner = manager;
        ObjectUtils.assign(queryRunner, { manager });
    }

    return manager;
}
