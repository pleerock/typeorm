import {CockroachDriver} from "../driver/cockroachdb/CockroachDriver";
import {PostgresConnectionOptions} from "../driver/postgres/PostgresConnectionOptions";
import {SqliteDriver} from "../driver/sqlite/SqliteDriver";
import {SapDriver} from "../driver/sap/SapDriver";
import {SqlServerConnectionOptions} from "../driver/sqlserver/SqlServerConnectionOptions";
import {Table} from "./table/Table";
import {TableColumn} from "./table/TableColumn";
import {TableForeignKey} from "./table/TableForeignKey";
import {TableIndex} from "./table/TableIndex";
import {QueryRunner} from "../query-runner/QueryRunner";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {EntityMetadata} from "../metadata/EntityMetadata";
import {PromiseUtils} from "../util/PromiseUtils";
import {Connection} from "../connection/Connection";
import {SchemaBuilder} from "./SchemaBuilder";
import {SqlInMemory} from "../driver/SqlInMemory";
import {TableUtils} from "./util/TableUtils";
import {TableColumnOptions} from "./options/TableColumnOptions";
import {PostgresDriver} from "../driver/postgres/PostgresDriver";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {TableUnique} from "./table/TableUnique";
import {TableCheck} from "./table/TableCheck";
import {TableExclusion} from "./table/TableExclusion";
import {View} from "./view/View";
import {AuroraDataApiDriver} from "../driver/aurora-data-api/AuroraDataApiDriver";
import { ForeignKeyMetadata } from "../metadata/ForeignKeyMetadata";

/**
 * Creates complete tables schemas in the database based on the entity metadatas.
 *
 * Steps how schema is being built:
 * 1. load list of all tables with complete column and keys information from the db
 * 2. drop all (old) foreign keys that exist in the table, but does not exist in the metadata
 * 3. create new tables that does not exist in the db, but exist in the metadata
 * 4. drop all columns exist (left old) in the db table, but does not exist in the metadata
 * 5. add columns from metadata which does not exist in the table
 * 6. update all exist columns which metadata has changed
 * 7. update primary keys - update old and create new primary key from changed columns
 * 8. create foreign keys which does not exist in the table yet
 * 9. create indices which are missing in db yet, and drops indices which exist in the db, but does not exist in the metadata anymore
 */
export class RdbmsSchemaBuilder implements SchemaBuilder {

    // -------------------------------------------------------------------------
    // Protected Properties
    // -------------------------------------------------------------------------

    /**
     * Used to execute schema creation queries in a single connection.
     */
    protected queryRunner: QueryRunner;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(protected connection: Connection) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Creates complete schemas for the given entity metadatas.
     */
    async build(): Promise<void> {
        this.queryRunner = this.connection.createQueryRunner("master");

        // for sqlite we disable foreign keys constraint check,
        // because otherwise its not possible to perfrom "re-create" table on schema changes used in sqlite
        // we have to do it before START TRANSACTION because sqlite ignore PRAGMA foreign_keys in transactions
        if (this.connection.driver instanceof SqliteDriver) {
            await this.queryRunner.query("PRAGMA foreign_keys = OFF");
        }

        // CockroachDB implements asynchronous schema sync operations which can not been executed in transaction.
        // E.g. if you try to DROP column and ADD it again in the same transaction, crdb throws error.
        if (!(this.connection.driver instanceof CockroachDriver))
            await this.queryRunner.startTransaction();
        try {
            const tablePaths = this.entityToSyncMetadatas.map(metadata => metadata.tablePath);
            // TODO: typeorm_metadata table needs only for Views for now.
            //  Remove condition or add new conditions if necessary (for CHECK constraints for example).
            if (this.viewEntityToSyncMetadatas.length > 0)
                await this.createTypeormMetadataTable();
            await this.queryRunner.getTables(tablePaths);
            await this.queryRunner.getViews([]);
            await this.executeSchemaSyncOperationsInProperOrder();

            // if cache is enabled then perform cache-synchronization as well
            if (this.connection.queryResultCache)
                await this.connection.queryResultCache.synchronize(this.queryRunner);

            if (!(this.connection.driver instanceof CockroachDriver))
                await this.queryRunner.commitTransaction();

            if (this.connection.driver instanceof SqliteDriver) {
                await this.queryRunner.query("PRAGMA foreign_keys = ON");
            }

        } catch (error) {

            try { // we throw original error even if rollback thrown an error
                if (!(this.connection.driver instanceof CockroachDriver))
                    await this.queryRunner.rollbackTransaction();
            } catch (rollbackError) { }
            throw error;

        } finally {
            await this.queryRunner.release();
        }
    }

    /**
     * Returns sql queries to be executed by schema builder.
     */
    async log(): Promise<SqlInMemory> {
        this.queryRunner = this.connection.createQueryRunner("master");
        try {
            const tablePaths = this.entityToSyncMetadatas.map(metadata => metadata.tablePath);
            // TODO: typeorm_metadata table needs only for Views for now.
            //  Remove condition or add new conditions if necessary (for CHECK constraints for example).
            if (this.viewEntityToSyncMetadatas.length > 0)
                await this.createTypeormMetadataTable();
            await this.queryRunner.getTables(tablePaths);
            await this.queryRunner.getViews([]);
            this.queryRunner.enableSqlMemory();
            await this.executeSchemaSyncOperationsInProperOrder();

            // if cache is enabled then perform cache-synchronization as well
            if (this.connection.queryResultCache) // todo: check this functionality
                await this.connection.queryResultCache.synchronize(this.queryRunner);

            return this.queryRunner.getMemorySql();

        } finally {
            // its important to disable this mode despite the fact we are release query builder
            // because there exist drivers which reuse same query runner. Also its important to disable
            // sql memory after call of getMemorySql() method because last one flushes sql memory.
            this.queryRunner.disableSqlMemory();
            await this.queryRunner.release();
        }
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Returns only entities that should be synced in the database.
     */
    protected get entityToSyncMetadatas(): EntityMetadata[] {
        return this.connection.entityMetadatas.filter(metadata => metadata.synchronize && metadata.tableType !== "entity-child" && metadata.tableType !== "view");
    }

    /**
     * Returns only entities that should be synced in the database.
     */
    protected get viewEntityToSyncMetadatas(): EntityMetadata[] {
        return this.connection.entityMetadatas.filter(metadata => metadata.tableType === "view" && metadata.synchronize);
    }

    /**
     * Executes schema sync operations in a proper order.
     * Order of operations matter here.
     */
    protected async executeSchemaSyncOperationsInProperOrder(): Promise<void> {
        await this.dropOldViews();
        await this.dropOldForeignKeys();
        await this.dropOldIndices();
        await this.dropOldChecks();
        await this.dropOldExclusions();
        await this.dropCompositeUniqueConstraints();
        // await this.renameTables();
        await this.renameColumns();
        await this.createNewTables();
        await this.dropRemovedColumns();
        await this.addNewColumns();
        await this.updatePrimaryKeys();
        await this.updateExistColumns();
        await this.createNewIndices();
        await this.createNewChecks();
        await this.createNewExclusions();
        await this.createCompositeUniqueConstraints();
        await this.createForeignKeys();
        await this.createViews();
    }

    /**
     * Drops all (old) foreign keys that exist in the tables, but do not exist in the entity metadata.
     */
    protected async dropOldForeignKeys(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {

            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            // find foreign keys that exist in the schemas but does not exist in the entity metadata
            const tableForeignKeysToDrop = table.foreignKeys.filter(tableForeignKey => {
                const metadataFK = metadata.foreignKeys.find(metadataForeignKey => foreignKeysMatch(tableForeignKey, metadataForeignKey));
                return !metadataFK
                    || (metadataFK.onDelete && metadataFK.onDelete !== tableForeignKey.onDelete)
                    || (metadataFK.onUpdate && metadataFK.onUpdate !== tableForeignKey.onUpdate);
            });
            if (tableForeignKeysToDrop.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`dropping old foreign keys of ${table.name}: ${tableForeignKeysToDrop.map(dbForeignKey => dbForeignKey.name).join(", ")}`);

            // drop foreign keys from the database
            await this.queryRunner.dropForeignKeys(table, tableForeignKeysToDrop);
        });
    }

    /**
     * Rename tables
     */
    protected async renameTables(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            // const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);

        });
    }

    /**
     * Renames columns.
     * Works if only one column per table was changed.
     * Changes only column name. If something besides name was changed, these changes will be ignored.
     */
    protected async renameColumns(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            if (metadata.columns.length !== table.columns.length)
                return;

            const renamedMetadataColumns = metadata.columns.filter(column => {
                return !table.columns.find(tableColumn => {
                    return tableColumn.name === column.databaseName
                        && tableColumn.type === this.connection.driver.normalizeType(column)
                        && tableColumn.isNullable === column.isNullable
                        && tableColumn.isUnique === this.connection.driver.normalizeIsUnique(column);
                });
            });

            if (renamedMetadataColumns.length === 0 || renamedMetadataColumns.length > 1)
                return;

            const renamedTableColumns = table.columns.filter(tableColumn => {
                return !metadata.columns.find(column => {
                    return column.databaseName === tableColumn.name
                        && this.connection.driver.normalizeType(column) === tableColumn.type
                        && column.isNullable === tableColumn.isNullable
                        && this.connection.driver.normalizeIsUnique(column) === tableColumn.isUnique;
                });
            });

            if (renamedTableColumns.length === 0 || renamedTableColumns.length > 1)
                return;

            const renamedColumn = renamedTableColumns[0].clone();
            renamedColumn.name = renamedMetadataColumns[0].databaseName;

            this.connection.logger.logSchemaBuild(`renaming column "${renamedTableColumns[0].name}" in to "${renamedColumn.name}"`);
            await this.queryRunner.renameColumn(table, renamedTableColumns[0], renamedColumn);
        });
    }

    protected async dropOldIndices(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const dropQueries = table.indices
                .filter(tableIndex => {
                    const indexMetadata = metadata.indices.find(index => index.name === tableIndex.name);
                    if (indexMetadata) {
                        if (indexMetadata.synchronize === false)
                            return false;

                        if (indexMetadata.isUnique !== tableIndex.isUnique)
                            return true;

                        if (indexMetadata.isSpatial !== tableIndex.isSpatial)
                            return true;

                        if (indexMetadata.isFulltext !== tableIndex.isFulltext)
                            return true;

                        if (indexMetadata.columns.length !== tableIndex.columnNames.length)
                            return true;

                        return !indexMetadata.columns.every(column => tableIndex.columnNames.indexOf(column.databaseName) !== -1);
                    }

                    return true;
                })
                .map(async tableIndex => {
                    this.connection.logger.logSchemaBuild(`dropping an index: "${tableIndex.name}" from table ${table.name}`);
                    await this.queryRunner.dropIndex(table, tableIndex);
                });

            await Promise.all(dropQueries);
        });
    }

    protected async dropOldChecks(): Promise<void> {
        // Mysql does not support check constraints
        if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver)
            return;

        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const oldChecks = table.checks.filter(tableCheck => {
                return !metadata.checks.find(checkMetadata => checkMetadata.name === tableCheck.name);
            });

            if (oldChecks.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`dropping old check constraint: ${oldChecks.map(check => `"${check.name}"`).join(", ")} from table "${table.name}"`);
            await this.queryRunner.dropCheckConstraints(table, oldChecks);
        });
    }

    protected async dropCompositeUniqueConstraints(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const compositeUniques = table.uniques.filter(tableUnique => {
                return tableUnique.columnNames.length > 1 && !metadata.uniques.find(uniqueMetadata => uniqueMetadata.name === tableUnique.name);
            });

            if (compositeUniques.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`dropping old unique constraint: ${compositeUniques.map(unique => `"${unique.name}"`).join(", ")} from table "${table.name}"`);
            await this.queryRunner.dropUniqueConstraints(table, compositeUniques);
        });
    }

    protected async dropOldExclusions(): Promise<void> {
        // Only PostgreSQL supports exclusion constraints
        if (!(this.connection.driver instanceof PostgresDriver))
            return;

        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const oldExclusions = table.exclusions.filter(tableExclusion => {
                return !metadata.exclusions.find(exclusionMetadata => exclusionMetadata.name === tableExclusion.name);
            });

            if (oldExclusions.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`dropping old exclusion constraint: ${oldExclusions.map(exclusion => `"${exclusion.name}"`).join(", ")} from table "${table.name}"`);
            await this.queryRunner.dropExclusionConstraints(table, oldExclusions);
        });
    }

    /**
     * Creates tables that do not exist in the database yet.
     * New tables are created without foreign and primary keys.
     * Primary key only can be created in conclusion with auto generated column.
     */
    protected async createNewTables(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            // check if table does not exist yet
            const existTable = this.queryRunner.loadedTables.find(table => {
                const database = metadata.database && metadata.database !== this.connection.driver.database ? metadata.database : undefined;
                const schema = metadata.schema || (<SqlServerDriver|PostgresDriver|SapDriver>this.connection.driver).options.schema;
                const fullTableName = this.connection.driver.buildTableName(metadata.tableName, schema, database);

                return table.name === fullTableName;
            });
            if (existTable)
                return;

            this.connection.logger.logSchemaBuild(`creating a new table: ${metadata.tablePath}`);

            // create a new table and sync it in the database
            const table = Table.create(metadata, this.connection.driver);
            await this.queryRunner.createTable(table, false, false);
            this.queryRunner.loadedTables.push(table);
        });
    }

    protected async createViews(): Promise<void> {
        await PromiseUtils.runInSequence(this.viewEntityToSyncMetadatas, async metadata => {
            // check if view does not exist yet
            const existView = this.queryRunner.loadedViews.find(view => {
                const database = metadata.database && metadata.database !== this.connection.driver.database ? metadata.database : undefined;
                const schema = metadata.schema || (<SqlServerDriver|PostgresDriver>this.connection.driver).options.schema;
                const fullViewName = this.connection.driver.buildTableName(metadata.tableName, schema, database);
                const viewExpression = typeof view.expression === "string" ? view.expression.trim() : view.expression(this.connection).getQuery();
                const metadataExpression = typeof metadata.expression === "string" ? metadata.expression.trim() : metadata.expression!(this.connection).getQuery();
                return view.name === fullViewName && viewExpression === metadataExpression;
            });
            if (existView)
                return;

            this.connection.logger.logSchemaBuild(`creating a new view: ${metadata.tablePath}`);

            // create a new view and sync it in the database
            const view = View.create(metadata, this.connection.driver);
            await this.queryRunner.createView(view);
            this.queryRunner.loadedViews.push(view);
        });
    }

    protected async dropOldViews(): Promise<void> {
        await PromiseUtils.runInSequence(this.queryRunner.loadedViews, async view => {
            const existViewMetadata = this.viewEntityToSyncMetadatas.find(metadata => {
                const database = metadata.database && metadata.database !== this.connection.driver.database ? metadata.database : undefined;
                const schema = metadata.schema || (<SqlServerDriver|PostgresDriver>this.connection.driver).options.schema;
                const fullViewName = this.connection.driver.buildTableName(metadata.tableName, schema, database);
                const viewExpression = typeof view.expression === "string" ? view.expression.trim() : view.expression(this.connection).getQuery();
                const metadataExpression = typeof metadata.expression === "string" ? metadata.expression.trim() : metadata.expression!(this.connection).getQuery();
                return view.name === fullViewName && viewExpression === metadataExpression;
            });

            if (existViewMetadata)
                return;

            this.connection.logger.logSchemaBuild(`dropping an old view: ${view.name}`);

            // drop an old view
            await this.queryRunner.dropView(view);
            this.queryRunner.loadedViews.splice(this.queryRunner.loadedViews.indexOf(view), 1);
        });
    }

    /**
     * Drops all columns that exist in the table, but does not exist in the metadata (left old).
     * We drop their keys too, since it should be safe.
     */
    protected async dropRemovedColumns(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table) return;

            // find columns that exist in the database but does not exist in the metadata
            const droppedTableColumns = table.columns.filter(tableColumn => {
                return !metadata.columns.find(columnMetadata => columnMetadata.databaseName === tableColumn.name);
            });
            if (droppedTableColumns.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`columns dropped in ${table.name}: ` + droppedTableColumns.map(column => column.name).join(", "));

            // drop columns from the database
            await this.queryRunner.dropColumns(table, droppedTableColumns);
        });
    }

    /**
     * Adds columns from metadata which does not exist in the table.
     * Columns are created without keys.
     */
    protected async addNewColumns(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            // find which columns are new
            const newColumnMetadatas = metadata.columns.filter(columnMetadata => {
                return !table.columns.find(tableColumn => tableColumn.name === columnMetadata.databaseName);
            });
            if (newColumnMetadatas.length === 0)
                return;

            // create columns in the database
            const newTableColumnOptions = this.metadataColumnsToTableColumnOptions(newColumnMetadatas);
            const newTableColumns = newTableColumnOptions.map(option => new TableColumn(option));

            if (newTableColumns.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`new columns added: ` + newColumnMetadatas.map(column => column.databaseName).join(", "));
            await this.queryRunner.addColumns(table, newTableColumns);
        });
    }

    /**
     * Updates composite primary keys.
     */
    protected async updatePrimaryKeys(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const primaryMetadataColumns = metadata.columns.filter(column => column.isPrimary);
            const primaryTableColumns = table.columns.filter(column => column.isPrimary);
            if (primaryTableColumns.length !== primaryMetadataColumns.length && primaryMetadataColumns.length > 1) {
                const changedPrimaryColumns = primaryMetadataColumns.map(primaryMetadataColumn => {
                    return new TableColumn(TableUtils.createTableColumnOptions(primaryMetadataColumn, this.connection.driver));
                });
                await this.queryRunner.updatePrimaryKeys(table, changedPrimaryColumns);
            }
        });
    }

    /**
     * Update all exist columns which metadata has changed.
     * Still don't create keys. Also we don't touch foreign keys of the changed columns.
     */
    protected async updateExistColumns(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const changedColumns = this.connection.driver.findChangedColumns(table.columns, metadata.columns);
            if (changedColumns.length === 0)
                return;

            // drop all foreign keys that point to this column
            await PromiseUtils.runInSequence(changedColumns, changedColumn => this.dropColumnReferencedForeignKeys(metadata.tablePath, changedColumn.databaseName));

            // drop all composite indices related to this column
            await PromiseUtils.runInSequence(changedColumns, changedColumn => this.dropColumnCompositeIndices(metadata.tablePath, changedColumn.databaseName));

            // drop all composite uniques related to this column
            // Mysql does not support unique constraints.
            if (!(this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver)) {
                await PromiseUtils.runInSequence(changedColumns, changedColumn => this.dropColumnCompositeUniques(metadata.tablePath, changedColumn.databaseName));
            }

            // generate a map of new/old columns
            const newAndOldTableColumns = changedColumns.map(changedColumn => {
                const oldTableColumn = table.columns.find(column => column.name === changedColumn.databaseName)!;
                const newTableColumnOptions = TableUtils.createTableColumnOptions(changedColumn, this.connection.driver);
                const newTableColumn = new TableColumn(newTableColumnOptions);

                return {
                    oldColumn: oldTableColumn,
                    newColumn: newTableColumn
                };
            });

            if (newAndOldTableColumns.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`columns changed in "${table.name}". updating: ` + changedColumns.map(column => column.databaseName).join(", "));
            await this.queryRunner.changeColumns(table, newAndOldTableColumns);
        });
    }

    /**
     * Creates composite indices which are missing in db yet.
     */
    protected async createNewIndices(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const newIndices = metadata.indices
                .filter(indexMetadata => !table.indices.find(tableIndex => tableIndex.name === indexMetadata.name) && indexMetadata.synchronize === true)
                .map(indexMetadata => TableIndex.create(indexMetadata));

            if (newIndices.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`adding new indices ${newIndices.map(index => `"${index.name}"`).join(", ")} in table "${table.name}"`);
            await this.queryRunner.createIndices(table, newIndices);
        });
    }

    protected async createNewChecks(): Promise<void> {
        // Mysql does not support check constraints
        if (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver)
            return;

        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const newChecks = metadata.checks
                .filter(checkMetadata => !table.checks.find(tableCheck => tableCheck.name === checkMetadata.name))
                .map(checkMetadata => TableCheck.create(checkMetadata));

            if (newChecks.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`adding new check constraints: ${newChecks.map(index => `"${index.name}"`).join(", ")} in table "${table.name}"`);
            await this.queryRunner.createCheckConstraints(table, newChecks);
        });
    }

    /**
     * Creates composite uniques which are missing in db yet.
     */
    protected async createCompositeUniqueConstraints(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const compositeUniques = metadata.uniques
                .filter(uniqueMetadata => uniqueMetadata.columns.length > 1 && !table.uniques.find(tableUnique => tableUnique.name === uniqueMetadata.name))
                .map(uniqueMetadata => TableUnique.create(uniqueMetadata));

            if (compositeUniques.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`adding new unique constraints: ${compositeUniques.map(unique => `"${unique.name}"`).join(", ")} in table "${table.name}"`);
            await this.queryRunner.createUniqueConstraints(table, compositeUniques);
        });
    }

    /**
     * Creates exclusions which are missing in db yet.
     */
    protected async createNewExclusions(): Promise<void> {
        // Only PostgreSQL supports exclusion constraints
        if (!(this.connection.driver instanceof PostgresDriver))
            return;

        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const newExclusions = metadata.exclusions
            .filter(exclusionMetadata => !table.exclusions.find(tableExclusion => tableExclusion.name === exclusionMetadata.name))
            .map(exclusionMetadata => TableExclusion.create(exclusionMetadata));

            if (newExclusions.length === 0)
                return;

            this.connection.logger.logSchemaBuild(`adding new exclusion constraints: ${newExclusions.map(exclusion => `"${exclusion.name}"`).join(", ")} in table "${table.name}"`);
            await this.queryRunner.createExclusionConstraints(table, newExclusions);
        });
    }

    /**
     * Creates foreign keys which does not exist in the table yet.
     */
    protected async createForeignKeys(): Promise<void> {
        await PromiseUtils.runInSequence(this.entityToSyncMetadatas, async metadata => {
            const table = this.queryRunner.loadedTables.find(table => table.name === metadata.tablePath);
            if (!table)
                return;

            const newKeys = metadata.foreignKeys.filter(foreignKey => {
                return !table.foreignKeys.find(dbForeignKey => foreignKeysMatch(dbForeignKey, foreignKey));
            });
            if (newKeys.length === 0)
                return;

            const dbForeignKeys = newKeys.map(foreignKeyMetadata => TableForeignKey.create(foreignKeyMetadata));
            this.connection.logger.logSchemaBuild(`creating a foreign keys: ${newKeys.map(key => key.name).join(", ")} on table "${table.name}"`);
            await this.queryRunner.createForeignKeys(table, dbForeignKeys);
        });
    }

    /**
     * Drops all foreign keys where given column of the given table is being used.
     */
    protected async dropColumnReferencedForeignKeys(tablePath: string, columnName: string): Promise<void> {
        const table = this.queryRunner.loadedTables.find(table => table.name === tablePath);
        if (!table)
            return;

        const tablesWithFK: Table[] = [];
        const columnForeignKey = table.foreignKeys.find(foreignKey => foreignKey.columnNames.indexOf(columnName) !== -1);
        if (columnForeignKey) {
            const clonedTable = table.clone();
            clonedTable.foreignKeys = [columnForeignKey];
            tablesWithFK.push(clonedTable);
            table.removeForeignKey(columnForeignKey);
        }

        this.queryRunner.loadedTables.forEach(loadedTable => {
            const dependForeignKeys = loadedTable.foreignKeys.filter(foreignKey => {
                return foreignKey.referencedTableName === tablePath && foreignKey.referencedColumnNames.indexOf(columnName) !== -1;
            });

            if (dependForeignKeys.length > 0) {
                const clonedTable = loadedTable.clone();
                clonedTable.foreignKeys = dependForeignKeys;
                tablesWithFK.push(clonedTable);
                dependForeignKeys.forEach(dependForeignKey => loadedTable.removeForeignKey(dependForeignKey));
            }
        });

        if (tablesWithFK.length > 0) {
            await PromiseUtils.runInSequence(tablesWithFK, tableWithFK => {
                this.connection.logger.logSchemaBuild(`dropping related foreign keys of ${tableWithFK.name}: ${tableWithFK.foreignKeys.map(foreignKey => foreignKey.name).join(", ")}`);
                return this.queryRunner.dropForeignKeys(tableWithFK, tableWithFK.foreignKeys);
            });
        }
    }

    /**
     * Drops all composite indices, related to given column.
     */
    protected async dropColumnCompositeIndices(tablePath: string, columnName: string): Promise<void> {
        const table = this.queryRunner.loadedTables.find(table => table.name === tablePath);
        if (!table)
            return;

        const relatedIndices = table.indices.filter(index => index.columnNames.length > 1 && index.columnNames.indexOf(columnName) !== -1);
        if (relatedIndices.length === 0)
            return;

        this.connection.logger.logSchemaBuild(`dropping related indices of "${tablePath}"."${columnName}": ${relatedIndices.map(index => index.name).join(", ")}`);
        await this.queryRunner.dropIndices(table, relatedIndices);
    }

    /**
     * Drops all composite uniques, related to given column.
     */
    protected async dropColumnCompositeUniques(tablePath: string, columnName: string): Promise<void> {
        const table = this.queryRunner.loadedTables.find(table => table.name === tablePath);
        if (!table)
            return;

        const relatedUniques = table.uniques.filter(unique => unique.columnNames.length > 1 && unique.columnNames.indexOf(columnName) !== -1);
        if (relatedUniques.length === 0)
            return;

        this.connection.logger.logSchemaBuild(`dropping related unique constraints of "${tablePath}"."${columnName}": ${relatedUniques.map(unique => unique.name).join(", ")}`);
        await this.queryRunner.dropUniqueConstraints(table, relatedUniques);
    }

    /**
     * Creates new columns from the given column metadatas.
     */
    protected metadataColumnsToTableColumnOptions(columns: ColumnMetadata[]): TableColumnOptions[] {
        return columns.map(columnMetadata => TableUtils.createTableColumnOptions(columnMetadata, this.connection.driver));
    }

    /**
     * Creates typeorm service table for storing user defined Views.
     */
    protected async createTypeormMetadataTable() {
        const options = <SqlServerConnectionOptions|PostgresConnectionOptions>this.connection.driver.options;
        const typeormMetadataTable = this.connection.driver.buildTableName("typeorm_metadata", options.schema, options.database);

        await this.queryRunner.createTable(new Table(
            {
                name: typeormMetadataTable,
                columns: [
                    {
                        name: "type",
                        type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.metadataType}),
                        isNullable: false
                    },
                    {
                        name: "database",
                        type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.metadataDatabase}),
                        isNullable: true
                    },
                    {
                        name: "schema",
                        type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.metadataSchema}),
                        isNullable: true
                    },
                    {
                        name: "table",
                        type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.metadataTable}),
                        isNullable: true
                    },
                    {
                        name: "name",
                        type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.metadataName}),
                        isNullable: true
                    },
                    {
                        name: "value",
                        type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.metadataValue}),
                        isNullable: true
                    },
                ]
            },
        ), true);
    }

}

function foreignKeysMatch(
    tableForeignKey: TableForeignKey, metadataForeignKey: ForeignKeyMetadata
): boolean {
    return (tableForeignKey.name === metadataForeignKey.name)
        && (tableForeignKey.referencedTableName === metadataForeignKey.referencedTablePath);
}
