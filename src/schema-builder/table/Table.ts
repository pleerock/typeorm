import {TableColumn} from "./TableColumn";
import {TableIndex} from "./TableIndex";
import {TableForeignKey} from "./TableForeignKey";
import {Driver} from "../../driver/Driver";
import {TableOptions} from "../options/TableOptions";
import {EntityMetadata} from "../../metadata/EntityMetadata";
import {TableUtils} from "../util/TableUtils";
import {TableUnique} from "./TableUnique";
import {TableCheck} from "./TableCheck";
import {TableExclusion} from "./TableExclusion";

/**
 * Table in the database represented in this class.
 */
export class Table {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Contains database name, schema name and table name.
     * E.g. "myDB"."mySchema"."myTable"
     */
    name: string;

    /**
     * Table columns.
     */
    columns: TableColumn[] = [];

    /**
     * Table indices.
     */
    indices: TableIndex[] = [];

    /**
     * Table foreign keys.
     */
    foreignKeys: TableForeignKey[] = [];

    /**
     * Table unique constraints.
     */
    uniques: TableUnique[] = [];

    /**
     * Table check constraints.
     */
    checks: TableCheck[] = [];

    /**
     * Table exclusion constraints.
     */
    exclusions: TableExclusion[] = [];

    /**
     * Indicates if table was just created.
     * This is needed, for example to check if we need to skip primary keys creation
     * for new tables.
     */
    justCreated: boolean = false;

    /**
     * Table engine.
     */
    engine?: string;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(options?: TableOptions) {
        if (options) {
            this.name = options.name;

            if (options.columns)
                this.columns = options.columns.map(column => new TableColumn(column));

            if (options.indices)
                this.indices = options.indices.map(index => new TableIndex(index));

            if (options.foreignKeys)
                this.foreignKeys = options.foreignKeys.map(foreignKey => new TableForeignKey(foreignKey));

            if (options.uniques)
                this.uniques = options.uniques.map(unique => new TableUnique(unique));

            if (options.checks)
                this.checks = options.checks.map(check => new TableCheck(check));

            if (options.exclusions)
                this.exclusions = options.exclusions.map(exclusion => new TableExclusion(exclusion));

            if (options.justCreated !== undefined)
                this.justCreated = options.justCreated;

            this.engine = options.engine;
        }
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    get primaryColumns(): TableColumn[] {
        return this.columns.filter(column => column.isPrimary);
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Clones this table to a new table with all properties cloned.
     */
    clone(): Table {
        return new Table(<TableOptions>{
            name: this.name,
            columns: this.columns.map(column => column.clone()),
            indices: this.indices.map(constraint => constraint.clone()),
            foreignKeys: this.foreignKeys.map(constraint => constraint.clone()),
            uniques: this.uniques.map(constraint => constraint.clone()),
            checks: this.checks.map(constraint => constraint.clone()),
            exclusions: this.exclusions.map(constraint => constraint.clone()),
            justCreated: this.justCreated,
            engine: this.engine,
        });
    }

    /**
     * Add column and creates its constraints.
     */
    addColumn(column: TableColumn): void {
        this.columns.push(column);
    }

    /**
     * Remove column and its constraints.
     */
    removeColumn(column: TableColumn): void {
        const foundColumn = this.columns.find(c => c.name === column.name);
        if (foundColumn)
            this.columns.splice(this.columns.indexOf(foundColumn), 1);
    }

    /**
     * Adds unique constraint.
     */
    addUniqueConstraint(uniqueConstraint: TableUnique): void {
        this.uniques.push(uniqueConstraint);
        if (uniqueConstraint.columnNames.length === 1) {
            const uniqueColumn = this.columns.find(column => column.name === uniqueConstraint.columnNames[0]);
            if (uniqueColumn)
                uniqueColumn.isUnique = true;
        }
    }

    /**
     * Removes unique constraint.
     */
    removeUniqueConstraint(removedUnique: TableUnique): void {
        const foundUnique = this.uniques.find(unique => unique.name === removedUnique.name);
        if (foundUnique) {
            this.uniques.splice(this.uniques.indexOf(foundUnique), 1);
            if (foundUnique.columnNames.length === 1) {
                const uniqueColumn = this.columns.find(column => column.name === foundUnique.columnNames[0]);
                if (uniqueColumn)
                    uniqueColumn.isUnique = false;
            }
        }
    }

    /**
     * Adds check constraint.
     */
    addCheckConstraint(checkConstraint: TableCheck): void {
        this.checks.push(checkConstraint);
    }

    /**
     * Removes check constraint.
     */
    removeCheckConstraint(removedCheck: TableCheck): void {
        const foundCheck = this.checks.find(check => check.name === removedCheck.name);
        if (foundCheck) {
            this.checks.splice(this.checks.indexOf(foundCheck), 1);
        }
    }

    /**
     * Adds exclusion constraint.
     */
    addExclusionConstraint(exclusionConstraint: TableExclusion): void {
        this.exclusions.push(exclusionConstraint);
    }

    /**
     * Removes exclusion constraint.
     */
    removeExclusionConstraint(removedExclusion: TableExclusion): void {
        const foundExclusion = this.exclusions.find(exclusion => exclusion.name === removedExclusion.name);
        if (foundExclusion) {
            this.exclusions.splice(this.exclusions.indexOf(foundExclusion), 1);
        }
    }

    /**
     * Adds foreign keys.
     */
    addForeignKey(foreignKey: TableForeignKey): void {
        this.foreignKeys.push(foreignKey);
    }

    /**
     * Removes foreign key.
     */
    removeForeignKey(removedForeignKey: TableForeignKey): void {
        const fk = this.foreignKeys.find(foreignKey => foreignKey.name === removedForeignKey.name);
        if (fk)
            this.foreignKeys.splice(this.foreignKeys.indexOf(fk), 1);
    }

    /**
     * Adds index.
     */
    addIndex(index: TableIndex, isMysql: boolean = false): void {
        this.indices.push(index);

        // in Mysql unique indices and unique constraints are the same thing
        // if index is unique and have only one column, we mark this column as unique
        if (index.columnNames.length === 1 && index.isUnique && isMysql) {
            const column = this.columns.find(c => c.name === index.columnNames[0]);
            if (column)
                column.isUnique = true;
        }
    }

    /**
     * Removes index.
     */
    removeIndex(tableIndex: TableIndex, isMysql: boolean = false): void {
        const index = this.indices.find(index => index.name === tableIndex.name);
        if (index) {
            this.indices.splice(this.indices.indexOf(index), 1);

            // in Mysql unique indices and unique constraints are the same thing
            // if index is unique and have only one column, we move `unique` attribute from its column
            if (index.columnNames.length === 1 && index.isUnique && isMysql) {
                const column = this.columns.find(c => c.name === index.columnNames[0]);
                if (column)
                    column.isUnique = this.indices.some(ind => ind.columnNames.length === 1 && ind.columnNames[0] === column.name && !!index.isUnique);
            }
        }
    }

    findColumnByName(name: string): TableColumn|undefined {
        return this.columns.find(column => column.name === name);
    }

    /**
     * Returns all column indices.
     */
    findColumnIndices(column: TableColumn): TableIndex[] {
        return this.indices.filter(index => {
           return !!index.columnNames.find(columnName => columnName === column.name);
        });
    }

    /**
     * Returns all column foreign keys.
     */
    findColumnForeignKeys(column: TableColumn): TableForeignKey[] {
        return this.foreignKeys.filter(foreignKey => {
            return !!foreignKey.columnNames.find(columnName => columnName === column.name);
        });
    }

    /**
     * Returns all column uniques.
     */
    findColumnUniques(column: TableColumn): TableUnique[] {
        return this.uniques.filter(unique => {
            return !!unique.columnNames.find(columnName => columnName === column.name);
        });
    }

    /**
     * Returns all column checks.
     */
    findColumnChecks(column: TableColumn): TableCheck[] {
        return this.checks.filter(check => {
            return !!check.columnNames!.find(columnName => columnName === column.name);
        });
    }

    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------

    /**
     * Creates table from a given entity metadata.
     */
    static create(entityMetadata: EntityMetadata, driver: Driver): Table {
        const options: TableOptions = {
            name: driver.buildTableName(entityMetadata.tableName, entityMetadata.schema, entityMetadata.database),
            engine: entityMetadata.engine,
            columns: entityMetadata.columns
                .filter(column => column)
                .map(column => TableUtils.createTableColumnOptions(column, driver)),
            indices: entityMetadata.indices
                .filter(index => index.synchronize === true)
                .map(index => TableIndex.create(index, driver)),
            uniques: entityMetadata.uniques.map(unique => TableUnique.create(unique)),
            checks: entityMetadata.checks.map(check => TableCheck.create(check)),
            exclusions: entityMetadata.exclusions.map(exclusion => TableExclusion.create(exclusion)),
        };

        return new Table(options);
    }

}
