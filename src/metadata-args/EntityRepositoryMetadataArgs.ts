import {EntitySchema} from "../entity-schema/EntitySchema";

/**
 * Arguments for EntityRepositoryMetadata class, helps to construct an EntityRepositoryMetadata object.
 */
export interface EntityRepositoryMetadataArgs {

    /**
     * Constructor of the custom entity repository.
     */
    readonly target: Function;

    /**
     * Entity managed by this custom repository.
     */
    readonly entity?: Function|string|EntitySchema<any>;

}
