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
import {FindExtraOptions, FindOptions, FindOptionsWhere} from "../find-options/FindOptions";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {QueryRunner} from "../query-runner/QueryRunner";
import {EntityTarget, MongoEntityManager, ObjectLiteral} from "..";
import {createLiteralRepository} from "./LiteralRepository";
import {MongoRepository} from "./MongoRepository";

/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
export function createLiteralMongoRepository<Entity>({ manager, target, queryRunner }: {
    manager: MongoEntityManager,
    target: EntityTarget<Entity>,
    queryRunner?: QueryRunner,
}): MongoRepository<Entity> {
    return {
        ...createLiteralRepository({ manager, target, queryRunner }),
        typeof: "MongoRepository",

        manager: manager,

        query(query: string, parameters?: any[]): Promise<any> {
            throw new Error(`Queries aren't supported by MongoDB.`);
        },

        createQueryBuilder(alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity> {
            throw new Error(`Query Builder is not supported by MongoDB.`);
        },

        find(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]> {
            return this.manager.find(this.getMetadata().target, optionsOrConditions);
        },

        findAndCount(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<[Entity[], number]> {
            return this.manager.findAndCount(this.getMetadata().target, optionsOrConditions);
        },

        findByIds(ids: any[], optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]> {
            return this.manager.findByIds(this.getMetadata().target, ids, optionsOrConditions);
        },

        findOne(optionsOrConditions?: string | number | Date | ObjectID | FindOptions<Entity> | FindOptionsWhere<Entity>, maybeOptions?: FindOptions<Entity>): Promise<Entity | undefined> {
            return this.manager.findOne(this.getMetadata().target, optionsOrConditions as any, maybeOptions as any);
        },

        createCursor<T = any>(query?: ObjectLiteral): Cursor<T> {
            return this.manager.createCursor(this.getMetadata().target, query);
        },

        createEntityCursor(query?: ObjectLiteral): Cursor<Entity> {
            return this.manager.createEntityCursor(this.getMetadata().target, query);
        },

        aggregate<R = any>(pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<R> {
            return this.manager.aggregate(this.getMetadata().target, pipeline, options);
        },

        aggregateEntity(pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<Entity> {
            return this.manager.aggregateEntity(this.getMetadata().target, pipeline, options);
        },

        bulkWrite(operations: ObjectLiteral[], options?: CollectionBulkWriteOptions): Promise<BulkWriteOpResultObject> {
            return this.manager.bulkWrite(this.getMetadata().target, operations, options);
        },

        count(query?: ObjectLiteral, options?: FindExtraOptions, mongoOptions?: MongoCountPreferences): Promise<number> {
            return this.manager.count(this.getMetadata().target, query || {}, options, mongoOptions);
        },

        createCollectionIndex(fieldOrSpec: string | any, options?: MongodbIndexOptions): Promise<string> {
            return this.manager.createCollectionIndex(this.getMetadata().target, fieldOrSpec, options);
        },

        createCollectionIndexes(indexSpecs: ObjectLiteral[]): Promise<void> {
            return this.manager.createCollectionIndexes(this.getMetadata().target, indexSpecs);
        },

        deleteMany(query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject> {
            return this.manager.deleteMany(this.getMetadata().tableName, query, options);
        },

        deleteOne(query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject> {
            return this.manager.deleteOne(this.getMetadata().tableName, query, options);
        },

        distinct(key: string, query: ObjectLiteral, options?: { readPreference?: ReadPreference | string }): Promise<any> {
            return this.manager.distinct(this.getMetadata().tableName, key, query, options);
        },

        dropCollectionIndex(indexName: string, options?: CollectionOptions): Promise<any> {
            return this.manager.dropCollectionIndex(this.getMetadata().tableName, indexName, options);
        },

        dropCollectionIndexes(): Promise<any> {
            return this.manager.dropCollectionIndexes(this.getMetadata().tableName);
        },

        findOneAndDelete(query: ObjectLiteral, options?: { projection?: Object, sort?: Object, maxTimeMS?: number }): Promise<FindAndModifyWriteOpResultObject> {
            return this.manager.findOneAndDelete(this.getMetadata().tableName, query, options);
        },

        findOneAndReplace(query: ObjectLiteral, replacement: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject> {
            return this.manager.findOneAndReplace(this.getMetadata().tableName, query, replacement, options);
        },

        findOneAndUpdate(query: ObjectLiteral, update: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject> {
            return this.manager.findOneAndUpdate(this.getMetadata().tableName, query, update, options);
        },

        geoHaystackSearch(x: number, y: number, options?: GeoHaystackSearchOptions): Promise<any> {
            return this.manager.geoHaystackSearch(this.getMetadata().tableName, x, y, options);
        },

        geoNear(x: number, y: number, options?: GeoNearOptions): Promise<any> {
            return this.manager.geoNear(this.getMetadata().tableName, x, y, options);
        },

        group(keys: Object | Array<any> | Function | Code, condition: Object, initial: Object, reduce: Function | Code, finalize: Function | Code, command: boolean, options?: { readPreference?: ReadPreference | string }): Promise<any> {
            return this.manager.group(this.getMetadata().tableName, keys, condition, initial, reduce, finalize, command, options);
        },

        collectionIndexes(): Promise<any> {
            return this.manager.collectionIndexes(this.getMetadata().tableName);
        },

        collectionIndexExists(indexes: string | string[]): Promise<boolean> {
            return this.manager.collectionIndexExists(this.getMetadata().tableName, indexes);
        },

        collectionIndexInformation(options?: { full: boolean }): Promise<any> {
            return this.manager.collectionIndexInformation(this.getMetadata().tableName, options);
        },

        initializeOrderedBulkOp(options?: CollectionOptions): OrderedBulkOperation {
            return this.manager.initializeOrderedBulkOp(this.getMetadata().tableName, options);
        },

        initializeUnorderedBulkOp(options?: CollectionOptions): UnorderedBulkOperation {
            return this.manager.initializeUnorderedBulkOp(this.getMetadata().tableName, options);
        },

        insertMany(docs: ObjectLiteral[], options?: CollectionInsertManyOptions): Promise<InsertWriteOpResult> {
            return this.manager.insertMany(this.getMetadata().tableName, docs, options);
        },

        insertOne(doc: ObjectLiteral, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult> {
            return this.manager.insertOne(this.getMetadata().tableName, doc, options);
        },

        isCapped(): Promise<any> {
            return this.manager.isCapped(this.getMetadata().tableName);
        },

        listCollectionIndexes(options?: { batchSize?: number, readPreference?: ReadPreference | string }): CommandCursor {
            return this.manager.listCollectionIndexes(this.getMetadata().tableName, options);
        },

        mapReduce(map: Function | string, reduce: Function | string, options?: MapReduceOptions): Promise<any> {
            return this.manager.mapReduce(this.getMetadata().tableName, map, reduce, options);
        },

        parallelCollectionScan(options?: ParallelCollectionScanOptions): Promise<Cursor<Entity>[]> {
            return this.manager.parallelCollectionScan(this.getMetadata().tableName, options);
        },

        reIndex(): Promise<any> {
            return this.manager.reIndex(this.getMetadata().tableName);
        },

        rename(newName: string, options?: { dropTarget?: boolean }): Promise<Collection<any>> {
            return this.manager.rename(this.getMetadata().tableName, newName, options);
        },

        replaceOne(query: ObjectLiteral, doc: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult> {
            return this.manager.replaceOne(this.getMetadata().tableName, query, doc, options);
        },

        stats(options?: { scale: number }): Promise<CollStats> {
            return this.manager.stats(this.getMetadata().tableName, options);
        },

        updateMany(query: ObjectLiteral, update: ObjectLiteral, options?: { upsert?: boolean, w?: any, wtimeout?: number, j?: boolean }): Promise<UpdateWriteOpResult> {
            return this.manager.updateMany(this.getMetadata().tableName, query, update, options);
        },

        updateOne(query: ObjectLiteral, update: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult> {
            return this.manager.updateOne(this.getMetadata().tableName, query, update, options);
        }

    };
}
