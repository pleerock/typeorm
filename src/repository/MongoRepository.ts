import {ObjectLiteral} from "../common/ObjectLiteral";
import {Repository} from "./Repository";
import {
    AggregationCursor,
    BulkWriteOpResultObject,
    Code,
    Collection,
    CollectionAggregationOptions,
    CollectionBulkWriteOptions,
    CollectionInsertManyOptions,
    CollectionInsertOneOptions,
    CollectionOptions,
    CollStats,
    CommandCursor,
    Cursor,
    DeleteWriteOpResultObject,
    FindAndModifyWriteOpResultObject,
    FindOneAndReplaceOption,
    GeoHaystackSearchOptions,
    GeoNearOptions,
    InsertOneWriteOpResult,
    InsertWriteOpResult,
    MapReduceOptions,
    MongoCountPreferences,
    MongodbIndexOptions,
    ObjectID,
    OrderedBulkOperation,
    ParallelCollectionScanOptions,
    ReadPreference,
    ReplaceOneOptions,
    UnorderedBulkOperation,
    UpdateWriteOpResult
} from "../driver/mongodb/typings";
import {MongoEntityManager} from "../entity-manager/MongoEntityManager";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {FindExtraOptions, FindOptions, FindOptionsWhere} from "../find-options/FindOptions";

/**
 * Repository used to manage mongodb documents of a single entity type.
 */
export type MongoRepository<Entity extends ObjectLiteral> = Repository<Entity> & {

    /**
     * Can be used to determine what object type is used.
     */
    readonly typeof: "MongoRepository"

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
    query(query: string, parameters?: any[]): Promise<any>

    /**
     * Using Query Builder with MongoDB is not supported yet.
     * Calling this method will return an error.
     */
    createQueryBuilder(alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>

    /**
     * Finds entities that match given find options or conditions.
     */
    find(optionsOrConditions?: FindOptions<Entity>|FindOptionsWhere<Entity>): Promise<Entity[]>

    /**
     * Finds entities that match given find options or conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(optionsOrConditions?: FindOptions<Entity>|FindOptionsWhere<Entity>): Promise<[ Entity[], number ]>

    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    findByIds(ids: any[], optionsOrConditions?: FindOptions<Entity>|FindOptionsWhere<Entity>): Promise<Entity[]>

    /**
     * Finds first entity that matches given conditions and/or find options.
     */
    findOne(optionsOrConditions?: string|number|Date|ObjectID|FindOptions<Entity>|FindOptionsWhere<Entity>, maybeOptions?: FindOptions<Entity>): Promise<Entity|undefined>

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     */
    createCursor<T = any>(query?: ObjectLiteral): Cursor<T>

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    createEntityCursor(query?: ObjectLiteral): Cursor<Entity>

    /**
     * Execute an aggregation framework pipeline against the collection.
     */
    aggregate<R = any>(pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<R>

    /**
     * Execute an aggregation framework pipeline against the collection.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    aggregateEntity(pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<Entity>

    /**
     * Perform a bulkWrite operation without a fluent API.
     */
    bulkWrite(operations: ObjectLiteral[], options?: CollectionBulkWriteOptions): Promise<BulkWriteOpResultObject>

    /**
     * Count number of matching documents in the db to a query.
     */
    count(query?: ObjectLiteral, options?: FindExtraOptions, mongoOptions?: MongoCountPreferences): Promise<number>

    /**
     * Creates an index on the db and collection.
     */
    createCollectionIndex(fieldOrSpec: string|any, options?: MongodbIndexOptions): Promise<string>

    /**
     * Creates multiple indexes in the collection, this method is only supported for MongoDB 2.6 or higher.
     * Earlier version of MongoDB will throw a command not supported error.
     * Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
     */
    createCollectionIndexes(indexSpecs: ObjectLiteral[]): Promise<void>

    /**
     * Delete multiple documents on MongoDB.
     */
    deleteMany(query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject>

    /**
     * Delete a document on MongoDB.
     */
    deleteOne(query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject>

    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     */
    distinct(key: string, query: ObjectLiteral, options?: { readPreference?: ReadPreference|string }): Promise<any>

    /**
     * Drops an index from this collection.
     */
    dropCollectionIndex(indexName: string, options?: CollectionOptions): Promise<any>

    /**
     * Drops all indexes from the collection.
     */
    dropCollectionIndexes(): Promise<any>

    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndDelete(query: ObjectLiteral, options?: { projection?: Object, sort?: Object, maxTimeMS?: number }): Promise<FindAndModifyWriteOpResultObject>

    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndReplace(query: ObjectLiteral, replacement: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject>

    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndUpdate(query: ObjectLiteral, update: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject>

    /**
     * Execute a geo search using a geo haystack index on a collection.
     */
    geoHaystackSearch(x: number, y: number, options?: GeoHaystackSearchOptions): Promise<any>

    /**
     * Execute the geoNear command to search for items in the collection.
     */
    geoNear(x: number, y: number, options?: GeoNearOptions): Promise<any>

    /**
     * Run a group command across a collection.
     */
    group(keys: Object|Array<any>|Function|Code, condition: Object, initial: Object, reduce: Function|Code, finalize: Function|Code, command: boolean, options?: { readPreference?: ReadPreference | string }): Promise<any>

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexes(): Promise<any>

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexExists(indexes: string|string[]): Promise<boolean>

    /**
     * Retrieves this collections index info.
     */
    collectionIndexInformation(options?: { full: boolean }): Promise<any>

    /**
     * Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.
     */
    initializeOrderedBulkOp(options?: CollectionOptions): OrderedBulkOperation

    /**
     * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
     */
    initializeUnorderedBulkOp(options?: CollectionOptions): UnorderedBulkOperation

    /**
     * Inserts an array of documents into MongoDB.
     */
    insertMany(docs: ObjectLiteral[], options?: CollectionInsertManyOptions): Promise<InsertWriteOpResult>

    /**
     * Inserts a single document into MongoDB.
     */
    insertOne(doc: ObjectLiteral, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult>

    /**
     * Returns if the collection is a capped collection.
     */
    isCapped(): Promise<any>

    /**
     * Get the list of all indexes information for the collection.
     */
    listCollectionIndexes(options?: { batchSize?: number, readPreference?: ReadPreference|string }): CommandCursor

    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     */
    mapReduce(map: Function|string, reduce: Function|string, options?: MapReduceOptions): Promise<any>

    /**
     * Return N number of parallel cursors for a collection allowing parallel reading of entire collection.
     * There are no ordering guarantees for returned results.
     */
    parallelCollectionScan(options?: ParallelCollectionScanOptions): Promise<Cursor<Entity>[]>

    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    reIndex(): Promise<any>

    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    rename(newName: string, options?: { dropTarget?: boolean }): Promise<Collection<any>>

    /**
     * Replace a document on MongoDB.
     */
    replaceOne(query: ObjectLiteral, doc: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult>

    /**
     * Get all the collection statistics.
     */
    stats(options?: { scale: number }): Promise<CollStats>

    /**
     * Update multiple documents on MongoDB.
     */
    updateMany(query: ObjectLiteral, update: ObjectLiteral, options?: { upsert?: boolean, w?: any, wtimeout?: number, j?: boolean }): Promise<UpdateWriteOpResult>

    /**
     * Update a single document on MongoDB.
     */
    updateOne(query: ObjectLiteral, update: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult>

};
