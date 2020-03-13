import {DeferrableType} from "../../metadata/types/DeferrableType";
import {OnDeleteType} from "../../metadata/types/OnDeleteType";
import {OnUpdateType} from "../../metadata/types/OnUpdateType";

/**
 * Describes all relation's options.
 */
export interface RelationOptions {

    /**
     * Sets cascades options for the given relation.
     * If set to true then it means that related object can be allowed to be inserted or updated in the database.
     * You can separately restrict cascades to insertion or updation using following syntax:
     *
     * cascade: ["insert", "update", "remove", "soft-remove", "recover"] // include or exclude one of them
     */
    cascade?: boolean|("insert"|"update"|"remove"|"soft-remove"|"recover")[];

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

    /**
     * Set this relation to be lazy. Note: lazy relations are promises. When you call them they return promise
     * which resolve relation result then. If your property's type is Promise then this relation is set to lazy automatically.
     */
    lazy?: boolean;

    /**
     * Set this relation to be eager.
     * Eager relations are always loaded automatically when relation's owner entity is loaded using find* methods.
     * Only using QueryBuilder prevents loading eager relations.
     * Eager flag cannot be set from both sides of relation - you can eager load only one side of the relationship.
     */
    eager?: boolean;

    /**
     * Indicates if persistence is enabled for the relation.
     * By default its enabled, but if you want to avoid any changes in the relation to be reflected in the database you can disable it.
     * If its disabled you can only change a relation from inverse side of a relation or using relation query builder functionality.
     * This is useful for performance optimization since its disabling avoid multiple extra queries during entity save.
     */
    persistence?: boolean;

}
