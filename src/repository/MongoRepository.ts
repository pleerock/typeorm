import { Document } from "bson";
import {
    AggregateOptions,
    AggregationCursor,
    AnyBulkWriteOperation,
    BulkWriteOptions,
    BulkWriteResult, Collection,
    CollectionOptions, CollStats,
    CountDocumentsOptions,
    CreateIndexesOptions,
    DeleteOptions,
    DeleteResult as MongoDeleteResult,
    DistinctOptions,
    DropIndexesOptions,
    Filter,
    FindCursor,
    FindOneAndDeleteOptions,
    FindOneAndUpdateOptions,
    IndexDescription,
    InsertManyResult,
    InsertOneOptions,
    InsertOneResult,
    ListIndexesCursor,
    ListIndexesOptions, MapFunction, MapReduceOptions,
    ModifyResult,
    ObjectId,
    OrderedBulkOperation, ReduceFunction, RenameOptions, ReplaceOptions,
    UnorderedBulkOperation,
    UpdateFilter, UpdateOptions
} from "mongodb";
import {ObjectLiteral} from "../common/ObjectLiteral";
import { UpdateResult } from "../query-builder/result/UpdateResult";
import {Repository} from "./Repository";
import {FindManyOptions} from "../find-options/FindManyOptions";
import {FindOneOptions} from "../find-options/FindOneOptions";
import {MongoEntityManager} from "../entity-manager/MongoEntityManager";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import { TypeORMError } from "../error/TypeORMError";

/**
 * Repository used to manage mongodb documents of a single entity type.
 */
export class MongoRepository<Entity extends ObjectLiteral> extends Repository<Entity> {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Entity Manager used by this repository.
     */
    readonly manager: MongoEntityManager;

    // -------------------------------------------------------------------------
    // Overridden Methods
    // -------------------------------------------------------------------------

    /**
     * Raw SQL query execution is not supported by MongoDB.
     * Calling this method will return an error.
     */
    query(query: string, parameters?: any[]): Promise<any> {
        throw new TypeORMError(`Queries aren't supported by MongoDB.`);
    }

    /**
     * Using Query Builder with MongoDB is not supported yet.
     * Calling this method will return an error.
     */
    createQueryBuilder(alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity> {
        throw new TypeORMError(`Query Builder is not supported by MongoDB.`);
    }

    /**
     * Finds entities that match given find options or conditions.
     */
    find(optionsOrConditions?: FindManyOptions<Entity>|Partial<Entity>): Promise<Entity[]> {
        return this.manager.find(this.metadata.target, optionsOrConditions);
    }

    /**
     * Finds entities that match given find options or conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(optionsOrConditions?: FindManyOptions<Entity>|Partial<Entity>): Promise<[ Entity[], number ]> {
        return this.manager.findAndCount(this.metadata.target, optionsOrConditions);
    }

    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    findByIds(ids: any[], optionsOrConditions?: FindManyOptions<Entity>|Partial<Entity>): Promise<Entity[]> {
        return this.manager.findByIds(this.metadata.target, ids, optionsOrConditions);
    }

    /**
     * Finds first entity that matches given conditions and/or find options.
     */
    findOne(optionsOrConditions?: string|number|Date|ObjectId|FindOneOptions<Entity>|Partial<Entity>, maybeOptions?: FindOneOptions<Entity>): Promise<Entity|undefined> {
        return this.manager.findOne(this.metadata.target, optionsOrConditions as any, maybeOptions as any);
    }

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     */
    createCursor<T = any>(query?: Filter<T>): FindCursor<T> {
        return this.manager.createCursor(this.metadata.target, query);
    }

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    createEntityCursor(query?: Filter<Entity>): FindCursor<Entity> {
        return this.manager.createEntityCursor(this.metadata.target, query);
    }

    /**
     * Execute an aggregation framework pipeline against the collection.
     */
    aggregate<R = any>(pipeline: ObjectLiteral[], options?: AggregateOptions): AggregationCursor<R> {
        return this.manager.aggregate<R>(this.metadata.target, pipeline, options);
    }

    /**
     * Execute an aggregation framework pipeline against the collection.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    aggregateEntity(pipeline: ObjectLiteral[], options?: AggregateOptions): AggregationCursor<Entity> {
        return this.manager.aggregateEntity(this.metadata.target, pipeline, options);
    }
    /**
     * Perform a bulkWrite operation without a fluent API.
     */
    bulkWrite(operations: AnyBulkWriteOperation[], options?: BulkWriteOptions): Promise<BulkWriteResult> {
        return this.manager.bulkWrite(this.metadata.target, operations, options);
    }

    /**
     * Count number of matching documents in the db to a query.
     */
    count(query?: ObjectLiteral, options?: CountDocumentsOptions): Promise<number> {
        return this.manager.count(this.metadata.target, query || {}, options);
    }

    /**
     * Creates an index on the db and collection.
     */
    createCollectionIndex(fieldOrSpec: string|any, options?: CreateIndexesOptions): Promise<string> {
        return this.manager.createCollectionIndex(this.metadata.target, fieldOrSpec, options);
    }

    /**
     * Creates multiple indexes in the collection, this method is only supported for MongoDB 2.6 or higher.
     * Earlier version of MongoDB will throw a command not supported error.
     * Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
     */
    createCollectionIndexes(indexSpecs: IndexDescription[]): Promise<void> {
        return this.manager.createCollectionIndexes(this.metadata.target, indexSpecs);
    }

    /**
     * Delete multiple documents on MongoDB.
     */
    deleteMany(query: ObjectLiteral, options?: DeleteOptions): Promise<MongoDeleteResult> {
        return this.manager.deleteMany(this.metadata.tableName, query, options);
    }

    /**
     * Delete a document on MongoDB.
     */
    deleteOne(query: ObjectLiteral, options?: DeleteOptions): Promise<MongoDeleteResult> {
        return this.manager.deleteOne(this.metadata.tableName, query, options);
    }

    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     */
    distinct(key: string, query: ObjectLiteral, options?: DistinctOptions): Promise<any> {
        return this.manager.distinct(this.metadata.tableName, key, query, options);
    }

    /**
     * Drops an index from this collection.
     */
    dropCollectionIndex(indexName: string, options?: DropIndexesOptions): Promise<any> {
        return this.manager.dropCollectionIndex(this.metadata.tableName, indexName, options);
    }

    /**
     * Drops all indexes from the collection.
     */
    dropCollectionIndexes(): Promise<any> {
        return this.manager.dropCollectionIndexes(this.metadata.tableName);
    }

    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndDelete(query: Filter<Entity>, options?: FindOneAndDeleteOptions): Promise<ModifyResult<Entity>> {
        return this.manager.findOneAndDelete(this.metadata.tableName, query, options);
    }

    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndReplace(query: ObjectLiteral, replacement: Object, options?: FindOneAndDeleteOptions): Promise<ModifyResult> {
        return this.manager.findOneAndReplace(this.metadata.tableName, query, replacement, options);
    }

    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndUpdate(query: Filter<Entity>, update: UpdateFilter<Entity>, options?: FindOneAndUpdateOptions): Promise<ModifyResult<Entity>> {
        return this.manager.findOneAndUpdate(this.metadata.tableName, query, update, options);
    }

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexes(): Promise<any> {
        return this.manager.collectionIndexes(this.metadata.tableName);
    }

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexExists(indexes: string|string[]): Promise<boolean> {
        return this.manager.collectionIndexExists(this.metadata.tableName, indexes);
    }

    /**
     * Retrieves this collections index info.
     */
    collectionIndexInformation(options?: { full: boolean }): Promise<any> {
        return this.manager.collectionIndexInformation(this.metadata.tableName, options);
    }

    /**
     * Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.
     */
    initializeOrderedBulkOp(options?: CollectionOptions): OrderedBulkOperation {
        return this.manager.initializeOrderedBulkOp(this.metadata.tableName, options);
    }

    /**
     * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
     */
    initializeUnorderedBulkOp(options?: CollectionOptions): UnorderedBulkOperation {
        return this.manager.initializeUnorderedBulkOp(this.metadata.tableName, options);
    }

    /**
     * Inserts an array of documents into MongoDB.
     */
    insertMany(docs: ObjectLiteral[], options?: BulkWriteOptions): Promise<InsertManyResult<Entity>> {
        return this.manager.insertMany(this.metadata.tableName, docs, options);
    }

    /**
     * Inserts a single document into MongoDB.
     */
    insertOne(doc: ObjectLiteral, options?: InsertOneOptions): Promise<InsertOneResult<Entity>> {
        return this.manager.insertOne(this.metadata.tableName, doc, options);
    }

    /**
     * Returns if the collection is a capped collection.
     */
    isCapped(): Promise<any> {
        return this.manager.isCapped(this.metadata.tableName);
    }

    /**
     * Get the list of all indexes information for the collection.
     */
    listCollectionIndexes(options?: ListIndexesOptions): ListIndexesCursor {
        return this.manager.listCollectionIndexes(this.metadata.tableName, options);
    }

    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     */
    mapReduce<Entity, TKey = any, TValue = any>(map: string | MapFunction<Entity>, reduce: string | ReduceFunction<TKey, TValue>, options?: MapReduceOptions<TKey, TValue>): Promise<any> {
        return this.manager.mapReduce(this.metadata.tableName, map, reduce, options);
    }

    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    rename(newName: string, options?: RenameOptions): Promise<Collection | void> {
        return this.manager.rename(this.metadata.tableName, newName, options);
    }

    /**
     * Replace a document on MongoDB.
     */
    replaceOne(query: ObjectLiteral, doc: ObjectLiteral, options?: ReplaceOptions): Promise<UpdateResult | Document> {
        return this.manager.replaceOne(this.metadata.tableName, query, doc, options);
    }

    /**
     * Get all the collection statistics.
     */
    stats(options?: { scale: number }): Promise<CollStats> {
        return this.manager.stats(this.metadata.tableName, options);
    }

    /**
     * Update multiple documents on MongoDB.
     */
    updateMany(query: ObjectLiteral, update: ObjectLiteral, options?: { upsert?: boolean, w?: any, wtimeout?: number, j?: boolean }): Promise<UpdateResult | Document> {
        return this.manager.updateMany(this.metadata.tableName, query, update, options);
    }

    /**
     * Update a single document on MongoDB.
     */
    updateOne(query: ObjectLiteral, update: ObjectLiteral, options?: UpdateOptions): Promise<UpdateResult | Document> {
        return this.manager.updateOne(this.metadata.tableName, query, update, options);
    }

}
