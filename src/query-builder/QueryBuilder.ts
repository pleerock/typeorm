import {ObjectLiteral} from "../common/ObjectLiteral";
import {QueryRunner} from "../query-runner/QueryRunner";
import {Connection} from "../connection/Connection";
import {QueryExpressionMap} from "./QueryExpressionMap";
import {SelectQueryBuilder} from "./SelectQueryBuilder";
import {UpdateQueryBuilder} from "./UpdateQueryBuilder";
import {DeleteQueryBuilder} from "./DeleteQueryBuilder";
import {SoftDeleteQueryBuilder} from "./SoftDeleteQueryBuilder";
import {InsertQueryBuilder} from "./InsertQueryBuilder";
import {RelationQueryBuilder} from "./RelationQueryBuilder";
import {EntityTarget} from "../common/EntityTarget";
import {Alias} from "./Alias";
import {Brackets} from "./Brackets";
import {QueryDeepPartialEntity} from "./QueryPartialEntity";
import {EntityMetadata} from "../metadata/EntityMetadata";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {SqljsDriver} from "../driver/sqljs/SqljsDriver";
import {PostgresDriver} from "../driver/postgres/PostgresDriver";
import {CockroachDriver} from "../driver/cockroachdb/CockroachDriver";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {OracleDriver} from "../driver/oracle/OracleDriver";
import {EntitySchema} from "../";
import {FindOperator} from "../find-options/FindOperator";
import {In} from "../find-options/operator/In";
import {EntityColumnNotFound} from "../error/EntityColumnNotFound";
import { ObjectUtils } from "../util/ObjectUtils";

// todo: completely cover query builder with tests
// todo: entityOrProperty can be target name. implement proper behaviour if it is.
// todo: check in persistment if id exist on object and throw exception (can be in partial selection?)
// todo: fix problem with long aliases eg getMaxIdentifierLength
// todo: fix replacing in .select("COUNT(post.id) AS cnt") statement
// todo: implement joinAlways in relations and relationId
// todo: finish partial selection
// todo: sugar methods like: .addCount and .selectCount, selectCountAndMap, selectSum, selectSumAndMap, ...
// todo: implement @Select decorator
// todo: add select and map functions

// todo: implement relation/entity loading and setting them into properties within a separate query
// .loadAndMap("post.categories", "post.categories", qb => ...)
// .loadAndMap("post.categories", Category, qb => ...)

/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
export abstract class QueryBuilder<Entity> {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection on which QueryBuilder was created.
     */
    readonly connection: Connection;

    /**
     * Contains all properties of the QueryBuilder that needs to be build a final query.
     */
    readonly expressionMap: QueryExpressionMap;

    /**
     * Stores temporarily user data.
     * Useful for sharing data with subscribers.
     */
    data?: ObjectLiteral;

    // -------------------------------------------------------------------------
    // Protected Properties
    // -------------------------------------------------------------------------

    /**
     * Query runner used to execute query builder query.
     */
    protected queryRunner?: QueryRunner;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * QueryBuilder can be initialized from given Connection and QueryRunner objects or from given other QueryBuilder.
     */
    constructor(queryBuilder: QueryBuilder<any>);

    /**
     * QueryBuilder can be initialized from given Connection and QueryRunner objects or from given other QueryBuilder.
     */
    constructor(connection: Connection, queryRunner?: QueryRunner);

    /**
     * QueryBuilder can be initialized from given Connection and QueryRunner objects or from given other QueryBuilder.
     */
    constructor(connectionOrQueryBuilder: Connection|QueryBuilder<any>, queryRunner?: QueryRunner) {
        if (connectionOrQueryBuilder instanceof QueryBuilder) {
            this.connection = connectionOrQueryBuilder.connection;
            this.queryRunner = connectionOrQueryBuilder.queryRunner;
            this.expressionMap = connectionOrQueryBuilder.expressionMap.clone();
            this.data = connectionOrQueryBuilder.data;

        } else {
            this.connection = connectionOrQueryBuilder;
            this.queryRunner = queryRunner;
            this.expressionMap = new QueryExpressionMap(this.connection);
        }
    }

    // -------------------------------------------------------------------------
    // Abstract Methods
    // -------------------------------------------------------------------------

    /**
     * Gets generated sql query without parameters being replaced.
     */
    abstract getQuery(): string;

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Gets the main alias string used in this query builder.
     */
    get alias(): string {
        if (!this.expressionMap.mainAlias)
            throw new Error(`Main alias is not set`); // todo: better exception

        return this.expressionMap.mainAlias.name;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Creates SELECT query.
     * Replaces all previous selections if they exist.
     */
    select(): SelectQueryBuilder<Entity>;

    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection: string, selectionAliasName?: string): SelectQueryBuilder<Entity>;

    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection: string[]): SelectQueryBuilder<Entity>;

    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection?: string|string[], selectionAliasName?: string): SelectQueryBuilder<Entity> {
        this.expressionMap.queryType = "select";
        if (Array.isArray(selection)) {
            this.expressionMap.selects = selection.map(selection => ({ selection: selection }));
        } else if (selection) {
            this.expressionMap.selects = [{ selection: selection, aliasName: selectionAliasName }];
        }

        // loading it dynamically because of circular issue
        const SelectQueryBuilderCls = require("./SelectQueryBuilder").SelectQueryBuilder;
        if (this instanceof SelectQueryBuilderCls)
            return this as any;

        return new SelectQueryBuilderCls(this);
    }

    /**
     * Creates INSERT query.
     */
    insert(): InsertQueryBuilder<Entity> {
        this.expressionMap.queryType = "insert";

        // loading it dynamically because of circular issue
        const InsertQueryBuilderCls = require("./InsertQueryBuilder").InsertQueryBuilder;
        if (this instanceof InsertQueryBuilderCls)
            return this as any;

        return new InsertQueryBuilderCls(this);
    }

    /**
     * Creates UPDATE query and applies given update values.
     */
    update(): UpdateQueryBuilder<Entity>;

    /**
     * Creates UPDATE query and applies given update values.
     */
    update(updateSet: QueryDeepPartialEntity<Entity>): UpdateQueryBuilder<Entity>;

    /**
     * Creates UPDATE query for the given entity and applies given update values.
     */
    update<Entity>(entity: EntityTarget<Entity>, updateSet?: QueryDeepPartialEntity<Entity>): UpdateQueryBuilder<Entity>;

    /**
     * Creates UPDATE query for the given table name and applies given update values.
     */
    update(tableName: string, updateSet?: QueryDeepPartialEntity<Entity>): UpdateQueryBuilder<Entity>;

    /**
     * Creates UPDATE query and applies given update values.
     */
    update(entityOrTableNameUpdateSet?: EntityTarget<any>|ObjectLiteral, maybeUpdateSet?: ObjectLiteral): UpdateQueryBuilder<any> {
        const updateSet = maybeUpdateSet ? maybeUpdateSet : entityOrTableNameUpdateSet as ObjectLiteral|undefined;
        entityOrTableNameUpdateSet = entityOrTableNameUpdateSet instanceof EntitySchema ? entityOrTableNameUpdateSet.options.name : entityOrTableNameUpdateSet;

        if (entityOrTableNameUpdateSet instanceof Function || typeof entityOrTableNameUpdateSet === "string") {
            const mainAlias = this.createFromAlias(entityOrTableNameUpdateSet);
            this.expressionMap.setMainAlias(mainAlias);
        }

        this.expressionMap.queryType = "update";
        this.expressionMap.valuesSet = updateSet;

        // loading it dynamically because of circular issue
        const UpdateQueryBuilderCls = require("./UpdateQueryBuilder").UpdateQueryBuilder;
        if (this instanceof UpdateQueryBuilderCls)
            return this as any;

        return new UpdateQueryBuilderCls(this);
    }

    /**
     * Creates DELETE query.
     */
    delete(): DeleteQueryBuilder<Entity> {
        this.expressionMap.queryType = "delete";

        // loading it dynamically because of circular issue
        const DeleteQueryBuilderCls = require("./DeleteQueryBuilder").DeleteQueryBuilder;
        if (this instanceof DeleteQueryBuilderCls)
            return this as any;

        return new DeleteQueryBuilderCls(this);
    }

    softDelete(): SoftDeleteQueryBuilder<any> {
        this.expressionMap.queryType = "soft-delete";

        // loading it dynamically because of circular issue
        const SoftDeleteQueryBuilderCls = require("./SoftDeleteQueryBuilder").SoftDeleteQueryBuilder;
        if (this instanceof SoftDeleteQueryBuilderCls)
            return this as any;

        return new SoftDeleteQueryBuilderCls(this);
    }

    restore(): SoftDeleteQueryBuilder<any> {
        this.expressionMap.queryType = "restore";

        // loading it dynamically because of circular issue
        const SoftDeleteQueryBuilderCls = require("./SoftDeleteQueryBuilder").SoftDeleteQueryBuilder;
        if (this instanceof SoftDeleteQueryBuilderCls)
            return this as any;

        return new SoftDeleteQueryBuilderCls(this);
    }

    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation(propertyPath: string): RelationQueryBuilder<Entity>;

    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation<T>(entityTarget: EntityTarget<T>, propertyPath: string): RelationQueryBuilder<T>;

    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation(entityTargetOrPropertyPath: Function|string, maybePropertyPath?: string): RelationQueryBuilder<Entity> {
        const entityTarget = arguments.length === 2 ? entityTargetOrPropertyPath : undefined;
        const propertyPath = arguments.length === 2 ? maybePropertyPath as string : entityTargetOrPropertyPath as string;

        this.expressionMap.queryType = "relation";
        this.expressionMap.relationPropertyPath = propertyPath;

        if (entityTarget) {
            const mainAlias = this.createFromAlias(entityTarget);
            this.expressionMap.setMainAlias(mainAlias);
        }

        // loading it dynamically because of circular issue
        const RelationQueryBuilderCls = require("./RelationQueryBuilder").RelationQueryBuilder;
        if (this instanceof RelationQueryBuilderCls)
            return this as any;

        return new RelationQueryBuilderCls(this);
    }


    /**
     * Checks if given relation exists in the entity.
     * Returns true if relation exists, false otherwise.
     *
     * todo: move this method to manager? or create a shortcut?
     */
    hasRelation<T>(target: EntityTarget<T>, relation: string): boolean;

    /**
     * Checks if given relations exist in the entity.
     * Returns true if relation exists, false otherwise.
     *
     * todo: move this method to manager? or create a shortcut?
     */
    hasRelation<T>(target: EntityTarget<T>, relation: string[]): boolean;

    /**
     * Checks if given relation or relations exist in the entity.
     * Returns true if relation exists, false otherwise.
     *
     * todo: move this method to manager? or create a shortcut?
     */
    hasRelation<T>(target: EntityTarget<T>, relation: string|string[]): boolean {
        const entityMetadata = this.connection.getMetadata(target);
        const relations = Array.isArray(relation) ? relation : [relation];
        return relations.every(relation => {
            return !!entityMetadata.findRelationWithPropertyPath(relation);
        });
    }

    /**
     * Sets parameter name and its value.
     */
    setParameter(key: string, value: any): this {
        this.expressionMap.parameters[key] = value;
        return this;
    }

    /**
     * Adds all parameters from the given object.
     */
    setParameters(parameters: ObjectLiteral): this {

        // remove function parameters
        Object.keys(parameters).forEach(key => {
            if (parameters[key] instanceof Function) {
                throw new Error(`Function parameter isn't supported in the parameters. Please check "${key}" parameter.`);
            }
        });

        // set parent query builder parameters as well in sub-query mode
        if (this.expressionMap.parentQueryBuilder)
            this.expressionMap.parentQueryBuilder.setParameters(parameters);

        Object.keys(parameters).forEach(key => this.setParameter(key, parameters[key]));
        return this;
    }

    /**
     * Adds native parameters from the given object.
     */
    setNativeParameters(parameters: ObjectLiteral): this {

        // set parent query builder parameters as well in sub-query mode
        if (this.expressionMap.parentQueryBuilder)
            this.expressionMap.parentQueryBuilder.setNativeParameters(parameters);

        Object.keys(parameters).forEach(key => {
            this.expressionMap.nativeParameters[key] = parameters[key];
        });
        return this;
    }

    /**
     * Gets all parameters.
     */
    getParameters(): ObjectLiteral {
        const parameters: ObjectLiteral = Object.assign({}, this.expressionMap.parameters);

        // add discriminator column parameter if it exist
        if (this.expressionMap.mainAlias && this.expressionMap.mainAlias.hasMetadata) {
            const metadata = this.expressionMap.mainAlias!.metadata;
            if (metadata.discriminatorColumn && metadata.parentEntityMetadata) {
                const values = metadata.childEntityMetadatas
                    .filter(childMetadata => childMetadata.discriminatorColumn)
                    .map(childMetadata => childMetadata.discriminatorValue);
                values.push(metadata.discriminatorValue);
                parameters["discriminatorColumnValues"] = values;
            }
        }

        return parameters;
    }

    /**
     * Prints sql to stdout using console.log.
     */
    printSql(): this { // TODO rename to logSql()
        const [query, parameters] = this.getQueryAndParameters();
        this.connection.logger.logQuery(query, parameters);
        return this;
    }

    /**
     * Gets generated sql that will be executed.
     * Parameters in the query are escaped for the currently used driver.
     */
    getSql(): string {
        return this.getQueryAndParameters()[0];
    }

    /**
     * Gets query to be executed with all parameters used in it.
     */
    getQueryAndParameters(): [string, any[]] {
        // this execution order is important because getQuery method generates this.expressionMap.nativeParameters values
        const query = this.getQuery();
        const parameters = this.getParameters();
        return this.connection.driver.escapeQueryWithParameters(query, parameters, this.expressionMap.nativeParameters);
    }

    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    async execute(): Promise<any> {
        const [sql, parameters] = this.getQueryAndParameters();
        const queryRunner = this.obtainQueryRunner();
        try {
            return await queryRunner.query(sql, parameters);  // await is needed here because we are using finally

        } finally {
            if (queryRunner !== this.queryRunner) { // means we created our own query runner
                await queryRunner.release();
            }
            if (this.connection.driver instanceof SqljsDriver) {
                await this.connection.driver.autoSave();
            }
        }
    }

    /**
     * Creates a completely new query builder.
     * Uses same query runner as current QueryBuilder.
     */
    createQueryBuilder(): this {
        return new (this.constructor as any)(this.connection, this.queryRunner);
    }

    /**
     * Clones query builder as it is.
     * Note: it uses new query runner, if you want query builder that uses exactly same query runner,
     * you can create query builder using its constructor, for example new SelectQueryBuilder(queryBuilder)
     * where queryBuilder is cloned QueryBuilder.
     */
    clone(): this {
        return new (this.constructor as any)(this);
    }

    /**
     * Includes a Query comment in the query builder.  This is helpful for debugging purposes,
     * such as finding a specific query in the database server's logs, or for categorization using
     * an APM product.
     */
    comment(comment: string): this {
        this.expressionMap.comment = comment;
        return this;
    }

    /**
     * Disables escaping.
     */
    disableEscaping(): this {
        this.expressionMap.disableEscaping = false;
        return this;
    }

    /**
     * Escapes table name, column name or alias name using current database's escaping character.
     */
    escape(name: string): string {
        if (!this.expressionMap.disableEscaping)
            return name;
        return this.connection.driver.escape(name);
    }

    /**
     * Sets or overrides query builder's QueryRunner.
     */
    setQueryRunner(queryRunner: QueryRunner): this {
        this.queryRunner = queryRunner;
        return this;
    }

    /**
     * Indicates if listeners and subscribers must be called before and after query execution.
     * Enabled by default.
     */
    callListeners(enabled: boolean): this {
        this.expressionMap.callListeners = enabled;
        return this;
    }

    /**
     * If set to true the query will be wrapped into a transaction.
     */
    useTransaction(enabled: boolean): this {
        this.expressionMap.useTransaction = enabled;
        return this;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Gets escaped table name with schema name if SqlServer driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    protected getTableName(tablePath: string): string {
        return tablePath.split(".")
            .map(i => {
                // this condition need because in SQL Server driver when custom database name was specified and schema name was not, we got `dbName..tableName` string, and doesn't need to escape middle empty string
                if (i === "")
                    return i;
                return this.escape(i);
            }).join(".");
    }

    /**
     * Gets name of the table where insert should be performed.
     */
    protected getMainTableName(): string {
        if (!this.expressionMap.mainAlias)
            throw new Error(`Entity where values should be inserted is not specified. Call "qb.into(entity)" method to specify it.`);

        if (this.expressionMap.mainAlias.hasMetadata)
            return this.expressionMap.mainAlias.metadata.tablePath;

        return this.expressionMap.mainAlias.tablePath!;
    }

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    protected createFromAlias(entityTarget: EntityTarget<any>|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), aliasName?: string): Alias {

        // if table has a metadata then find it to properly escape its properties
        // const metadata = this.connection.entityMetadatas.find(metadata => metadata.tableName === tableName);
        if (this.connection.hasMetadata(entityTarget)) {
            const metadata = this.connection.getMetadata(entityTarget);

            return this.expressionMap.createAlias({
                type: "from",
                name: aliasName,
                metadata: this.connection.getMetadata(entityTarget),
                tablePath: metadata.tablePath
            });

        } else {
            if (typeof entityTarget === "string") {
                const isSubquery = entityTarget.substr(0, 1) === "(" && entityTarget.substr(-1) === ")";

                return this.expressionMap.createAlias({
                    type: "from",
                    name: aliasName,
                    tablePath: !isSubquery ? entityTarget as string : undefined,
                    subQuery: isSubquery ? entityTarget : undefined,
                });
            }

            const subQueryBuilder: SelectQueryBuilder<any> = (entityTarget as any)(((this as any) as SelectQueryBuilder<any>).subQuery());
            this.setParameters(subQueryBuilder.getParameters());
            const subquery = subQueryBuilder.getQuery();

            return this.expressionMap.createAlias({
                type: "from",
                name: aliasName,
                subQuery: subquery
            });
        }
    }

    /**
     * Replaces all entity's propertyName to name in the given statement.
     */
    protected replacePropertyNames(statement: string) {
        // Escape special characters in regular expressions
        // Per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
        const escapeRegExp = (s: String) => s.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");

        for (const alias of this.expressionMap.aliases) {
            if (!alias.hasMetadata) continue;
            const replaceAliasNamePrefix = this.expressionMap.aliasNamePrefixingEnabled ? `${alias.name}.` : "";
            const replacementAliasNamePrefix = this.expressionMap.aliasNamePrefixingEnabled ? `${this.escape(alias.name)}.` : "";

            const replacements: { [key: string]: string } = {};

            // Insert & overwrite the replacements from least to most relevant in our replacements object.
            // To do this we iterate and overwrite in the order of relevance.
            // Least to Most Relevant:
            // * Relation Property Path to first join column key
            // * Relation Property Path + Column Path
            // * Column Database Name
            // * Column Propety Name
            // * Column Property Path

            for (const relation of alias.metadata.relations) {
                if (relation.joinColumns.length > 0)
                    replacements[relation.propertyPath] = relation.joinColumns[0].databaseName;
            }

            for (const relation of alias.metadata.relations) {
                for (const joinColumn of [...relation.joinColumns, ...relation.inverseJoinColumns]) {
                    const propertyKey = `${relation.propertyPath}.${joinColumn.referencedColumn!.propertyPath}`;
                    replacements[propertyKey] = joinColumn.databaseName;
                }
            }

            for (const column of alias.metadata.columns) {
                replacements[column.databaseName] = column.databaseName;
            }

            for (const column of alias.metadata.columns) {
                replacements[column.propertyName] = column.databaseName;
            }

            for (const column of alias.metadata.columns) {
                replacements[column.propertyPath] = column.databaseName;
            }

            const replacementKeys = Object.keys(replacements);

            if (replacementKeys.length) {
                statement = statement.replace(new RegExp(
                    // Avoid a lookbehind here since it's not well supported
                    `([ =\(]|^.{0})` +
                    `${escapeRegExp(replaceAliasNamePrefix)}(${replacementKeys.map(escapeRegExp).join("|")})` +
                    `(?=[ =\)\,]|.{0}$)`,
                    "gm"
                ), (_, pre, p) =>
                    `${pre}${replacementAliasNamePrefix}${this.escape(replacements[p])}`
                );
            }
        }

        return statement;
    }

    protected createComment(): string {
        if (!this.expressionMap.comment) {
            return "";
        }

        // ANSI SQL 2003 support C style comments - comments that start with `/*` and end with `*/`
        // In some dialects query nesting is available - but not all.  Because of this, we'll need
        // to scrub "ending" characters from the SQL but otherwise we can leave everything else
        // as-is and it should be valid.

        return `/* ${this.expressionMap.comment.replace("*/", "")} */ `;
    }

    /**
     * Creates "WHERE" expression.
     */
    protected createWhereExpression() {
        const conditionsArray = [];

        const whereExpression = this.createWhereExpressionString();
        whereExpression.trim() && conditionsArray.push(this.createWhereExpressionString());

        if (this.expressionMap.mainAlias!.hasMetadata) {
            const metadata = this.expressionMap.mainAlias!.metadata;
            // Adds the global condition of "non-deleted" for the entity with delete date columns in select query.
            if (this.expressionMap.queryType === "select" && !this.expressionMap.withDeleted && metadata.deleteDateColumn) {
                const column = this.expressionMap.aliasNamePrefixingEnabled
                    ? this.expressionMap.mainAlias!.name + "." + metadata.deleteDateColumn.propertyName
                    : metadata.deleteDateColumn.propertyName;

                const condition = `${this.replacePropertyNames(column)} IS NULL`;
                conditionsArray.push(condition);
            }

            if (metadata.discriminatorColumn && metadata.parentEntityMetadata) {
                const column = this.expressionMap.aliasNamePrefixingEnabled
                    ? this.expressionMap.mainAlias!.name + "." + metadata.discriminatorColumn.databaseName
                    : metadata.discriminatorColumn.databaseName;

                const condition = `${this.replacePropertyNames(column)} IN (:...discriminatorColumnValues)`;
                conditionsArray.push(condition);
            }
        }

        if (this.expressionMap.extraAppendedAndWhereCondition) {
            const condition = this.replacePropertyNames(this.expressionMap.extraAppendedAndWhereCondition);
            conditionsArray.push(condition);
        }

        if (!conditionsArray.length) {
            return "";
        } else if (conditionsArray.length === 1) {
            return ` WHERE ${conditionsArray[0]}`;
        } else {
            return ` WHERE ( ${conditionsArray.join(" ) AND ( ")} )`;
        }
    }

    /**
     * Creates "RETURNING" / "OUTPUT" expression.
     */
    protected createReturningExpression(): string {
        const columns = this.getReturningColumns();
        const driver = this.connection.driver;

        // also add columns we must auto-return to perform entity updation
        // if user gave his own returning
        if (typeof this.expressionMap.returning !== "string" &&
            this.expressionMap.extraReturningColumns.length > 0 &&
            driver.isReturningSqlSupported()) {
            columns.push(...this.expressionMap.extraReturningColumns.filter(column => {
                return columns.indexOf(column) === -1;
            }));
        }

        if (columns.length) {
            let columnsExpression = columns.map(column => {
                const name = this.escape(column.databaseName);
                if (driver instanceof SqlServerDriver) {
                    if (this.expressionMap.queryType === "insert" || this.expressionMap.queryType === "update" || this.expressionMap.queryType === "soft-delete" || this.expressionMap.queryType === "restore") {
                        return "INSERTED." + name;
                    } else {
                        return this.escape(this.getMainTableName()) + "." + name;
                    }
                } else {
                    return name;
                }
            }).join(", ");

            if (driver instanceof OracleDriver) {
                columnsExpression += " INTO " + columns.map(column => {
                    const parameterName = "output_" + column.databaseName;
                    this.expressionMap.nativeParameters[parameterName] = { type: driver.columnTypeToNativeParameter(column.type), dir: driver.oracle.BIND_OUT };
                    return this.connection.driver.createParameter(parameterName, Object.keys(this.expressionMap.nativeParameters).length);
                }).join(", ");
            }

            if (driver instanceof SqlServerDriver) {
                if (this.expressionMap.queryType === "insert" || this.expressionMap.queryType === "update") {
                    columnsExpression += " INTO @OutputTable";
                }
            }

            return columnsExpression;

        } else if (typeof this.expressionMap.returning === "string") {
            return this.expressionMap.returning;
        }

        return "";
    }

    /**
     * If returning / output cause is set to array of column names,
     * then this method will return all column metadatas of those column names.
     */
    protected getReturningColumns(): ColumnMetadata[] {
        const columns: ColumnMetadata[] = [];
        if (Array.isArray(this.expressionMap.returning)) {
            (this.expressionMap.returning as string[]).forEach(columnName => {
                if (this.expressionMap.mainAlias!.hasMetadata) {
                    columns.push(...this.expressionMap.mainAlias!.metadata.findColumnsWithPropertyPath(columnName));
                }
            });
        }
        return columns;
    }

    /**
     * Concatenates all added where expressions into one string.
     */
    protected createWhereExpressionString(): string {
        return this.expressionMap.wheres.map((where, index) => {
            switch (where.type) {
                case "and":
                    return (index > 0 ? "AND " : "") + this.replacePropertyNames(where.condition);
                case "or":
                    return (index > 0 ? "OR " : "") + this.replacePropertyNames(where.condition);
                default:
                    return this.replacePropertyNames(where.condition);
            }
        }).join(" ");
    }

    /**
     * Creates "WHERE" expression and variables for the given "ids".
     */
    protected createWhereIdsExpression(ids: any|any[]): string {
        const metadata = this.expressionMap.mainAlias!.metadata;
        const normalized = (Array.isArray(ids) ? ids : [ids]).map(id => metadata.ensureEntityIdMap(id));

        // using in(...ids) for single primary key entities
        if (!metadata.hasMultiplePrimaryKeys
            && metadata.embeddeds.length === 0
        ) {
            const primaryColumn = metadata.primaryColumns[0];

            // getEntityValue will try to transform `In`, it is a bug
            // todo: remove this transformer check after #2390 is fixed
            if (!primaryColumn.transformer) {
                return this.computeWhereParameter({
                    [primaryColumn.propertyName]: In(
                        normalized.map(id => primaryColumn.getEntityValue(id, false))
                    )
                });
            }
        }

        // create shortcuts for better readability
        const alias = this.expressionMap.aliasNamePrefixingEnabled ? this.escape(this.expressionMap.mainAlias!.name) + "." : "";
        let parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;
        const whereStrings = normalized.map((id, index) => {
            const whereSubStrings: string[] = [];
            metadata.primaryColumns.forEach((primaryColumn, secondIndex) => {
                const parameterName = "id_" + index + "_" + secondIndex;
                // whereSubStrings.push(alias + this.escape(primaryColumn.databaseName) + "=:id_" + index + "_" + secondIndex);
                whereSubStrings.push(alias + this.escape(primaryColumn.databaseName) + " = " + this.connection.driver.createParameter(parameterName, parameterIndex));
                this.expressionMap.nativeParameters[parameterName] = primaryColumn.getEntityValue(id, true);
                parameterIndex++;
            });
            return whereSubStrings.join(" AND ");
        });

        return whereStrings.length > 1
            ? "(" + whereStrings.map(whereString => "(" + whereString + ")").join(" OR ") + ")"
            : whereStrings[0];
    }

    /**
     * Computes given where argument - transforms to a where string all forms it can take.
     */
    protected computeWhereParameter(where: string|((qb: this) => string)|Brackets|ObjectLiteral|ObjectLiteral[]) {
        if (typeof where === "string")
            return where;

        if (where instanceof Brackets) {
            const whereQueryBuilder = this.createQueryBuilder();
            whereQueryBuilder.expressionMap.mainAlias = this.expressionMap.mainAlias;
            whereQueryBuilder.expressionMap.aliasNamePrefixingEnabled = this.expressionMap.aliasNamePrefixingEnabled;
            whereQueryBuilder.expressionMap.nativeParameters = this.expressionMap.nativeParameters;
            where.whereFactory(whereQueryBuilder as any);
            const whereString = whereQueryBuilder.createWhereExpressionString();
            this.setParameters(whereQueryBuilder.getParameters());
            return whereString ? "(" + whereString + ")" : "";

        } else if (where instanceof Function) {
            return where(this);

        } else if (where instanceof Object) {
            const wheres: ObjectLiteral[] = Array.isArray(where) ? where : [where];
            let andConditions: string[];
            let parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;

            if (this.expressionMap.mainAlias!.hasMetadata) {
                andConditions = wheres.map((where, whereIndex) => {
                    const propertyPaths = EntityMetadata.createPropertyPath(this.expressionMap.mainAlias!.metadata, where);

                    return propertyPaths.map((propertyPath, propertyIndex) => {
                        const columns = this.expressionMap.mainAlias!.metadata.findColumnsWithPropertyPath(propertyPath);

                        if (!columns.length) {
                            throw new EntityColumnNotFound(propertyPath);
                        }

                        return columns.map((column, columnIndex) => {

                            const aliasPath = this.expressionMap.aliasNamePrefixingEnabled ? `${this.alias}.${propertyPath}` : column.propertyPath;
                            let parameterValue = column.getEntityValue(where, true);
                            const parameterName = "where_" + whereIndex + "_" + propertyIndex + "_" + columnIndex;
                            const parameterBaseCount = Object.keys(this.expressionMap.nativeParameters).filter(x => x.startsWith(parameterName)).length;

                            if (parameterValue === null) {
                                return `${aliasPath} IS NULL`;

                            } else if (parameterValue instanceof FindOperator) {
                                let parameters: any[] = [];
                                if (parameterValue.useParameter) {
                                    if (parameterValue.objectLiteralParameters) {
                                        this.setParameters(parameterValue.objectLiteralParameters);
                                    } else {
                                        const realParameterValues: any[] = parameterValue.multipleParameters ? parameterValue.value : [parameterValue.value];
                                        realParameterValues.forEach((realParameterValue, realParameterValueIndex) => {
                                            this.expressionMap.nativeParameters[parameterName + (parameterBaseCount + realParameterValueIndex)] = realParameterValue;
                                            parameterIndex++;
                                            parameters.push(this.connection.driver.createParameter(parameterName + (parameterBaseCount + realParameterValueIndex), parameterIndex - 1));
                                        });
                                    }
                                }

                                return this.computeFindOperatorExpression(parameterValue, aliasPath, parameters);
                            } else {
                                this.expressionMap.nativeParameters[parameterName] = parameterValue;
                                parameterIndex++;
                                const parameter = this.connection.driver.createParameter(parameterName, parameterIndex - 1);
                                return `${aliasPath} = ${parameter}`;
                            }

                        }).filter(expression => !!expression).join(" AND ");
                    }).filter(expression => !!expression).join(" AND ");
                });

            } else {
                andConditions = wheres.map((where, whereIndex) => {
                    return Object.keys(where).map((key, parameterIndex) => {
                        const parameterValue = where[key];
                        const aliasPath = this.expressionMap.aliasNamePrefixingEnabled ? `${this.alias}.${key}` : key;
                        if (parameterValue === null) {
                            return `${aliasPath} IS NULL`;

                        } else {
                            const parameterName = "where_" + whereIndex + "_" + parameterIndex;
                            this.expressionMap.nativeParameters[parameterName] = parameterValue;
                            parameterIndex++;
                            return `${aliasPath} = ${this.connection.driver.createParameter(parameterName, parameterIndex - 1)}`;
                        }
                    }).join(" AND ");
                });
            }

            if (andConditions.length > 1)
                return andConditions.map(where => "(" + where + ")").join(" OR ");

            return andConditions.join("");
        }

        return "";
    }

    /**
     * Gets SQL needs to be inserted into final query.
     */
    protected computeFindOperatorExpression(operator: FindOperator<any>, aliasPath: string, parameters: any[]): string {
        const { driver } = this.connection;

        switch (operator.type) {
            case "not":
                if (operator.child) {
                    return `NOT(${this.computeFindOperatorExpression(operator.child, aliasPath, parameters)})`;
                } else {
                    return `${aliasPath} != ${parameters[0]}`;
                }
            case "lessThan":
                return `${aliasPath} < ${parameters[0]}`;
            case "lessThanOrEqual":
                return `${aliasPath} <= ${parameters[0]}`;
            case "moreThan":
                return `${aliasPath} > ${parameters[0]}`;
            case "moreThanOrEqual":
                return `${aliasPath} >= ${parameters[0]}`;
            case "equal":
                return `${aliasPath} = ${parameters[0]}`;
            case "ilike":
                if (driver instanceof PostgresDriver || driver instanceof CockroachDriver) {
                    return `${aliasPath} ILIKE ${parameters[0]}`;
                }

                return `UPPER(${aliasPath}) LIKE UPPER(${parameters[0]})`;
            case "like":
                return `${aliasPath} LIKE ${parameters[0]}`;
            case "between":
                return `${aliasPath} BETWEEN ${parameters[0]} AND ${parameters[1]}`;
            case "in":
                if (parameters.length === 0) {
                    return "0=1";
                }
                return `${aliasPath} IN (${parameters.join(", ")})`;
            case "any":
                return `${aliasPath} = ANY(${parameters[0]})`;
            case "isNull":
                return `${aliasPath} IS NULL`;
            case "raw":
                if (operator.getSql) {
                    return operator.getSql(aliasPath);
                } else {
                    return `${aliasPath} = ${operator.value}`;
                }
        }

        throw new TypeError(`Unsupported FindOperator ${FindOperator.constructor.name}`);
    }

    /**
     * Obtains or creates query runner used to execute sql queries inside this query builder.
     */
    protected obtainQueryRunner() {
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        if (this.data) ObjectUtils.assign(queryRunner.data, this.data);
        return queryRunner;
    }

}
