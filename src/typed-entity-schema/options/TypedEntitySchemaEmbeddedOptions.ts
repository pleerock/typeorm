import {TypedEntitySchemaProjection} from "./TypedEntitySchemaProjection";

/**
 * Options for embedded.
 */
export type TypedEntitySchemaEmbeddedOptions<T> = {

    /**
     * Indicates if this is embedded.
     */
    embedded: true

    /**
     * Prefix for this embedded to be applied to each column in the nested object.
     */
    prefix?: string

    /**
     * Projection for this embedded's properties.
     */
    projection: TypedEntitySchemaProjection<T>

};
