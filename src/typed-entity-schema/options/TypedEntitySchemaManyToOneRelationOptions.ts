import {TypedEntitySchemaCommonRelationOptions} from "./TypedEntitySchemaCommonRelationOptions";
import {JoinColumnOptions} from "../..";
import {OnDeleteType} from "../../metadata/types/OnDeleteType";
import {DeferrableType} from "../../metadata/types/DeferrableType";
import {OnUpdateType} from "../../metadata/types/OnUpdateType";

/**
 * Options for many-to-one relation.
 */
export type TypedEntitySchemaManyToOneRelationOptions = TypedEntitySchemaCommonRelationOptions & {

    /**
     * Relation type.
     */
    relation: "many-to-one"

    /**
     * Inverse side of the relationship.
     * Must point to one-to-one relation property from related entity.
     */
    inverse?: string

    /**
     * Indicates if column in this relation will have a primary key.
     */
    primary?: boolean

    /**
     * Indicates if this is a parent relation in the tree tables.
     */
    treeParent?: boolean

    /**
     * Options for the join column created by this relation.
     */
    joinColumnOptions?: JoinColumnOptions

    /**
     * Default database value.
     */
    default?: any

    /**
     * Indicates if relation column value can be nullable or not.
     */
    nullable?: boolean

    /**
     * Database cascade action on delete.
     */
    onDelete?: OnDeleteType

    /**
     * Database cascade action on update.
     */
    onUpdate?: OnUpdateType

    /**
     * Indicate if foreign key constraints can be deferred.
     */
    deferrable?: DeferrableType

};
