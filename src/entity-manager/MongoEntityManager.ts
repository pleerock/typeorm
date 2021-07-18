import { Document } from "bson";
import {
    AggregateOptions,
    AggregationCursor,
    AnyBulkWriteOperation,
    BulkWriteOptions,
    BulkWriteResult,
    CountDocumentsOptions,
    CreateIndexesOptions,
    DeleteOptions,
    Filter,
    FindCursor,
    IndexDescription,
    DeleteResult as MongoDeleteResult,
    ObjectId,
    DistinctOptions,
    DropIndexesOptions,
    FindOneAndDeleteOptions,
    ModifyResult,
    FindOneAndUpdateOptions,
    UpdateFilter,
    CollectionOptions,
    OrderedBulkOperation,
    UnorderedBulkOperation,
    InsertManyResult,
    InsertOneOptions,
    InsertOneResult,
    ListIndexesCursor,
    ListIndexesOptions,
    MapFunction,
    ReduceFunction,
    MapReduceOptions,
    Collection,
    ReplaceOptions, CollStats, ChangeStreamOptions, ChangeStream, UpdateOptions, Callback, MongoError, RenameOptions
} from "mongodb";
import { Connection } from "../connection/Connection";
import { EntityManager } from "./EntityManager";
import { EntityTarget } from "../common/EntityTarget";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { MongoQueryRunner } from "../driver/mongodb/MongoQueryRunner";
import { MongoDriver } from "../driver/mongodb/MongoDriver";
import { DocumentToEntityTransformer } from "../query-builder/transformer/DocumentToEntityTransformer";
import { FindManyOptions } from "../find-options/FindManyOptions";
import { FindOptionsUtils } from "../find-options/FindOptionsUtils";
import { FindOneOptions } from "../find-options/FindOneOptions";
import { PlatformTools } from "../platform/PlatformTools";
import { DeepPartial } from "../common/DeepPartial";
import { QueryDeepPartialEntity } from "../query-builder/QueryPartialEntity";
import { InsertResult } from "../query-builder/result/InsertResult";
import { UpdateResult } from "../query-builder/result/UpdateResult";
import { DeleteResult } from "../query-builder/result/DeleteResult";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { FindConditions } from "../find-options/FindConditions";
import { BroadcasterResult } from "../subscriber/BroadcasterResult";

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 *
 * This implementation is used for MongoDB driver which has some specifics in its EntityManager.
 */
export class MongoEntityManager extends EntityManager {

    get mongoQueryRunner(): MongoQueryRunner {
        return (this.connection.driver as MongoDriver).queryRunner as MongoQueryRunner;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection) {
        super(connection);
    }

    // -------------------------------------------------------------------------
    // Overridden Methods
    // -------------------------------------------------------------------------

    /**
     * Finds entities that match given find options or conditions.
     */
    async find<Entity>(entityClassOrName: EntityTarget<Entity>, optionsOrConditions?: FindManyOptions<Entity> | Partial<Entity>): Promise<Entity[]> {
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions);
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
            if (optionsOrConditions.skip)
                cursor.skip(optionsOrConditions.skip);
            if (optionsOrConditions.take)
                cursor.limit(optionsOrConditions.take);
            if (optionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));
        }
        return cursor.toArray();
    }

    /**
     * Finds entities that match given find options or conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    async findAndCount<Entity>(entityClassOrName: EntityTarget<Entity>, optionsOrConditions?: FindManyOptions<Entity> | Partial<Entity>): Promise<[Entity[], number]> {
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions);
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
            if (optionsOrConditions.skip)
                cursor.skip(optionsOrConditions.skip);
            if (optionsOrConditions.take)
                cursor.limit(optionsOrConditions.take);
            if (optionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));

        }
        const [results, count] = await Promise.all<any>([
            cursor.toArray(),
            this.count(entityClassOrName, query),
        ]);
        return [results, parseInt(count)];
    }

    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    async findByIds<Entity>(entityClassOrName: EntityTarget<Entity>, ids: any[], optionsOrConditions?: FindManyOptions<Entity> | Partial<Entity>): Promise<Entity[]> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const query = this.convertFindManyOptionsOrConditionsToMongodbQuery(optionsOrConditions) || {};
        const objectIdInstance = PlatformTools.load("mongodb").ObjectId;
        query["_id"] = {
            $in: ids.map(id => {
                if (typeof id === "string") {
                    return new objectIdInstance(id);
                }

                if (typeof id === "object") {
                    if (id instanceof objectIdInstance) {
                        return id;
                    }

                    const propertyName = metadata.objectIdColumn!.propertyName;

                    if (id[propertyName] instanceof objectIdInstance) {
                        return id[propertyName];
                    }
                }
            })
        };

        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
            if (optionsOrConditions.skip)
                cursor.skip(optionsOrConditions.skip);
            if (optionsOrConditions.take)
                cursor.limit(optionsOrConditions.take);
            if (optionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));
        }
        return await cursor.toArray();
    }

    /**
     * Finds first entity that matches given conditions and/or find options.
     */
    async findOne<Entity>(entityClassOrName: EntityTarget<Entity>,
                          optionsOrConditions?: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOneOptions<Entity> | DeepPartial<Entity>,
                          maybeOptions?: FindOneOptions<Entity>): Promise<Entity | undefined> {
        const objectIdInstance = PlatformTools.load("mongodb").ObjectId;
        const id = (optionsOrConditions instanceof objectIdInstance) || typeof optionsOrConditions === "string" ? optionsOrConditions : undefined;
        const findOneOptionsOrConditions = (id ? maybeOptions : optionsOrConditions) as any;
        const query = this.convertFindOneOptionsOrConditionsToMongodbQuery(findOneOptionsOrConditions) || {};
        if (id) {
            query["_id"] = (id instanceof objectIdInstance) ? id : new objectIdInstance(id);
        }
        const cursor = await this.createEntityCursor(entityClassOrName, query);
        if (FindOptionsUtils.isFindOneOptions(findOneOptionsOrConditions)) {
            if (findOneOptionsOrConditions.select)
                cursor.project(this.convertFindOptionsSelectToProjectCriteria(findOneOptionsOrConditions.select));
            if (findOneOptionsOrConditions.order)
                cursor.sort(this.convertFindOptionsOrderToOrderCriteria(findOneOptionsOrConditions.order));
        }

        // const result = await cursor.limit(1).next();
        const result = await cursor.limit(1).toArray();
        return result.length > 0 ? result[0] : undefined;
    }

    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    async insert<Entity>(target: EntityTarget<Entity>, entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<InsertResult> {
        // todo: convert entity to its database name
        const result = new InsertResult();
        if (Array.isArray(entity)) {
            result.raw = await this.insertMany(target, entity);
            Object.keys(result.raw.insertedIds).forEach((key: any) => {
                let insertedId = result.raw.insertedIds[key];
                result.generatedMaps.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), insertedId)!);
                result.identifiers.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), insertedId)!);
            });

        } else {
            result.raw = await this.insertOne(target, entity);
            result.generatedMaps.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), result.raw.insertedId)!);
            result.identifiers.push(this.connection.driver.createGeneratedMap(this.connection.getMetadata(target), result.raw.insertedId)!);
        }

        return result;
    }

    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    async update<Entity>(target: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindConditions<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult> {
        const result = new UpdateResult();

        if (Array.isArray(criteria)) {
            const updateResults = await Promise.all((criteria as any[]).map(criteriaItem => {
                return this.update(target, criteriaItem, partialEntity);
            }));

            result.raw = updateResults.map(r => r.raw);
            result.affected = updateResults.map(r => (r.affected || 0)).reduce(( c, r) => c + r, 0);
            result.generatedMaps = updateResults.reduce((c, r) => c.concat(r.generatedMaps), [] as ObjectLiteral[]);

        } else {
            const metadata = this.connection.getMetadata(target);
            const mongoResult = await this.updateMany(target, this.convertMixedCriteria(metadata, criteria), { $set: partialEntity });

            result.raw = mongoResult;
            result.affected = mongoResult.affected;
        }

        return result;
    }

    /**
     * Deletes entities by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    async delete<Entity>(target: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindConditions<Entity>): Promise<DeleteResult> {
        const result = new DeleteResult();

        if (Array.isArray(criteria)) {
            const deleteResults = await Promise.all((criteria as any[]).map(criteriaItem => {
                return this.delete(target, criteriaItem);
            }));

            result.raw = deleteResults.map(r => r.raw);
            result.affected = deleteResults.map(r => (r.affected || 0)).reduce((c, r) => c + r, 0);

        } else {
            const mongoResult = await this.deleteMany(target, this.convertMixedCriteria(this.connection.getMetadata(target), criteria));

            result.raw = mongoResult;
            result.affected = mongoResult.deletedCount;
        }

        return result;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     */
    createCursor<Entity, T = any>(entityClassOrName: EntityTarget<Entity>, query?: Filter<T>): FindCursor<T> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.cursor<T>(metadata.tableName, query);
    }

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    createEntityCursor<Entity>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral): FindCursor<Entity> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const cursor = this.createCursor<Entity>(entityClassOrName, query);
        this.applyEntityTransformationToCursor(metadata, cursor);
        return cursor;
    }

    /**
     * Execute an aggregation framework pipeline against the collection.
     */
    aggregate<Entity, R = any>(entityClassOrName: EntityTarget<Entity>, pipeline: ObjectLiteral[], options?: AggregateOptions): AggregationCursor<R> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.aggregate(metadata.tableName, pipeline, options);
    }

    /**
     * Execute an aggregation framework pipeline against the collection.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    aggregateEntity<Entity>(entityClassOrName: EntityTarget<Entity>, pipeline: ObjectLiteral[], options?: AggregateOptions): AggregationCursor<Entity> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        const cursor = this.mongoQueryRunner.aggregate<Entity>(metadata.tableName, pipeline, options);
        this.applyEntityTransformationToCursor(metadata, cursor);
        return cursor;
    }

    /**
     * Perform a bulkWrite operation without a fluent API.
     */
    bulkWrite<Entity>(entityClassOrName: EntityTarget<Entity>, operations: AnyBulkWriteOperation[], options?: BulkWriteOptions): Promise<BulkWriteResult> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.bulkWrite(metadata.tableName, operations, options);
    }

    /**
     * Count number of matching documents in the db to a query.
     */
    count<Entity>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral, options?: CountDocumentsOptions): Promise<number> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.count(metadata.tableName, query, options);
    }

    /**
     * Creates an index on the db and collection.
     */
    createCollectionIndex<Entity>(entityClassOrName: EntityTarget<Entity>, fieldOrSpec: string | any, options?: CreateIndexesOptions): Promise<string> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.createCollectionIndex(metadata.tableName, fieldOrSpec, options);
    }

    /**
     * Creates multiple indexes in the collection, this method is only supported for MongoDB 2.6 or higher.
     * Earlier version of MongoDB will throw a command not supported error.
     * Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
     */
    createCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>, indexSpecs: IndexDescription[]): Promise<void> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.createCollectionIndexes(metadata.tableName, indexSpecs);
    }

    /**
     * Delete multiple documents on MongoDB.
     */
    deleteMany<Entity>(entityClassOrName: EntityTarget<Entity>, query: Filter<Entity>, options?: DeleteOptions): Promise<MongoDeleteResult> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.deleteMany<Entity>(metadata.tableName, query, options);
    }

    /**
     * Delete a document on MongoDB.
     */
    deleteOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, options?: DeleteOptions): Promise<MongoDeleteResult> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.deleteOne(metadata.tableName, query, options);
    }

    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     */
    distinct<Entity>(entityClassOrName: EntityTarget<Entity>, key: string, query: ObjectLiteral, options?: DistinctOptions): Promise<any> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.distinct(metadata.tableName, key, query, options);
    }

    /**
     * Drops an index from this collection.
     */
    dropCollectionIndex<Entity>(entityClassOrName: EntityTarget<Entity>, indexName: string, options?: DropIndexesOptions): Promise<any> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.dropCollectionIndex(metadata.tableName, indexName, options);
    }

    /**
     * Drops all indexes from the collection.
     */
    dropCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.dropCollectionIndexes(metadata.tableName);
    }

    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndDelete<Entity>(entityClassOrName: EntityTarget<Entity>, query: Filter<Entity>, options?: FindOneAndDeleteOptions): Promise<ModifyResult<Entity>> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.findOneAndDelete(metadata.tableName, query, options);
    }

    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndReplace<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, replacement: Object, options?: FindOneAndDeleteOptions): Promise<ModifyResult> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.findOneAndReplace(metadata.tableName, query, replacement, options);
    }

    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndUpdate<Entity>(entityClassOrName: EntityTarget<Entity>, query: Filter<Entity>, update: UpdateFilter<Entity>, options?: FindOneAndUpdateOptions): Promise<ModifyResult<Entity>> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.findOneAndUpdate(metadata.tableName, query, update, options);
    }

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.collectionIndexes(metadata.tableName);
    }

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexExists<Entity>(entityClassOrName: EntityTarget<Entity>, indexes: string | string[]): Promise<boolean> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.collectionIndexExists(metadata.tableName, indexes);
    }

    /**
     * Retrieves this collections index info.
     */
    collectionIndexInformation<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { full: boolean }): Promise<any> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.collectionIndexInformation(metadata.tableName, options);
    }

    /**
     * Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.
     */
    initializeOrderedBulkOp<Entity>(entityClassOrName: EntityTarget<Entity>, options?: CollectionOptions): OrderedBulkOperation {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.initializeOrderedBulkOp(metadata.tableName, options);
    }

    /**
     * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
     */
    initializeUnorderedBulkOp<Entity>(entityClassOrName: EntityTarget<Entity>, options?: CollectionOptions): UnorderedBulkOperation {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.initializeUnorderedBulkOp(metadata.tableName, options);
    }

    /**
     * Inserts an array of documents into MongoDB.
     */
    insertMany<Entity>(entityClassOrName: EntityTarget<Entity>, docs: ObjectLiteral[], options?: BulkWriteOptions): Promise<InsertManyResult<Entity>> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.insertMany(metadata.tableName, docs, options);
    }

    /**
     * Inserts a single document into MongoDB.
     */
    insertOne<Entity>(entityClassOrName: EntityTarget<Entity>, doc: ObjectLiteral, options?: InsertOneOptions): Promise<InsertOneResult<Entity>> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.insertOne(metadata.tableName, doc, options);
    }

    /**
     * Returns if the collection is a capped collection.
     */
    isCapped<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.isCapped(metadata.tableName);
    }

    /**
     * Get the list of all indexes information for the collection.
     */
    listCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>, options?: ListIndexesOptions): ListIndexesCursor {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.listCollectionIndexes(metadata.tableName, options);
    }

    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     */
    mapReduce<Entity, TKey = any, TValue = any>(entityClassOrName: EntityTarget<Entity>, map: string | MapFunction<Entity>, reduce: string | ReduceFunction<TKey, TValue>, options?: MapReduceOptions<TKey, TValue>): Promise<any> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.mapReduce(metadata.tableName, map, reduce, options);
    }

    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    rename<Entity>(entityClassOrName: EntityTarget<Entity>, newName: string, options?: RenameOptions): Promise<Collection | void> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.rename(metadata.tableName, newName, options);
    }

    /**
     * Replace a document on MongoDB.
     */
    replaceOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, doc: ObjectLiteral, options?: ReplaceOptions): Promise<UpdateResult | Document> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.replaceOne(metadata.tableName, query, doc, options);
    }

    /**
     * Get all the collection statistics.
     */
    stats<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { scale: number }): Promise<CollStats> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.stats(metadata.tableName, options);
    }

    watch<Entity>(entityClassOrName: EntityTarget<Entity>, pipeline?: Object[], options?: ChangeStreamOptions): ChangeStream {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.watch(metadata.tableName, pipeline, options);
    }

    /**
     * Update multiple documents on MongoDB.
     */
    updateMany<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: ObjectLiteral, options?: UpdateOptions): Promise<UpdateResult | Document> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.updateMany(metadata.tableName, query, update, options);
    }

    /**
     * Update a single document on MongoDB.
     */
    updateOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: ObjectLiteral, options?: UpdateOptions): Promise<UpdateResult | Document> {
        const metadata = this.connection.getMetadata(entityClassOrName);
        return this.mongoQueryRunner.updateOne(metadata.tableName, query, update, options);
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Converts FindManyOptions to mongodb query.
     */
    protected convertFindManyOptionsOrConditionsToMongodbQuery<Entity>(optionsOrConditions: FindManyOptions<Entity> | Partial<Entity> | undefined): ObjectLiteral | undefined {
        if (!optionsOrConditions)
            return undefined;

        if (FindOptionsUtils.isFindManyOptions<Entity>(optionsOrConditions))
        // If where condition is passed as a string which contains sql we have to ignore
        // as mongo is not a sql database
            return typeof optionsOrConditions.where === "string"
                ? {}
                : optionsOrConditions.where;

        return optionsOrConditions;
    }

    /**
     * Converts FindOneOptions to mongodb query.
     */
    protected convertFindOneOptionsOrConditionsToMongodbQuery<Entity>(optionsOrConditions: FindOneOptions<Entity> | Partial<Entity> | undefined): ObjectLiteral | undefined {
        if (!optionsOrConditions)
            return undefined;

        if (FindOptionsUtils.isFindOneOptions<Entity>(optionsOrConditions))
        // If where condition is passed as a string which contains sql we have to ignore
        // as mongo is not a sql database
            return typeof optionsOrConditions.where === "string"
                ? {}
                : optionsOrConditions.where;

        return optionsOrConditions;
    }

    /**
     * Converts FindOptions into mongodb order by criteria.
     */
    protected convertFindOptionsOrderToOrderCriteria(order: ObjectLiteral) {
        return Object.keys(order).reduce((orderCriteria, key) => {
            switch (order[key]) {
                case "DESC":
                    orderCriteria[key] = -1;
                    break;
                case "ASC":
                    orderCriteria[key] = 1;
                    break;
                default:
                    orderCriteria[key] = order[key];
            }
            return orderCriteria;
        }, {} as ObjectLiteral);
    }

    /**
     * Converts FindOptions into mongodb select by criteria.
     */
    protected convertFindOptionsSelectToProjectCriteria(selects: (keyof any)[]) {
        return selects.reduce((projectCriteria, key) => {
            projectCriteria[key] = 1;
            return projectCriteria;
        }, {} as any);
    }

    /**
     * Ensures given id is an id for query.
     */
    protected convertMixedCriteria<Entity>(metadata: EntityMetadata, idMap: any): Filter<Entity> {
        const objectIdInstance = PlatformTools.load("mongodb").ObjectId;

        // check first if it's ObjectId compatible:
        // string, number, Buffer, ObjectId or ObjectId-like
        if (objectIdInstance.isValid(idMap)) {
            return {
                "_id": new objectIdInstance(idMap)
            };
        }

        // if it's some other type of object build a query from the columns
        // this check needs to be after the ObjectId check, because a valid ObjectId is also an Object instance
        if (idMap instanceof Object) {
            return metadata.columns.reduce((query, column) => {
                const columnValue = column.getEntityValue(idMap);
                if (columnValue !== undefined)
                    query[column.databasePath] = columnValue;
                return query;
            }, {} as any);
        }

        // last resort: try to convert it to an ObjectID anyway
        // most likely it will fail, but we want to be backwards compatible and keep the same thrown Errors.
        // it can still pass with null/undefined
        return {
            "_id": new objectIdInstance(idMap)
        };
    }

    /**
     * Overrides cursor's toArray and next methods to convert results to entity automatically.
     */
    protected applyEntityTransformationToCursor<Entity>(metadata: EntityMetadata, cursor: AggregationCursor<Entity> | FindCursor<Entity>) {
        const ParentCursor = PlatformTools.load("mongodb").FindCursor;
        const queryRunner = this.mongoQueryRunner;
        cursor.toArray = function (callback?: Callback<Entity[]>) {
            if (callback) {
                ParentCursor.prototype.toArray.call(this, (error: MongoError, results: Entity[]): void => {
                    if (error) {
                        callback(error, results);
                        return;
                    }

                    const transformer = new DocumentToEntityTransformer();
                    const entities = transformer.transformAll(results, metadata);

                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, entities);

                    Promise.all(broadcastResult.promises).then(() => callback(error, entities));
                });
            } else {
                return ParentCursor.prototype.toArray.call(this).then((results: Entity[]) => {
                    const transformer = new DocumentToEntityTransformer();
                    const entities = transformer.transformAll(results, metadata);

                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, entities);

                    return Promise.all(broadcastResult.promises).then(() => entities);
                });
            }
        };
        cursor.next = function (callback?: Callback<Entity>) {
            if (callback) {
                ParentCursor.prototype.next.call(this, (error: MongoError, result: Entity): void => {
                    if (error || !result) {
                        callback(error, result);
                        return;
                    }

                    const transformer = new DocumentToEntityTransformer();
                    const entity = transformer.transform(result, metadata);

                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, [entity]);

                    Promise.all(broadcastResult.promises).then(() => callback(error, entity));
                });
            } else {
                return ParentCursor.prototype.next.call(this).then((result: Entity) => {
                    if (!result) return result;

                    const transformer = new DocumentToEntityTransformer();
                    const entity = transformer.transform(result, metadata);

                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult();
                    queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, [entity]);

                    return Promise.all(broadcastResult.promises).then(() => entity);
                });
            }
        };
    }

}
