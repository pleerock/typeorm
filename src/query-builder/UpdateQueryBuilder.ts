import {CockroachDriver} from "../driver/cockroachdb/CockroachDriver";
import {SapDriver} from "../driver/sap/SapDriver";
import { ColumnMetadata } from "../metadata/ColumnMetadata";
import {QueryBuilder} from "./QueryBuilder";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {Connection} from "../connection/Connection";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {PostgresDriver} from "../driver/postgres/PostgresDriver";
import {WhereExpression} from "./WhereExpression";
import {Brackets} from "./Brackets";
import {EntityMetadata} from "../metadata/EntityMetadata";
import {UpdateResult} from "./result/UpdateResult";
import {ReturningStatementNotSupportedError} from "../error/ReturningStatementNotSupportedError";
import {ReturningResultsEntityUpdator} from "./ReturningResultsEntityUpdator";
import {SqljsDriver} from "../driver/sqljs/SqljsDriver";
import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {BroadcasterResult} from "../subscriber/BroadcasterResult";
import {AbstractSqliteDriver} from "../driver/sqlite-abstract/AbstractSqliteDriver";
import {OrderByCondition} from "../find-options/OrderByCondition";
import {LimitOnUpdateNotSupportedError} from "../error/LimitOnUpdateNotSupportedError";
import {OracleDriver} from "../driver/oracle/OracleDriver";
import {UpdateValuesMissingError} from "../error/UpdateValuesMissingError";
import {EntityColumnNotFound} from "../error/EntityColumnNotFound";
import {QueryDeepPartialEntity} from "./QueryPartialEntity";
import {AuroraDataApiDriver} from "../driver/aurora-data-api/AuroraDataApiDriver";
import {BetterSqlite3Driver} from "../driver/better-sqlite3/BetterSqlite3Driver";

/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
export class UpdateQueryBuilder<Entity> extends QueryBuilder<Entity> implements WhereExpression {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connectionOrQueryBuilder: Connection|QueryBuilder<any>, queryRunner?: QueryRunner) {
        super(connectionOrQueryBuilder as any, queryRunner);
        this.expressionMap.aliasNamePrefixingEnabled = false;
    }

    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------

    /**
     * Gets generated sql query without parameters being replaced.
     */
    getQuery(): string {
        let sql = this.createUpdateExpression();
        sql += this.createOrderByExpression();
        sql += this.createLimitExpression();
        return sql.trim();
    }

    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    async execute(): Promise<UpdateResult> {
        let transactionStartedByUs: boolean = false;

        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && this.queryRunner.isTransactionActive === false) {
                await this.queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            // call before updation methods in listeners and subscribers
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata) {
                const broadcastResult = new BroadcasterResult();
                this.queryRunner.broadcaster.broadcastBeforeUpdateEvent(broadcastResult, this.expressionMap.mainAlias!.metadata, this.expressionMap.valuesSet);
                if (broadcastResult.promises.length > 0) await Promise.all(broadcastResult.promises);
            }

            let declareSql: string | null = null;
            let selectOutputSql: string | null = null;

            // if update entity mode is enabled we may need extra columns for the returning statement
            const returningResultsEntityUpdator = new ReturningResultsEntityUpdator(this.queryRunner, this.expressionMap);
            if (this.expressionMap.updateEntity === true &&
                this.expressionMap.mainAlias!.hasMetadata &&
                this.expressionMap.whereEntities.length > 0) {
                this.expressionMap.extraReturningColumns = returningResultsEntityUpdator.getUpdationReturningColumns();

                if (this.expressionMap.extraReturningColumns.length > 0 && this.connection.driver instanceof SqlServerDriver) {
                    declareSql = this.connection.driver.buildTableVariableDeclaration("@OutputTable", this.expressionMap.extraReturningColumns);
                    selectOutputSql = `SELECT * FROM @OutputTable`;
                }
            }

            // execute update query
            const [updateSql, parameters] = this.getQueryAndParameters();
            const updateResult = new UpdateResult();
            const statements = [declareSql, updateSql, selectOutputSql];
            const result = await this.queryRunner.query(
                statements.filter(sql => sql != null).join(";\n\n"),
                parameters,
            );

            if (this.connection.driver instanceof PostgresDriver) {
                updateResult.raw = result[0];
                updateResult.affected = result[1];
            }
            else if (this.connection.driver instanceof MysqlDriver) {
                updateResult.raw = result;
                updateResult.affected = result.affectedRows;
            }
            else if (this.connection.driver instanceof BetterSqlite3Driver) { // only works for better-sqlite3
                updateResult.raw = result;
                updateResult.affected = result.changes;
            }
            else {
                updateResult.raw = result;
            }

            // if we are updating entities and entity updation is enabled we must update some of entity columns (like version, update date, etc.)
            if (this.expressionMap.updateEntity === true &&
                this.expressionMap.mainAlias!.hasMetadata &&
                this.expressionMap.whereEntities.length > 0) {
                await returningResultsEntityUpdator.update(updateResult, this.expressionMap.whereEntities);
            }

            // call after updation methods in listeners and subscribers
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata) {
                const broadcastResult = new BroadcasterResult();
                this.queryRunner.broadcaster.broadcastAfterUpdateEvent(broadcastResult, this.expressionMap.mainAlias!.metadata);
                if (broadcastResult.promises.length > 0) await Promise.all(broadcastResult.promises);
            }

            // close transaction if we started it
            if (transactionStartedByUs)
                await this.queryRunner.commitTransaction();

            return updateResult;

        } catch (error) {

            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await this.queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }
            throw error;

        } finally {
            if (this.connection.driver instanceof SqljsDriver && !this.queryRunner.isTransactionActive) {
                await this.connection.driver.autoSave();
            }
        }
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Values needs to be updated.
     */
    set(values: QueryDeepPartialEntity<Entity>): this {
        this.expressionMap.valuesSet = values;
        return this;
    }

    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(where: string|((qb: this) => string)|Brackets|ObjectLiteral|ObjectLiteral[], parameters?: ObjectLiteral): this {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions
        const condition = this.computeWhereParameter(where);
        if (condition)
            this.expressionMap.wheres = [{ type: "simple", condition: condition }];
        if (parameters)
            this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andWhere(where: string|((qb: this) => string)|Brackets, parameters?: ObjectLiteral): this {
        this.expressionMap.wheres.push({ type: "and", condition: this.computeWhereParameter(where) });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orWhere(where: string|((qb: this) => string)|Brackets, parameters?: ObjectLiteral): this {
        this.expressionMap.wheres.push({ type: "or", condition: this.computeWhereParameter(where) });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    whereInIds(ids: any|any[]): this {
        return this.where(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    andWhereInIds(ids: any|any[]): this {
        return this.andWhere(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new OR WHERE with conditions for the given ids.
     */
    orWhereInIds(ids: any|any[]): this {
        return this.orWhere(this.createWhereIdsExpression(ids));
    }
    /**
     * Optional returning/output clause.
     * This will return given column values.
     */
    output(columns: string[]): this;

    /**
     * Optional returning/output clause.
     * Returning is a SQL string containing returning statement.
     */
    output(output: string): this;

    /**
     * Optional returning/output clause.
     */
    output(output: string|string[]): this;

    /**
     * Optional returning/output clause.
     */
    output(output: string|string[]): this {
        return this.returning(output);
    }

    /**
     * Optional returning/output clause.
     * This will return given column values.
     */
    returning(columns: string[]): this;

    /**
     * Optional returning/output clause.
     * Returning is a SQL string containing returning statement.
     */
    returning(returning: string): this;

    /**
     * Optional returning/output clause.
     */
    returning(returning: string|string[]): this;

    /**
     * Optional returning/output clause.
     */
    returning(returning: string|string[]): this {

        // not all databases support returning/output cause
        if (!this.connection.driver.isReturningSqlSupported())
            throw new ReturningStatementNotSupportedError();

        this.expressionMap.returning = returning;
        return this;
    }

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     *
     * Calling order by without order set will remove all previously set order bys.
     */
    orderBy(): this;

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(sort: string, order?: "ASC"|"DESC", nulls?: "NULLS FIRST"|"NULLS LAST"): this;

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(order: OrderByCondition): this;

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(sort?: string|OrderByCondition, order: "ASC"|"DESC" = "ASC", nulls?: "NULLS FIRST"|"NULLS LAST"): this {
        if (sort) {
            if (sort instanceof Object) {
                this.expressionMap.orderBys = sort as OrderByCondition;
            } else {
                if (nulls) {
                    this.expressionMap.orderBys = { [sort as string]: { order, nulls } };
                } else {
                    this.expressionMap.orderBys = { [sort as string]: order };
                }
            }
        } else {
            this.expressionMap.orderBys = {};
        }
        return this;
    }

    /**
     * Adds ORDER BY condition in the query builder.
     */
    addOrderBy(sort: string, order: "ASC"|"DESC" = "ASC", nulls?: "NULLS FIRST"|"NULLS LAST"): this {
        if (nulls) {
            this.expressionMap.orderBys[sort] = { order, nulls };
        } else {
            this.expressionMap.orderBys[sort] = order;
        }
        return this;
    }

    /**
     * Sets LIMIT - maximum number of rows to be selected.
     */
    limit(limit?: number): this {
        this.expressionMap.limit = limit;
        return this;
    }

    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    whereEntity(entity: Entity|Entity[]): this {
        if (!this.expressionMap.mainAlias!.hasMetadata)
            throw new Error(`.whereEntity method can only be used on queries which update real entity table.`);

        this.expressionMap.wheres = [];
        const entities: Entity[] = Array.isArray(entity) ? entity : [entity];
        entities.forEach(entity => {

            const entityIdMap = this.expressionMap.mainAlias!.metadata.getEntityIdMap(entity);
            if (!entityIdMap)
                throw new Error(`Provided entity does not have ids set, cannot perform operation.`);

            this.orWhereInIds(entityIdMap);
        });

        this.expressionMap.whereEntities = entities;
        return this;
    }

    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    updateEntity(enabled: boolean): this {
        this.expressionMap.updateEntity = enabled;
        return this;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates UPDATE express used to perform insert query.
     */
    protected createUpdateExpression() {
        const valuesSet = this.getValueSet();
        const metadata = this.expressionMap.mainAlias!.hasMetadata ? this.expressionMap.mainAlias!.metadata : undefined;

        // prepare columns and values to be updated
        const updateColumnAndValues: string[] = [];
        const updatedColumns: ColumnMetadata[] = [];
        const newParameters: ObjectLiteral = {};
        let parametersCount =   this.connection.driver instanceof MysqlDriver ||
                                this.connection.driver instanceof AuroraDataApiDriver ||
                                this.connection.driver instanceof OracleDriver ||
                                this.connection.driver instanceof AbstractSqliteDriver ||
                                this.connection.driver instanceof SapDriver
            ? 0 : Object.keys(this.expressionMap.nativeParameters).length;
        if (metadata) {
            EntityMetadata.createPropertyPath(metadata, valuesSet).forEach(propertyPath => {
                // todo: make this and other query builder to work with properly with tables without metadata
                const columns = metadata.findColumnsWithPropertyPath(propertyPath);

                if (columns.length <= 0) {
                    throw new EntityColumnNotFound(propertyPath);
                }

                columns.forEach(column => {
                    if (!column.isUpdate) { return; }
                    updatedColumns.push(column);

                    const paramName = "upd_" + column.databaseName;

                    //
                    let value = column.getEntityValue(valuesSet);
                    if (column.referencedColumn && value instanceof Object) {
                        value = column.referencedColumn.getEntityValue(value);
                    }
                    else if (!(value instanceof Function)) {
                        value = this.connection.driver.preparePersistentValue(value, column);
                    }

                    // todo: duplication zone
                    if (value instanceof Function) { // support for SQL expressions in update query
                        updateColumnAndValues.push(this.escape(column.databaseName) + " = " + value());
                    } else if (this.connection.driver instanceof SapDriver && value === null) {
                        updateColumnAndValues.push(this.escape(column.databaseName) + " = NULL");
                    } else {
                        if (this.connection.driver instanceof SqlServerDriver) {
                            value = this.connection.driver.parametrizeValue(column, value);

                        // } else if (value instanceof Array) {
                        //     value = new ArrayParameter(value);
                        }

                        if (this.connection.driver instanceof MysqlDriver ||
                            this.connection.driver instanceof AuroraDataApiDriver ||
                            this.connection.driver instanceof OracleDriver ||
                            this.connection.driver instanceof AbstractSqliteDriver ||
                            this.connection.driver instanceof SapDriver) {
                            newParameters[paramName] = value;
                        } else {
                            this.expressionMap.nativeParameters[paramName] = value;
                        }

                        let expression = null;
                        if ((this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver) && this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                            const useLegacy = this.connection.driver.options.legacySpatialSupport;
                            const geomFromText = useLegacy ? "GeomFromText" : "ST_GeomFromText";
                            if (column.srid != null) {
                                expression = `${geomFromText}(${this.connection.driver.createParameter(paramName, parametersCount)}, ${column.srid})`;
                            } else {
                                expression = `${geomFromText}(${this.connection.driver.createParameter(paramName, parametersCount)})`;
                            }
                        } else if (this.connection.driver instanceof PostgresDriver && this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                            if (column.srid != null) {
                              expression = `ST_SetSRID(ST_GeomFromGeoJSON(${this.connection.driver.createParameter(paramName, parametersCount)}), ${column.srid})::${column.type}`;
                            } else {
                              expression = `ST_GeomFromGeoJSON(${this.connection.driver.createParameter(paramName, parametersCount)})::${column.type}`;
                            }
                        } else if (this.connection.driver instanceof SqlServerDriver && this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                            expression = column.type + "::STGeomFromText(" + this.connection.driver.createParameter(paramName, parametersCount) + ", " + (column.srid || "0") + ")";
                        } else {
                            expression = this.connection.driver.createParameter(paramName, parametersCount);
                        }
                        updateColumnAndValues.push(this.escape(column.databaseName) + " = " + expression);
                        parametersCount++;
                    }
                });
            });

            if (metadata.versionColumn && updatedColumns.indexOf(metadata.versionColumn) === -1)
                updateColumnAndValues.push(this.escape(metadata.versionColumn.databaseName) + " = " + this.escape(metadata.versionColumn.databaseName) + " + 1");
            if (metadata.updateDateColumn && updatedColumns.indexOf(metadata.updateDateColumn) === -1)
                updateColumnAndValues.push(this.escape(metadata.updateDateColumn.databaseName) + " = CURRENT_TIMESTAMP"); // todo: fix issue with CURRENT_TIMESTAMP(6) being used, can "DEFAULT" be used?!

        } else {
            Object.keys(valuesSet).map(key => {
                let value = valuesSet[key];

                // todo: duplication zone
                if (value instanceof Function) { // support for SQL expressions in update query
                    updateColumnAndValues.push(this.escape(key) + " = " + value());
                } else if (this.connection.driver instanceof SapDriver && value === null) {
                    updateColumnAndValues.push(this.escape(key) + " = NULL");
                } else {

                    // we need to store array values in a special class to make sure parameter replacement will work correctly
                    // if (value instanceof Array)
                    //     value = new ArrayParameter(value);

                    if (this.connection.driver instanceof MysqlDriver ||
                        this.connection.driver instanceof AuroraDataApiDriver ||
                        this.connection.driver instanceof OracleDriver ||
                        this.connection.driver instanceof AbstractSqliteDriver ||
                        this.connection.driver instanceof SapDriver) {
                        newParameters[key] = value;
                    } else {
                        this.expressionMap.nativeParameters[key] = value;
                    }

                    updateColumnAndValues.push(this.escape(key) + " = " + this.connection.driver.createParameter(key, parametersCount));
                    parametersCount++;
                }
            });
        }

        if (updateColumnAndValues.length <= 0) {
            throw new UpdateValuesMissingError();
        }

        // we re-write parameters this way because we want our "UPDATE ... SET" parameters to be first in the list of "nativeParameters"
        // because some drivers like mysql depend on order of parameters
        if (this.connection.driver instanceof MysqlDriver ||
            this.connection.driver instanceof AuroraDataApiDriver ||
            this.connection.driver instanceof OracleDriver ||
            this.connection.driver instanceof AbstractSqliteDriver ||
            this.connection.driver instanceof SapDriver) {
            this.expressionMap.nativeParameters = Object.assign(newParameters, this.expressionMap.nativeParameters);
        }

        // get a table name and all column database names
        const whereExpression = this.createWhereExpression();
        const returningExpression = this.createReturningExpression();

        // generate and return sql update query
        if (returningExpression && (this.connection.driver instanceof PostgresDriver || this.connection.driver instanceof OracleDriver || this.connection.driver instanceof CockroachDriver)) {
            return `UPDATE ${this.getTableName(this.getMainTableName())} SET ${updateColumnAndValues.join(", ")}${whereExpression} RETURNING ${returningExpression}`;

        } else if (returningExpression && this.connection.driver instanceof SqlServerDriver) {
            return `UPDATE ${this.getTableName(this.getMainTableName())} SET ${updateColumnAndValues.join(", ")} OUTPUT ${returningExpression}${whereExpression}`;

        } else {
            return `UPDATE ${this.getTableName(this.getMainTableName())} SET ${updateColumnAndValues.join(", ")}${whereExpression}`; // todo: how do we replace aliases in where to nothing?
        }
    }

    /**
     * Creates "ORDER BY" part of SQL query.
     */
    protected createOrderByExpression() {
        const orderBys = this.expressionMap.orderBys;
        if (Object.keys(orderBys).length > 0)
            return " ORDER BY " + Object.keys(orderBys)
                    .map(columnName => {
                        if (typeof orderBys[columnName] === "string") {
                            return this.replacePropertyNames(columnName) + " " + orderBys[columnName];
                        } else {
                            return this.replacePropertyNames(columnName) + " " + (orderBys[columnName] as any).order + " " + (orderBys[columnName] as any).nulls;
                        }
                    })
                    .join(", ");

        return "";
    }

    /**
     * Creates "LIMIT" parts of SQL query.
     */
    protected createLimitExpression(): string {
        let limit: number|undefined = this.expressionMap.limit;

        if (limit) {
            if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver) {
                return " LIMIT " + limit;
            } else {
                throw new LimitOnUpdateNotSupportedError();
            }
        }

        return "";
    }

    /**
     * Gets array of values need to be inserted into the target table.
     */
    protected getValueSet(): ObjectLiteral {
        if (this.expressionMap.valuesSet instanceof Object)
            return this.expressionMap.valuesSet;

        throw new UpdateValuesMissingError();
    }

}
