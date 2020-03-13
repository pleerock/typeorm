import {normalizeFindOptions} from "../find-options/FindOptionsUtils";
import {ObserverExecutor} from "../observer/ObserverExecutor";
import {QueryBuilderUtils} from "./QueryBuilderUtils";
import {SapDriver} from "../driver/sap/SapDriver";
import {RawSqlResultsToEntityTransformer} from "./transformer/RawSqlResultsToEntityTransformer";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {PessimisticLockTransactionRequiredError} from "../error/PessimisticLockTransactionRequiredError";
import {NoVersionOrUpdateDateColumnError} from "../error/NoVersionOrUpdateDateColumnError";
import {OptimisticLockVersionMismatchError} from "../error/OptimisticLockVersionMismatchError";
import {OptimisticLockCanNotBeUsedError} from "../error/OptimisticLockCanNotBeUsedError";
import {JoinAttribute} from "./JoinAttribute";
import {RelationIdAttribute} from "./relation-id/RelationIdAttribute";
import {RelationCountAttribute} from "./relation-count/RelationCountAttribute";
import {RelationIdLoader} from "./relation-id/RelationIdLoader";
import {RelationIdMetadataToAttributeTransformer} from "./relation-id/RelationIdMetadataToAttributeTransformer";
import {RelationCountLoader} from "./relation-count/RelationCountLoader";
import {RelationCountMetadataToAttributeTransformer} from "./relation-count/RelationCountMetadataToAttributeTransformer";
import {QueryBuilder} from "./QueryBuilder";
import {ReadStream} from "../platform/PlatformTools";
import {LockNotSupportedOnGivenDriverError} from "../error/LockNotSupportedOnGivenDriverError";
import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {PostgresDriver} from "../driver/postgres/PostgresDriver";
import {OracleDriver} from "../driver/oracle/OracleDriver";
import {SelectQuery} from "./SelectQuery";
import {EntityMetadata} from "../metadata/EntityMetadata";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {OrderByCondition} from "../find-options/OrderByCondition";
import {QueryExpressionMap} from "./QueryExpressionMap";
import {QueryRunner} from "../query-runner/QueryRunner";
import {WhereExpression} from "./WhereExpression";
import {Brackets} from "./Brackets";
import {AbstractSqliteDriver} from "../driver/sqlite-abstract/AbstractSqliteDriver";
import {QueryResultCacheOptions} from "../cache/QueryResultCacheOptions";
import {OffsetWithoutLimitNotSupportedError} from "../error/OffsetWithoutLimitNotSupportedError";
import {BroadcasterResult} from "../subscriber/BroadcasterResult";
import {SelectQueryBuilderOption} from "./SelectQueryBuilderOption";
import {
    FindOptions,
    FindOptionsOrder,
    FindOptionsRelation,
    FindOptionsSelect,
    FindOptionsWhere,
    QueryFindOptions
} from "../find-options/FindOptions";
import {RelationMetadata} from "../metadata/RelationMetadata";
import {FindCriteriaNotFoundError} from "../error/FindCriteriaNotFoundError";
import {FindOperator} from "../find-options/FindOperator";
import {OrmUtils} from "../util/OrmUtils";
import {ObjectUtils} from "../util/ObjectUtils";
import {DriverUtils} from "../driver/DriverUtils";
import {AuroraDataApiDriver} from "../driver/aurora-data-api/AuroraDataApiDriver";
import {ApplyValueTransformers} from "../util/ApplyValueTransformers";
import {Connection, EntityTarget} from "..";

/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
export class SelectQueryBuilder<Entity> extends QueryBuilder<Entity> implements WhereExpression {

    protected findOptions: QueryFindOptions<Entity> = {};
    protected selects: string[] = [];
    protected joins: { type: "inner"|"left", alias: string, parentAlias: string, relationMetadata: RelationMetadata, select: boolean }[] = [];
    protected conditions: string = "";
    protected orderBys: { alias: string, direction: "ASC"|"DESC", nulls?: "NULLS FIRST"|"NULLS LAST" }[] = [];
    protected relationMetadatas: RelationMetadata[] = [];

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * QueryBuilder can be initialized from given Connection and QueryRunner objects or from given other QueryBuilder.
     */
    constructor(connectionOrQueryBuilder: Connection | QueryBuilder<any>, queryRunner?: QueryRunner) {
        // TODO: Proper clone of findOptions field(deep, no as any)
        super(connectionOrQueryBuilder as any, queryRunner);
        if (connectionOrQueryBuilder instanceof QueryBuilder) {
            this.findOptions = (connectionOrQueryBuilder as  SelectQueryBuilder<Entity>).findOptions;
        }
    }


    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------

    /**
     * Gets generated sql query without parameters being replaced.
     */
    getQuery(): string {
        let sql = this.createSelectExpression();
        sql += this.createJoinExpression();
        sql += this.createWhereExpression();
        sql += this.createGroupByExpression();
        sql += this.createHavingExpression();
        sql += this.createOrderByExpression();
        sql += this.createLimitOffsetExpression();
        sql += this.createLockExpression();
        sql = sql.trim();
        if (this.expressionMap.subQuery)
            sql = "(" + sql + ")";
        return sql;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Creates a subquery - query that can be used inside other queries.
     */
    subQuery(): SelectQueryBuilder<any> {
        const qb = this.createQueryBuilder();
        qb.expressionMap.subQuery = true;
        qb.expressionMap.parentQueryBuilder = this;
        return qb;
    }

    setFindOptions(findOptions: FindOptions<Entity>) {
        const normalizedFindOptions = normalizeFindOptions(findOptions);
        this.findOptions = {
            select: normalizedFindOptions.select,
            where: normalizedFindOptions.where,
            relations: normalizedFindOptions.relations,
            order: normalizedFindOptions.order,
            skip: normalizedFindOptions.skip,
            take: normalizedFindOptions.take,
            pagination: normalizedFindOptions.options && normalizedFindOptions.options.pagination,
            loadRelationIds: normalizedFindOptions.options && normalizedFindOptions.options.loadRelationIds,
            withDeleted: normalizedFindOptions.options && normalizedFindOptions.options.withDeleted
        };
        this.applyFindOptionsOrmOptions(normalizedFindOptions);
        return this;
    }

    /**
     * Creates SELECT query.
     * Replaces all previous selections if they exist.
     */
    select(): this;

    /**
     * Creates SELECT query.
     * Replaces all previous selections if they exist.
     */
    select(selection: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, selectionAliasName?: string): this;

    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection: string, selectionAliasName?: string): this;

    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection: string[]): this;

    /**
     * Creates SELECT query based on find options.
     * Replaces all previous selections if they exist.
     */
    select(options: FindOptionsSelect<Entity>): this;

    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection?: string|string[]|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>)|FindOptionsSelect<Entity>, selectionAliasName?: string): SelectQueryBuilder<Entity> {
        this.expressionMap.queryType = "select";
        if (Array.isArray(selection)) {
            this.expressionMap.selects = (selection as string[]).map(selection => ({ selection: selection }));

        } else if (selection instanceof Function) {
            const subQueryBuilder = selection(this.subQuery());
            this.setParameters(subQueryBuilder.getParameters());
            this.expressionMap.selects.push({ selection: subQueryBuilder.getQuery(), aliasName: selectionAliasName });

        } else if (selection && typeof selection === "object") {
            this.findOptions.select = selection;

        } else if (selection) {
            this.expressionMap.selects = [{ selection: selection, aliasName: selectionAliasName }];
        }

        return this;
    }

    /**
     * Adds new selection to the SELECT query.
     */
    addSelect(selection: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, selectionAliasName?: string): this;

    /**
     * Adds new selection to the SELECT query.
     */
    addSelect(selection: string, selectionAliasName?: string): this;

    /**
     * Adds new selection to the SELECT query.
     */
    addSelect(selection: string[]): this;

    /**
     * Adds new selection to the SELECT query based on find options.
     */
    addSelect(options: FindOptionsSelect<Entity>): this;

    /**
     * Adds new selection to the SELECT query.
     */
    addSelect(selection: string|string[]|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>)|FindOptionsSelect<Entity>, selectionAliasName?: string): this {
        if (!selection)
            return this;

        if (Array.isArray(selection)) {
            this.expressionMap.selects = this.expressionMap.selects.concat((selection as string[]).map(selection => ({ selection: selection })));

        } else if (selection instanceof Function) {
            const subQueryBuilder = selection(this.subQuery());
            this.setParameters(subQueryBuilder.getParameters());
            this.expressionMap.selects.push({ selection: subQueryBuilder.getQuery(), aliasName: selectionAliasName });

        } else if (selection && typeof selection === "object") {
            this.findOptions.select = Object.assign(this.findOptions.select, selection);

        } else if (selection) {
            this.expressionMap.selects.push({ selection: selection, aliasName: selectionAliasName });
        }

        return this;
    }

    /**
     * Sets whether the selection is DISTINCT.
     */
    distinct(distinct: boolean = true): this {
        this.expressionMap.selectDistinct = distinct;
        return this;
    }

    /**
     * Sets the distinct on clause for Postgres.
     */
    distinctOn(distinctOn: string[]): this {
        this.expressionMap.selectDistinctOn = distinctOn;
        return this;
    }

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     * Removes all previously set from-s.
     */
    from<T>(entityTarget: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, aliasName: string): SelectQueryBuilder<T>;

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     * Removes all previously set from-s.
     */
    from<T>(entityTarget: EntityTarget<T>, aliasName: string): SelectQueryBuilder<T>;

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     * Removes all previously set from-s.
     */
    from<T>(entityTarget: EntityTarget<T>|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), aliasName: string): SelectQueryBuilder<T> {
        const mainAlias = this.createFromAlias(entityTarget, aliasName);
        this.expressionMap.setMainAlias(mainAlias);
        return (this as any) as SelectQueryBuilder<T>;
    }

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    addFrom<T>(entityTarget: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, aliasName: string): SelectQueryBuilder<T>;

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    addFrom<T>(entityTarget: EntityTarget<T>, aliasName: string): SelectQueryBuilder<T>;

    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    addFrom<T>(entityTarget: EntityTarget<T>|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), aliasName: string): SelectQueryBuilder<T> {
        const alias = this.createFromAlias(entityTarget, aliasName);
        if (!this.expressionMap.mainAlias)
            this.expressionMap.setMainAlias(alias);

        return (this as any) as SelectQueryBuilder<T>;
    }

    /**
     * INNER JOINs (without selection) given subquery.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoin(subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs (without selection) entity's property.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoin(property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs (without selection) given entity's table.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoin(entity: Function|string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs (without selection) given table.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoin(tableName: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs (without selection).
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoin(entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.join("INNER", entityOrProperty, alias, condition, parameters);
        return this;
    }

    /**
     * LEFT JOINs (without selection) given subquery.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoin(subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs (without selection) entity's property.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoin(property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs (without selection) entity's table.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoin(entity: Function|string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs (without selection) given table.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoin(tableName: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs (without selection).
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoin(entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.join("LEFT", entityOrProperty, alias, condition, parameters);
        return this;
    }

    /**
     * INNER JOINs given subquery and adds all selection properties to SELECT..
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndSelect(subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs entity's property and adds all selection properties to SELECT.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndSelect(property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs entity and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndSelect(entity: Function|string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs table and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndSelect(tableName: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndSelect(entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.addSelect(alias);
        this.innerJoin(entityOrProperty, alias, condition, parameters);
        return this;
    }

    /**
     * LEFT JOINs given subquery and adds all selection properties to SELECT..
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndSelect(subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs entity's property and adds all selection properties to SELECT.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndSelect(property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs entity and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndSelect(entity: Function|string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs table and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndSelect(tableName: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndSelect(entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.addSelect(alias);
        this.leftJoin(entityOrProperty, alias, condition, parameters);
        return this;
    }

    /**
     * INNER JOINs given subquery, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapMany(mapToProperty: string, subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs entity's property, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapMany(mapToProperty: string, property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs entity's table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapMany(mapToProperty: string, entity: Function|string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapMany(mapToProperty: string, tableName: string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapMany(mapToProperty: string, entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.addSelect(alias);
        this.join("INNER", entityOrProperty, alias, condition, parameters, mapToProperty, true);
        return this;
    }

    /**
     * INNER JOINs given subquery, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapOne(mapToProperty: string, subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs entity's property, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapOne(mapToProperty: string, property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs entity's table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapOne(mapToProperty: string, entity: Function|string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapOne(mapToProperty: string, tableName: string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * INNER JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapOne(mapToProperty: string, entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.addSelect(alias);
        this.join("INNER", entityOrProperty, alias, condition, parameters, mapToProperty, false);
        return this;
    }

    /**
     * LEFT JOINs given subquery, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapMany(mapToProperty: string, subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs entity's property, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapMany(mapToProperty: string, property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs entity's table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapMany(mapToProperty: string, entity: Function|string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapMany(mapToProperty: string, tableName: string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapMany(mapToProperty: string, entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.addSelect(alias);
        this.join("LEFT", entityOrProperty, alias, condition, parameters, mapToProperty, true);
        return this;
    }

    /**
     * LEFT JOINs given subquery, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapOne(mapToProperty: string, subQueryFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs entity's property, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * Given entity property should be a relation.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapOne(mapToProperty: string, property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs entity's table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapOne(mapToProperty: string, entity: Function|string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs table, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapOne(mapToProperty: string, tableName: string, alias: string, condition: string, parameters?: ObjectLiteral): this;

    /**
     * LEFT JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapOne(mapToProperty: string, entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), alias: string, condition: string = "", parameters?: ObjectLiteral): this {
        this.addSelect(alias);
        this.join("LEFT", entityOrProperty, alias, condition, parameters, mapToProperty, false);
        return this;
    }

    /**
     */
    // selectAndMap(mapToProperty: string, property: string, aliasName: string, qbFactory: ((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>)): this;

    /**
     */
    // selectAndMap(mapToProperty: string, entity: Function|string, aliasName: string, qbFactory: ((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>)): this;

    /**
     */
    // selectAndMap(mapToProperty: string, tableName: string, aliasName: string, qbFactory: ((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>)): this;

    /**
     */
    // selectAndMap(mapToProperty: string, entityOrProperty: Function|string, aliasName: string, qbFactory: ((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>)): this {
    //     const select = new SelectAttribute(this.expressionMap);
    //     select.mapToProperty = mapToProperty;
    //     select.entityOrProperty = entityOrProperty;
    //     select.aliasName = aliasName;
    //     select.qbFactory = qbFactory;
    //     return this;
    // }

    /**
     * LEFT JOINs relation id and maps it into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationIdAndMap(mapToProperty: string, relationName: string, options?: { disableMixedMap?: boolean }): this;

    /**
     * LEFT JOINs relation id and maps it into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationIdAndMap(mapToProperty: string, relationName: string, alias: string, queryBuilderFactory: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>): this;

    /**
     * LEFT JOINs relation id and maps it into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationIdAndMap(mapToProperty: string,
                         relationName: string,
                         aliasNameOrOptions?: string|{ disableMixedMap?: boolean },
                         queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>): this {

        const relationIdAttribute = new RelationIdAttribute(this.expressionMap);
        relationIdAttribute.mapToProperty = mapToProperty;
        relationIdAttribute.relationName = relationName;
        if (typeof aliasNameOrOptions === "string")
            relationIdAttribute.alias = aliasNameOrOptions;
        if (aliasNameOrOptions instanceof Object && (aliasNameOrOptions as any).disableMixedMap)
            relationIdAttribute.disableMixedMap = true;

        relationIdAttribute.queryBuilderFactory = queryBuilderFactory;
        this.expressionMap.relationIdAttributes.push(relationIdAttribute);

        if (relationIdAttribute.relation.junctionEntityMetadata) {
            this.expressionMap.createAlias({
                type: "other",
                name: relationIdAttribute.junctionAlias,
                metadata: relationIdAttribute.relation.junctionEntityMetadata
            });
        }
        return this;
    }

    /**
     * Counts number of entities of entity's relation and maps the value into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationCountAndMap(mapToProperty: string, relationName: string, aliasName?: string, queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>): this {
        const relationCountAttribute = new RelationCountAttribute(this.expressionMap);
        relationCountAttribute.mapToProperty = mapToProperty;
        relationCountAttribute.relationName = relationName;
        relationCountAttribute.alias = aliasName;
        relationCountAttribute.queryBuilderFactory = queryBuilderFactory;
        this.expressionMap.relationCountAttributes.push(relationCountAttribute);

        this.expressionMap.createAlias({
            type: "other",
            name: relationCountAttribute.junctionAlias
        });
        if (relationCountAttribute.relation.junctionEntityMetadata) {
            this.expressionMap.createAlias({
                type: "other",
                name: relationCountAttribute.junctionAlias,
                metadata: relationCountAttribute.relation.junctionEntityMetadata
            });
        }
        return this;
    }

    /**
     * Loads all relation ids for all relations of the selected entity.
     * All relation ids will be mapped to relation property themself.
     * If array of strings is given then loads only relation ids of the given properties.
     */
    loadAllRelationIds(options?: { relations?: string[], disableMixedMap?: boolean }): this { // todo: add skip relations
        this.expressionMap.mainAlias!.metadata.relations.forEach(relation => {
            if (options !== undefined && options.relations !== undefined && options.relations.indexOf(relation.propertyPath) === -1)
                return;

            this.loadRelationIdAndMap(
                this.expressionMap.mainAlias!.name + "." + relation.propertyPath,
                this.expressionMap.mainAlias!.name + "." + relation.propertyPath,
                options
            );
        });
        return this;
    }

    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(where: Brackets|string|((qb: this) => string)|FindOptionsWhere<Entity>, parameters?: ObjectLiteral): this {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions

        if (where && typeof where === "object" && !(where instanceof Brackets)) {
            this.findOptions.where = where;

        } else {
            const condition = this.computeWhereParameter(where);
            if (condition)
                this.expressionMap.wheres = [{ type: "simple", condition: condition }];
        }

        if (parameters)
            this.setParameters(parameters);

        return this;
    }

    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andWhere(where: string|Brackets|((qb: this) => string), parameters?: ObjectLiteral): this {

        this.expressionMap.wheres.push({ type: "and", condition: this.computeWhereParameter(where) });

        if (parameters)
            this.setParameters(parameters);

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
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    whereInIds(ids: any|any[]): this {
        return this.where(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new AND WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    andWhereInIds(ids: any|any[]): this {
        return this.andWhere(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new OR WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    orWhereInIds(ids: any|any[]): this {
        return this.orWhere(this.createWhereIdsExpression(ids));
    }

    /**
     * Sets HAVING condition in the query builder.
     * If you had previously HAVING expression defined,
     * calling this function will override previously set HAVING conditions.
     * Additionally you can add parameters used in where expression.
     */
    having(having: string, parameters?: ObjectLiteral): this {
        this.expressionMap.havings.push({ type: "simple", condition: having });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new AND HAVING condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andHaving(having: string, parameters?: ObjectLiteral): this {
        this.expressionMap.havings.push({ type: "and", condition: having });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new OR HAVING condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orHaving(having: string, parameters?: ObjectLiteral): this {
        this.expressionMap.havings.push({ type: "or", condition: having });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Sets GROUP BY condition in the query builder.
     * If you had previously GROUP BY expression defined,
     * calling this function will override previously set GROUP BY conditions.
     */
    groupBy(): this;

    /**
     * Sets GROUP BY condition in the query builder.
     * If you had previously GROUP BY expression defined,
     * calling this function will override previously set GROUP BY conditions.
     */
    groupBy(groupBy: string): this;

    /**
     * Sets GROUP BY condition in the query builder.
     * If you had previously GROUP BY expression defined,
     * calling this function will override previously set GROUP BY conditions.
     */
    groupBy(groupBy?: string): this {
        if (groupBy) {
            this.expressionMap.groupBys = [groupBy];
        } else {
            this.expressionMap.groupBys = [];
        }
        return this;
    }

    /**
     * Adds GROUP BY condition in the query builder.
     */
    addGroupBy(groupBy: string): this {
        this.expressionMap.groupBys.push(groupBy);
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
        if (order !== undefined && order !== "ASC" && order !== "DESC")
            throw new Error(`SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.`);
        if (nulls !== undefined && nulls !== "NULLS FIRST" && nulls !== "NULLS LAST")
            throw new Error(`SelectQueryBuilder.addOrderBy "nulls" can accept only "NULLS FIRST" and "NULLS LAST" values.`);

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
        if (order !== undefined && order !== "ASC" && order !== "DESC")
            throw new Error(`SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.`);
        if (nulls !== undefined && nulls !== "NULLS FIRST" && nulls !== "NULLS LAST")
            throw new Error(`SelectQueryBuilder.addOrderBy "nulls" can accept only "NULLS FIRST" and "NULLS LAST" values.`);

        if (nulls) {
            this.expressionMap.orderBys[sort] = { order, nulls };
        } else {
            this.expressionMap.orderBys[sort] = order;
        }
        return this;
    }

    /**
     * Set's LIMIT - maximum number of rows to be selected.
     * NOTE that it may not work as you expect if you are using joins.
     * If you want to implement pagination, and you are having join in your query,
     * then use instead take method instead.
     */
    limit(limit?: number): this {
        this.expressionMap.limit = this.normalizeNumber(limit);
        if (this.expressionMap.limit !== undefined && isNaN(this.expressionMap.limit))
            throw new Error(`Provided "limit" value is not a number. Please provide a numeric value.`);

        return this;
    }

    /**
     * Set's OFFSET - selection offset.
     * NOTE that it may not work as you expect if you are using joins.
     * If you want to implement pagination, and you are having join in your query,
     * then use instead skip method instead.
     */
    offset(offset?: number): this {
        this.expressionMap.offset = this.normalizeNumber(offset);
        if (this.expressionMap.offset !== undefined && isNaN(this.expressionMap.offset))
            throw new Error(`Provided "offset" value is not a number. Please provide a numeric value.`);

        return this;
    }

    /**
     * Sets maximal number of entities to take.
     */
    take(take?: number): this {
        this.expressionMap.take = this.normalizeNumber(take);
        if (this.expressionMap.take !== undefined && isNaN(this.expressionMap.take))
            throw new Error(`Provided "take" value is not a number. Please provide a numeric value.`);

        return this;
    }

    /**
     * Sets number of entities to skip.
     */
    skip(skip?: number): this {
        this.expressionMap.skip = this.normalizeNumber(skip);
        if (this.expressionMap.skip !== undefined && isNaN(this.expressionMap.skip))
            throw new Error(`Provided "skip" value is not a number. Please provide a numeric value.`);

        return this;
    }

    /**
     * Sets locking mode.
     */
    setLock(lockMode: "optimistic", lockVersion: number | Date): this;

    /**
     * Sets locking mode.
     */
    setLock(lockMode: "pessimistic_read"|"pessimistic_write"|"dirty_read"): this;

    /**
     * Sets locking mode.
     */
    setLock(lockMode: "optimistic"|"pessimistic_read"|"pessimistic_write"|"dirty_read", lockVersion?: number|Date): this {
        this.expressionMap.lockMode = lockMode;
        this.expressionMap.lockVersion = lockVersion;
        return this;

    }

    /**
     * Disables the global condition of "non-deleted" for the entity with delete date columns.
     */
    withDeleted(): this {
        this.expressionMap.withDeleted = true;
        return this;
    }

    /**
     * Gets first raw result returned by execution of generated query builder sql.
     */
    async getRawOne<T = any>(): Promise<T> {
        return (await this.getRawMany())[0];
    }

    /**
     * Gets all raw results returned by execution of generated query builder sql.
     */
    async getRawMany<T = any>(): Promise<T[]> {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError();

        this.expressionMap.queryEntity = false;
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs: boolean = false;
        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.applyFindOptions();

            const results = await this.loadRawResults(queryRunner);

            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
                if (this.expressionMap.callObservers)
                    await new ObserverExecutor(this.connection.observers).execute();
            }

            return results;

        } catch (error) {

            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }
            throw error;

        } finally {
            if (queryRunner !== this.queryRunner) { // means we created our own query runner
                await queryRunner.release();
            }
        }
    }

    /**
     * Executes sql generated by query builder and returns object with raw results and entities created from them.
     */
    async getRawAndEntities<T = any>(): Promise<{ entities: Entity[], raw: T[] }> {
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs: boolean = false;
        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            this.expressionMap.queryEntity = true;
            this.applyFindOptions();
            const results = await this.executeEntitiesAndRawResults(queryRunner);

            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
                if (this.expressionMap.callObservers)
                    await new ObserverExecutor(this.connection.observers).execute();
            }

            return results;

        } catch (error) {

            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }
            throw error;

        } finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }

    /**
     * Gets single entity returned by execution of generated query builder sql.
     */
    async getOne(): Promise<Entity|undefined> {
        const results = await this.getRawAndEntities();
        const result = results.entities[0] as any;

        if (result && this.expressionMap.lockMode === "optimistic" && this.expressionMap.lockVersion) {
            const metadata = this.expressionMap.mainAlias!.metadata;

            if (this.expressionMap.lockVersion instanceof Date) {
                const actualVersion = metadata.updateDateColumn!.getEntityValue(result); // what if columns arent set?
                if (actualVersion.getTime() !== this.expressionMap.lockVersion.getTime())
                    throw new OptimisticLockVersionMismatchError(metadata.name, this.expressionMap.lockVersion, actualVersion);

            } else {
                const actualVersion = metadata.versionColumn!.getEntityValue(result); // what if columns arent set?
                if (actualVersion !== this.expressionMap.lockVersion)
                    throw new OptimisticLockVersionMismatchError(metadata.name, this.expressionMap.lockVersion, actualVersion);
            }
        }

        return result;
    }

    /**
     * Gets entities returned by execution of generated query builder sql.
     */
    async getMany(): Promise<Entity[]> {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError();

        const results = await this.getRawAndEntities();
        return results.entities;
    }

    /**
     * Gets count - number of entities selected by sql generated by this query builder.
     * Count excludes all limitations set by setFirstResult and setMaxResults methods call.
     */
    async getCount(): Promise<number> {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError();

        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs: boolean = false;
        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            this.expressionMap.queryEntity = false;
            this.applyFindOptions();
            const results = await this.executeCountQuery(queryRunner);

            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
                if (this.expressionMap.callObservers)
                    await new ObserverExecutor(this.connection.observers).execute();
            }

            return results;

        } catch (error) {

            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }
            throw error;

        } finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }

    /**
     * Executes built SQL query and returns entities and overall entities count (without limitation).
     * This method is useful to build pagination.
     */
    async getManyAndCount(): Promise<[Entity[], number]> {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError();

        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs: boolean = false;
        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            this.applyFindOptions();
            this.expressionMap.queryEntity = true;
            const entitiesAndRaw = await this.executeEntitiesAndRawResults(queryRunner);
            this.expressionMap.queryEntity = false;
            const count = await this.executeCountQuery(queryRunner);
            const results: [Entity[], number] = [entitiesAndRaw.entities, count];

            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
                if (this.expressionMap.callObservers)
                    await new ObserverExecutor(this.connection.observers).execute();
            }

            return results;

        } catch (error) {

            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }
            throw error;

        } finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }

    /**
     * Executes built SQL query and returns raw data stream.
     */
    async stream(): Promise<ReadStream> {
        this.expressionMap.queryEntity = false;
        const [sql, parameters] = this.getQueryAndParameters();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs: boolean = false;
        try {

            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            const releaseFn = () => {
                if (queryRunner !== this.queryRunner) // means we created our own query runner
                    return queryRunner.release();
                return;
            };
            const results = queryRunner.stream(sql, parameters, releaseFn, releaseFn);

            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
                if (this.expressionMap.callObservers)
                    await new ObserverExecutor(this.connection.observers).execute();
            }

            return results;

        } catch (error) {

            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }
            throw error;

        } finally {
            if (queryRunner !== this.queryRunner) // means we created our own query runner
                await queryRunner.release();
        }
    }

    /**
     * Enables or disables query result caching.
     */
    cache(enabled: boolean): this;

    /**
     * Enables query result caching and sets in milliseconds in which cache will expire.
     * If not set then global caching time will be used.
     */
    cache(milliseconds: number): this;

    /**
     * Enables query result caching and sets cache id and milliseconds in which cache will expire.
     */
    cache(id: any, milliseconds?: number): this;

    /**
     * Enables or disables query result caching.
     */
    cache(enabledOrMillisecondsOrId: boolean|number|string, maybeMilliseconds?: number): this {

        if (typeof enabledOrMillisecondsOrId === "boolean") {
            this.expressionMap.cache = enabledOrMillisecondsOrId;

        } else if (typeof enabledOrMillisecondsOrId === "number") {
            this.expressionMap.cache = true;
            this.expressionMap.cacheDuration = enabledOrMillisecondsOrId;

        } else if (typeof enabledOrMillisecondsOrId === "string" || typeof enabledOrMillisecondsOrId === "number") {
            this.expressionMap.cache = true;
            this.expressionMap.cacheId = enabledOrMillisecondsOrId;
        }

        if (maybeMilliseconds) {
            this.expressionMap.cacheDuration = maybeMilliseconds;
        }

        return this;
    }

    /**
     * Sets extra options that can be used to configure how query builder works.
     */
    setOption(option: SelectQueryBuilderOption): this {
        this.expressionMap.options.push(option);
        return this;
    }

    /**
     * Disables eager relations.
     */
    disableEagerRelations(disabled: boolean = true) {
        this.expressionMap.eagerRelations = disabled === true ? false : true;
        return this;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    protected join(direction: "INNER"|"LEFT",
                   entityOrProperty: Function|string|((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>),
                   aliasName: string,
                   condition?: string,
                   parameters?: ObjectLiteral,
                   mapToProperty?: string,
                   isMappingMany?: boolean): void {

        this.setParameters(parameters || {});

        const joinAttribute = new JoinAttribute(this.connection, this.expressionMap);
        joinAttribute.direction = direction;
        joinAttribute.mapToProperty = mapToProperty;
        joinAttribute.isMappingMany = isMappingMany;
        joinAttribute.entityOrProperty = entityOrProperty; // relationName
        joinAttribute.condition = condition; // joinInverseSideCondition
        // joinAttribute.junctionAlias = joinAttribute.relation.isOwning ? parentAlias + "_" + destinationTableAlias : destinationTableAlias + "_" + parentAlias;
        this.expressionMap.joinAttributes.push(joinAttribute);

        if (joinAttribute.metadata) {

            // todo: find and set metadata right there?
            joinAttribute.alias = this.expressionMap.createAlias({
                type: "join",
                name: aliasName,
                metadata: joinAttribute.metadata
            });
            if (joinAttribute.relation && joinAttribute.relation.junctionEntityMetadata) {
                this.expressionMap.createAlias({
                    type: "join",
                    name: joinAttribute.junctionAlias,
                    metadata: joinAttribute.relation.junctionEntityMetadata
                });
            }

        } else {
            let subQuery: string = "";
            if (entityOrProperty instanceof Function) {
                const subQueryBuilder: SelectQueryBuilder<any> = (entityOrProperty as any)(((this as any) as SelectQueryBuilder<any>).subQuery());
                this.setParameters(subQueryBuilder.getParameters());
                subQuery = subQueryBuilder.getQuery();

            } else {
                subQuery = entityOrProperty;
            }
            const isSubQuery = entityOrProperty instanceof Function || entityOrProperty.substr(0, 1) === "(" && entityOrProperty.substr(-1) === ")";
            joinAttribute.alias = this.expressionMap.createAlias({
                type: "join",
                name: aliasName,
                tablePath: isSubQuery === false ? entityOrProperty as string : undefined,
                subQuery: isSubQuery === true ? subQuery : undefined,
            });
        }
    }

    /**
     * Creates "SELECT FROM" part of SQL query.
     */
    protected createSelectExpression() {

        if (!this.expressionMap.mainAlias)
            throw new Error("Cannot build query because main alias is not set (call qb#from method)");

        // todo throw exception if selects or from is missing

        const allSelects: SelectQuery[] = [];
        const excludedSelects: SelectQuery[] = [];

        if (this.expressionMap.mainAlias.hasMetadata) {
            const metadata = this.expressionMap.mainAlias.metadata;
            allSelects.push(...this.buildEscapedEntityColumnSelects(this.expressionMap.mainAlias.name, metadata));
            excludedSelects.push(...this.findEntityColumnSelects(this.expressionMap.mainAlias.name, metadata));
        }

        // add selects from joins
        this.expressionMap.joinAttributes
            .forEach(join => {
                if (join.metadata) {
                    allSelects.push(...this.buildEscapedEntityColumnSelects(join.alias.name!, join.metadata));
                    excludedSelects.push(...this.findEntityColumnSelects(join.alias.name!, join.metadata));
                } else {
                    const hasMainAlias = this.expressionMap.selects.some(select => select.selection === join.alias.name);
                    if (hasMainAlias) {
                        allSelects.push({ selection: this.escape(join.alias.name!) + ".*" });
                        const excludedSelect = this.expressionMap.selects.find(select => select.selection === join.alias.name);
                        excludedSelects.push(excludedSelect!);
                    }
                }
            });

        // add all other selects
        this.expressionMap.selects
            .filter(select => excludedSelects.indexOf(select) === -1)
            .forEach(select => allSelects.push({ selection: this.replacePropertyNames(select.selection), aliasName: select.aliasName }));

        // if still selection is empty, then simply set it to all (*)
        if (allSelects.length === 0)
            allSelects.push({ selection: "*" });

        let lock: string = "";
        if (this.connection.driver instanceof SqlServerDriver) {
            switch (this.expressionMap.lockMode) {
                case "pessimistic_read":
                    lock = " WITH (HOLDLOCK, ROWLOCK)";
                    break;
                case "pessimistic_write":
                    lock = " WITH (UPDLOCK, ROWLOCK)";
                    break;
                case "dirty_read":
                    lock = " WITH (NOLOCK)";
                    break;
            }
        }

        // create a selection query
        const froms = this.expressionMap.aliases
            .filter(alias => alias.type === "from" && (alias.tablePath || alias.subQuery))
            .map(alias => {
                if (alias.subQuery)
                    return alias.subQuery + " " + this.escape(alias.name);

                return this.getTableName(alias.tablePath!) + " " + this.escape(alias.name);
            });

        const select = this.createSelectDistinctExpression();
        const selection = allSelects.map(select => select.selection + (select.aliasName ? " AS " + this.escape(select.aliasName) : "")).join(", ");

        return select + selection + " FROM " + froms.join(", ") + lock;
    }

    /**
     * Creates select | select distinct part of SQL query.
     */
    protected createSelectDistinctExpression(): string {
        const {selectDistinct, selectDistinctOn} = this.expressionMap;
        const {driver} = this.connection;

        let select = "SELECT ";
        if (driver instanceof PostgresDriver && selectDistinctOn.length > 0) {
            const selectDistinctOnMap = selectDistinctOn.map(
              (on) => this.replacePropertyNames(on)
            ).join(", ");

            select = `SELECT DISTINCT ON (${selectDistinctOnMap}) `;
        } else if (selectDistinct) {
            select = "SELECT DISTINCT ";
        }

        return select;
    }

    /**
     * Creates "JOIN" part of SQL query.
     */
    protected createJoinExpression(): string {

        // examples:
        // select from owning side
        // qb.select("post")
        //     .leftJoinAndSelect("post.category", "category");
        // select from non-owning side
        // qb.select("category")
        //     .leftJoinAndSelect("category.post", "post");

        const joins = this.expressionMap.joinAttributes.map(joinAttr => {

            const relation = joinAttr.relation;
            const destinationTableName = joinAttr.tablePath;
            const destinationTableAlias = joinAttr.alias.name;
            const appendedCondition = joinAttr.condition ? " AND (" + joinAttr.condition + ")" : "";
            const parentAlias = joinAttr.parentAlias;

            // if join was build without relation (e.g. without "post.category") then it means that we have direct
            // table to join, without junction table involved. This means we simply join direct table.
            if (!parentAlias || !relation) {
                const destinationJoin = joinAttr.alias.subQuery ? joinAttr.alias.subQuery : this.getTableName(destinationTableName);
                return " " + joinAttr.direction + " JOIN " + destinationJoin + " " + this.escape(destinationTableAlias) +
                    (joinAttr.condition ? " ON " + this.replacePropertyNames(joinAttr.condition) : "");
            }

            // if real entity relation is involved
            if (relation.isManyToOne || relation.isOneToOneOwner) {

                // JOIN `category` `category` ON `category`.`id` = `post`.`categoryId`
                const condition = relation.joinColumns.map(joinColumn => {
                    return destinationTableAlias + "." + joinColumn.referencedColumn!.propertyPath + "=" +
                        parentAlias + "." + relation.propertyPath + "." + joinColumn.referencedColumn!.propertyPath;
                }).join(" AND ");

                return " " + joinAttr.direction + " JOIN " + this.getTableName(destinationTableName) + " " + this.escape(destinationTableAlias) + " ON " + this.replacePropertyNames(condition + appendedCondition);

            } else if (relation.isOneToMany || relation.isOneToOneNotOwner) {

                // JOIN `post` `post` ON `post`.`categoryId` = `category`.`id`
                const condition = relation.inverseRelation!.joinColumns.map(joinColumn => {
                    return destinationTableAlias + "." + relation.inverseRelation!.propertyPath + "." + joinColumn.referencedColumn!.propertyPath + "=" +
                        parentAlias + "." + joinColumn.referencedColumn!.propertyPath;
                }).join(" AND ");

                return " " + joinAttr.direction + " JOIN " + this.getTableName(destinationTableName) + " " + this.escape(destinationTableAlias) + " ON " + this.replacePropertyNames(condition + appendedCondition);

            } else { // means many-to-many
                const junctionTableName = relation.junctionEntityMetadata!.tablePath;

                const junctionAlias = joinAttr.junctionAlias;
                let junctionCondition = "", destinationCondition = "";

                if (relation.isOwning) {

                    junctionCondition = relation.joinColumns.map(joinColumn => {
                        // `post_category`.`postId` = `post`.`id`
                        return junctionAlias + "." + joinColumn.propertyPath + "=" + parentAlias + "." + joinColumn.referencedColumn!.propertyPath;
                    }).join(" AND ");

                    destinationCondition = relation.inverseJoinColumns.map(joinColumn => {
                        // `category`.`id` = `post_category`.`categoryId`
                        return destinationTableAlias + "." + joinColumn.referencedColumn!.propertyPath + "=" + junctionAlias + "." + joinColumn.propertyPath;
                    }).join(" AND ");

                } else {
                    junctionCondition = relation.inverseRelation!.inverseJoinColumns.map(joinColumn => {
                        // `post_category`.`categoryId` = `category`.`id`
                        return junctionAlias + "." + joinColumn.propertyPath + "=" + parentAlias + "." + joinColumn.referencedColumn!.propertyPath;
                    }).join(" AND ");

                    destinationCondition = relation.inverseRelation!.joinColumns.map(joinColumn => {
                        // `post`.`id` = `post_category`.`postId`
                        return destinationTableAlias + "." + joinColumn.referencedColumn!.propertyPath + "=" + junctionAlias + "." + joinColumn.propertyPath;
                    }).join(" AND ");
                }

                return " " + joinAttr.direction + " JOIN " + this.getTableName(junctionTableName) + " " + this.escape(junctionAlias) + " ON " + this.replacePropertyNames(junctionCondition) +
                    " " + joinAttr.direction + " JOIN " + this.getTableName(destinationTableName) + " " + this.escape(destinationTableAlias) + " ON " + this.replacePropertyNames(destinationCondition + appendedCondition);

            }
        });

        return joins.join(" ");
    }

    /**
     * Creates "GROUP BY" part of SQL query.
     */
    protected createGroupByExpression() {
        if (!this.expressionMap.groupBys || !this.expressionMap.groupBys.length) return "";
        return " GROUP BY " + this.replacePropertyNames(this.expressionMap.groupBys.join(", "));
    }

    /**
     * Creates "ORDER BY" part of SQL query.
     */
    protected createOrderByExpression() {
        const orderBys = this.expressionMap.allOrderBys;
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
     * Creates "LIMIT" and "OFFSET" parts of SQL query.
     */
    protected createLimitOffsetExpression(): string {
        // in the case if nothing is joined in the query builder we don't need to make two requests to get paginated results
        // we can use regular limit / offset, that's why we add offset and limit construction here based on skip and take values
        let offset: number|undefined = this.expressionMap.offset,
            limit: number|undefined = this.expressionMap.limit;
        if (!offset && !limit && this.expressionMap.joinAttributes.length === 0) {
            offset = this.expressionMap.skip;
            limit = this.expressionMap.take;
        }

        if (this.connection.driver instanceof SqlServerDriver) {
            // Due to a limitation in SQL Server's parser implementation it does not support using
            // OFFSET or FETCH NEXT without an ORDER BY clause being provided. In cases where the
            // user does not request one we insert a dummy ORDER BY that does nothing and should
            // have no effect on the query planner or on the order of the results returned.
            // https://dba.stackexchange.com/a/193799
            let prefix = "";
            if ((limit || offset) && Object.keys(this.expressionMap.allOrderBys).length <= 0) {
                prefix = " ORDER BY (SELECT NULL)";
            }

            if (limit && offset)
                return prefix + " OFFSET " + offset + " ROWS FETCH NEXT " + limit + " ROWS ONLY";
            if (limit)
                return prefix + " OFFSET 0 ROWS FETCH NEXT " + limit + " ROWS ONLY";
            if (offset)
                return prefix + " OFFSET " + offset + " ROWS";

        } else if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver || this.connection.driver instanceof SapDriver) {

            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                throw new OffsetWithoutLimitNotSupportedError();

        } else if (this.connection.driver instanceof AbstractSqliteDriver) {

            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                return " LIMIT -1 OFFSET " + offset;

        } else if (this.connection.driver instanceof OracleDriver) {

            if (limit && offset)
                return " OFFSET " + offset + " ROWS FETCH NEXT " + limit + " ROWS ONLY";
            if (limit)
                return " FETCH NEXT " + limit + " ROWS ONLY";
            if (offset)
                return " OFFSET " + offset + " ROWS";

        } else {
            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                return " OFFSET " + offset;
        }

        return "";
    }

    /**
     * Creates "LOCK" part of SQL query.
     */
    protected createLockExpression(): string {
        const driver = this.connection.driver;
        switch (this.expressionMap.lockMode) {
            case "pessimistic_read":
                if (driver instanceof MysqlDriver || driver instanceof AuroraDataApiDriver) {
                    return " LOCK IN SHARE MODE";

                } else if (driver instanceof PostgresDriver) {
                    return " FOR SHARE";

                } else if (driver instanceof OracleDriver) {
                    return " FOR UPDATE";

                } else if (driver instanceof SqlServerDriver) {
                    return "";

                } else {
                    throw new LockNotSupportedOnGivenDriverError();
                }
            case "pessimistic_write":
                if (driver instanceof MysqlDriver || driver instanceof AuroraDataApiDriver || driver instanceof PostgresDriver || driver instanceof OracleDriver) {
                    return " FOR UPDATE";

                } else if (driver instanceof SqlServerDriver) {
                    return "";

                } else {
                    throw new LockNotSupportedOnGivenDriverError();
                }
            default:
                return "";
        }
    }

    /**
     * Creates "HAVING" part of SQL query.
     */
    protected createHavingExpression() {
        if (!this.expressionMap.havings || !this.expressionMap.havings.length) return "";
        const conditions = this.expressionMap.havings.map((having, index) => {
            switch (having.type) {
                case "and":
                    return (index > 0 ? "AND " : "") + this.replacePropertyNames(having.condition);
                case "or":
                    return (index > 0 ? "OR " : "") + this.replacePropertyNames(having.condition);
                default:
                    return this.replacePropertyNames(having.condition);
            }
        }).join(" ");

        if (!conditions.length) return "";
        return " HAVING " + conditions;
    }

    protected buildEscapedEntityColumnSelects(aliasName: string, metadata: EntityMetadata): SelectQuery[] {
        const hasMainAlias = this.expressionMap.selects.some(select => select.selection === aliasName);

        const columns: ColumnMetadata[] = [];
        if (hasMainAlias) {
            columns.push(...metadata.columns.filter(column => column.isSelect === true));
        }
        columns.push(...metadata.columns.filter(column => {
            return this.expressionMap.selects.some(select => select.selection === aliasName + "." + column.propertyPath);
        }));

        // if user used partial selection and did not select some primary columns which are required to be selected
        // we select those primary columns and mark them as "virtual". Later virtual column values will be removed from final entity
        // to make entity contain exactly what user selected
        if (columns.length === 0) // however not in the case when nothing (even partial) was selected from this target (for example joins without selection)
            return [];

        const nonSelectedPrimaryColumns = this.expressionMap.queryEntity ? metadata.primaryColumns.filter(primaryColumn => columns.indexOf(primaryColumn) === -1) : [];
        const allColumns = [...columns, ...nonSelectedPrimaryColumns];

        return allColumns.map(column => {
            const selection = this.expressionMap.selects.find(select => select.selection === aliasName + "." + column.propertyPath);
            let selectionPath = this.escape(aliasName) + "." + this.escape(column.databaseName);
            if (this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver) {
                    const useLegacy = this.connection.driver.options.legacySpatialSupport;
                    const asText = useLegacy ? "AsText" : "ST_AsText";
                    selectionPath = `${asText}(${selectionPath})`;
                }

                if (this.connection.driver instanceof PostgresDriver)
                    // cast to JSON to trigger parsing in the driver
                    selectionPath = `ST_AsGeoJSON(${selectionPath})::json`;

                if (this.connection.driver instanceof SqlServerDriver)
                    selectionPath = `${selectionPath}.ToString()`;
            }
            return {
                selection: selectionPath,
                aliasName: selection && selection.aliasName ? selection.aliasName : DriverUtils.buildColumnAlias(this.connection.driver, aliasName, column.databaseName),
                // todo: need to keep in mind that custom selection.aliasName breaks hydrator. fix it later!
                virtual: selection ? selection.virtual === true : (hasMainAlias ? false : true),
            };
        });
    }

    protected findEntityColumnSelects(aliasName: string, metadata: EntityMetadata): SelectQuery[] {
        const mainSelect = this.expressionMap.selects.find(select => select.selection === aliasName);
        if (mainSelect)
            return [mainSelect];

        return this.expressionMap.selects.filter(select => {
            return metadata.columns.some(column => select.selection === aliasName + "." + column.propertyPath);
        });
    }

    protected applyFindOptions() {

        if (this.expressionMap.mainAlias!.hasMetadata) {

            if (this.findOptions.select)
                this.buildSelect(this.findOptions.select, this.expressionMap.mainAlias!.metadata, this.expressionMap.mainAlias!.name);

            if (this.findOptions.where)
                this.conditions = this.buildWhere(this.findOptions.where, this.expressionMap.mainAlias!.metadata, this.expressionMap.mainAlias!.name);

            if (this.findOptions.order)
                this.buildOrder(this.findOptions.order, this.expressionMap.mainAlias!.metadata, this.expressionMap.mainAlias!.name);

            if (this.findOptions.relations)
                this.buildRelations(this.findOptions.relations, this.expressionMap.mainAlias!.metadata);

            if (this.selects.length)
                this.select(this.selects);

            // apply joins
            if (this.joins.length) {
                this.joins.forEach(join => {
                    if (join.select) {
                        if (join.type === "inner") {
                            this.innerJoinAndSelect(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        } else {
                            this.leftJoinAndSelect(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        }
                    } else {
                        if (join.type === "inner") {
                            this.innerJoin(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        } else {
                            this.leftJoin(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        }
                    }
                });
            }

            if (this.conditions.length)
                this.andWhere(this.conditions.substr(0, 1) !== "(" ? "(" + this.conditions + ")" : this.conditions); // temporary and where and braces

            // apply offset
            if (this.findOptions.skip !== undefined) {
                if (this.findOptions.pagination === false) {
                    this.offset(this.findOptions.skip);
                } else {
                    this.skip(this.findOptions.skip);
                }
            }

            // apply limit
            if (this.findOptions.take !== undefined) {
                if (this.findOptions.pagination === false) {
                    this.limit(this.findOptions.take);
                } else {
                    this.take(this.findOptions.take);
                }
            }

            if (this.orderBys.length) {
                this.orderBys.forEach(orderBy => {
                    this.addOrderBy(orderBy.alias, orderBy.direction, orderBy.nulls);
                });
            }

            if (this.expressionMap.eagerRelations === true) {
                    const manuallyJoinedRelations = this.expressionMap.joinAttributes
                                                        .filter(join => join.relationPropertyPath)
                                                        .map(join => join.parentAlias + "." + join.relationPropertyPath);
                    const joinEagerRelations = (alias: string, metadata: EntityMetadata) => {
                        metadata.eagerRelations.forEach(relation => {
                            const relationAlias = this.connection.namingStrategy.eagerJoinRelationAlias(alias, relation.propertyPath);
                            const path = alias + "." + relation.propertyPath;
                            if (manuallyJoinedRelations.indexOf(path) === -1) {
                                // This alias+propertyPath was already joined manually
                                this.leftJoinAndSelect(path, relationAlias);
                            }
                            joinEagerRelations(relationAlias, relation.inverseEntityMetadata);
                        });
                    };
                    joinEagerRelations(this.expressionMap.mainAlias!.name, this.expressionMap.mainAlias!.metadata);
            }

            if (this.findOptions.loadRelationIds === true) {
                this.loadAllRelationIds();

            } else if (this.findOptions.loadRelationIds instanceof Object) {
                this.loadAllRelationIds(this.findOptions.loadRelationIds as any);
            }
        }

    }
    protected applyFindOptionsOrmOptions(findOptions: FindOptions<Entity>) {

        if (this.expressionMap.mainAlias!.metadata) {

            // apply caching options
            if (typeof findOptions.cache === "number") {
                this.cache(findOptions.cache);

            } else if (typeof findOptions.cache === "boolean") {
                this.cache(findOptions.cache);

            } else if (typeof findOptions.cache === "object") {
                this.cache(findOptions.cache.id, findOptions.cache.milliseconds);
            }

            if (findOptions.options) {

                if (findOptions.options.listeners === false)
                    this.callListeners(false);

                if (findOptions.options.observers === false)
                    this.callObservers(false);
            }
            if (findOptions.lock) {
                if (findOptions.lock.mode === "optimistic") {
                    this.setLock(findOptions.lock.mode, findOptions.lock.version);
                } else {
                    this.setLock(findOptions.lock.mode);
                }
            }

            if (findOptions.options && findOptions.options.eagerRelations !== undefined) {
                this.expressionMap.eagerRelations = findOptions.options.eagerRelations;
            }
            if (findOptions.options?.withDeleted !== undefined) {
                this.expressionMap.withDeleted = findOptions.options.withDeleted;
            }

        }

    }


    protected async executeCountQuery(queryRunner: QueryRunner): Promise<number> {

        const mainAlias = this.expressionMap.mainAlias!.name; // todo: will this work with "fromTableName"?
        const metadata = this.expressionMap.mainAlias!.metadata;

        const distinctAlias = this.escape(mainAlias);
        let countSql: string = "";
        if (metadata.hasMultiplePrimaryKeys) {
            if (this.connection.driver instanceof AbstractSqliteDriver) {
                countSql = `COUNT(DISTINCT(` + metadata.primaryColumns.map((primaryColumn, index) => {
                    const propertyName = this.escape(primaryColumn.databaseName);
                    return `${distinctAlias}.${propertyName}`;
                }).join(" || ") + ")) as \"cnt\"";

            } else {
                countSql = `COUNT(DISTINCT(CONCAT(` + metadata.primaryColumns.map((primaryColumn, index) => {
                    const propertyName = this.escape(primaryColumn.databaseName);
                    return `${distinctAlias}.${propertyName}`;
                }).join(", ") + "))) as \"cnt\"";
            }

        } else {
            countSql = `COUNT(DISTINCT(` + metadata.primaryColumns.map((primaryColumn, index) => {
                const propertyName = this.escape(primaryColumn.databaseName);
                return `${distinctAlias}.${propertyName}`;
            }).join(", ") + ")) as \"cnt\"";
        }

        const results = await this.clone()
            .orderBy()
            .groupBy()
            .offset(undefined)
            .limit(undefined)
            .skip(undefined)
            .take(undefined)
            .select(countSql)
            .setOption("disable-global-order")
            // .setFindOptions({ where: this.findOptions.where })
            .loadRawResults(queryRunner);

        if (!results || !results[0] || !results[0]["cnt"])
            return 0;

        return parseInt(results[0]["cnt"]);
    }

    /**
     * Executes sql generated by query builder and returns object with raw results and entities created from them.
     */
    protected async executeEntitiesAndRawResults(queryRunner: QueryRunner): Promise<{ entities: Entity[], raw: any[] }> {

        if (!this.expressionMap.mainAlias)
            throw new Error(`Alias is not set. Use "from" method to set an alias.`);

        const cloneQb1 = this.clone();
        const cloneQb2 = this.clone();

        if ((this.expressionMap.lockMode === "pessimistic_read" || this.expressionMap.lockMode === "pessimistic_write") && !queryRunner.isTransactionActive)
            throw new PessimisticLockTransactionRequiredError();

        if (this.expressionMap.lockMode === "optimistic") {
            const metadata = this.expressionMap.mainAlias.metadata;
            if (!metadata.versionColumn && !metadata.updateDateColumn)
                throw new NoVersionOrUpdateDateColumnError(metadata.name);
        }

        const relationIdLoader = new RelationIdLoader(this.connection, queryRunner, this.expressionMap.relationIdAttributes);
        const relationCountLoader = new RelationCountLoader(this.connection, queryRunner, this.expressionMap.relationCountAttributes);
        const relationIdMetadataTransformer = new RelationIdMetadataToAttributeTransformer(this.expressionMap);
        relationIdMetadataTransformer.transform();
        const relationCountMetadataTransformer = new RelationCountMetadataToAttributeTransformer(this.expressionMap);
        relationCountMetadataTransformer.transform();

        let rawResults: any[] = [], entities: any[] = [];

        // for pagination enabled (e.g. skip and take) its much more complicated - its a special process
        // where we make two queries to find the data we need
        // first query find ids in skip and take range
        // and second query loads the actual data in given ids range
        if ((this.expressionMap.skip || this.expressionMap.take) && this.expressionMap.joinAttributes.length > 0) {

            // we are skipping order by here because its not working in subqueries anyway
            // to make order by working we need to apply it on a distinct query
            const [selects, orderBys] = this.createOrderByCombinedWithSelectExpression("distinctAlias");
            const metadata = this.expressionMap.mainAlias.metadata;
            const mainAliasName = this.expressionMap.mainAlias.name;

            const querySelects = metadata.primaryColumns.map(primaryColumn => {
                const distinctAlias = this.escape("distinctAlias");
                const columnAlias = this.escape(DriverUtils.buildColumnAlias(this.connection.driver, mainAliasName, primaryColumn.databaseName));
                if (!orderBys[columnAlias]) // make sure we aren't overriding user-defined order in inverse direction
                    orderBys[columnAlias] = "ASC";
                return `${distinctAlias}.${columnAlias} as "ids_${DriverUtils.buildColumnAlias(this.connection.driver, mainAliasName, primaryColumn.databaseName)}"`;
            });

            const clonnedQb = cloneQb1
                // .setFindOptions({
                //     select: this.findOptions.select,
                //     relations: this.findOptions.relations,
                //     options: this.findOptions.options,
                //     where: this.findOptions.where
                // })
                .orderBy();

            rawResults = await new SelectQueryBuilder(this.connection, queryRunner)
                .select(`DISTINCT ${querySelects.join(", ")}`)
                .addSelect(selects)
                .from(`(${clonnedQb.getQuery()})`, "distinctAlias")
                .offset(this.expressionMap.skip)
                .limit(this.expressionMap.take)
                .orderBy(orderBys)
                .cache(this.expressionMap.cache ? this.expressionMap.cache : this.expressionMap.cacheId, this.expressionMap.cacheDuration)
                .setParameters(this.getParameters())
                .setNativeParameters(this.expressionMap.nativeParameters)
                .getRawMany();

            if (rawResults.length > 0) {
                let condition = "";
                const parameters: ObjectLiteral = {};
                if (metadata.hasMultiplePrimaryKeys) {
                    condition = rawResults.map((result, index) => {
                        return metadata.primaryColumns.map(primaryColumn => {
                            const paramKey = `orm_distinct_ids_${index}_${primaryColumn.databaseName}`;
                            parameters[paramKey] = result[`ids_${mainAliasName}_${primaryColumn.databaseName}`];
                            return `${mainAliasName}.${primaryColumn.propertyPath}=:${paramKey}`;
                        }).join(" AND ");
                    }).join(" OR ");
                } else {
                    const ids = rawResults.map(result => result["ids_" + DriverUtils.buildColumnAlias(this.connection.driver, mainAliasName, metadata.primaryColumns[0].databaseName)]);
                    const areAllNumbers = ids.every((id: any) => typeof id === "number");
                    if (areAllNumbers) {
                        // fixes #190. if all numbers then its safe to perform query without parameter
                        condition = `${mainAliasName}.${metadata.primaryColumns[0].propertyPath} IN (${ids.join(", ")})`;
                    } else {
                        parameters["orm_distinct_ids"] = ids;
                        condition = mainAliasName + "." + metadata.primaryColumns[0].propertyPath + " IN (:...orm_distinct_ids)";
                    }
                }
                rawResults = await cloneQb2
                    // .setFindOptions(this.findOptions)
                    .mergeExpressionMap({ extraAppendedAndWhereCondition: condition })
                    .setParameters(parameters)
                    .loadRawResults(queryRunner);
            }

        } else {
            // console.time("load raw results");
            rawResults = await this.loadRawResults(queryRunner);
            // console.timeEnd("load raw results");
        }

        if (rawResults.length > 0) {

            // transform raw results into entities
            const rawRelationIdResults = await relationIdLoader.load(rawResults);
            const rawRelationCountResults = await relationCountLoader.load(rawResults);
            const transformer = new RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, rawRelationIdResults, rawRelationCountResults, this.queryRunner);
            // console.time("transforming entities");
            entities = transformer.transform(rawResults, this.expressionMap.mainAlias!);
            // console.timeEnd("transforming entities");

            // broadcast all "after load" events
            if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias.hasMetadata) {
                const broadcastResult = new BroadcasterResult();
                queryRunner.broadcaster.broadcastLoadEventsForAll(broadcastResult, this.expressionMap.mainAlias.metadata, entities);
                if (broadcastResult.promises.length > 0) await Promise.all(broadcastResult.promises);
            }
        }

        await Promise.all(this.relationMetadatas.map(async relation => {

            const relationTarget = relation.inverseEntityMetadata.target;
            const relationAlias = relation.inverseEntityMetadata.targetName;

            const queryBuilder = this.createQueryBuilder()
                .select(relationAlias)
                .from(relationTarget, relationAlias)
                .setFindOptions({
                    select: this.findOptions.select && typeof this.findOptions.select === "object" ? OrmUtils.deepValue(this.findOptions.select, relation.propertyPath) : undefined,
                    order: this.findOptions.order ? OrmUtils.deepValue(this.findOptions.order, relation.propertyPath) : undefined,
                    relations: this.findOptions.relations && typeof this.findOptions.relations === "object" ? OrmUtils.deepValue(this.findOptions.relations, relation.propertyPath) : undefined,
                });
            if (entities.length > 0) {
                const relatedEntityGroups: any[] = await this.connection.relationIdLoader.loadManyToManyRelationIdsAndGroup(relation, entities, undefined, queryBuilder);
                entities.forEach(entity => {
                    const relatedEntityGroup = relatedEntityGroups.find(group => group.entity === entity);
                    if (relatedEntityGroup) {
                        const value = relatedEntityGroup.related === undefined ? null : relatedEntityGroup.related;
                        relation.setEntityValue(entity, value);
                    }
                });
            }
        }));

        return {
            raw: rawResults,
            entities: entities,
        };
    }

    protected createOrderByCombinedWithSelectExpression(parentAlias: string): [ string, OrderByCondition] {

        // if table has a default order then apply it
        const orderBys = this.expressionMap.allOrderBys;
        const selectString = Object.keys(orderBys)
            .map(orderCriteria => {
                if (orderCriteria.indexOf(".") !== -1) {
                    const [aliasName, propertyPath] = QueryBuilderUtils.extractAliasAndPropertyPath(orderCriteria);
                    const alias = this.expressionMap.findAliasByName(aliasName);
                    const column = alias.metadata.findColumnWithPropertyPath(propertyPath);
                    return this.escape(parentAlias) + "." + this.escape(DriverUtils.buildColumnAlias(this.connection.driver, aliasName, column!.databaseName));
                } else {
                    if (this.expressionMap.selects.find(select => select.selection === orderCriteria || select.aliasName === orderCriteria))
                        return this.escape(parentAlias) + "." + orderCriteria;

                    return "";
                }
            })
            .join(", ");

        const orderByObject: OrderByCondition = {};
        Object.keys(orderBys).forEach(orderCriteria => {
            if (orderCriteria.indexOf(".") !== -1) {
                const [aliasName, propertyPath] = QueryBuilderUtils.extractAliasAndPropertyPath(orderCriteria);
                const alias = this.expressionMap.findAliasByName(aliasName);
                const column = alias.metadata.findColumnWithPropertyPath(propertyPath);
                orderByObject[this.escape(parentAlias) + "." + this.escape(DriverUtils.buildColumnAlias(this.connection.driver, aliasName, column!.databaseName))] = orderBys[orderCriteria];
            } else {
                if (this.expressionMap.selects.find(select => select.selection === orderCriteria || select.aliasName === orderCriteria)) {
                    orderByObject[this.escape(parentAlias) + "." + orderCriteria] = orderBys[orderCriteria];
                } else {
                    orderByObject[orderCriteria] = orderBys[orderCriteria];
                }
            }
        });

        return [selectString, orderByObject];
    }

    /**
     * Loads raw results from the database.
     */
    protected async loadRawResults(queryRunner: QueryRunner) {
        const [sql, parameters] = this.getQueryAndParameters();
        const queryId = sql + " -- PARAMETERS: " + JSON.stringify(parameters);
        const cacheOptions = typeof this.connection.options.cache === "object" ? this.connection.options.cache : {};
        let savedQueryResultCacheOptions: QueryResultCacheOptions|undefined = undefined;
        if (this.connection.queryResultCache && (this.expressionMap.cache || cacheOptions.alwaysEnabled)) {
            savedQueryResultCacheOptions = await this.connection.queryResultCache.getFromCache({
                identifier: this.expressionMap.cacheId,
                query: queryId,
                duration: this.expressionMap.cacheDuration || cacheOptions.duration || 1000
            }, queryRunner);
            if (savedQueryResultCacheOptions && !this.connection.queryResultCache.isExpired(savedQueryResultCacheOptions))
                return JSON.parse(savedQueryResultCacheOptions.result);
        }

        const results = await queryRunner.query(sql, parameters);

        if (this.connection.queryResultCache && (this.expressionMap.cache || cacheOptions.alwaysEnabled)) {
            await this.connection.queryResultCache.storeInCache({
                identifier: this.expressionMap.cacheId,
                query: queryId,
                time: new Date().getTime(),
                duration: this.expressionMap.cacheDuration || cacheOptions.duration || 1000,
                result: JSON.stringify(results)
            }, savedQueryResultCacheOptions, queryRunner);
        }

        return results;
    }

    /**
     * Merges into expression map given expression map properties.
     */
    protected mergeExpressionMap(expressionMap: Partial<QueryExpressionMap>): this {
        ObjectUtils.assign(this.expressionMap, expressionMap);
        return this;
    }

    /**
     * Normalizes a give number - converts to int if possible.
     */
    protected normalizeNumber(num: any) {
        if (typeof num === "number" || num === undefined || num === null)
            return num;

        return Number(num);
    }

    /**
     * Creates a query builder used to execute sql queries inside this query builder.
     */
    protected obtainQueryRunner() {
        return this.queryRunner || this.connection.createQueryRunner("slave");
    }

    protected buildSelect(select: FindOptionsSelect<any>, metadata: EntityMetadata, alias: string, embedPrefix?: string) {

        if (select instanceof Array) {
            select.forEach(select => {
                this.selects.push(this.expressionMap.mainAlias!.name + "." + (select as string));
            });

        } else {
            for (let key in select) {
                if (select[key] === undefined)
                    continue;

                const propertyPath = embedPrefix ? embedPrefix + "." + key : key;
                const column = metadata.findColumnWithPropertyPathStrict(propertyPath);
                const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
                const relation = metadata.findRelationWithPropertyPath(propertyPath);

                if (!embed && !column && !relation)
                    throw new FindCriteriaNotFoundError(propertyPath, metadata);

                if (column) {
                    this.selects.push(alias + "." + propertyPath);

                } else if (embed) {
                    this.buildSelect(select[key] as FindOptionsOrder<any>, metadata, alias, propertyPath);

                    // } else if (relation) {
                    //     const joinAlias = alias + "_" + relation.propertyName;
                    //     const existJoin = this.joins.find(join => join.alias === joinAlias);
                    //     if (!existJoin) {
                    //         this.joins.push({
                    //             type: "left",
                    //             select: false,
                    //             alias: joinAlias,
                    //             parentAlias: alias,
                    //             relationMetadata: relation
                    //         });
                    //     }
                    //     this.buildOrder(select[key] as FindOptionsOrder<any>, relation.inverseEntityMetadata, joinAlias);
                }
            }
        }
    }

    protected buildRelations(relations: FindOptionsRelation<any>|any, metadata: EntityMetadata, embedPrefix?: string) {
        if (!relations)
            return;

        if (relations instanceof Array) {
            relations.forEach(relationName => {
                const propertyPath = embedPrefix ? embedPrefix + "." + relationName : relationName;
                const relation = metadata.findRelationWithPropertyPath(propertyPath);
                if (!relation)
                    throw new FindCriteriaNotFoundError(propertyPath, metadata);

                this.relationMetadatas.push(relation);
            });
        } else {
            Object.keys(relations).forEach(relationName => {
                const relationValue = (relations as any)[relationName];
                if (relationValue === true || relationValue instanceof Object) {
                    const propertyPath = embedPrefix ? embedPrefix + "." + relationName : relationName;
                    const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
                    const relation = metadata.findRelationWithPropertyPath(propertyPath);
                    if (!embed && !relation)
                        throw new FindCriteriaNotFoundError(propertyPath, metadata);

                    if (embed) {
                        this.buildRelations(relationValue as FindOptionsRelation<any>, metadata, propertyPath);

                    } else {
                        this.relationMetadatas.push(relation!);
                    }
                }
            });
        }
    }

    protected buildOrder(order: FindOptionsOrder<any>, metadata: EntityMetadata, alias: string, embedPrefix?: string) {
        for (let key in order) {
            if (order[key] === undefined)
                continue;

            const propertyPath = embedPrefix ? embedPrefix + "." + key : key;
            const column = metadata.findColumnWithPropertyPathStrict(propertyPath);
            const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
            const relation = metadata.findRelationWithPropertyPath(propertyPath);

            if (!embed && !column && !relation)
                throw new FindCriteriaNotFoundError(propertyPath, metadata);

            if (column) {

                let direction = order[key] instanceof Object ? (order[key] as any).direction : order[key];
                direction = direction === "DESC" || direction === "desc" || direction === -1 ? "DESC" : "ASC";
                let nulls = order[key] instanceof Object ? (order[key] as any).nulls : undefined;
                nulls = nulls === "first" ? "NULLS FIRST" : nulls === "last" ? "NULLS LAST" : undefined;

                this.orderBys.push({ alias: alias + "." + propertyPath, direction, nulls }); // `${alias}.${propertyPath} = :${paramName}`);

            } else if (embed) {
                this.buildOrder(order[key] as FindOptionsOrder<any>, metadata, alias, propertyPath);

            } else if (relation) {
                const joinAlias = alias + "_" + relation.propertyName;
                const existJoin = this.joins.find(join => join.alias === joinAlias);
                if (!existJoin) {
                    this.joins.push({
                        type: "left",
                        select: false,
                        alias: joinAlias,
                        parentAlias: alias,
                        relationMetadata: relation
                    });
                }
                this.buildOrder(order[key] as FindOptionsOrder<any>, relation.inverseEntityMetadata, joinAlias);
            }
        }
    }

    protected buildWhere(where: any, metadata: EntityMetadata, alias: string, embedPrefix?: string): string {
        let condition: string = "";
        let parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;
        if (where instanceof Array) {
            condition = ("(" + where.map(whereItem => {
                return this.buildWhere(whereItem, metadata, alias, embedPrefix);
            }).filter(condition => !!condition).map(condition => "(" + condition + ")").join(" OR ") + ")");

        } else {
            let andConditions: string[] = [];
            for (let key in where) {
                if (where[key] === undefined)
                    continue;

                const propertyPath = embedPrefix ? embedPrefix + "." + key : key;
                const column = metadata.findColumnWithPropertyPathStrict(propertyPath);
                const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
                const relation = metadata.findRelationWithPropertyPath(propertyPath);

                if (!embed && !column && !relation)
                    throw new FindCriteriaNotFoundError(propertyPath, metadata);

                if (column) {

                    const aliasPath = `${alias}.${propertyPath}`;
                    const parameterName = alias + "_" + propertyPath.split(".").join("_") + "_" + parameterIndex;
                    const parameterValue = column.transformer ? ApplyValueTransformers.transformTo(column.transformer, where[key]) : where[key];

                    if (parameterValue === null) {
                        andConditions.push(`${aliasPath} IS NULL`);

                    } else if (parameterValue instanceof FindOperator) {
                        let parameters: any[] = [];
                        if (parameterValue.useParameter) {
                            const realParameterValues: any[] = parameterValue.multipleParameters ? parameterValue.value : [parameterValue.value];
                            realParameterValues.forEach((realParameterValue, realParameterValueIndex) => {

                                // don't create parameters for number to prevent max number of variables issues as much as possible
                                if (typeof realParameterValue === "number") {
                                    parameters.push(realParameterValue);

                                } else {
                                    this.expressionMap.nativeParameters[parameterName + realParameterValueIndex] = realParameterValue;
                                    parameterIndex++;
                                    parameters.push(this.connection.driver.createParameter(parameterName + realParameterValueIndex, parameterIndex - 1));
                                }
                            });
                        }
                        andConditions.push(parameterValue.toSql(this.connection, aliasPath, parameters));

                    } else {
                        this.expressionMap.nativeParameters[parameterName] = parameterValue;
                        parameterIndex++;
                        const parameter = this.connection.driver.createParameter(parameterName, parameterIndex - 1);
                        andConditions.push(`${aliasPath} = ${parameter}`);
                    }

                    // this.conditions.push(`${alias}.${propertyPath} = :${paramName}`);
                    // this.expressionMap.parameters[paramName] = where[key]; // todo: handle functions and other edge cases

                } else if (embed) {
                    const condition = this.buildWhere(where[key], metadata, alias, propertyPath);
                    if (condition)
                        andConditions.push(condition);

                } else if (relation) {

                    // if all properties of where are undefined we don't need to join anything
                    // this can happen when user defines map with conditional queries inside
                    if (where[key] instanceof Object) {
                        const allAllUndefined = Object.keys(where[key]).every(k => where[key][k] === undefined);
                        if (allAllUndefined) {
                            continue;
                        }
                    }

                    if (where[key] instanceof FindOperator) {
                        if (where[key].type === "moreThan" || where[key].type === "lessThan") {
                            const sqlOperator = where[key].type === "moreThan" ? ">" : "<";
                            // basically relation count functionality
                            const qb: QueryBuilder<any> = this.subQuery();
                            if (relation.isManyToManyOwner) {
                                qb.select("COUNT(*)")
                                    .from(relation.joinTableName, relation.joinTableName)
                                    .where(relation.joinColumns.map(column => {
                                        return `${relation.joinTableName}.${column.propertyName} = ${alias}.${column.referencedColumn!.propertyName}`;
                                    }).join(" AND "));

                            } else if (relation.isManyToManyNotOwner) {
                                qb.select("COUNT(*)")
                                    .from(relation.inverseRelation!.joinTableName, relation.inverseRelation!.joinTableName)
                                    .where(relation.inverseRelation!.inverseJoinColumns.map(column => {
                                        return `${relation.inverseRelation!.joinTableName}.${column.propertyName} = ${alias}.${column.referencedColumn!.propertyName}`;
                                    }).join(" AND "));

                            } else if (relation.isOneToMany) {
                                qb.select("COUNT(*)")
                                    .from(relation.inverseEntityMetadata.target, relation.inverseEntityMetadata.tableName)
                                    .where(relation.inverseRelation!.joinColumns.map(column => {
                                        return `${relation.inverseEntityMetadata.tableName}.${column.propertyName} = ${alias}.${column.referencedColumn!.propertyName}`;
                                    }).join(" AND "));

                            } else {
                                throw new Error(`This relation isn't supported by given find operator`);
                            }
                            // this
                            //     .addSelect(qb.getSql(), relation.propertyAliasName + "_cnt")
                            //     .andWhere(this.escape(relation.propertyAliasName + "_cnt") + " " + sqlOperator + " " + parseInt(where[key].value));
                            this.andWhere((qb.getSql()) + " " + sqlOperator + " " + parseInt(where[key].value));
                        }

                    } else {

                        const joinAlias = alias + "_" + relation.propertyName;
                        const existJoin = this.joins.find(join => join.alias === joinAlias);
                        if (!existJoin) {
                            this.joins.push({
                                type: "inner",
                                select: false,
                                alias: joinAlias,
                                parentAlias: alias,
                                relationMetadata: relation
                            });
                        } else {
                            if (existJoin.type === "left")
                                existJoin.type = "inner";
                        }

                        const condition = this.buildWhere(where[key], relation.inverseEntityMetadata, joinAlias);
                        if (condition)
                            andConditions.push(condition);
                    }
                }
            }
            condition = andConditions.join(" AND ");
        }
        return condition;
    }

}
