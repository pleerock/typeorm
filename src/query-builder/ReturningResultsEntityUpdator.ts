import {ObjectLiteral} from "../common/ObjectLiteral";
import {QueryRunner} from "../query-runner/QueryRunner";
import {OrmUtils} from "../util/OrmUtils";
import {QueryExpressionMap} from "./QueryExpressionMap";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {UpdateResult} from "./result/UpdateResult";
import {InsertResult} from "./result/InsertResult";
import {OracleDriver} from "../driver/oracle/OracleDriver";
import { SqliteDriver } from "../driver/sqlite/SqliteDriver";
import { SqlServerDriver } from "../driver/sqlserver/SqlServerDriver";

/**
 * Updates entity with returning results in the entity insert and update operations.
 */
export class ReturningResultsEntityUpdator {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(protected queryRunner: QueryRunner,
                protected expressionMap: QueryExpressionMap) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Updates entities with a special columns after updation query execution.
     */
    async update(updateResult: UpdateResult, entities: ObjectLiteral[]): Promise<void> {
        const metadata = this.expressionMap.mainAlias!.metadata;

        await Promise.all(entities.map(async (entity, entityIndex) => {

            // if database supports returning/output statement then we already should have updating values in the raw data returned by insert query
            if (this.queryRunner.connection.driver.isReturningSqlSupported()) {
                if (this.queryRunner.connection.driver instanceof OracleDriver && Array.isArray(updateResult.raw) && this.expressionMap.extraReturningColumns.length > 0) {
                    updateResult.raw = updateResult.raw.reduce((newRaw, rawItem, rawItemIndex) => {
                        newRaw[this.expressionMap.extraReturningColumns[rawItemIndex].databaseName] = rawItem[0];
                        return newRaw;
                    }, {} as ObjectLiteral);
                }
                const result = Array.isArray(updateResult.raw) ? updateResult.raw[entityIndex] : updateResult.raw;
                const returningColumns = this.queryRunner.connection.driver.createGeneratedMap(metadata, result);
                if (returningColumns) {
                    this.queryRunner.manager.merge(metadata.target as any, entity, returningColumns);
                    updateResult.generatedMaps.push(returningColumns);
                }

            } else {

                // for driver which do not support returning/output statement we need to perform separate query and load what we need
                const updationColumns = this.getUpdationReturningColumns();
                if (updationColumns.length > 0) {

                    // get entity id by which we will get needed data
                    const entityId = this.expressionMap.mainAlias!.metadata.getEntityIdMap(entity);
                    if (!entityId)
                        throw new Error(`Cannot update entity because entity id is not set in the entity.`);

                    // Need to use metadata.target in cases where metadata.targetName is not available
                    // like when using .save in an entity that has a join column
                    const selectPrimaryColumns = metadata.primaryColumns.map(column => {
                        let target: string = "";
                        if (metadata.targetName === undefined || metadata.targetName === null || metadata.targetName === "") {
                            if (typeof metadata.target === "string") {
                                target = metadata.target;
                            }
                        } else {
                            target = metadata.targetName;
                        }
                        return target + "." + column.propertyPath;
                    });

                    const selectInsertionColumns = updationColumns.map(column => {
                        let target: string = "";
                        if (metadata.targetName === undefined || metadata.targetName === null || metadata.targetName === "") {
                            if (typeof metadata.target === "string") {
                                target = metadata.target;
                            }
                        } else {
                            target = metadata.targetName;
                        }
                        return target + "." + column.propertyPath;
                    });

                    // execute query to get needed data
                    const loadedReturningColumns = await this.queryRunner.manager
                        .createQueryBuilder()
                        .select(selectPrimaryColumns)
                        .addSelect(selectInsertionColumns)
                        .from(metadata.target, metadata.targetName)
                        .where(entityId)
                        .setOption("create-pojo") // use POJO because created object can contain default values, e.g. property = null and those properties maight be overridden by merge process
                        .getOne() as any;

                    if (loadedReturningColumns) {
                        this.queryRunner.manager.merge(metadata.target as any, entity, loadedReturningColumns);
                        updateResult.generatedMaps.push(loadedReturningColumns);
                    }
                }
            }
        }));
    }

    /**
     * Updates entities with a special columns after insertion query execution.
     */
    async insert(insertResult: InsertResult, entities: ObjectLiteral[]): Promise<void> {
        const metadata = this.expressionMap.mainAlias!.metadata;
        const insertionColumns = this.getInsertionReturningColumns();

        const generatedMaps = entities.map((entity, entityIndex) => {
            if (this.queryRunner.connection.driver instanceof OracleDriver && Array.isArray(insertResult.raw) && this.expressionMap.extraReturningColumns.length > 0) {
                insertResult.raw = insertResult.raw.reduce((newRaw, rawItem, rawItemIndex) => {
                    newRaw[this.expressionMap.extraReturningColumns[rawItemIndex].databaseName] = rawItem[0];
                    return newRaw;
                }, {} as ObjectLiteral);
            }
            // get all values generated by a database for us
            let result = Array.isArray(insertResult.raw) ? insertResult.raw[entityIndex] : insertResult.raw;

            // Unwrap insertResult for SqliteDriver as it's an object
            if (this.queryRunner.connection.driver instanceof SqliteDriver) {
                result = result.lastID;
            }
            const generatedMap = this.queryRunner.connection.driver.createGeneratedMap(metadata, result) || {};

            // if database does not support uuid generation we need to get uuid values
            // generated by orm and set them to the generatedMap
            if (this.queryRunner.connection.driver.isUUIDGenerationSupported() === false) {
                metadata.generatedColumns.forEach(generatedColumn => {
                    if (generatedColumn.generationStrategy === "uuid") {
                        // uuid can be defined by user in a model, that's why first we get it
                        let uuid = generatedColumn.getEntityValue(entity);
                        if (!uuid) // if it was not defined by a user then InsertQueryBuilder generates it by its own, get this generated uuid value
                            uuid = this.expressionMap.nativeParameters["uuid_" + generatedColumn.databaseName + entityIndex];

                        OrmUtils.mergeDeep(generatedMap, generatedColumn.createValueMap(uuid));
                    }
                });
            }

            this.queryRunner.manager.merge(metadata.target as any, entity, generatedMap); // todo: this should not be here, but problem with below line
            return generatedMap;
        });

        // for postgres and mssql we use returning/output statement to get values of inserted default and generated values
        // for other drivers we have to re-select this data from the database
        if (this.queryRunner.connection.driver.isReturningSqlSupported() === false && insertionColumns.length > 0) {
            await Promise.all(entities.map(async (entity, entityIndex) => {
                const entityId = metadata.getEntityIdMap(entity)!;

                // to select just inserted entity we need a criteria to select by.
                // for newly inserted entities in drivers which do not support returning statement
                // row identifier can only be an increment column
                // (since its the only thing that can be generated by those databases)
                // or (and) other primary key which is defined by a user and inserted value has it

                // Need to use metadata.target in cases where metadata.targetName is not available
                // like when using .save in an entity that has a join column
                const selectPrimaryColumns = metadata.primaryColumns.map(column => {
                    let target: string = "";
                    if (metadata.targetName === undefined || metadata.targetName === null || metadata.targetName === "") {
                        if (typeof metadata.target === "string") {
                            target = metadata.target;
                        }
                    } else {
                        target = metadata.targetName;
                    }
                    return target + "." + column.propertyPath;
                });

                const selectInsertionColumns = insertionColumns.map(column => {
                    let target: string = "";
                    if (metadata.targetName === undefined || metadata.targetName === null || metadata.targetName === "") {
                        if (typeof metadata.target === "string") {
                            target = metadata.target;
                        }
                    } else {
                        target = metadata.targetName;
                    }
                    return target + "." + column.propertyPath;
                });

                const returningResult: any = await this.queryRunner.manager
                    .createQueryBuilder()
                    .select(selectPrimaryColumns)
                    .addSelect(selectInsertionColumns)
                    .from(metadata.target, metadata.targetName)
                    .where(entityId)
                    .setOption("create-pojo") // use POJO because created object can contain default values, e.g. property = null and those properties maight be overridden by merge process
                    .markHelperReturning()
                    .getOne();

                this.queryRunner.manager.merge(metadata.target as any, generatedMaps[entityIndex], returningResult);
            }));
        }

        entities.forEach((entity, entityIndex) => {
            const entityId = metadata.getEntityIdMap(entity)!;
            insertResult.identifiers.push(entityId);
            insertResult.generatedMaps.push(generatedMaps[entityIndex]);
            this.queryRunner.manager.merge(this.expressionMap.mainAlias!.metadata.target as any, entity, generatedMaps[entityIndex], generatedMaps[entityIndex]); // todo: why twice?!
        });
    }

    /**
     * All qualifying columns will be returned after insert if reload is enabled
     */
    getInsertionReturningColumns(): ColumnMetadata[] {
        return this.expressionMap.mainAlias!.metadata.columns.filter(column => {
            // When an inheritanceTree exists and the main Entity has a parentEntity
            // properly select only the columns related to the parent and self
            // Other columns from "brother" entities should not be returned
            if (column.entityMetadata.inheritanceTree.length > 0 && this.expressionMap.mainAlias?.metadata?.parentEntityMetadata) {
                return column.target === this.expressionMap.mainAlias?.metadata.target ||
                    column.target === this.expressionMap.mainAlias?.metadata.parentEntityMetadata.target;
            }
            // Rowversion columns cannot be inserted therefore must be removed from the list
            if (this.queryRunner.connection.driver instanceof SqlServerDriver) {
                if (column.type === "rowversion") return false;
            }
            return true;
        });
    }

    /**
     * All qualifying columns will be returned after update if reload is enabled
     */
    getUpdationReturningColumns(): ColumnMetadata[] {
        return this.expressionMap.mainAlias!.metadata.columns.filter(column => {
            if (column.entityMetadata.inheritanceTree.length > 0 && this.expressionMap.mainAlias?.metadata?.parentEntityMetadata) {
                return column.target === this.expressionMap.mainAlias?.metadata.target ||
                    column.target === this.expressionMap.mainAlias?.metadata.parentEntityMetadata.target;
            }
            // Rowversion columns cannot be inserted therefore must be removed from the list
            if (this.queryRunner.connection.driver instanceof SqlServerDriver) {
                if (column.type === "rowversion") return false;
            }
            return true;
        });
    }

}
