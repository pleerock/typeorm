import {CockroachDriver} from "../driver/cockroachdb/CockroachDriver";
import {OracleDriver} from "../driver/oracle/OracleDriver";
import {QueryBuilder} from "./QueryBuilder";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {ObjectType} from "../common/ObjectType";
import {Connection} from "../connection/Connection";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {PostgresDriver} from "../driver/postgres/PostgresDriver";
import {WhereExpression} from "./WhereExpression";
import {Brackets} from "./Brackets";
import {DeleteResult} from "./result/DeleteResult";
import {ReturningStatementNotSupportedError} from "../error/ReturningStatementNotSupportedError";
import {SqljsDriver} from "../driver/sqljs/SqljsDriver";
import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {BroadcasterResult} from "../subscriber/BroadcasterResult";
import {EntitySchema} from "../index";
import {AuroraDataApiDriver} from "../driver/aurora-data-api/AuroraDataApiDriver";
import {BetterSqlite3Driver} from "../driver/better-sqlite3/BetterSqlite3Driver";
import {QueryExpressionMap} from "./QueryExpressionMap";

/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
export class DeleteQueryBuilder<Entity> extends QueryBuilder<Entity> implements WhereExpression {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection, queryRunner: QueryRunner, queryExpressionMap?: QueryExpressionMap) {
        super(connection, queryRunner, queryExpressionMap);
        this.expressionMap.aliasNamePrefixingEnabled = false;
    }

    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------

    /**
     * Gets generated sql query without parameters being replaced.
     */
    getQuery(): string {
        let sql = this.createDeleteExpression();
        return sql.trim();
    }

    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    async execute(): Promise<DeleteResult> {
        const [sql, parameters] = this.getQueryAndParameters();
        let transactionStartedByUs: boolean = false;

        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && this.queryRunner.isTransactionActive === false) {
                await this.queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            // call before deletion methods in listeners and subscribers
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata) {
                const broadcastResult = new BroadcasterResult();
                this.queryRunner.broadcaster.broadcastBeforeRemoveEvent(broadcastResult, this.expressionMap.mainAlias!.metadata);
                if (broadcastResult.promises.length > 0) await Promise.all(broadcastResult.promises);
            }

            // execute query
            const deleteResult = new DeleteResult();
            const result = await this.queryRunner.query(sql, parameters);

            const driver = this.queryRunner.connection.driver;
            if (driver instanceof MysqlDriver || driver instanceof AuroraDataApiDriver) {
                deleteResult.raw = result;
                deleteResult.affected = result.affectedRows;

            } else if (driver instanceof SqlServerDriver || driver instanceof PostgresDriver || driver instanceof CockroachDriver) {
                deleteResult.raw = result[0] ? result[0] : null;
                // don't return 0 because it could confuse. null means that we did not receive this value
                deleteResult.affected = typeof result[1] === "number" ? result[1] : null;

            } else if (driver instanceof OracleDriver) {
                deleteResult.affected = result;

            } else if (driver instanceof BetterSqlite3Driver) { // only works for better-sqlite3
                deleteResult.raw = result;
                deleteResult.affected = result.changes;

            } else {
                deleteResult.raw = result;
            }

            // call after deletion methods in listeners and subscribers
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias!.hasMetadata) {
                const broadcastResult = new BroadcasterResult();
                this.queryRunner.broadcaster.broadcastAfterRemoveEvent(broadcastResult, this.expressionMap.mainAlias!.metadata);
                if (broadcastResult.promises.length > 0) await Promise.all(broadcastResult.promises);
            }

            // close transaction if we started it
            if (transactionStartedByUs)
                await this.queryRunner.commitTransaction();

            return deleteResult;

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
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    from<T>(entityTarget: ObjectType<T>|EntitySchema<T>|string, aliasName?: string): DeleteQueryBuilder<T> {
        entityTarget = entityTarget instanceof EntitySchema ? entityTarget.options.name : entityTarget;
        const mainAlias = this.createFromAlias(entityTarget, aliasName);
        this.expressionMap.setMainAlias(mainAlias);
        return (this as any) as DeleteQueryBuilder<T>;
    }

    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(where: Brackets|string|((qb: this) => string)|ObjectLiteral|ObjectLiteral[], parameters?: ObjectLiteral): this {
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
    andWhere(where: Brackets|string|((qb: this) => string), parameters?: ObjectLiteral): this {
        this.expressionMap.wheres.push({ type: "and", condition: this.computeWhereParameter(where) });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orWhere(where: Brackets|string|((qb: this) => string), parameters?: ObjectLiteral): this {
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

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates DELETE express used to perform query.
     */
    protected createDeleteExpression() {
        const tableName = this.getTableName(this.getMainTableName());
        const whereExpression = this.createWhereExpression();
        const returningExpression = this.createReturningExpression();

        if (returningExpression && (this.connection.driver instanceof PostgresDriver || this.connection.driver instanceof CockroachDriver)) {
            return `DELETE FROM ${tableName}${whereExpression} RETURNING ${returningExpression}`;

        } else if (returningExpression !== "" && this.connection.driver instanceof SqlServerDriver) {
            return `DELETE FROM ${tableName} OUTPUT ${returningExpression}${whereExpression}`;

        } else {
            return `DELETE FROM ${tableName}${whereExpression}`;
        }
    }

}
