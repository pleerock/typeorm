import { EntitySchema } from "./EntitySchema";

export interface EntitySchemaEmbeddedOptions {
    /**
     * Type of the class to be embedded.
     */
    type: ((type?: any) => Function | EntitySchema);

    /**
     * Indicates if this embedded is array or not.
     */
    isArray: boolean;

    /**
     * Prefix of the embedded, used instead of propertyName. If set to empty string, then prefix is not set at all.
     */
    prefix?: string | boolean;

}