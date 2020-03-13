import {TypedEntitySchemaCommonRelationOptions} from "./TypedEntitySchemaCommonRelationOptions";
import {JoinTableOptions} from "../..";
import {JoinTableMultipleColumnsOptions} from "../../decorator/options/JoinTableMultipleColumnsOptions";

/**
 * Options for many-to-many relation.
 */
export type TypedEntitySchemaManyToManyRelationOptions = TypedEntitySchemaCommonRelationOptions & ({

    /**
     * Relation type.
     */
    relation: "many-to-many"

    /**
     * Indicates if relation is a join column owning side.
     * If set to true, current table will own a join column for this relation.
     */
    owner: true

    /**
     * Inverse side of the relationship.
     * Must point to many-to-many relation property from related entity.
     */
    inverse: string

    /**
     * Join table options of this column.
     * Used when you want to configure many-to-many's generated join table.
     */
    joinTableOptions?: JoinTableOptions | JoinTableMultipleColumnsOptions

} | {

    /**
     * Relation type.
     */
    relation: "many-to-many"

    /**
     * Indicates if relation "owns" a join table.
     * In many-to-many relation relation ownership doesn't matter a lot -
     * you just need to set ownership from one of the side,
     * it affects only generated table name.
     */
    owner: false

    /**
     * Inverse side of the relationship.
     * Must point to many-to-many relation property from related entity.
     */
    inverse: string

});
