/**
 * Foreign key options.
 */
export interface TableForeignKeyOptions {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Name of the table which contains this foreign key.
     */
    name?: string;

    /**
     * Column names which included by this foreign key.
     */
    columnNames: string[];

    /**
     * Database of the Table referenced in the foreign key.
     */
    referencedDatabase?: string;

    /**
     * Schema of the Table referenced in the foreign key.
     */
    referencedSchema?: string;

    /**
     * Table referenced in the foreign key.
     */
    referencedTableName: string;

    /**
     * Table path referenced in the foreign key.
     */
    referencedTablePath?: string;

    /**
     * Column names which included by this foreign key.
     */
    referencedColumnNames: string[];

    /**
     * "ON DELETE" of this foreign key, e.g. what action database should perform when
     * referenced stuff is being deleted.
     */
    onDelete?: string;

    /**
     * "ON UPDATE" of this foreign key, e.g. what action database should perform when
     * referenced stuff is being updated.
     */
    onUpdate?: string;

    /**
     * Set this foreign key constraint as "DEFERRABLE" e.g. check constraints at start
     * or at the end of a transaction
     */
    deferrable?: string;
}
