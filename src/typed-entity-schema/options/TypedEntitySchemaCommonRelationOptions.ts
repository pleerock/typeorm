
/**
 * Common options all relations have.
 */
export type TypedEntitySchemaCommonRelationOptions = {

    /**
     * Specifies with what entity relation will be established.
     * Can be omitted only when this data is provided by somebody else.
     */
    with?: string

    /**
     * Indicates if this relation will be lazily loaded.
     */
    lazy?: boolean

    /**
     * Indicates if this relation will be eagerly loaded.
     */
    eager?: boolean

    /**
     * Indicates if persistence is enabled for the relation.
     * By default its enabled, but if you want to avoid any changes in the relation to be reflected in the database you can disable it.
     * If its disabled you can only change a relation from inverse side of a relation or using relation query builder functionality.
     * This is useful for performance optimization since its disabling avoid multiple extra queries during entity save.
     */
    persistence?: boolean

    /**
     * If set to true then it means that related object can be allowed to be inserted / updated / removed to the db.
     * This is option a shortcut if you would like to set cascadeInsert, cascadeUpdate and cascadeRemove to true.
     */
    cascade?: boolean|("insert"|"update"|"remove")[]

};
