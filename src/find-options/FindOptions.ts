import {FindOperator} from "./FindOperator";

/**
 * Value of order by in find options.
 */
export type FindOptionsOrderByValue = "ASC" | "DESC" | "asc" | "desc" | 1 | -1 | {
    direction?: "asc"|"desc"|"ASC"|"DESC";
    nulls?: "first"|"last"|"FIRST"|"LAST";
};

/**
 * Order by find options.
 */
export type FindOptionsOrder<E> = {
    [P in keyof E]?:
        E[P] extends (infer R)[] ? FindOptionsOrder<R> :
        E[P] extends Promise<infer R> ? FindOptionsOrder<R> :
        E[P] extends object ? FindOptionsOrder<E[P]> :
        FindOptionsOrderByValue;
};

/**
 * Filters and lefts only object-type properties from the object.
 * Used in relations find options.
 */
export type FindOptionsRelationKeyName<E> = {
    [K in keyof E]:
        E[K] extends object ? K :
        E[K] extends object|null ? K :
        E[K] extends object|undefined ? K :
        never
}[keyof E];

/**
 * Flattens array type in the object.
 * Used in relations find options.
 */
export type FindOptionsRelationKey<E> = {
    [P in keyof E]?:
        E[P] extends (infer R)[] ? FindOptionsRelation<R> | boolean :
        E[P] extends Promise<infer R> ? FindOptionsRelation<R> | boolean :
        FindOptionsRelation<E[P]> | boolean;
};

/**
 * Relations find options.
 */
export type FindOptionsRelation<E> = FindOptionsRelationKeyName<E>[]|FindOptionsRelationKey<Pick<E, FindOptionsRelationKeyName<E>>>;

/**
 * Select find options.
 */
export type FindOptionsSelect<E> = (keyof E)[]|{
    [P in keyof E]?:
        E[P] extends (infer R)[] ? FindOptionsSelect<R> | boolean :
        E[P] extends Promise<infer R> ? FindOptionsSelect<R> | boolean :
        E[P] extends object ? FindOptionsSelect<E[P]> | boolean :
        boolean;
};

/**
 * "where" in find options.
 */
export type FindOptionsWhereCondition<E> = {
    [P in keyof E]?:
        E[P] extends (infer R)[] ? FindOptionsWhere<R> | boolean | FindOperator<number> | FindAltOperator<number> :
        E[P] extends Promise<infer R> ? FindOptionsWhere<R> | boolean :
        E[P] extends Object ? FindOperator<E[P]> | FindAltOperator<E[P]> | FindOptionsWhere<E[P]> | boolean :
        FindOperator<E[P]> | FindAltOperator<E[P]> | E[P]
};

/**
 * "where" in find options.
 * Includes "array where" as well.
 */
export type FindOptionsWhere<E> = FindOptionsWhereCondition<E>|FindOptionsWhereCondition<E>[];

/**
 * Alternative FindOperator syntax.
 */
export type FindAltOperator<T> = {
    $any: T[] | FindAltOperator<T>
} | {
    $between: [T, T]
} | {
    $equal: T | FindAltOperator<T>
} | {
    $iLike: T | FindAltOperator<T>
} | {
    $in: T[] | FindAltOperator<T>
} | {
    $lessThan: T | FindAltOperator<T>
} |  {
    $like: T | FindAltOperator<T>
} | {
    $moreThan: T | FindAltOperator<T>
} | {
    $not: T | FindAltOperator<T>
} | {
    $raw: string
};

/**
 * Extra options that can be applied to FindOptions.
 */
export type FindExtraOptions = {

    /**
     * Indicates if eager relations should be loaded or not.
     * Enabled by default.
     */
    eagerRelations?: boolean;

    /**
     * Indicates if special pagination query shall be applied to the query
     * if skip or take in conjunction with joins is used.
     * Enabled by default.
     */
    pagination?: boolean;

    /**
     * Indicates if listeners must be executed before and after the query execution.
     * Enabled by default.
     */
    listeners?: boolean;

    /**
     * Indicates if observers must be executed before and after the query execution.
     * Enabled by default.
     */
    observers?: boolean;

    /**
     * If sets to true then loads all relation ids of the entity and maps them into relation values (not relation objects).
     * If array of strings is given then loads only relation ids of the given properties.
     */
    loadRelationIds?: boolean | {
        relations?: string[];
        disableMixedMap?: boolean;
    }; // todo: extract options into separate interface, reuse

    /**
     * Indicates if soft-deleted rows should be included in entity result.
     */
    withDeleted?: boolean;

};

/**
 * Advanced caching options for FindOptions.
 */
export type FindCacheOptions = {

    /**
     * Cache identifier.
     */
    id?: any;

    /**
     * Caching time in milliseconds.
     */
    milliseconds?: number;
};


/**
 * Set of criteria and options to return entities by.
 */
export type FindOptions<E> = {

    /**
     * Specifies what columns should be selected.
     * Used for partial selections.
     */
    select?: FindOptionsSelect<E>;

    /**
     * Conditions that should be applied to match entities.
     */
    where?: FindOptionsWhere<E>;

    /**
     * Order, in which entities should be ordered.
     */
    order?: FindOptionsOrder<E>;

    /**
     * Relations that needs to be loaded in a separate SQL queries.
     * If you have lot of data returned by your query then its more efficient to load it using relations instead of joins.
     */
    relations?: FindOptionsRelation<E>;

    /**
     * Query caching options.
     * Disabled by default.
     * If set to true then caching is enabled based on global options.
     * You can also provide a number of milliseconds - caching time.
     */
    cache?: boolean | number | FindCacheOptions;

    /**
     * Extra options.
     */
    options?: FindExtraOptions;

    /**
     * Enables or disables query result caching.
     */
    lock?: { mode: "optimistic", version: number | Date } | { mode: "pessimistic_read" | "pessimistic_write" | "dirty_read" };

    /**
     * Offset (paginated) where from entities should be taken.
     */
    skip?: number;

    /**
     * Limit (paginated) - max number of entities should be taken.
     */
    take?: number;

};

/**
 * Find options which are applicable to single sql query.
 */
export type QueryFindOptions<E> =
    Pick<FindOptions<E>, "select">
    & Pick<FindOptions<E>, "where">
    & Pick<FindOptions<E>, "order">
    & Pick<FindOptions<E>, "relations">
    & Pick<FindOptions<E>, "skip">
    & Pick<FindOptions<E>, "take">
    & Pick<FindExtraOptions, "loadRelationIds">
    & Pick<FindExtraOptions, "pagination">
    & Pick<FindExtraOptions, "withDeleted">;
