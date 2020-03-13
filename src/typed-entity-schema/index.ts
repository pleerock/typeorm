import {EntitySchema} from "..";
import {EntitySchemaOptions} from "../entity-schema/EntitySchemaOptions";

export * from "./options/TypedEntitySchemaCommonRelationOptions";
export * from "./options/TypedEntitySchemaEmbeddedOptions";
export * from "./options/TypedEntitySchemaManyToManyRelationOptions";
export * from "./options/TypedEntitySchemaManyToOneRelationOptions";
export * from "./options/TypedEntitySchemaOneToManyRelationOptions";
export * from "./options/TypedEntitySchemaOneToOneRelationOptions";
export * from "./options/TypedEntitySchemaProjection";
export * from "./typed-entity-schema-types";

/**
 * Creates a new Entity Schema.
 */
export function entity<T>(name: string | { type: T, name: string }, options: EntitySchemaOptions<T>) {
    const entityName = typeof name === "string" ? name : name.name;
    return new EntitySchema({
        name: entityName,
        ...options
    });
}
