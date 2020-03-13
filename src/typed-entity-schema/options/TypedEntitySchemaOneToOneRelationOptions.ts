import {TypedEntitySchemaCommonRelationOptions} from "./TypedEntitySchemaCommonRelationOptions";
import {JoinColumnOptions} from "../..";
import {OnDeleteType} from "../../metadata/types/OnDeleteType";
import {DeferrableType} from "../../metadata/types/DeferrableType";
import {OnUpdateType} from "../../metadata/types/OnUpdateType";

/**
 * Options for one-to-one relation.
 */
export type TypedEntitySchemaOneToOneRelationOptions = TypedEntitySchemaCommonRelationOptions & ({

    /**
     * Relation type.
     */
    relation: "one-to-one"

    /**
     * Indicates if relation is a join column owning side.
     * If set to true, current table will own a join column for this relation.
     */
    owner: true

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
     * Options for the join column created by this relation.
     */
    joinColumnOptions?: JoinColumnOptions

    /**
     * Default database value.
     */
    default?: any;

    /**
     * Indicates if relation column value can be nullable or not.
     */
    nullable?: boolean;

    /**
     * Database cascade action on delete.
     */
    onDelete?: OnDeleteType;

    /**
     * Database cascade action on update.
     */
    onUpdate?: OnUpdateType;

    /**
     * Indicate if foreign key constraints can be deferred.
     */
    deferrable?: DeferrableType;

} | {

    /**
     * Relation type.
     */
    relation: "one-to-one"

    /**
     * Indicates if relation is a join column owning side.
     * If set to false, this side of relation won't have a join column in current table.
     */
    owner: false

    /**
     * Inverse side of the relationship.
     * Must point to one-to-one relation property from related entity.
     */
    inverse: string

});

