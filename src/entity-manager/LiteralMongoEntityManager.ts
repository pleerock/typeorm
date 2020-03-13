import { ObjectLiteral } from "../common/ObjectLiteral";
import { Connection } from "../connection/Connection";
import { MongoDriver } from "../driver/mongodb/MongoDriver";
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
    CursorResult,
    DeleteWriteOpResultObject,
    FindAndModifyWriteOpResultObject,
    FindOneAndReplaceOption,
    GeoHaystackSearchOptions,
    GeoNearOptions,
    InsertOneWriteOpResult,
    InsertWriteOpResult,
    MapReduceOptions,
    MongoCallback,
    MongoCountPreferences,
    MongodbIndexOptions,
    MongoError,
    ObjectID,
    OrderedBulkOperation,
    ParallelCollectionScanOptions,
    ReadPreference,
    ReplaceOneOptions,
    UnorderedBulkOperation,
    UpdateWriteOpResult
} from "../driver/mongodb/typings";
import { FindOptions, FindOptionsWhere } from "../find-options/FindOptions";
import { FindOptionsUtils } from "../find-options/FindOptionsUtils";
import { EntityTarget, FindExtraOptions, FindOptionsSelect, MongoEntityManager } from "../index";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { PlatformTools } from "../platform/PlatformTools";
import { QueryDeepPartialEntity } from "../query-builder/QueryPartialEntity";
import { DeleteResult } from "../query-builder/result/DeleteResult";
import { InsertResult } from "../query-builder/result/InsertResult";
import { UpdateResult } from "../query-builder/result/UpdateResult";
import { DocumentToEntityTransformer } from "../query-builder/transformer/DocumentToEntityTransformer";
import { BroadcasterResult } from "../subscriber/BroadcasterResult";
import { createLiteralEntityManager } from "./LiteralEntityManager";

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 *
 * This implementation is used for MongoDB driver which has some specifics in its EntityManager.
 */
export function createLiteralMongoEntityManager<Entity>({ connection }: {
    connection: Connection,
}): MongoEntityManager {

    function getQueryRunner(): MongoQueryRunner {
        return (connection.driver as MongoDriver).queryRunner!;
    }

    /**
     * Overrides cursor's toArray and next methods to convert results to entity automatically.
     */
    function applyEntityTransformationToCursor<Entity>(metadata: EntityMetadata, cursor: Cursor<Entity> | AggregationCursor<Entity>) {
        const ParentCursor = PlatformTools.load("mongodb").Cursor;
        cursor.toArray = function (callback?: MongoCallback<Entity[]>) {
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
                    getQueryRunner().broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, entities);

                    Promise.all(broadcastResult.promises).then(() => callback(error, entities));
                });
            } else {
                return ParentCursor.prototype.toArray.call(this).then((results: Entity[]) => {
                    const transformer = new DocumentToEntityTransformer();
                    const entities = transformer.transformAll(results, metadata);

                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult();
                    getQueryRunner().broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, entities);

                    return Promise.all(broadcastResult.promises).then(() => entities);
                });
            }
        };
        cursor.next = function (callback?: MongoCallback<CursorResult>) {
            if (callback) {
                ParentCursor.prototype.next.call(this, (error: MongoError, result: CursorResult): void => {
                    if (error || !result) {
                        callback(error, result);
                        return;
                    }

                    const transformer = new DocumentToEntityTransformer();
                    const entity = transformer.transform(result, metadata);

                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult();
                    getQueryRunner().broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, [entity]);

                    Promise.all(broadcastResult.promises).then(() => callback(error, entity));
                });
            } else {
                return ParentCursor.prototype.next.call(this).then((result: Entity) => {
                    if (!result) return result;

                    const transformer = new DocumentToEntityTransformer();
                    const entity = transformer.transform(result, metadata);

                    // broadcast "load" events
                    const broadcastResult = new BroadcasterResult();
                    getQueryRunner().broadcaster.broadcastLoadEventsForAll(broadcastResult, metadata, [entity]);

                    return Promise.all(broadcastResult.promises).then(() => entity);
                });
            }
        };
    }

    /**
     * Converts FindOptions to mongodb query.
     */
    function convertFindOptionsOrConditionsToMongodbQuery<Entity>(optionsOrConditions: FindOptions<Entity> | FindOptionsWhere<Entity> | undefined): ObjectLiteral | undefined {
        if (!optionsOrConditions)
            return undefined;

        if (FindOptionsUtils.isFindOptions(optionsOrConditions))
            return optionsOrConditions.where;

        return optionsOrConditions;
    }

    /**
     * Converts FindOneOptions to mongodb query.
     */
    function convertFindOneOptionsOrConditionsToMongodbQuery<Entity>(optionsOrConditions: FindOptions<Entity> | FindOptionsWhere<Entity> | undefined): ObjectLiteral | undefined {
        if (!optionsOrConditions)
            return undefined;

        if (FindOptionsUtils.isFindOptions(optionsOrConditions))
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
    function convertFindOptionsOrderToOrderCriteria(order: ObjectLiteral) {
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
    function convertFindOptionsSelectToProjectCriteria(select: FindOptionsSelect<any>) {
        if (select instanceof Array) {
            return select.reduce((projectCriteria, key) => {
                projectCriteria[key] = 1;
                return projectCriteria;
            }, {} as any);
        } else {
            return Object.keys(select).reduce((projectCriteria, key) => {
                if (select[key] === true) {
                    projectCriteria[key] = 1;
                }
                // todo: do we need to make this recursive?
                return projectCriteria;
            }, {} as any);

        }
    }

    /**
     * Ensures given id is an id for query.
     */
    function convertMixedCriteria(metadata: EntityMetadata, idMap: any): ObjectLiteral {
        if (idMap instanceof Object) {
            return metadata.columns.reduce((query, column) => {
                const columnValue = column.getEntityValue(idMap);
                if (columnValue !== undefined)
                    query[column.databasePath] = columnValue;
                return query;
            }, {} as any);
        }

        // means idMap is just object id
        const objectIdInstance = PlatformTools.load("mongodb").ObjectID;
        return {
            "_id": (idMap instanceof objectIdInstance) ? idMap : new objectIdInstance(idMap)
        };
    }

    return {
        ...createLiteralEntityManager({ connection }),
        connection: connection,
        get queryRunner() {
            return getQueryRunner();
        },
        typeof: "MongoEntityManager" as any, // todo: fix as any

        // -------------------------------------------------------------------------
        // Overridden Methods
        // -------------------------------------------------------------------------

        async find<Entity>(entityClassOrName: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]> {
            const query = convertFindOptionsOrConditionsToMongodbQuery(optionsOrConditions);
            const cursor = await this.createEntityCursor(entityClassOrName, query);
            if (FindOptionsUtils.isFindOptions(optionsOrConditions)) {
                if (optionsOrConditions.select)
                    cursor.project(convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
                if (optionsOrConditions.skip)
                    cursor.skip(optionsOrConditions.skip);
                if (optionsOrConditions.take)
                    cursor.limit(optionsOrConditions.take);
                if (optionsOrConditions.order)
                    cursor.sort(convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));
            }
            return cursor.toArray();
        },

        async findAndCount<Entity>(entityClassOrName: EntityTarget<Entity>, optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<[Entity[], number]> {
            const query = convertFindOptionsOrConditionsToMongodbQuery(optionsOrConditions);
            const cursor = await this.createEntityCursor(entityClassOrName, query);
            if (FindOptionsUtils.isFindOptions(optionsOrConditions)) {
                if (optionsOrConditions.select)
                    cursor.project(convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
                if (optionsOrConditions.skip)
                    cursor.skip(optionsOrConditions.skip);
                if (optionsOrConditions.take)
                    cursor.limit(optionsOrConditions.take);
                if (optionsOrConditions.order)
                    cursor.sort(convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));

            }
            const [results, count] = await Promise.all<any>([
                cursor.toArray(),
                this.count(entityClassOrName, query),
            ]);
            return [results, parseInt(count)];
        },

        async findByIds<Entity>(entityClassOrName: EntityTarget<Entity>, ids: any[], optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]> {
            const metadata = connection.getMetadata(entityClassOrName);
            const query = convertFindOptionsOrConditionsToMongodbQuery(optionsOrConditions) || {};
            const objectIdInstance = PlatformTools.load("mongodb").ObjectID;
            query["_id"] = {
                $in: ids.map(id => {
                    if (id instanceof objectIdInstance)
                        return id;

                    return id[metadata.objectIdColumn!.propertyName];
                })
            };

            const cursor = await this.createEntityCursor(entityClassOrName, query);
            if (FindOptionsUtils.isFindOptions(optionsOrConditions)) {
                if (optionsOrConditions.select)
                    cursor.project(convertFindOptionsSelectToProjectCriteria(optionsOrConditions.select));
                if (optionsOrConditions.skip)
                    cursor.skip(optionsOrConditions.skip);
                if (optionsOrConditions.take)
                    cursor.limit(optionsOrConditions.take);
                if (optionsOrConditions.order)
                    cursor.sort(convertFindOptionsOrderToOrderCriteria(optionsOrConditions.order));
            }
            return await cursor.toArray();
        },

        async findOne<Entity>(entityClassOrName: EntityTarget<Entity>,
                              optionsOrConditions?: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptions<Entity> | FindOptionsWhere<Entity>,
                              maybeOptions?: FindOptions<Entity>): Promise<Entity | undefined> {
            const objectIdInstance = PlatformTools.load("mongodb").ObjectID;
            const id = (optionsOrConditions instanceof objectIdInstance) || typeof optionsOrConditions === "string" ? optionsOrConditions : undefined;
            const findOneOptionsOrConditions = (id ? maybeOptions : optionsOrConditions) as any;
            const query = convertFindOneOptionsOrConditionsToMongodbQuery(findOneOptionsOrConditions) || {};
            if (id) {
                query["_id"] = (id instanceof objectIdInstance) ? id : new objectIdInstance(id);
            }
            const cursor = await this.createEntityCursor(entityClassOrName, query);
            if (FindOptionsUtils.isFindOptions(findOneOptionsOrConditions)) {
                if (findOneOptionsOrConditions.select)
                    cursor.project(convertFindOptionsSelectToProjectCriteria(findOneOptionsOrConditions.select));
                if (findOneOptionsOrConditions.order)
                    cursor.sort(convertFindOptionsOrderToOrderCriteria(findOneOptionsOrConditions.order));
            }

            // const result = await cursor.limit(1).next();
            const result = await cursor.limit(1).toArray();
            return result.length > 0 ? result[0] : undefined;
        },

        async insert<Entity>(target: EntityTarget<Entity>, entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<InsertResult> {
            // todo: convert entity to its database name
            const result = new InsertResult();
            if (Array.isArray(entity)) {
                result.raw = await this.insertMany(target, entity);
                Object.keys(result.raw.insertedIds).forEach((key: any) => {
                    let insertedId = result.raw.insertedIds[key];
                    result.generatedMaps.push(connection.driver.createGeneratedMap(connection.getMetadata(target), insertedId)!);
                    result.identifiers.push(connection.driver.createGeneratedMap(connection.getMetadata(target), insertedId)!);
                });

            } else {
                result.raw = await this.insertOne(target, entity);
                result.generatedMaps.push(connection.driver.createGeneratedMap(connection.getMetadata(target), result.raw.insertedId)!);
                result.identifiers.push(connection.driver.createGeneratedMap(connection.getMetadata(target), result.raw.insertedId)!);
            }

            return result;
        },

        async update<Entity>(target: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult> {
            if (Array.isArray(criteria)) {
                await Promise.all((criteria as any[]).map(criteriaItem => {
                    return this.update(target, criteriaItem, partialEntity);
                }));

            } else {
                const metadata = connection.getMetadata(target);
                await this.updateOne(target, convertMixedCriteria(metadata, criteria), { $set: partialEntity });
            }

            return new UpdateResult();
        },

        async delete<Entity>(target: EntityTarget<Entity>, criteria: string|string[]|number|number[]|Date|Date[]|ObjectID|ObjectID[]|FindOptionsWhere<Entity>): Promise<DeleteResult> {
            if (Array.isArray(criteria)) {
                await Promise.all((criteria as any[]).map(criteriaItem => {
                    return this.delete(target, criteriaItem);
                }));

            } else {
                await this.deleteOne(target, convertMixedCriteria(connection.getMetadata(target), criteria));
            }

            return new DeleteResult();
        },

        // -------------------------------------------------------------------------
        // Public Methods
        // -------------------------------------------------------------------------

        createCursor<Entity, T = any>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral): Cursor<T> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().cursor(metadata.tableName, query);
        },

        createEntityCursor<Entity>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral): Cursor<Entity> {
            const metadata = connection.getMetadata(entityClassOrName);
            const cursor = this.createCursor(entityClassOrName, query);
            applyEntityTransformationToCursor(metadata, cursor);
            return cursor;
        },

        aggregate<Entity, R = any>(entityClassOrName: EntityTarget<Entity>, pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<R> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().aggregate(metadata.tableName, pipeline, options);
        },

        aggregateEntity<Entity>(entityClassOrName: EntityTarget<Entity>, pipeline: ObjectLiteral[], options?: CollectionAggregationOptions): AggregationCursor<Entity> {
            const metadata = connection.getMetadata(entityClassOrName);
            const cursor = getQueryRunner().aggregate(metadata.tableName, pipeline, options);
            applyEntityTransformationToCursor(metadata, cursor);
            return cursor;
        },

        bulkWrite<Entity>(entityClassOrName: EntityTarget<Entity>, operations: ObjectLiteral[], options?: CollectionBulkWriteOptions): Promise<BulkWriteOpResultObject> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().bulkWrite(metadata.tableName, operations, options);
        },

        count<Entity>(entityClassOrName: EntityTarget<Entity>, query?: ObjectLiteral, options?: FindExtraOptions, mongoOptions?: MongoCountPreferences): Promise<number> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().count(metadata.tableName, query, mongoOptions);
        },

        createCollectionIndex<Entity>(entityClassOrName: EntityTarget<Entity>, fieldOrSpec: string | any, options?: MongodbIndexOptions): Promise<string> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().createCollectionIndex(metadata.tableName, fieldOrSpec, options);
        },

        createCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>, indexSpecs: ObjectLiteral[]): Promise<void> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().createCollectionIndexes(metadata.tableName, indexSpecs);
        },

        deleteMany<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().deleteMany(metadata.tableName, query, options);
        },

        deleteOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, options?: CollectionOptions): Promise<DeleteWriteOpResultObject> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().deleteOne(metadata.tableName, query, options);
        },

        distinct<Entity>(entityClassOrName: EntityTarget<Entity>, key: string, query: ObjectLiteral, options?: { readPreference?: ReadPreference | string }): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().distinct(metadata.tableName, key, query, options);
        },

        dropCollectionIndex<Entity>(entityClassOrName: EntityTarget<Entity>, indexName: string, options?: CollectionOptions): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().dropCollectionIndex(metadata.tableName, indexName, options);
        },

        dropCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().dropCollectionIndexes(metadata.tableName);
        },

        findOneAndDelete<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, options?: { projection?: Object, sort?: Object, maxTimeMS?: number }): Promise<FindAndModifyWriteOpResultObject> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().findOneAndDelete(metadata.tableName, query, options);
        },

        findOneAndReplace<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, replacement: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().findOneAndReplace(metadata.tableName, query, replacement, options);
        },

        findOneAndUpdate<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().findOneAndUpdate(metadata.tableName, query, update, options);
        },

        geoHaystackSearch<Entity>(entityClassOrName: EntityTarget<Entity>, x: number, y: number, options?: GeoHaystackSearchOptions): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().geoHaystackSearch(metadata.tableName, x, y, options);
        },

        geoNear<Entity>(entityClassOrName: EntityTarget<Entity>, x: number, y: number, options?: GeoNearOptions): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().geoNear(metadata.tableName, x, y, options);
        },

        group<Entity>(entityClassOrName: EntityTarget<Entity>, keys: Object | Array<any> | Function | Code, condition: Object, initial: Object, reduce: Function | Code, finalize: Function | Code, command: boolean, options?: { readPreference?: ReadPreference | string }): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().group(metadata.tableName, keys, condition, initial, reduce, finalize, command, options);
        },

        collectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().collectionIndexes(metadata.tableName);
        },

        collectionIndexExists<Entity>(entityClassOrName: EntityTarget<Entity>, indexes: string | string[]): Promise<boolean> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().collectionIndexExists(metadata.tableName, indexes);
        },

        collectionIndexInformation<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { full: boolean }): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().collectionIndexInformation(metadata.tableName, options);
        },

        initializeOrderedBulkOp<Entity>(entityClassOrName: EntityTarget<Entity>, options?: CollectionOptions): OrderedBulkOperation {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().initializeOrderedBulkOp(metadata.tableName, options);
        },

        initializeUnorderedBulkOp<Entity>(entityClassOrName: EntityTarget<Entity>, options?: CollectionOptions): UnorderedBulkOperation {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().initializeUnorderedBulkOp(metadata.tableName, options);
        },

        insertMany<Entity>(entityClassOrName: EntityTarget<Entity>, docs: ObjectLiteral[], options?: CollectionInsertManyOptions): Promise<InsertWriteOpResult> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().insertMany(metadata.tableName, docs, options);
        },

        insertOne<Entity>(entityClassOrName: EntityTarget<Entity>, doc: ObjectLiteral, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().insertOne(metadata.tableName, doc, options);
        },

        isCapped<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().isCapped(metadata.tableName);
        },

        listCollectionIndexes<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { batchSize?: number, readPreference?: ReadPreference | string }): CommandCursor {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().listCollectionIndexes(metadata.tableName, options);
        },

        mapReduce<Entity>(entityClassOrName: EntityTarget<Entity>, map: Function | string, reduce: Function | string, options?: MapReduceOptions): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().mapReduce(metadata.tableName, map, reduce, options);
        },

        parallelCollectionScan<Entity>(entityClassOrName: EntityTarget<Entity>, options?: ParallelCollectionScanOptions): Promise<Cursor<Entity>[]> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().parallelCollectionScan(metadata.tableName, options);
        },

        reIndex<Entity>(entityClassOrName: EntityTarget<Entity>): Promise<any> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().reIndex(metadata.tableName);
        },

        rename<Entity>(entityClassOrName: EntityTarget<Entity>, newName: string, options?: { dropTarget?: boolean }): Promise<Collection<any>> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().rename(metadata.tableName, newName, options);
        },

        replaceOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, doc: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().replaceOne(metadata.tableName, query, doc, options);
        },

        stats<Entity>(entityClassOrName: EntityTarget<Entity>, options?: { scale: number }): Promise<CollStats> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().stats(metadata.tableName, options);
        },

        watch<Entity>(entityClassOrName: EntityTarget<Entity>, pipeline?: Object[], options?: ChangeStreamOptions): ChangeStream {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().watch(metadata.tableName, pipeline, options);
        },

        updateMany<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: ObjectLiteral, options?: { upsert?: boolean, w?: any, wtimeout?: number, j?: boolean }): Promise<UpdateWriteOpResult> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().updateMany(metadata.tableName, query, update, options);
        },

        updateOne<Entity>(entityClassOrName: EntityTarget<Entity>, query: ObjectLiteral, update: ObjectLiteral, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult> {
            const metadata = connection.getMetadata(entityClassOrName);
            return getQueryRunner().updateOne(metadata.tableName, query, update, options);
        }

    };

}
