import {ObjectLiteral} from "../common/ObjectLiteral";
import {QueryRunner} from "../query-runner/QueryRunner";
import {Connection} from "../connection/Connection";
import {QueryExpressionMap} from "./QueryExpressionMap";
import {SelectQueryBuilder} from "./SelectQueryBuilder";
import {UpdateQueryBuilder} from "./UpdateQueryBuilder";
import {DeleteQueryBuilder} from "./DeleteQueryBuilder";
import {InsertQueryBuilder} from "./InsertQueryBuilder";
import {RelationQueryBuilder} from "./RelationQueryBuilder";
import {ObjectType} from "../common/ObjectType";
import {Alias} from "./Alias";
import {Brackets} from "./Brackets";
import {QueryPartialEntity} from "./QueryPartialEntity";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {SqlServerConnectionOptions} from "../driver/sqlserver/SqlServerConnectionOptions";
import {PostgresDriver} from "../driver/postgres/PostgresDriver";
import {PostgresConnectionOptions} from "../driver/postgres/PostgresConnectionOptions";
import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {WhereExpression} from "./WhereExpression";
import {EntityMetadataUtils} from "../metadata/EntityMetadataUtils";

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
    // Protected properties
    // -------------------------------------------------------------------------

    /**
     * Connection on which QueryBuilder was created.
     */
    protected connection: Connection;

    /**
     * Query runner used to execute query builder query.
     */
    protected queryRunner?: QueryRunner;

    /**
     * Contains all properties of the QueryBuilder that needs to be build a final query.
     */
    protected expressionMap: QueryExpressionMap;

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
        if (selection instanceof Array) {
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
    update(updateSet: QueryPartialEntity<Entity>): UpdateQueryBuilder<Entity>;

    /**
     * Creates UPDATE query for the given entity and applies given update values.
     */
    update<T>(entity: ObjectType<T>, updateSet?: QueryPartialEntity<T>): UpdateQueryBuilder<T>;

    /**
     * Creates UPDATE query for the given entity and applies given update values.
     */
    update(entity: Function|string, updateSet?: QueryPartialEntity<Entity>): UpdateQueryBuilder<Entity>;

    /**
     * Creates UPDATE query for the given table name and applies given update values.
     */
    update(tableName: string, updateSet?: QueryPartialEntity<Entity>): UpdateQueryBuilder<Entity>;

    /**
     * Creates UPDATE query and applies given update values.
     */
    update(entityOrTableNameUpdateSet?: string|Function|ObjectLiteral, maybeUpdateSet?: ObjectLiteral): UpdateQueryBuilder<any> {
        const updateSet = maybeUpdateSet ? maybeUpdateSet : entityOrTableNameUpdateSet as ObjectLiteral|undefined;

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

    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation(propertyPath: string): RelationQueryBuilder<Entity>;

    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation<T>(entityTarget: ObjectType<T>|string, propertyPath: string): RelationQueryBuilder<T>;

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
     */
    hasRelation<T>(target: ObjectType<T>|string, relation: string): boolean;

    /**
     * Checks if given relations exist in the entity.
     * Returns true if relation exists, false otherwise.
     */
    hasRelation<T>(target: ObjectType<T>|string, relation: string[]): boolean;

    /**
     * Checks if given relation or relations exist in the entity.
     * Returns true if relation exists, false otherwise.
     */
    hasRelation<T>(target: ObjectType<T>|string, relation: string|string[]): boolean {
        const entityMetadata = this.connection.getMetadata(target);
        const relations = relation instanceof Array ? relation : [relation];
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

        // set parent query builder parameters as well in sub-query mode
        if (this.expressionMap.parentQueryBuilder)
            this.expressionMap.parentQueryBuilder.setParameters(parameters);

        Object.keys(parameters).forEach(key => {
            this.expressionMap.parameters[key] = parameters[key];
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
     * Gets generated sql that will be executed.
     * Parameters in the query are escaped for the currently used driver.
     */
    getSql(): string {
        return this.connection.driver.escapeQueryWithParameters(this.getQuery(), this.getParameters())[0];
    }

    /**
     * Prints sql to stdout using console.log.
     */
    printSql(): this {
        console.log(this.getSql());
        return this;
    }

    /**
     * Gets query to be executed with all parameters used in it.
     */
    getQueryAndParameters(): [string, any[]] {
        return this.connection.driver.escapeQueryWithParameters(this.getQuery(), this.getParameters());
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
    setQueryRunner(queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Gets escaped table name with schema name if SqlServer driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    protected getTableName(tableName: string): string {
        let tablePath = tableName;
        const driver = this.connection.driver;
        const schema = (driver.options as SqlServerConnectionOptions|PostgresConnectionOptions).schema;
        const metadata = this.connection.hasMetadata(tableName) ? this.connection.getMetadata(tableName) : undefined;

        if (driver instanceof SqlServerDriver || driver instanceof PostgresDriver || driver instanceof MysqlDriver) {
            if (metadata) {
                if (metadata.schema) {
                    tablePath = `${metadata.schema}.${tableName}`;
                } else if (schema) {
                    tablePath = `${schema}.${tableName}`;
                }

                if (metadata.database && !(driver instanceof PostgresDriver)) {
                    if (!schema && !metadata.schema && driver instanceof SqlServerDriver) {
                        tablePath = `${metadata.database}..${tablePath}`;
                    } else {
                        tablePath = `${metadata.database}.${tablePath}`;
                    }
                }

            } else if (schema) {
                tablePath = `${schema!}.${tableName}`;
            }
        }
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
            return this.expressionMap.mainAlias.metadata.tableName;

        return this.expressionMap.mainAlias.tableName!;
    }

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    protected createFromAlias(entityTarget: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), aliasName?: string): Alias {

        // if table has a metadata then find it to properly escape its properties
        // const metadata = this.connection.entityMetadatas.find(metadata => metadata.tableName === tableName);
        if (this.connection.hasMetadata(entityTarget)) {
            const metadata = this.connection.getMetadata(entityTarget);

            return this.expressionMap.createAlias({
                type: "from",
                name: aliasName,
                metadata: this.connection.getMetadata(entityTarget),
                tableName: metadata.tableName
            });

        } else {
            let subQuery: string = "";
            if (entityTarget instanceof Function) {
                const subQueryBuilder: SelectQueryBuilder<any> = (entityTarget as any)(((this as any) as SelectQueryBuilder<any>).subQuery());
                this.setParameters(subQueryBuilder.getParameters());
                subQuery = subQueryBuilder.getQuery();

            } else {
                subQuery = entityTarget;
            }
            const isSubQuery = entityTarget instanceof Function || entityTarget.substr(0, 1) === "(" && entityTarget.substr(-1) === ")";
            return this.expressionMap.createAlias({
                type: "from",
                name: aliasName,
                tableName: isSubQuery === false ? entityTarget as string : undefined,
                subQuery: isSubQuery === true ? subQuery : undefined,
            });
        }
    }

    /**
     * Replaces all entity's propertyName to name in the given statement.
     */
    protected replacePropertyNames(statement: string) {
        this.expressionMap.aliases.forEach(alias => {
            if (!alias.hasMetadata) return;
            const replaceAliasNamePrefix = this.expressionMap.aliasNamePrefixingEnabled ? alias.name + "\\." : "";
            const replacementAliasNamePrefix = this.expressionMap.aliasNamePrefixingEnabled ? this.escape(alias.name) + "." : "";
            alias.metadata.columns.forEach(column => {
                const expression = "([ =\(]|^.{0})" + replaceAliasNamePrefix + column.propertyPath + "([ =\)\,]|.{0}$)";
                statement = statement.replace(new RegExp(expression, "gm"), "$1" + replacementAliasNamePrefix + this.escape(column.databaseName) + "$2");
                const expression2 = "([ =\(]|^.{0})" + replaceAliasNamePrefix + column.propertyName + "([ =\)\,]|.{0}$)";
                statement = statement.replace(new RegExp(expression2, "gm"), "$1" + replacementAliasNamePrefix + this.escape(column.databaseName) + "$2");
            });
            alias.metadata.relations.forEach(relation => {
                [...relation.joinColumns, ...relation.inverseJoinColumns].forEach(joinColumn => {
                    const expression = "([ =\(]|^.{0})" + replaceAliasNamePrefix + relation.propertyPath + "\\." + joinColumn.referencedColumn!.propertyPath + "([ =\)\,]|.{0}$)";
                    statement = statement.replace(new RegExp(expression, "gm"), "$1" + replacementAliasNamePrefix + this.escape(joinColumn.databaseName) + "$2"); // todo: fix relation.joinColumns[0], what if multiple columns
                });
                if (relation.joinColumns.length > 0) {
                    const expression = "([ =\(]|^.{0})" + replaceAliasNamePrefix + relation.propertyPath + "([ =\)\,]|.{0}$)";
                    statement = statement.replace(new RegExp(expression, "gm"), "$1" + replacementAliasNamePrefix + this.escape(relation.joinColumns[0].databaseName) + "$2"); // todo: fix relation.joinColumns[0], what if multiple columns
                }
            });
        });
        return statement;
    }

    /**
     * Creates "WHERE" expression.
     */
    protected createWhereExpression() {
        const conditions = this.createWhereExpressionString();

        if (this.expressionMap.mainAlias!.hasMetadata) {
            const metadata = this.expressionMap.mainAlias!.metadata;
            if (metadata.discriminatorColumn && metadata.parentEntityMetadata) {
                const condition = `${this.replacePropertyNames(this.expressionMap.mainAlias!.name + "." + metadata.discriminatorColumn.databaseName)} IN (:discriminatorColumnValues)`;
                return ` WHERE ${ conditions.length ? "(" + conditions + ") AND" : "" } ${condition}`;
            }
        }

        if (!conditions.length) // TODO copy in to discriminator condition
            return this.expressionMap.extraAppendedAndWhereCondition ? " WHERE " + this.replacePropertyNames(this.expressionMap.extraAppendedAndWhereCondition) : "";

        if (this.expressionMap.extraAppendedAndWhereCondition)
            return " WHERE (" + conditions + ") AND " + this.replacePropertyNames(this.expressionMap.extraAppendedAndWhereCondition);

        return " WHERE " + conditions;
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
    protected createWhereIdsExpression(ids: any[]): [string, ObjectLiteral] {
        const metadata = this.expressionMap.mainAlias!.metadata;

        // create shortcuts for better readability
        const alias = this.expressionMap.aliasNamePrefixingEnabled ? this.escape(this.expressionMap.mainAlias!.name) + "." : "";
        const parameters: ObjectLiteral = {};
        const whereStrings = ids.map((id, index) => {
            id = id instanceof Object ? id : metadata.createEntityIdMap(id);
            const whereSubStrings: string[] = [];
            metadata.primaryColumns.forEach((primaryColumn, secondIndex) => {
                whereSubStrings.push(alias + this.escape(primaryColumn.databaseName) + "=:id_" + index + "_" + secondIndex);

                parameters["id_" + index + "_" + secondIndex] = primaryColumn.getEntityValue(id);
            });
            metadata.parentIdColumns.forEach((parentIdColumn, secondIndex) => {
                whereSubStrings.push(alias + this.escape(parentIdColumn.databaseName) + "=:parentId_" + index + "_" + secondIndex);
                parameters["parentId_" + index + "_" + secondIndex] = parentIdColumn.getEntityValue(id);
            });
            return whereSubStrings.join(" AND ");
        });

        const whereString = whereStrings.length > 1 ? "(" + whereStrings.join(" OR ") + ")" : whereStrings[0];

        return [whereString, parameters];
    }

    /**
     * Computes given where argument - transforms to a where string all forms it can take.
     */
    protected computeWhereParameter(where: string|((qb: this) => string)|Brackets|ObjectLiteral) {
        if (typeof where === "string")
            return where;

        if (where instanceof Brackets) {
            const whereQueryBuilder = this.createQueryBuilder();
            where.whereFactory(whereQueryBuilder as any);
            const whereString = whereQueryBuilder.createWhereExpressionString();
            this.setParameters(whereQueryBuilder.getParameters());
            return whereString ? "(" + whereString + ")" : "";

        } else if (where instanceof Function) {
            return where(this);

        } else if (where instanceof Object) {
            if (this.expressionMap.mainAlias!.metadata) {
                const propertyPaths = EntityMetadataUtils.createPropertyPath(this.expressionMap.mainAlias!.metadata, where);
                propertyPaths.forEach((propertyPath, index) => {
                    const parameterValue = EntityMetadataUtils.getPropertyPathValue((where as ObjectLiteral), propertyPath);
                    const aliasPath = this.expressionMap.aliasNamePrefixingEnabled ? `${this.alias}.${propertyPath}` : propertyPath;
                    if (parameterValue === null) {
                        ((this as any) as WhereExpression).andWhere(`${aliasPath} IS NULL`);

                    } else {
                        const parameterName = "where_" + index;
                        ((this as any) as WhereExpression).andWhere(`${aliasPath}=:${parameterName}`);
                        this.setParameter(parameterName, parameterValue);
                    }
                });

            } else {
                Object.keys(where).forEach((key, index) => {
                    const parameterValue = (where as ObjectLiteral)[key];
                    const aliasPath = this.expressionMap.aliasNamePrefixingEnabled ? `${this.alias}.${key}` : key;
                    if (parameterValue === null) {
                        ((this as any) as WhereExpression).andWhere(`${aliasPath} IS NULL`);

                    } else {
                        const parameterName = "where_" + index;
                        ((this as any) as WhereExpression).andWhere(`${aliasPath}=:${parameterName}`);
                        this.setParameter(parameterName, parameterValue);
                    }
                });

            }
        }

        return "";
    }

    /**
     * Creates a query builder used to execute sql queries inside this query builder.
     */
    protected obtainQueryRunner() {
        return this.queryRunner || this.connection.createQueryRunner("master");
    }

}
