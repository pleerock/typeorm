import {ForeignKeyMetadata} from "../../metadata/ForeignKeyMetadata";
import {TableForeignKeyOptions} from "../options/TableForeignKeyOptions";

/**
 * Foreign key from the database stored in this class.
 */
export class TableForeignKey {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Name of the foreign key constraint.
     */
    name?: string;

    /**
     * Column names which included by this foreign key.
     */
    columnNames: string[] = [];

    /**
     * Database of Table referenced in the foreign key.
     */
    referencedDatabase?: string;

    /**
     * Database of Table referenced in the foreign key.
     */
    referencedSchema?: string;

    /**
     * Table referenced in the foreign key.
     */
    referencedTableName: string;

    /**
     * Table referenced in the foreign key.
     */
    referencedTablePath: string;

    /**
     * Column names which included by this foreign key.
     */
    referencedColumnNames: string[] = [];

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

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(options: TableForeignKeyOptions) {
        this.name = options.name;
        this.columnNames = options.columnNames;
        this.referencedColumnNames = options.referencedColumnNames;
        this.referencedDatabase = options.referencedDatabase;
        this.referencedSchema = options.referencedSchema;
        this.referencedTableName = options.referencedTableName;
        this.referencedTablePath = options.referencedTablePath || options.referencedTableName;
        this.onDelete = options.onDelete;
        this.onUpdate = options.onUpdate;
        this.deferrable = options.deferrable;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Creates a new copy of this foreign key with exactly same properties.
     */
    clone(): TableForeignKey {
        return new TableForeignKey(<TableForeignKeyOptions>{
            name: this.name,
            columnNames: [...this.columnNames],
            referencedColumnNames: [...this.referencedColumnNames],
            referencedDatabase: this.referencedDatabase,
            referencedSchema: this.referencedSchema,
            referencedTableName: this.referencedTableName,
            referencedTablePath: this.referencedTablePath,
            onDelete: this.onDelete,
            onUpdate: this.onUpdate,
            deferrable: this.deferrable,
        });
    }

    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------

    /**
     * Creates a new table foreign key from the given foreign key metadata.
     */
    static create(metadata: ForeignKeyMetadata): TableForeignKey {
        return new TableForeignKey(<TableForeignKeyOptions>{
            name: metadata.name,
            columnNames: metadata.columnNames,
            referencedColumnNames: metadata.referencedColumnNames,
            referencedDatabase: metadata.referencedEntityMetadata.database,
            referencedSchema: metadata.referencedEntityMetadata.schema,
            referencedTableName: metadata.referencedEntityMetadata.tableName,
            referencedTablePath: metadata.referencedTablePath,
            onDelete: metadata.onDelete,
            onUpdate: metadata.onUpdate,
            deferrable: metadata.deferrable,
        });
    }

}
