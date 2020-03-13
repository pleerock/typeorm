import { ObjectLiteral } from "../common/ObjectLiteral";
import { MongoQueryRunner } from "../driver/mongodb/MongoQueryRunner";
import {
    AggregationCursor,
    BulkWriteOpResultObject,
    ChangeStream,
    ChangeStreamOptions,
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
import { FindOptions, FindOptionsWhere } from "../find-options/FindOptions";
import { EntityTarget, FindExtraOptions } from "../index";
import { QueryDeepPartialEntity } from "../query-builder/QueryPartialEntity";
import { DeleteResult } from "../query-builder/result/DeleteResult";
import { InsertResult } from "../query-builder/result/InsertResult";
import { UpdateResult } from "../query-builder/result/UpdateResult";
import { EntityManager } from "./EntityManager";

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 *
 * This implementation is used for MongoDB driver which has some specifics in its EntityManager.
 */
export type MongoEntityManager = EntityManager & {

    /**
     * Gets query runner used to execute queries.
     */
    queryRunner: MongoQueryRunner

    // -------------------------------------------------------------------------
    // Overridden Methods
    // -------------------------------------------------------------------------

    /**
     * Finds entities that match given find options or conditions.
     */
    find<Entity>(entityClassOrName: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]>;

    /**
     * Finds entities that match given find options or conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount<Entity>(entityClassOrName: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<[Entity[], number]>;

    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     */
    findByIds<Entity>(entityClassOrName: EntityTarget<Entity>, ids: any[], optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]>;

    /**
     * Finds first entity that matches given conditions and/or find options.
     */
    findOne<Entity>(entityClassOrName: EntityTarget<Entity>,
                  optionsOrConditions?: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptions<Entity> | FindOptionsWhere<Entity>,
                  maybeOptions?: FindOptions<Entity>): Promise<Entity | undefined>;

    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    insert<Entity>(target: EntityTarget<Entity>, entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<InsertResult>;

    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    update<Entity>(target: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult>;

    /**
     * Deletes entities by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    delete<Entity>(target: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>): Promise<DeleteResult>;

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     */
    createCursor<Entity, T = any>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral): Cursor<T>;

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    createEntityCursor<Entity>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral): Cursor<Entity>;

    /**
     * Execute an aggregation framework pipeline against the collection.
     */
    aggregate<Entity, R = any>(entityClassOrName: EntityTarget<Entity>, pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<R>;

    /**
     * Execute an aggregation framework pipeline against the collection.
     * This returns modified version of cursor that transforms each result into Entity model.
     */
    aggregateEntity<Entity>(entityClassOrName: EntityTarget<Entity>, pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<Entity>;

    /**
     * Perform a bulkWrite operation without a fluent API.
     */
    bulkWrite<Entity>(entityClassOrName: EntityTarget<Entity>, operations: ObjectLiteral[], options?: CollectionBulkWriteOptions): Promise<BulkWriteOpResultObject>;

    /**
     * Count number of matching documents in the db to a query.
     */
    count<Entity>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral, options?: FindExtraOptions, mongoOptions?: MongoCountPreferences): Promise<number>;

    /**
     * Creates an index on the db and collection.
     */
    createCollectionIndex<Entity>(entityClassOrName: EntityTarget<Entity>, fieldOrSpec: string | any, options?: MongodbIndexOptions): Promise<string>;

    /**
     * Creates multiple indexes in the collection, this method is only supported for MongoDB 2.6 or higher.
     * Earlier version of MongoDB will throw a command not supported error.
     * Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
     */
    createCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>, indexSpecs: ObjectLiteral[]): Promise<void>;

    /**
     * Delete multiple documents on MongoDB.
     */
    deleteMany<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject>;

    /**
     * Delete a document on MongoDB.
     */
    deleteOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject>;

    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     */
    distinct<Entity>(entityClassOrName: EntityTarget<Entity>, key: string, query: ObjectLiteral, options?: { readPreference?: ReadPreference | string }): Promise<any>;

    /**
     * Drops an index from this collection.
     */
    dropCollectionIndex<Entity>(entityClassOrName: EntityTarget<Entity>, indexName: string, options?: CollectionOptions): Promise<any>;

    /**
     * Drops all indexes from the collection.
     */
    dropCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any>;

    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndDelete<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, options?: { projection?: Object, sort?: Object, maxTimeMS?: number }): Promise<FindAndModifyWriteOpResultObject>;

    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndReplace<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, replacement: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject>;

    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     */
    findOneAndUpdate<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject>;

    /**
     * Execute a geo search using a geo haystack index on a collection.
     */
    geoHaystackSearch<Entity>(entityClassOrName: EntityTarget<Entity>, x: number, y: number, options?: GeoHaystackSearchOptions): Promise<any>;

    /**
     * Execute the geoNear command to search for items in the collection.
     */
    geoNear<Entity>(entityClassOrName: EntityTarget<Entity>, x: number, y: number, options?: GeoNearOptions): Promise<any>;

    /**
     * Run a group command across a collection.
     */
    group<Entity>(entityClassOrName: EntityTarget<Entity>, keys: Object | Array<any> | Function | Code, condition: Object, initial: Object, reduce: Function | Code, finalize: Function | Code, command: boolean, options?: { readPreference?: ReadPreference | string }): Promise<any>;

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any>;

    /**
     * Retrieve all the indexes on the collection.
     */
    collectionIndexExists<Entity>(entityClassOrName: EntityTarget<Entity>, indexes: string | string[]): Promise<boolean>;

    /**
     * Retrieves this collections index info.
     */
    collectionIndexInformation<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { full: boolean }): Promise<any>;

    /**
     * Initiate an In order bulk write operation, operations will be serially executed in the order they are added, creating a new operation for each switch in types.
     */
    initializeOrderedBulkOp<Entity>(entityClassOrName: EntityTarget<Entity>, options?: CollectionOptions): OrderedBulkOperation;

    /**
     * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
     */
    initializeUnorderedBulkOp<Entity>(entityClassOrName: EntityTarget<Entity>, options?: CollectionOptions): UnorderedBulkOperation;

    /**
     * Inserts an array of documents into MongoDB.
     */
    insertMany<Entity>(entityClassOrName: EntityTarget<Entity>, docs: ObjectLiteral[], options?: CollectionInsertManyOptions): Promise<InsertWriteOpResult>;

    /**
     * Inserts a single document into MongoDB.
     */
    insertOne<Entity>(entityClassOrName: EntityTarget<Entity>, doc: ObjectLiteral, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult>;

    /**
     * Returns if the collection is a capped collection.
     */
    isCapped<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any>;

    /**
     * Get the list of all indexes information for the collection.
     */
    listCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { batchSize?: number, readPreference?: ReadPreference | string }): CommandCursor;

    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     */
    mapReduce<Entity>(entityClassOrName: EntityTarget<Entity>, map: Function | string, reduce: Function | string, options?: MapReduceOptions): Promise<any>;

    /**
     * Return N number of parallel cursors for a collection allowing parallel reading of entire collection.
     * There are no ordering guarantees for returned results.
     */
    parallelCollectionScan<Entity>(entityClassOrName: EntityTarget<Entity>, options?: ParallelCollectionScanOptions): Promise<Cursor<Entity>[]>;

    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    reIndex<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any>;

    /**
     * Reindex all indexes on the collection Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
     */
    rename<Entity>(entityClassOrName: EntityTarget<Entity>, newName: string, options?: { dropTarget?: boolean }): Promise<Collection<any>>;

    /**
     * Replace a document on MongoDB.
     */
    replaceOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, doc: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult>;

    /**
     * Get all the collection statistics.
     */
    stats<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { scale: number }): Promise<CollStats>;

    watch<Entity>(entityClassOrName: EntityTarget<Entity>, pipeline?: Object[], options?: ChangeStreamOptions): ChangeStream;

    /**
     * Update multiple documents on MongoDB.
     */
    updateMany<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: ObjectLiteral, options?: { upsert?: boolean, w?: any, wtimeout?: number, j?: boolean }): Promise<UpdateWriteOpResult>;

    /**
     * Update a single document on MongoDB.
     */
    updateOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult>;

};
