export type TypedEntitySchemaOneToManyRelationOptions = {

    /**
     * Relation type.
     */
    relation: "one-to-many"

    /**
     * Inverse side of the relationship.
     * Must point to many-to-one relation property from related entity.
     */
    inverse: string

    /**
     * Indicates if this is a children relation in the tree tables.
     */
    treeChildren?: boolean

};
