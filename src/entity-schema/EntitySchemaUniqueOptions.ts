import { UniqueOptions } from "../decorator/options/UniqueOptions";

export interface EntitySchemaUniqueOptions {

    /**
     * Unique constraint name.
     */
    name?: string;

    /**
     * Unique column names.
     */
    columns?: ((object?: any) => (any[] | { [key: string]: number })) | string[];

    /**
     * Additional relation options.
     */
    readonly options?: UniqueOptions;

}