export interface InsertOptions {
    /**
     * Flag to determine whether the entity that is being persisted
     * should be reloaded during the persistence operation.
     *
     * Enabled by default.
     */
    reload?: boolean;
}
