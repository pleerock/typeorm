import { UniqueOptions } from "../decorator/options/UniqueOptions";

/**
 * Arguments for UniqueMetadata class.
 */
export interface UniqueMetadataArgs {

    /**
     * Class to which index is applied.
     */
    target: Function | string;

    /**
     * Unique constraint name.
     */
    name?: string;

    /**
     * Columns combination to be unique.
     */
    columns?: ((object?: any) => (any[] | { [key: string]: number })) | string[];


    /**
     * Additional relation options.
     */
    readonly options?: UniqueOptions;

}
