import {TypedEntitySchemaManyToManyRelationOptions} from "./TypedEntitySchemaManyToManyRelationOptions";
import {TypedEntitySchemaOneToManyRelationOptions} from "./TypedEntitySchemaOneToManyRelationOptions";
import {TypedEntitySchemaManyToOneRelationOptions} from "./TypedEntitySchemaManyToOneRelationOptions";
import {TypedEntitySchemaOneToOneRelationOptions} from "./TypedEntitySchemaOneToOneRelationOptions";
import {EntitySchemaColumnOptions} from "../..";
import {TypedEntitySchemaEmbeddedOptions} from "./TypedEntitySchemaEmbeddedOptions";

/**
 * Type to define schema of a given entity.
 */
export type TypedEntitySchemaProjection<T> = {
    [P in keyof T]?:
        T[P] extends null ? never :
        T[P] extends undefined ? never :
        T[P] extends Array<infer I> | null | undefined ? (
            I extends null ? never :
            I extends undefined ? never :
            I extends object | undefined | null ? (
                | TypedEntitySchemaManyToManyRelationOptions
                | TypedEntitySchemaOneToManyRelationOptions
            ) :
            EntitySchemaColumnOptions
        ) :
        T[P] extends object | null | undefined ? (
            | TypedEntitySchemaManyToOneRelationOptions
            | TypedEntitySchemaOneToOneRelationOptions
            | TypedEntitySchemaEmbeddedOptions<T[P]>
        ) :
        EntitySchemaColumnOptions;
};
