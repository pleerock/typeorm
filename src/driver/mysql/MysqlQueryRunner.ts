import {QueryRunner} from "../../query-runner/QueryRunner";
import {ObjectLiteral} from "../../common/ObjectLiteral";
import {TransactionAlreadyStartedError} from "../../error/TransactionAlreadyStartedError";
import {TransactionNotStartedError} from "../../error/TransactionNotStartedError";
import {NotImplementedError} from "../../error/NotImplementedError";
import {TableColumn} from "../../schema-builder/table/TableColumn";
import {Table} from "../../schema-builder/table/Table";
import {TableForeignKey} from "../../schema-builder/table/TableForeignKey";
import {TableIndex} from "../../schema-builder/table/TableIndex";
import {QueryRunnerAlreadyReleasedError} from "../../error/QueryRunnerAlreadyReleasedError";
import {View} from "../../schema-builder/view/View";
import {Query} from "../Query";
import {MysqlDriver} from "./MysqlDriver";
import {ReadStream} from "../../platform/PlatformTools";
import {OrmUtils} from "../../util/OrmUtils";
import {QueryFailedError} from "../../error/QueryFailedError";
import {TableIndexOptions} from "../../schema-builder/options/TableIndexOptions";
import {TableUnique} from "../../schema-builder/table/TableUnique";
import {BaseQueryRunner} from "../../query-runner/BaseQueryRunner";
import {Broadcaster} from "../../subscriber/Broadcaster";
import {ColumnType, PromiseUtils} from "../../index";
import {TableCheck} from "../../schema-builder/table/TableCheck";
import {IsolationLevel} from "../types/IsolationLevel";
import {TableExclusion} from "../../schema-builder/table/TableExclusion";
import {VersionUtils} from "../../util/VersionUtils";

/**
 * Runs queries on a single mysql database connection.
 */
export class MysqlQueryRunner extends BaseQueryRunner implements QueryRunner {

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Database driver used by connection.
     */
    driver: MysqlDriver;

    // -------------------------------------------------------------------------
    // Protected Properties
    // -------------------------------------------------------------------------

    /**
     * Promise used to obtain a database connection from a pool for a first time.
     */
    protected databaseConnectionPromise: Promise<any>;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(driver: MysqlDriver, mode: "master"|"slave" = "master") {
        super();
        this.driver = driver;
        this.connection = driver.connection;
        this.broadcaster = new Broadcaster(this);
        this.mode = mode;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Creates/uses database connection from the connection pool to perform further operations.
     * Returns obtained database connection.
     */
    connect(): Promise<any> {
        if (this.databaseConnection)
            return Promise.resolve(this.databaseConnection);

        if (this.databaseConnectionPromise)
            return this.databaseConnectionPromise;

        if (this.mode === "slave" && this.driver.isReplicated) {

            this.databaseConnectionPromise = this.driver.obtainSlaveConnection().then(connection => {
                this.databaseConnection = connection;
                return this.databaseConnection;
            });

        } else { // master
            this.databaseConnectionPromise = this.driver.obtainMasterConnection().then(connection => {
                this.databaseConnection = connection;
                return this.databaseConnection;
            });
        }

        return this.databaseConnectionPromise;
    }

    /**
     * Releases used database connection.
     * You cannot use query runner methods once its released.
     */
    release(): Promise<void> {
        this.isReleased = true;
        if (this.databaseConnection)
            this.databaseConnection.release();
        return Promise.resolve();
    }

    /**
     * Starts transaction on the current connection.
     */
    async startTransaction(isolationLevel?: IsolationLevel): Promise<void> {
        if (this.isTransactionActive)
            throw new TransactionAlreadyStartedError();

        this.isTransactionActive = true;
        if (isolationLevel) {
            await this.query("SET TRANSACTION ISOLATION LEVEL " + isolationLevel);
            await this.query("START TRANSACTION");
        } else {
            await this.query("START TRANSACTION");
        }
    }

    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    async commitTransaction(): Promise<void> {
        if (!this.isTransactionActive)
            throw new TransactionNotStartedError();

        await this.query("COMMIT");
        this.isTransactionActive = false;
    }

    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     */
    async rollbackTransaction(): Promise<void> {
        if (!this.isTransactionActive)
            throw new TransactionNotStartedError();

        await this.query("ROLLBACK");
        this.isTransactionActive = false;
    }

    /**
     * Executes a raw SQL query.
     */
    query(query: string, parameters?: any[]): Promise<any> {
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError();

        return new Promise(async (ok, fail) => {
            try {
                const databaseConnection = await this.connect();
                this.driver.connection.logger.logQuery(query, parameters, this);
                const queryStartTime = +new Date();
                databaseConnection.query(query, parameters, (err: any, result: any) => {

                    // log slow queries if maxQueryExecution time is set
                    const maxQueryExecutionTime = this.driver.connection.options.maxQueryExecutionTime;
                    const queryEndTime = +new Date();
                    const queryExecutionTime = queryEndTime - queryStartTime;
                    if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
                        this.driver.connection.logger.logQuerySlow(queryExecutionTime, query, parameters, this);

                    if (err) {
                        this.driver.connection.logger.logQueryError(err, query, parameters, this);
                        return fail(new QueryFailedError(query, parameters, err));
                    }

                    ok(result);
                });

            } catch (err) {
                fail(err);
            }
        });
    }

    /**
     * Returns raw data stream.
     */
    stream(query: string, parameters?: any[], onEnd?: Function, onError?: Function): Promise<ReadStream> {
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError();

        return new Promise(async (ok, fail) => {
            try {
                const databaseConnection = await this.connect();
                this.driver.connection.logger.logQuery(query, parameters, this);
                const databaseQuery = databaseConnection.query(query, parameters);
                if (onEnd) databaseQuery.on("end", onEnd);
                if (onError) databaseQuery.on("error", onError);
                ok(databaseQuery.stream());

            } catch (err) {
                fail(err);
            }
        });
    }

    /**
     * Returns all available database names including system databases.
     */
    async getDatabases(): Promise<string[]> {
        throw new NotImplementedError();
    }

    /**
     * Returns all available schema names including system schemas.
     * If database parameter specified, returns schemas of that database.
     */
    async getSchemas(database?: string): Promise<string[]> {
        throw new Error(`MySql driver does not support table schemas`);
    }

    /**
     * Checks if database with the given name exist.
     */
    async hasDatabase(database: string): Promise<boolean> {
        const result = await this.query(`SELECT * FROM \`INFORMATION_SCHEMA\`.\`SCHEMATA\` WHERE \`SCHEMA_NAME\` = '${database}'`);
        return result.length ? true : false;
    }

    /**
     * Checks if schema with the given name exist.
     */
    async hasSchema(schema: string): Promise<boolean> {
        throw new Error(`MySql driver does not support table schemas`);
    }

    /**
     * Checks if table with the given name exist in the database.
     */
    async hasTable(tableOrName: Table|string): Promise<boolean> {
        const parsedTableName = this.parseTableName(tableOrName);
        const sql = `SELECT * FROM \`INFORMATION_SCHEMA\`.\`COLUMNS\` WHERE \`TABLE_SCHEMA\` = '${parsedTableName.database}' AND \`TABLE_NAME\` = '${parsedTableName.tableName}'`;
        const result = await this.query(sql);
        return result.length ? true : false;
    }

    /**
     * Checks if column with the given name exist in the given table.
     */
    async hasColumn(tableOrName: Table|string, column: TableColumn|string): Promise<boolean> {
        const parsedTableName = this.parseTableName(tableOrName);
        const columnName = column instanceof TableColumn ? column.name : column;
        const sql = `SELECT * FROM \`INFORMATION_SCHEMA\`.\`COLUMNS\` WHERE \`TABLE_SCHEMA\` = '${parsedTableName.database}' AND \`TABLE_NAME\` = '${parsedTableName.tableName}' AND \`COLUMN_NAME\` = '${columnName}'`;
        const result = await this.query(sql);
        return result.length ? true : false;
    }

    /**
     * Creates a new database.
     */
    async createDatabase(database: string, ifNotExist?: boolean): Promise<void> {
        const up = ifNotExist ? `CREATE DATABASE IF NOT EXISTS \`${database}\`` : `CREATE DATABASE \`${database}\``;
        const down = `DROP DATABASE \`${database}\``;
        await this.executeQueries(new Query(up), new Query(down));
    }

    /**
     * Drops database.
     */
    async dropDatabase(database: string, ifExist?: boolean): Promise<void> {
        const up = ifExist ? `DROP DATABASE IF EXISTS \`${database}\`` : `DROP DATABASE \`${database}\``;
        const down = `CREATE DATABASE \`${database}\``;
        await this.executeQueries(new Query(up), new Query(down));
    }

    /**
     * Creates a new table schema.
     */
    async createSchema(schema: string, ifNotExist?: boolean): Promise<void> {
        throw new Error(`Schema create queries are not supported by MySql driver.`);
    }

    /**
     * Drops table schema.
     */
    async dropSchema(schemaPath: string, ifExist?: boolean): Promise<void> {
        throw new Error(`Schema drop queries are not supported by MySql driver.`);
    }

    /**
     * Creates a new table.
     */
    async createTable(table: Table, ifNotExist: boolean = false, createForeignKeys: boolean = true): Promise<void> {
        if (ifNotExist) {
            const isTableExist = await this.hasTable(table);
            if (isTableExist) return Promise.resolve();
        }
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        upQueries.push(this.createTableSql(table, createForeignKeys));
        downQueries.push(this.dropTableSql(table));

        // we must first drop indices, than drop foreign keys, because drop queries runs in reversed order
        // and foreign keys will be dropped first as indices. This order is very important, because we can't drop index
        // if it related to the foreign key.

        // createTable does not need separate method to create indices, because it create indices in the same query with table creation.
        table.indices.forEach(index => downQueries.push(this.dropIndexSql(table, index)));

        // if createForeignKeys is true, we must drop created foreign keys in down query.
        // createTable does not need separate method to create foreign keys, because it create fk's in the same query with table creation.
        if (createForeignKeys)
            table.foreignKeys.forEach(foreignKey => downQueries.push(this.dropForeignKeySql(table, foreignKey)));

        return this.executeQueries(upQueries, downQueries);
    }

    /**
     * Drop the table.
     */
    async dropTable(target: Table|string, ifExist?: boolean, dropForeignKeys: boolean = true): Promise<void> {
        // It needs because if table does not exist and dropForeignKeys or dropIndices is true, we don't need
        // to perform drop queries for foreign keys and indices.
        if (ifExist) {
            const isTableExist = await this.hasTable(target);
            if (!isTableExist) return Promise.resolve();
        }

        // if dropTable called with dropForeignKeys = true, we must create foreign keys in down query.
        const createForeignKeys: boolean = dropForeignKeys;
        const tableName = target instanceof Table ? target.name : target;
        const table = await this.getCachedTable(tableName);
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        if (dropForeignKeys)
            table.foreignKeys.forEach(foreignKey => upQueries.push(this.dropForeignKeySql(table, foreignKey)));

        table.indices.forEach(index => upQueries.push(this.dropIndexSql(table, index)));

        upQueries.push(this.dropTableSql(table));
        downQueries.push(this.createTableSql(table, createForeignKeys));

        await this.executeQueries(upQueries, downQueries);
    }

    /**
     * Creates a new view.
     */
    async createView(view: View): Promise<void> {
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];
        upQueries.push(this.createViewSql(view));
        upQueries.push(await this.insertViewDefinitionSql(view));
        downQueries.push(this.dropViewSql(view));
        downQueries.push(await this.deleteViewDefinitionSql(view));
        await this.executeQueries(upQueries, downQueries);
    }

    /**
     * Drops the view.
     */
    async dropView(target: View|string): Promise<void> {
        const viewName = target instanceof View ? target.name : target;
        const view = await this.getCachedView(viewName);

        const upQueries: Query[] = [];
        const downQueries: Query[] = [];
        upQueries.push(await this.deleteViewDefinitionSql(view));
        upQueries.push(this.dropViewSql(view));
        downQueries.push(await this.insertViewDefinitionSql(view));
        downQueries.push(this.createViewSql(view));
        await this.executeQueries(upQueries, downQueries);
    }

    /**
     * Renames a table.
     */
    async renameTable(oldTableOrName: Table|string, newTableName: string): Promise<void> {
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];
        const oldTable = oldTableOrName instanceof Table ? oldTableOrName : await this.getCachedTable(oldTableOrName);
        const newTable = oldTable.clone();
        const dbName = oldTable.name.indexOf(".") === -1 ? undefined : oldTable.name.split(".")[0];
        newTable.name = dbName ? `${dbName}.${newTableName}` : newTableName;

        // rename table
        upQueries.push(new Query(`RENAME TABLE ${this.escapePath(oldTable.name)} TO ${this.escapePath(newTable.name)}`));
        downQueries.push(new Query(`RENAME TABLE ${this.escapePath(newTable.name)} TO ${this.escapePath(oldTable.name)}`));

        // rename index constraints
        newTable.indices.forEach(index => {
            // build new constraint name
            const columnNames = index.columnNames.map(column => `\`${column}\``).join(", ");
            const newIndexName = this.connection.namingStrategy.indexName(newTable, index.columnNames, index.where);

            // build queries
            let indexType = "";
            if (index.isUnique)
                indexType += "UNIQUE ";
            if (index.isSpatial)
                indexType += "SPATIAL ";
            if (index.isFulltext)
                indexType += "FULLTEXT ";
            const indexParser = index.isFulltext && index.parser ? ` WITH PARSER ${index.parser}` : "";

            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} DROP INDEX \`${index.name}\`, ADD ${indexType}INDEX \`${newIndexName}\` (${columnNames})${indexParser}`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} DROP INDEX \`${newIndexName}\`, ADD ${indexType}INDEX \`${index.name}\` (${columnNames})${indexParser}`));

            // replace constraint name
            index.name = newIndexName;
        });

        // rename foreign key constraint
        newTable.foreignKeys.forEach(foreignKey => {
            // build new constraint name
            const columnNames = foreignKey.columnNames.map(column => `\`${column}\``).join(", ");
            const referencedColumnNames = foreignKey.referencedColumnNames.map(column => `\`${column}\``).join(",");
            const newForeignKeyName = this.connection.namingStrategy.foreignKeyName(newTable, foreignKey.columnNames, foreignKey.referencedTableName, foreignKey.referencedColumnNames);

            // build queries
            let up = `ALTER TABLE ${this.escapePath(newTable)} DROP FOREIGN KEY \`${foreignKey.name}\`, ADD CONSTRAINT \`${newForeignKeyName}\` FOREIGN KEY (${columnNames}) ` +
                `REFERENCES ${this.escapePath(foreignKey.referencedTableName)}(${referencedColumnNames})`;
            if (foreignKey.onDelete)
                up += ` ON DELETE ${foreignKey.onDelete}`;
            if (foreignKey.onUpdate)
                up += ` ON UPDATE ${foreignKey.onUpdate}`;

            let down = `ALTER TABLE ${this.escapePath(newTable)} DROP FOREIGN KEY \`${newForeignKeyName}\`, ADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (${columnNames}) ` +
                `REFERENCES ${this.escapePath(foreignKey.referencedTableName)}(${referencedColumnNames})`;
            if (foreignKey.onDelete)
                down += ` ON DELETE ${foreignKey.onDelete}`;
            if (foreignKey.onUpdate)
                down += ` ON UPDATE ${foreignKey.onUpdate}`;

            upQueries.push(new Query(up));
            downQueries.push(new Query(down));

            // replace constraint name
            foreignKey.name = newForeignKeyName;
        });

        await this.executeQueries(upQueries, downQueries);

        // rename old table and replace it in cached tabled;
        oldTable.name = newTable.name;
        this.replaceCachedTable(oldTable, newTable);
    }

    /**
     * Creates a new column from the column in the table.
     */
    async addColumn(tableOrName: Table|string, column: TableColumn): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const clonedTable = table.clone();
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];
        const skipColumnLevelPrimary = clonedTable.primaryColumns.length > 0;

        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD ${this.buildCreateColumnSql(column, skipColumnLevelPrimary, false)}`));
        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP COLUMN \`${column.name}\``));

        // create or update primary key constraint
        if (column.isPrimary && skipColumnLevelPrimary) {
            // if we already have generated column, we must temporary drop AUTO_INCREMENT property.
            const generatedColumn = clonedTable.columns.find(column => column.isGenerated && column.generationStrategy === "increment");
            if (generatedColumn) {
                const nonGeneratedColumn = generatedColumn.clone();
                nonGeneratedColumn.isGenerated = false;
                nonGeneratedColumn.generationStrategy = undefined;
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${column.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(column, true)}`));
            }

            const primaryColumns = clonedTable.primaryColumns;
            let columnNames = primaryColumns.map(column => `\`${column.name}\``).join(", ");
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNames})`));

            primaryColumns.push(column);
            columnNames = primaryColumns.map(column => `\`${column.name}\``).join(", ");
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNames})`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`));

            // if we previously dropped AUTO_INCREMENT property, we must bring it back
            if (generatedColumn) {
                const nonGeneratedColumn = generatedColumn.clone();
                nonGeneratedColumn.isGenerated = false;
                nonGeneratedColumn.generationStrategy = undefined;
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(column, true)}`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${column.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));
            }
        }

        // create column index
        const columnIndex = clonedTable.indices.find(index => index.columnNames.length === 1 && index.columnNames[0] === column.name);
        if (columnIndex) {
            upQueries.push(this.createIndexSql(table, columnIndex));
            downQueries.push(this.dropIndexSql(table, columnIndex));

        } else if (column.isUnique) {
            const uniqueIndex = new TableIndex({
                name: this.connection.namingStrategy.indexName(table.name, [column.name]),
                columnNames: [column.name],
                isUnique: true
            });
            clonedTable.indices.push(uniqueIndex);
            clonedTable.uniques.push(new TableUnique({
                name: uniqueIndex.name,
                columnNames: uniqueIndex.columnNames
            }));
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD UNIQUE INDEX \`${uniqueIndex.name}\` (\`${column.name}\`)`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP INDEX \`${uniqueIndex.name}\``));
        }

        await this.executeQueries(upQueries, downQueries);

        clonedTable.addColumn(column);
        this.replaceCachedTable(table, clonedTable);
    }

    /**
     * Creates a new columns from the column in the table.
     */
    async addColumns(tableOrName: Table|string, columns: TableColumn[]): Promise<void> {
        await PromiseUtils.runInSequence(columns, column => this.addColumn(tableOrName, column));
    }

    /**
     * Renames column in the given table.
     */
    async renameColumn(tableOrName: Table|string, oldTableColumnOrName: TableColumn|string, newTableColumnOrName: TableColumn|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const oldColumn = oldTableColumnOrName instanceof TableColumn ? oldTableColumnOrName : table.columns.find(c => c.name === oldTableColumnOrName);
        if (!oldColumn)
            throw new Error(`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`);

        let newColumn: TableColumn|undefined = undefined;
        if (newTableColumnOrName instanceof TableColumn) {
            newColumn = newTableColumnOrName;
        } else {
            newColumn = oldColumn.clone();
            newColumn.name = newTableColumnOrName;
        }

        await this.changeColumn(table, oldColumn, newColumn);
    }

    /**
     * Changes a column in the table.
     */
    async changeColumn(tableOrName: Table|string, oldColumnOrName: TableColumn|string, newColumn: TableColumn): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        let clonedTable = table.clone();
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        const oldColumn = oldColumnOrName instanceof TableColumn
            ? oldColumnOrName
            : table.columns.find(column => column.name === oldColumnOrName);
        if (!oldColumn)
            throw new Error(`Column "${oldColumnOrName}" was not found in the "${table.name}" table.`);

        if ((newColumn.isGenerated !== oldColumn.isGenerated && newColumn.generationStrategy !== "uuid")
            || oldColumn.type !== newColumn.type
            || oldColumn.length !== newColumn.length
            || oldColumn.generatedType !== newColumn.generatedType) {
            await this.dropColumn(table, oldColumn);
            await this.addColumn(table, newColumn);

            // update cloned table
            clonedTable = table.clone();

        } else {
            if (newColumn.name !== oldColumn.name) {
                // We don't change any column properties, just rename it.
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${oldColumn.name}\` \`${newColumn.name}\` ${this.buildCreateColumnSql(oldColumn, true, true)}`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${newColumn.name}\` \`${oldColumn.name}\` ${this.buildCreateColumnSql(oldColumn, true, true)}`));

                // rename index constraints
                clonedTable.findColumnIndices(oldColumn).forEach(index => {
                    // build new constraint name
                    index.columnNames.splice(index.columnNames.indexOf(oldColumn.name), 1);
                    index.columnNames.push(newColumn.name);
                    const columnNames = index.columnNames.map(column => `\`${column}\``).join(", ");
                    const newIndexName = this.connection.namingStrategy.indexName(clonedTable, index.columnNames, index.where);

                    // build queries
                    let indexType = "";
                    if (index.isUnique)
                        indexType += "UNIQUE ";
                    if (index.isSpatial)
                        indexType += "SPATIAL ";
                    if (index.isFulltext)
                        indexType += "FULLTEXT ";
                    const indexParser = index.isFulltext && index.parser ? ` WITH PARSER ${index.parser}` : "";

                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP INDEX \`${index.name}\`, ADD ${indexType}INDEX \`${newIndexName}\` (${columnNames})${indexParser}`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP INDEX \`${newIndexName}\`, ADD ${indexType}INDEX \`${index.name}\` (${columnNames})${indexParser}`));

                    // replace constraint name
                    index.name = newIndexName;
                });

                // rename foreign key constraints
                clonedTable.findColumnForeignKeys(oldColumn).forEach(foreignKey => {
                    // build new constraint name
                    foreignKey.columnNames.splice(foreignKey.columnNames.indexOf(oldColumn.name), 1);
                    foreignKey.columnNames.push(newColumn.name);
                    const columnNames = foreignKey.columnNames.map(column => `\`${column}\``).join(", ");
                    const referencedColumnNames = foreignKey.referencedColumnNames.map(column => `\`${column}\``).join(",");
                    const newForeignKeyName = this.connection.namingStrategy.foreignKeyName(clonedTable, foreignKey.columnNames, foreignKey.referencedTableName, foreignKey.referencedColumnNames);

                    // build queries
                    let up = `ALTER TABLE ${this.escapePath(table)} DROP FOREIGN KEY \`${foreignKey.name}\`, ADD CONSTRAINT \`${newForeignKeyName}\` FOREIGN KEY (${columnNames}) ` +
                        `REFERENCES ${this.escapePath(foreignKey.referencedTableName)}(${referencedColumnNames})`;
                    if (foreignKey.onDelete)
                        up += ` ON DELETE ${foreignKey.onDelete}`;
                    if (foreignKey.onUpdate)
                        up += ` ON UPDATE ${foreignKey.onUpdate}`;

                    let down = `ALTER TABLE ${this.escapePath(table)} DROP FOREIGN KEY \`${newForeignKeyName}\`, ADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (${columnNames}) ` +
                        `REFERENCES ${this.escapePath(foreignKey.referencedTableName)}(${referencedColumnNames})`;
                    if (foreignKey.onDelete)
                        down += ` ON DELETE ${foreignKey.onDelete}`;
                    if (foreignKey.onUpdate)
                        down += ` ON UPDATE ${foreignKey.onUpdate}`;

                    upQueries.push(new Query(up));
                    downQueries.push(new Query(down));

                    // replace constraint name
                    foreignKey.name = newForeignKeyName;
                });

                // rename old column in the Table object
                const oldTableColumn = clonedTable.columns.find(column => column.name === oldColumn.name);
                clonedTable.columns[clonedTable.columns.indexOf(oldTableColumn!)].name = newColumn.name;
                oldColumn.name = newColumn.name;
            }

            if (this.isColumnChanged(oldColumn, newColumn, true)) {
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${oldColumn.name}\` ${this.buildCreateColumnSql(newColumn, true)}`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${newColumn.name}\` ${this.buildCreateColumnSql(oldColumn, true)}`));
            }

            if (newColumn.isPrimary !== oldColumn.isPrimary) {
                // if table have generated column, we must drop AUTO_INCREMENT before changing primary constraints.
                const generatedColumn = clonedTable.columns.find(column => column.isGenerated && column.generationStrategy === "increment");
                if (generatedColumn) {
                    const nonGeneratedColumn = generatedColumn.clone();
                    nonGeneratedColumn.isGenerated = false;
                    nonGeneratedColumn.generationStrategy = undefined;

                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${generatedColumn.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(generatedColumn, true)}`));
                }

                const primaryColumns = clonedTable.primaryColumns;

                // if primary column state changed, we must always drop existed constraint.
                if (primaryColumns.length > 0) {
                    const columnNames = primaryColumns.map(column => `\`${column.name}\``).join(", ");
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNames})`));
                }

                if (newColumn.isPrimary === true) {
                    primaryColumns.push(newColumn);
                    // update column in table
                    const column = clonedTable.columns.find(column => column.name === newColumn.name);
                    column!.isPrimary = true;
                    const columnNames = primaryColumns.map(column => `\`${column.name}\``).join(", ");
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNames})`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`));

                } else {
                    const primaryColumn = primaryColumns.find(c => c.name === newColumn.name);
                    primaryColumns.splice(primaryColumns.indexOf(primaryColumn!), 1);
                    // update column in table
                    const column = clonedTable.columns.find(column => column.name === newColumn.name);
                    column!.isPrimary = false;

                    // if we have another primary keys, we must recreate constraint.
                    if (primaryColumns.length > 0) {
                        const columnNames = primaryColumns.map(column => `\`${column.name}\``).join(", ");
                        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNames})`));
                        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`));
                    }
                }

                // if we have generated column, and we dropped AUTO_INCREMENT property before, we must bring it back
                if (generatedColumn) {
                    const nonGeneratedColumn = generatedColumn.clone();
                    nonGeneratedColumn.isGenerated = false;
                    nonGeneratedColumn.generationStrategy = undefined;

                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(generatedColumn, true)}`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${generatedColumn.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));
                }
            }

            if (newColumn.isUnique !== oldColumn.isUnique) {
                if (newColumn.isUnique === true) {
                    const uniqueIndex = new TableIndex({
                        name: this.connection.namingStrategy.indexName(table.name, [newColumn.name]),
                        columnNames: [newColumn.name],
                        isUnique: true
                    });
                    clonedTable.indices.push(uniqueIndex);
                    clonedTable.uniques.push(new TableUnique({
                        name: uniqueIndex.name,
                        columnNames: uniqueIndex.columnNames
                    }));
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD UNIQUE INDEX \`${uniqueIndex.name}\` (\`${newColumn.name}\`)`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP INDEX \`${uniqueIndex.name}\``));

                } else {
                    const uniqueIndex = clonedTable.indices.find(index => {
                        return index.columnNames.length === 1 && index.isUnique === true && !!index.columnNames.find(columnName => columnName === newColumn.name);
                    });
                    clonedTable.indices.splice(clonedTable.indices.indexOf(uniqueIndex!), 1);

                    const tableUnique = clonedTable.uniques.find(unique => unique.name === uniqueIndex!.name);
                    clonedTable.uniques.splice(clonedTable.uniques.indexOf(tableUnique!), 1);

                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP INDEX \`${uniqueIndex!.name}\``));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD UNIQUE INDEX \`${uniqueIndex!.name}\` (\`${newColumn.name}\`)`));
                }
            }
        }

        await this.executeQueries(upQueries, downQueries);
        this.replaceCachedTable(table, clonedTable);
    }

    /**
     * Changes a column in the table.
     */
    async changeColumns(tableOrName: Table|string, changedColumns: { newColumn: TableColumn, oldColumn: TableColumn }[]): Promise<void> {
        await PromiseUtils.runInSequence(changedColumns, changedColumn => this.changeColumn(tableOrName, changedColumn.oldColumn, changedColumn.newColumn));
    }

    /**
     * Drops column in the table.
     */
    async dropColumn(tableOrName: Table|string, columnOrName: TableColumn|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const column = columnOrName instanceof TableColumn ? columnOrName : table.findColumnByName(columnOrName);
        if (!column)
            throw new Error(`Column "${columnOrName}" was not found in table "${table.name}"`);

        const clonedTable = table.clone();
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        // drop primary key constraint
        if (column.isPrimary) {
            // if table have generated column, we must drop AUTO_INCREMENT before changing primary constraints.
            const generatedColumn = clonedTable.columns.find(column => column.isGenerated && column.generationStrategy === "increment");
            if (generatedColumn) {
                const nonGeneratedColumn = generatedColumn.clone();
                nonGeneratedColumn.isGenerated = false;
                nonGeneratedColumn.generationStrategy = undefined;

                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${generatedColumn.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(generatedColumn, true)}`));
            }

            // dropping primary key constraint
            const columnNames = clonedTable.primaryColumns.map(primaryColumn => `\`${primaryColumn.name}\``).join(", ");
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} DROP PRIMARY KEY`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} ADD PRIMARY KEY (${columnNames})`));

            // update column in table
            const tableColumn = clonedTable.findColumnByName(column.name);
            tableColumn!.isPrimary = false;

            // if primary key have multiple columns, we must recreate it without dropped column
            if (clonedTable.primaryColumns.length > 0) {
                const columnNames = clonedTable.primaryColumns.map(primaryColumn => `\`${primaryColumn.name}\``).join(", ");
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} ADD PRIMARY KEY (${columnNames})`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} DROP PRIMARY KEY`));
            }

            // if we have generated column, and we dropped AUTO_INCREMENT property before, and this column is not current dropping column, we must bring it back
            if (generatedColumn && generatedColumn.name !== column.name) {
                const nonGeneratedColumn = generatedColumn.clone();
                nonGeneratedColumn.isGenerated = false;
                nonGeneratedColumn.generationStrategy = undefined;

                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(generatedColumn, true)}`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${generatedColumn.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));
            }
        }

        // drop column index
        const columnIndex = clonedTable.indices.find(index => index.columnNames.length === 1 && index.columnNames[0] === column.name);
        if (columnIndex) {
            clonedTable.indices.splice(clonedTable.indices.indexOf(columnIndex), 1);
            upQueries.push(this.dropIndexSql(table, columnIndex));
            downQueries.push(this.createIndexSql(table, columnIndex));

        } else if (column.isUnique) {
            // we splice constraints both from table uniques and indices.
            const uniqueName = this.connection.namingStrategy.uniqueConstraintName(table.name, [column.name]);
            const foundUnique = clonedTable.uniques.find(unique => unique.name === uniqueName);
            if (foundUnique)
                clonedTable.uniques.splice(clonedTable.uniques.indexOf(foundUnique), 1);

            const indexName = this.connection.namingStrategy.indexName(table.name, [column.name]);
            const foundIndex = clonedTable.indices.find(index => index.name === indexName);
            if (foundIndex)
                clonedTable.indices.splice(clonedTable.indices.indexOf(foundIndex), 1);

            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP INDEX \`${indexName}\``));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD UNIQUE INDEX \`${indexName}\` (\`${column.name}\`)`));
        }

        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP COLUMN \`${column.name}\``));
        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD ${this.buildCreateColumnSql(column, true)}`));

        await this.executeQueries(upQueries, downQueries);

        clonedTable.removeColumn(column);
        this.replaceCachedTable(table, clonedTable);
    }

    /**
     * Drops the columns in the table.
     */
    async dropColumns(tableOrName: Table|string, columns: TableColumn[]): Promise<void> {
        await PromiseUtils.runInSequence(columns, column => this.dropColumn(tableOrName, column));
    }

    /**
     * Creates a new primary key.
     */
    async createPrimaryKey(tableOrName: Table|string, columnNames: string[]): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const clonedTable = table.clone();

        const up = this.createPrimaryKeySql(table, columnNames);
        const down = this.dropPrimaryKeySql(table);

        await this.executeQueries(up, down);
        clonedTable.columns.forEach(column => {
            if (columnNames.find(columnName => columnName === column.name))
                column.isPrimary = true;
        });
        this.replaceCachedTable(table, clonedTable);
    }

    /**
     * Updates composite primary keys.
     */
    async updatePrimaryKeys(tableOrName: Table|string, columns: TableColumn[]): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const clonedTable = table.clone();
        const columnNames = columns.map(column => column.name);
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        // if table have generated column, we must drop AUTO_INCREMENT before changing primary constraints.
        const generatedColumn = clonedTable.columns.find(column => column.isGenerated && column.generationStrategy === "increment");
        if (generatedColumn) {
            const nonGeneratedColumn = generatedColumn.clone();
            nonGeneratedColumn.isGenerated = false;
            nonGeneratedColumn.generationStrategy = undefined;

            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${generatedColumn.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(generatedColumn, true)}`));
        }

        // if table already have primary columns, we must drop them.
        const primaryColumns = clonedTable.primaryColumns;
        if (primaryColumns.length > 0) {
            const columnNames = primaryColumns.map(column => `\`${column.name}\``).join(", ");
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNames})`));
        }

        // update columns in table.
        clonedTable.columns
            .filter(column => columnNames.indexOf(column.name) !== -1)
            .forEach(column => column.isPrimary = true);

        const columnNamesString = columnNames.map(columnName => `\`${columnName}\``).join(", ");
        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNamesString})`));
        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`));

        // if we already have generated column or column is changed to generated, and we dropped AUTO_INCREMENT property before, we must bring it back
        const newOrExistGeneratedColumn = generatedColumn ? generatedColumn : columns.find(column => column.isGenerated && column.generationStrategy === "increment");
        if (newOrExistGeneratedColumn) {
            const nonGeneratedColumn = newOrExistGeneratedColumn.clone();
            nonGeneratedColumn.isGenerated = false;
            nonGeneratedColumn.generationStrategy = undefined;

            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${nonGeneratedColumn.name}\` ${this.buildCreateColumnSql(newOrExistGeneratedColumn, true)}`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} CHANGE \`${newOrExistGeneratedColumn.name}\` ${this.buildCreateColumnSql(nonGeneratedColumn, true)}`));

            // if column changed to generated, we must update it in table
            const changedGeneratedColumn = clonedTable.columns.find(column => column.name === newOrExistGeneratedColumn.name);
            changedGeneratedColumn!.isGenerated = true;
            changedGeneratedColumn!.generationStrategy = "increment";
        }

        await this.executeQueries(upQueries, downQueries);
        this.replaceCachedTable(table, clonedTable);
    }

    /**
     * Drops a primary key.
     */
    async dropPrimaryKey(tableOrName: Table|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const up = this.dropPrimaryKeySql(table);
        const down = this.createPrimaryKeySql(table, table.primaryColumns.map(column => column.name));
        await this.executeQueries(up, down);
        table.primaryColumns.forEach(column => {
            column.isPrimary = false;
        });
    }

    /**
     * Creates a new unique constraint.
     */
    async createUniqueConstraint(tableOrName: Table|string, uniqueConstraint: TableUnique): Promise<void> {
        throw new Error(`MySql does not support unique constraints. Use unique index instead.`);
    }

    /**
     * Creates a new unique constraints.
     */
    async createUniqueConstraints(tableOrName: Table|string, uniqueConstraints: TableUnique[]): Promise<void> {
        throw new Error(`MySql does not support unique constraints. Use unique index instead.`);
    }

    /**
     * Drops an unique constraint.
     */
    async dropUniqueConstraint(tableOrName: Table|string, uniqueOrName: TableUnique|string): Promise<void> {
        throw new Error(`MySql does not support unique constraints. Use unique index instead.`);
    }

    /**
     * Drops an unique constraints.
     */
    async dropUniqueConstraints(tableOrName: Table|string, uniqueConstraints: TableUnique[]): Promise<void> {
        throw new Error(`MySql does not support unique constraints. Use unique index instead.`);
    }

    /**
     * Creates a new check constraint.
     */
    async createCheckConstraint(tableOrName: Table|string, checkConstraint: TableCheck): Promise<void> {
        throw new Error(`MySql does not support check constraints.`);
    }

    /**
     * Creates a new check constraints.
     */
    async createCheckConstraints(tableOrName: Table|string, checkConstraints: TableCheck[]): Promise<void> {
        throw new Error(`MySql does not support check constraints.`);
    }

    /**
     * Drops check constraint.
     */
    async dropCheckConstraint(tableOrName: Table|string, checkOrName: TableCheck|string): Promise<void> {
        throw new Error(`MySql does not support check constraints.`);
    }

    /**
     * Drops check constraints.
     */
    async dropCheckConstraints(tableOrName: Table|string, checkConstraints: TableCheck[]): Promise<void> {
        throw new Error(`MySql does not support check constraints.`);
    }

    /**
     * Creates a new exclusion constraint.
     */
    async createExclusionConstraint(tableOrName: Table|string, exclusionConstraint: TableExclusion): Promise<void> {
        throw new Error(`MySql does not support exclusion constraints.`);
    }

    /**
     * Creates a new exclusion constraints.
     */
    async createExclusionConstraints(tableOrName: Table|string, exclusionConstraints: TableExclusion[]): Promise<void> {
        throw new Error(`MySql does not support exclusion constraints.`);
    }

    /**
     * Drops exclusion constraint.
     */
    async dropExclusionConstraint(tableOrName: Table|string, exclusionOrName: TableExclusion|string): Promise<void> {
        throw new Error(`MySql does not support exclusion constraints.`);
    }

    /**
     * Drops exclusion constraints.
     */
    async dropExclusionConstraints(tableOrName: Table|string, exclusionConstraints: TableExclusion[]): Promise<void> {
        throw new Error(`MySql does not support exclusion constraints.`);
    }

    /**
     * Creates a new foreign key.
     */
    async createForeignKey(tableOrName: Table|string, foreignKey: TableForeignKey): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);

        // new FK may be passed without name. In this case we generate FK name manually.
        if (!foreignKey.name)
            foreignKey.name = this.connection.namingStrategy.foreignKeyName(table.name, foreignKey.columnNames, foreignKey.referencedTableName, foreignKey.referencedColumnNames);

        const up = this.createForeignKeySql(table, foreignKey);
        const down = this.dropForeignKeySql(table, foreignKey);
        await this.executeQueries(up, down);
        table.addForeignKey(foreignKey);
    }

    /**
     * Creates a new foreign keys.
     */
    async createForeignKeys(tableOrName: Table|string, foreignKeys: TableForeignKey[]): Promise<void> {
        const promises = foreignKeys.map(foreignKey => this.createForeignKey(tableOrName, foreignKey));
        await Promise.all(promises);
    }

    /**
     * Drops a foreign key.
     */
    async dropForeignKey(tableOrName: Table|string, foreignKeyOrName: TableForeignKey|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const foreignKey = foreignKeyOrName instanceof TableForeignKey ? foreignKeyOrName : table.foreignKeys.find(fk => fk.name === foreignKeyOrName);
        if (!foreignKey)
            throw new Error(`Supplied foreign key was not found in table ${table.name}`);

        const up = this.dropForeignKeySql(table, foreignKey);
        const down = this.createForeignKeySql(table, foreignKey);
        await this.executeQueries(up, down);
        table.removeForeignKey(foreignKey);
    }

    /**
     * Drops a foreign keys from the table.
     */
    async dropForeignKeys(tableOrName: Table|string, foreignKeys: TableForeignKey[]): Promise<void> {
        const promises = foreignKeys.map(foreignKey => this.dropForeignKey(tableOrName, foreignKey));
        await Promise.all(promises);
    }

    /**
     * Creates a new index.
     */
    async createIndex(tableOrName: Table|string, index: TableIndex): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);

        // new index may be passed without name. In this case we generate index name manually.
        if (!index.name)
            index.name = this.connection.namingStrategy.indexName(table.name, index.columnNames, index.where);

        const up = this.createIndexSql(table, index);
        const down = this.dropIndexSql(table, index);
        await this.executeQueries(up, down);
        table.addIndex(index, true);
    }

    /**
     * Creates a new indices
     */
    async createIndices(tableOrName: Table|string, indices: TableIndex[]): Promise<void> {
        const promises = indices.map(index => this.createIndex(tableOrName, index));
        await Promise.all(promises);
    }

    /**
     * Drops an index.
     */
    async dropIndex(tableOrName: Table|string, indexOrName: TableIndex|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const index = indexOrName instanceof TableIndex ? indexOrName : table.indices.find(i => i.name === indexOrName);
        if (!index)
            throw new Error(`Supplied index was not found in table ${table.name}`);

        const up = this.dropIndexSql(table, index);
        const down = this.createIndexSql(table, index);
        await this.executeQueries(up, down);
        table.removeIndex(index, true);
    }

    /**
     * Drops an indices from the table.
     */
    async dropIndices(tableOrName: Table|string, indices: TableIndex[]): Promise<void> {
        const promises = indices.map(index => this.dropIndex(tableOrName, index));
        await Promise.all(promises);
    }

    /**
     * Clears all table contents.
     * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
     */
    async clearTable(tableOrName: Table|string): Promise<void> {
        await this.query(`TRUNCATE TABLE ${this.escapePath(tableOrName)}`);
    }

    /**
     * Removes all tables from the currently connected database.
     * Be careful using this method and avoid using it in production or migrations
     * (because it can clear all your database).
     */
    async clearDatabase(database?: string): Promise<void> {
        const dbName = database ? database : this.driver.database;
        if (dbName) {
            const isDatabaseExist = await this.hasDatabase(dbName);
            if (!isDatabaseExist)
                return Promise.resolve();
        } else {
            throw new Error(`Can not clear database. No database is specified`);
        }

        await this.startTransaction();
        try {

            const selectViewDropsQuery = `SELECT concat('DROP VIEW IF EXISTS \`', table_schema, '\`.\`', table_name, '\`') AS \`query\` FROM \`INFORMATION_SCHEMA\`.\`VIEWS\` WHERE \`TABLE_SCHEMA\` = '${dbName}'`;
            const dropViewQueries: ObjectLiteral[] = await this.query(selectViewDropsQuery);
            await Promise.all(dropViewQueries.map(q => this.query(q["query"])));

            const disableForeignKeysCheckQuery = `SET FOREIGN_KEY_CHECKS = 0;`;
            const dropTablesQuery = `SELECT concat('DROP TABLE IF EXISTS \`', table_schema, '\`.\`', table_name, '\`') AS \`query\` FROM \`INFORMATION_SCHEMA\`.\`TABLES\` WHERE \`TABLE_SCHEMA\` = '${dbName}'`;
            const enableForeignKeysCheckQuery = `SET FOREIGN_KEY_CHECKS = 1;`;

            await this.query(disableForeignKeysCheckQuery);
            const dropQueries: ObjectLiteral[] = await this.query(dropTablesQuery);
            await Promise.all(dropQueries.map(query => this.query(query["query"])));
            await this.query(enableForeignKeysCheckQuery);

            await this.commitTransaction();

        } catch (error) {
            try { // we throw original error even if rollback thrown an error
                await this.rollbackTransaction();
            } catch (rollbackError) { }
            throw error;
        }
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Returns current database.
     */
    protected async getCurrentDatabase(): Promise<string> {
        const currentDBQuery = await this.query(`SELECT DATABASE() AS \`db_name\``);
        return currentDBQuery[0]["db_name"];
    }

    protected async loadViews(viewNames: string[]): Promise<View[]> {
        const hasTable = await this.hasTable(this.getTypeormMetadataTableName());
        if (!hasTable)
            return Promise.resolve([]);

        const currentDatabase = await this.getCurrentDatabase();
        const viewsCondition = viewNames.map(tableName => {
            let [database, name] = tableName.split(".");
            if (!name) {
                name = database;
                database = this.driver.database || currentDatabase;
            }
            return `(\`t\`.\`schema\` = '${database}' AND \`t\`.\`name\` = '${name}')`;
        }).join(" OR ");

        const query = `SELECT \`t\`.*, \`v\`.\`check_option\` FROM ${this.escapePath(this.getTypeormMetadataTableName())} \`t\` ` +
            `INNER JOIN \`information_schema\`.\`views\` \`v\` ON \`v\`.\`table_schema\` = \`t\`.\`schema\` AND \`v\`.\`table_name\` = \`t\`.\`name\` WHERE \`t\`.\`type\` = 'VIEW' ${viewsCondition ? `AND (${viewsCondition})` : ""}`;
        const dbViews = await this.query(query);
        return dbViews.map((dbView: any) => {
            const view = new View();
            const db = dbView["schema"] === currentDatabase ? undefined : dbView["schema"];
            view.name = this.driver.buildTableName(dbView["name"], undefined, db);
            view.expression = dbView["value"];
            return view;
        });
    }

    /**
     * Loads all tables (with given names) from the database and creates a Table from them.
     */
    protected async loadTables(tableNames: string[]): Promise<Table[]> {

        // if no tables given then no need to proceed
        if (!tableNames || !tableNames.length)
            return [];

        const currentDatabase = await this.getCurrentDatabase();
        const tablesCondition = tableNames.map(tableName => {
            let [database, name] = tableName.split(".");
            if (!name) {
                name = database;
                database = this.driver.database || currentDatabase;
            }
            return `(\`TABLE_SCHEMA\` = '${database}' AND \`TABLE_NAME\` = '${name}')`;
        }).join(" OR ");
        const tablesSql = `SELECT * FROM \`INFORMATION_SCHEMA\`.\`TABLES\` WHERE ` + tablesCondition;

        const columnsSql = `SELECT * FROM \`INFORMATION_SCHEMA\`.\`COLUMNS\` WHERE ` + tablesCondition;

        const primaryKeySql = `SELECT * FROM \`INFORMATION_SCHEMA\`.\`KEY_COLUMN_USAGE\` WHERE \`CONSTRAINT_NAME\` = 'PRIMARY' AND (${tablesCondition})`;

        const collationsSql = `SELECT \`SCHEMA_NAME\`, \`DEFAULT_CHARACTER_SET_NAME\` as \`CHARSET\`, \`DEFAULT_COLLATION_NAME\` AS \`COLLATION\` FROM \`INFORMATION_SCHEMA\`.\`SCHEMATA\``;

        const indicesCondition = tableNames.map(tableName => {
            let [database, name] = tableName.split(".");
            if (!name) {
                name = database;
                database = this.driver.database || currentDatabase;
            }
            return `(\`s\`.\`TABLE_SCHEMA\` = '${database}' AND \`s\`.\`TABLE_NAME\` = '${name}')`;
        }).join(" OR ");
        const indicesSql = `SELECT \`s\`.* FROM \`INFORMATION_SCHEMA\`.\`STATISTICS\` \`s\` ` +
            `LEFT JOIN \`INFORMATION_SCHEMA\`.\`REFERENTIAL_CONSTRAINTS\` \`rc\` ON \`s\`.\`INDEX_NAME\` = \`rc\`.\`CONSTRAINT_NAME\` ` +
            `WHERE (${indicesCondition}) AND \`s\`.\`INDEX_NAME\` != 'PRIMARY' AND \`rc\`.\`CONSTRAINT_NAME\` IS NULL`;

        const foreignKeysCondition = tableNames.map(tableName => {
            let [database, name] = tableName.split(".");
            if (!name) {
                name = database;
                database = this.driver.database || currentDatabase;
            }
            return `(\`kcu\`.\`TABLE_SCHEMA\` = '${database}' AND \`kcu\`.\`TABLE_NAME\` = '${name}')`;
        }).join(" OR ");
        const foreignKeysSql = `SELECT \`kcu\`.\`TABLE_SCHEMA\`, \`kcu\`.\`TABLE_NAME\`, \`kcu\`.\`CONSTRAINT_NAME\`, \`kcu\`.\`COLUMN_NAME\`, \`kcu\`.\`REFERENCED_TABLE_SCHEMA\`, ` +
            `\`kcu\`.\`REFERENCED_TABLE_NAME\`, \`kcu\`.\`REFERENCED_COLUMN_NAME\`, \`rc\`.\`DELETE_RULE\` \`ON_DELETE\`, \`rc\`.\`UPDATE_RULE\` \`ON_UPDATE\` ` +
            `FROM \`INFORMATION_SCHEMA\`.\`KEY_COLUMN_USAGE\` \`kcu\` ` +
            `INNER JOIN \`INFORMATION_SCHEMA\`.\`REFERENTIAL_CONSTRAINTS\` \`rc\` ON \`rc\`.\`constraint_name\` = \`kcu\`.\`constraint_name\` ` +
            `WHERE ` + foreignKeysCondition;
        const [dbTables, dbColumns, dbPrimaryKeys, dbCollations, dbIndices, dbForeignKeys]: ObjectLiteral[][] = await Promise.all([
            this.query(tablesSql),
            this.query(columnsSql),
            this.query(primaryKeySql),
            this.query(collationsSql),
            this.query(indicesSql),
            this.query(foreignKeysSql)
        ]);

        // if tables were not found in the db, no need to proceed
        if (!dbTables.length)
            return [];

        const isMariaDb = this.driver.options.type === "mariadb";
        const dbVersion = await this.getVersion();

        // create tables for loaded tables
        return Promise.all(dbTables.map(async dbTable => {
            const table = new Table();

            const dbCollation = dbCollations.find(coll => coll["SCHEMA_NAME"] === dbTable["TABLE_SCHEMA"])!;
            const defaultCollation = dbCollation["COLLATION"];
            const defaultCharset = dbCollation["CHARSET"];

            // We do not need to join database name, when database is by default.
            // In this case we need local variable `tableFullName` for below comparision.
            const db = dbTable["TABLE_SCHEMA"] === currentDatabase ? undefined : dbTable["TABLE_SCHEMA"];
            table.name = this.driver.buildTableName(dbTable["TABLE_NAME"], undefined, db);
            const tableFullName = this.driver.buildTableName(dbTable["TABLE_NAME"], undefined, dbTable["TABLE_SCHEMA"]);

            // create columns from the loaded columns
            table.columns = dbColumns
                .filter(dbColumn => this.driver.buildTableName(dbColumn["TABLE_NAME"], undefined, dbColumn["TABLE_SCHEMA"]) === tableFullName)
                .map(dbColumn => {

                    const columnUniqueIndex = dbIndices.find(dbIndex => {
                        const indexTableFullName = this.driver.buildTableName(dbIndex["TABLE_NAME"], undefined, dbIndex["TABLE_SCHEMA"]);
                        if (indexTableFullName !== tableFullName) {
                            return false;
                        }

                        // Index is not for this column
                        if (dbIndex["COLUMN_NAME"] !== dbColumn["COLUMN_NAME"]) {
                            return false;
                        }

                        const nonUnique = parseInt(dbIndex["NON_UNIQUE"], 10);
                        return nonUnique === 0;
                    });

                    const tableMetadata = this.connection.entityMetadatas.find(metadata => metadata.tablePath === table.name);
                    const hasIgnoredIndex = columnUniqueIndex && tableMetadata && tableMetadata.indices
                        .some(index => index.name === columnUniqueIndex["INDEX_NAME"] && index.synchronize === false);

                    const isConstraintComposite = columnUniqueIndex
                        ? !!dbIndices.find(dbIndex => dbIndex["INDEX_NAME"] === columnUniqueIndex["INDEX_NAME"] && dbIndex["COLUMN_NAME"] !== dbColumn["COLUMN_NAME"])
                        : false;

                    const tableColumn = new TableColumn();
                    tableColumn.name = dbColumn["COLUMN_NAME"];
                    tableColumn.type = dbColumn["DATA_TYPE"].toLowerCase();

                    if (dbColumn["COLUMN_DEFAULT"] === null
                        || dbColumn["COLUMN_DEFAULT"] === undefined
                        || (isMariaDb && dbColumn["COLUMN_DEFAULT"] === "NULL")) {
                        tableColumn.default = undefined;

                    } else if (/^CURRENT_TIMESTAMP(\([0-9]*\))?$/i.test(dbColumn["COLUMN_DEFAULT"])) {
                        // New versions of MariaDB return expressions in lowercase.  We need to set it in
                        // uppercase so the comparison in MysqlDriver#compareDefaultValues does not fail.
                        tableColumn.default = dbColumn["COLUMN_DEFAULT"].toUpperCase();
                    } else if (isMariaDb && VersionUtils.isGreaterOrEqual(dbVersion, "10.2.7")) {
                        // MariaDB started adding quotes to literals in COLUMN_DEFAULT since version 10.2.7
                        // See https://mariadb.com/kb/en/library/information-schema-columns-table/
                        tableColumn.default = dbColumn["COLUMN_DEFAULT"];
                    } else {
                        tableColumn.default = `'${dbColumn["COLUMN_DEFAULT"]}'`;
                    }

                    if (dbColumn["EXTRA"].indexOf("on update") !== -1) {
                        tableColumn.onUpdate = dbColumn["EXTRA"].substring(dbColumn["EXTRA"].indexOf("on update") + 10);
                    }

                    if (dbColumn["GENERATION_EXPRESSION"]) {
                        tableColumn.asExpression = dbColumn["GENERATION_EXPRESSION"];
                        tableColumn.generatedType = dbColumn["EXTRA"].indexOf("VIRTUAL") !== -1 ? "VIRTUAL" : "STORED";
                    }

                    tableColumn.isUnique = !!columnUniqueIndex && !hasIgnoredIndex && !isConstraintComposite;
                    tableColumn.isNullable = dbColumn["IS_NULLABLE"] === "YES";
                    tableColumn.isPrimary = dbPrimaryKeys.some(dbPrimaryKey => {
                        return this.driver.buildTableName(dbPrimaryKey["TABLE_NAME"], undefined, dbPrimaryKey["TABLE_SCHEMA"]) === tableFullName && dbPrimaryKey["COLUMN_NAME"] === tableColumn.name;
                    });
                    tableColumn.zerofill = dbColumn["COLUMN_TYPE"].indexOf("zerofill") !== -1;
                    tableColumn.unsigned = tableColumn.zerofill ? true : dbColumn["COLUMN_TYPE"].indexOf("unsigned") !== -1;
                    if (this.driver.withWidthColumnTypes.indexOf(tableColumn.type as ColumnType) !== -1) {
                        const width = dbColumn["COLUMN_TYPE"].substring(dbColumn["COLUMN_TYPE"].indexOf("(") + 1, dbColumn["COLUMN_TYPE"].indexOf(")"));
                        tableColumn.width = width && !this.isDefaultColumnWidth(table, tableColumn, parseInt(width)) ? parseInt(width) : undefined;
                    }

                    tableColumn.isGenerated = dbColumn["EXTRA"].indexOf("auto_increment") !== -1;
                    if (tableColumn.isGenerated)
                        tableColumn.generationStrategy = "increment";

                    tableColumn.comment = dbColumn["COLUMN_COMMENT"];
                    if (dbColumn["CHARACTER_SET_NAME"])
                        tableColumn.charset = dbColumn["CHARACTER_SET_NAME"] === defaultCharset ? undefined : dbColumn["CHARACTER_SET_NAME"];
                    if (dbColumn["COLLATION_NAME"])
                        tableColumn.collation = dbColumn["COLLATION_NAME"] === defaultCollation ? undefined : dbColumn["COLLATION_NAME"];

                    // check only columns that have length property
                    if (this.driver.withLengthColumnTypes.indexOf(tableColumn.type as ColumnType) !== -1 && dbColumn["CHARACTER_MAXIMUM_LENGTH"]) {
                        const length = dbColumn["CHARACTER_MAXIMUM_LENGTH"].toString();
                        tableColumn.length = !this.isDefaultColumnLength(table, tableColumn, length) ? length : "";
                    }

                    if (tableColumn.type === "decimal" || tableColumn.type === "double" || tableColumn.type === "float") {
                        if (dbColumn["NUMERIC_PRECISION"] !== null && !this.isDefaultColumnPrecision(table, tableColumn, dbColumn["NUMERIC_PRECISION"]))
                            tableColumn.precision = parseInt(dbColumn["NUMERIC_PRECISION"]);
                        if (dbColumn["NUMERIC_SCALE"] !== null && !this.isDefaultColumnScale(table, tableColumn, dbColumn["NUMERIC_SCALE"]))
                            tableColumn.scale = parseInt(dbColumn["NUMERIC_SCALE"]);
                    }

                    if (tableColumn.type === "enum" || tableColumn.type === "simple-enum" || tableColumn.type === "set") {
                        const colType = dbColumn["COLUMN_TYPE"];
                        const items = colType.substring(colType.indexOf("(") + 1, colType.indexOf(")")).split(",");
                        tableColumn.enum = (items as string[]).map(item => {
                            return item.substring(1, item.length - 1);
                        });
                        tableColumn.length = "";
                    }

                    if ((tableColumn.type === "datetime" || tableColumn.type === "time" || tableColumn.type === "timestamp")
                        && dbColumn["DATETIME_PRECISION"] !== null && dbColumn["DATETIME_PRECISION"] !== undefined
                        && !this.isDefaultColumnPrecision(table, tableColumn, parseInt(dbColumn["DATETIME_PRECISION"]))) {
                        tableColumn.precision = parseInt(dbColumn["DATETIME_PRECISION"]);
                    }

                    return tableColumn;
                });

            // find foreign key constraints of table, group them by constraint name and build TableForeignKey.
            const tableForeignKeyConstraints = OrmUtils.uniq(dbForeignKeys.filter(dbForeignKey => {
                return this.driver.buildTableName(dbForeignKey["TABLE_NAME"], undefined, dbForeignKey["TABLE_SCHEMA"]) === tableFullName;
            }), dbForeignKey => dbForeignKey["CONSTRAINT_NAME"]);

            table.foreignKeys = tableForeignKeyConstraints.map(dbForeignKey => {
                const foreignKeys = dbForeignKeys.filter(dbFk => dbFk["CONSTRAINT_NAME"] === dbForeignKey["CONSTRAINT_NAME"]);

                // if referenced table located in currently used db, we don't need to concat db name to table name.
                const database = dbForeignKey["REFERENCED_TABLE_SCHEMA"] === currentDatabase ? undefined : dbForeignKey["REFERENCED_TABLE_SCHEMA"];
                const referencedTableName = this.driver.buildTableName(dbForeignKey["REFERENCED_TABLE_NAME"], undefined, database);

                return new TableForeignKey({
                    name: dbForeignKey["CONSTRAINT_NAME"],
                    columnNames: foreignKeys.map(dbFk => dbFk["COLUMN_NAME"]),
                    referencedTableName: referencedTableName,
                    referencedColumnNames: foreignKeys.map(dbFk => dbFk["REFERENCED_COLUMN_NAME"]),
                    onDelete: dbForeignKey["ON_DELETE"],
                    onUpdate: dbForeignKey["ON_UPDATE"]
                });
            });

            // find index constraints of table, group them by constraint name and build TableIndex.
            const tableIndexConstraints = OrmUtils.uniq(dbIndices.filter(dbIndex => {
                return this.driver.buildTableName(dbIndex["TABLE_NAME"], undefined, dbIndex["TABLE_SCHEMA"]) === tableFullName;
            }), dbIndex => dbIndex["INDEX_NAME"]);

            table.indices = tableIndexConstraints.map(constraint => {
                const indices = dbIndices.filter(index => {
                    return index["TABLE_SCHEMA"] === constraint["TABLE_SCHEMA"]
                        && index["TABLE_NAME"] === constraint["TABLE_NAME"]
                        && index["INDEX_NAME"] === constraint["INDEX_NAME"];
                });

                const nonUnique = parseInt(constraint["NON_UNIQUE"], 10);

                return new TableIndex(<TableIndexOptions>{
                    table: table,
                    name: constraint["INDEX_NAME"],
                    columnNames: indices.map(i => i["COLUMN_NAME"]),
                    isUnique: nonUnique === 0,
                    isSpatial: constraint["INDEX_TYPE"] === "SPATIAL",
                    isFulltext: constraint["INDEX_TYPE"] === "FULLTEXT"
                });
            });

            return table;
        }));
    }

    /**
     * Builds create table sql
     */
    protected createTableSql(table: Table, createForeignKeys?: boolean): Query {
        const columnDefinitions = table.columns.map(column => this.buildCreateColumnSql(column, true)).join(", ");
        let sql = `CREATE TABLE ${this.escapePath(table)} (${columnDefinitions}`;

        // we create unique indexes instead of unique constraints, because MySql does not have unique constraints.
        // if we mark column as Unique, it means that we create UNIQUE INDEX.
        table.columns
            .filter(column => column.isUnique)
            .forEach(column => {
                const isUniqueIndexExist = table.indices.some(index => {
                    return index.columnNames.length === 1 && !!index.isUnique && index.columnNames.indexOf(column.name) !== -1;
                });
                const isUniqueConstraintExist = table.uniques.some(unique => {
                    return unique.columnNames.length === 1 && unique.columnNames.indexOf(column.name) !== -1;
                });
                if (!isUniqueIndexExist && !isUniqueConstraintExist)
                    table.indices.push(new TableIndex({
                        name: this.connection.namingStrategy.uniqueConstraintName(table.name, [column.name]),
                        columnNames: [column.name],
                        isUnique: true
                    }));
            });

        // as MySql does not have unique constraints, we must create table indices from table uniques and mark them as unique.
        if (table.uniques.length > 0) {
            table.uniques.forEach(unique => {
                const uniqueExist = table.indices.some(index => index.name === unique.name);
                if (!uniqueExist) {
                    table.indices.push(new TableIndex({
                        name: unique.name,
                        columnNames: unique.columnNames,
                        isUnique: true
                    }));
                }
            });
        }

        if (table.indices.length > 0) {
            const indicesSql = table.indices.map(index => {
                const columnNames = index.columnNames.map(columnName => `\`${columnName}\``).join(", ");
                if (!index.name)
                    index.name = this.connection.namingStrategy.indexName(table.name, index.columnNames, index.where);

                let indexType = "";
                if (index.isUnique)
                    indexType += "UNIQUE ";
                if (index.isSpatial)
                    indexType += "SPATIAL ";
                if (index.isFulltext)
                    indexType += "FULLTEXT ";
                const indexParser = index.isFulltext && index.parser ? ` WITH PARSER ${index.parser}` : "";

                return `${indexType}INDEX \`${index.name}\` (${columnNames})${indexParser}`;
            }).join(", ");

            sql += `, ${indicesSql}`;
        }

        if (table.foreignKeys.length > 0 && createForeignKeys) {
            const foreignKeysSql = table.foreignKeys.map(fk => {
                const columnNames = fk.columnNames.map(columnName => `\`${columnName}\``).join(", ");
                if (!fk.name)
                    fk.name = this.connection.namingStrategy.foreignKeyName(table.name, fk.columnNames, fk.referencedTableName, fk.referencedColumnNames);
                const referencedColumnNames = fk.referencedColumnNames.map(columnName => `\`${columnName}\``).join(", ");

                let constraint = `CONSTRAINT \`${fk.name}\` FOREIGN KEY (${columnNames}) REFERENCES ${this.escapePath(fk.referencedTableName)} (${referencedColumnNames})`;
                if (fk.onDelete)
                    constraint += ` ON DELETE ${fk.onDelete}`;
                if (fk.onUpdate)
                    constraint += ` ON UPDATE ${fk.onUpdate}`;

                return constraint;
            }).join(", ");

            sql += `, ${foreignKeysSql}`;
        }

        if (table.primaryColumns.length > 0) {
            const columnNames = table.primaryColumns.map(column => `\`${column.name}\``).join(", ");
            sql += `, PRIMARY KEY (${columnNames})`;
        }

        sql += `) ENGINE=${table.engine || "InnoDB"}`;

        return new Query(sql);
    }

    /**
     * Builds drop table sql
     */
    protected dropTableSql(tableOrName: Table|string): Query {
        return new Query(`DROP TABLE ${this.escapePath(tableOrName)}`);
    }

    protected createViewSql(view: View): Query {
        if (typeof view.expression === "string") {
            return new Query(`CREATE VIEW ${this.escapePath(view)} AS ${view.expression}`);
        } else {
            return new Query(`CREATE VIEW ${this.escapePath(view)} AS ${view.expression(this.connection).getQuery()}`);
        }
    }

    protected async insertViewDefinitionSql(view: View): Promise<Query> {
        const currentDatabase = await this.getCurrentDatabase();
        const expression = typeof view.expression === "string" ? view.expression.trim() : view.expression(this.connection).getQuery();
        const [query, parameters] = this.connection.createQueryBuilder()
            .insert()
            .into(this.getTypeormMetadataTableName())
            .values({ type: "VIEW", schema: currentDatabase, name: view.name, value: expression })
            .getQueryAndParameters();

        return new Query(query, parameters);
    }

    /**
     * Builds drop view sql.
     */
    protected dropViewSql(viewOrPath: View|string): Query {
        return new Query(`DROP VIEW ${this.escapePath(viewOrPath)}`);
    }

    /**
     * Builds remove view sql.
     */
    protected async deleteViewDefinitionSql(viewOrPath: View|string): Promise<Query> {
        const currentDatabase = await this.getCurrentDatabase();
        const viewName = viewOrPath instanceof View ? viewOrPath.name : viewOrPath;
        const qb = this.connection.createQueryBuilder();
        const [query, parameters] = qb.delete()
            .from(this.getTypeormMetadataTableName())
            .where(`${qb.escape("type")} = 'VIEW'`)
            .andWhere(`${qb.escape("schema")} = :schema`, { schema: currentDatabase })
            .andWhere(`${qb.escape("name")} = :name`, { name: viewName })
            .getQueryAndParameters();

        return new Query(query, parameters);
    }

    /**
     * Builds create index sql.
     */
    protected createIndexSql(table: Table, index: TableIndex): Query {
        const columns = index.columnNames.map(columnName => `\`${columnName}\``).join(", ");
        let indexType = "";
        if (index.isUnique)
            indexType += "UNIQUE ";
        if (index.isSpatial)
            indexType += "SPATIAL ";
        if (index.isFulltext)
            indexType += "FULLTEXT ";
        const indexParser = index.isFulltext && index.parser ? ` WITH PARSER ${index.parser}` : "";

        return new Query(`CREATE ${indexType}INDEX \`${index.name}\` ON ${this.escapePath(table)} (${columns})${indexParser}`);
    }

    /**
     * Builds drop index sql.
     */
    protected dropIndexSql(table: Table, indexOrName: TableIndex|string): Query {
        let indexName = indexOrName instanceof TableIndex ? indexOrName.name : indexOrName;
        return new Query(`DROP INDEX \`${indexName}\` ON ${this.escapePath(table)}`);
    }

    /**
     * Builds create primary key sql.
     */
    protected createPrimaryKeySql(table: Table, columnNames: string[]): Query {
        const columnNamesString = columnNames.map(columnName => `\`${columnName}\``).join(", ");
        return new Query(`ALTER TABLE ${this.escapePath(table)} ADD PRIMARY KEY (${columnNamesString})`);
    }

    /**
     * Builds drop primary key sql.
     */
    protected dropPrimaryKeySql(table: Table): Query {
        return new Query(`ALTER TABLE ${this.escapePath(table)} DROP PRIMARY KEY`);
    }

    /**
     * Builds create foreign key sql.
     */
    protected createForeignKeySql(table: Table, foreignKey: TableForeignKey): Query {
        const columnNames = foreignKey.columnNames.map(column => `\`${column}\``).join(", ");
        const referencedColumnNames = foreignKey.referencedColumnNames.map(column => `\`${column}\``).join(",");
        let sql = `ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (${columnNames}) ` +
            `REFERENCES ${this.escapePath(foreignKey.referencedTableName)}(${referencedColumnNames})`;
        if (foreignKey.onDelete)
            sql += ` ON DELETE ${foreignKey.onDelete}`;
        if (foreignKey.onUpdate)
            sql += ` ON UPDATE ${foreignKey.onUpdate}`;

        return new Query(sql);
    }

    /**
     * Builds drop foreign key sql.
     */
    protected dropForeignKeySql(table: Table, foreignKeyOrName: TableForeignKey|string): Query {
        const foreignKeyName = foreignKeyOrName instanceof TableForeignKey ? foreignKeyOrName.name : foreignKeyOrName;
        return new Query(`ALTER TABLE ${this.escapePath(table)} DROP FOREIGN KEY \`${foreignKeyName}\``);
    }

    protected parseTableName(target: Table|string) {
        const tableName = target instanceof Table ? target.name : target;
        return {
            database: tableName.indexOf(".") !== -1 ? tableName.split(".")[0] : this.driver.database,
            tableName: tableName.indexOf(".") !== -1 ? tableName.split(".")[1] : tableName
        };
    }

    /**
     * Escapes given table or view path.
     */
    protected escapePath(target: Table|View|string, disableEscape?: boolean): string {
        const tableName = target instanceof Table || target instanceof View ? target.name : target;
        return tableName.split(".").map(i => disableEscape ? i : `\`${i}\``).join(".");
    }

    /**
     * Builds a part of query to create/change a column.
     */
    protected buildCreateColumnSql(column: TableColumn, skipPrimary: boolean, skipName: boolean = false) {
        let c = "";
        if (skipName) {
            c = this.connection.driver.createFullType(column);
        } else {
            c = `\`${column.name}\` ${this.connection.driver.createFullType(column)}`;
        }
        if (column.asExpression)
            c += ` AS (${column.asExpression}) ${column.generatedType ? column.generatedType : "VIRTUAL"}`;

        // if you specify ZEROFILL for a numeric column, MySQL automatically adds the UNSIGNED attribute to that column.
        if (column.zerofill) {
            c += " ZEROFILL";
        } else if (column.unsigned) {
            c += " UNSIGNED";
        }
        if (column.enum)
            c += ` (${column.enum.map(value => "'" + value.replace("'", "''") + "'").join(", ")})`;
        if (column.charset)
            c += ` CHARACTER SET "${column.charset}"`;
        if (column.collation)
            c += ` COLLATE "${column.collation}"`;
        if (!column.isNullable)
            c += " NOT NULL";
        if (column.isNullable)
            c += " NULL";
        if (column.isPrimary && !skipPrimary)
            c += " PRIMARY KEY";
        if (column.isGenerated && column.generationStrategy === "increment") // don't use skipPrimary here since updates can update already exist primary without auto inc.
            c += " AUTO_INCREMENT";
        if (column.comment)
            c += ` COMMENT '${column.comment}'`;
        if (column.default !== undefined && column.default !== null)
            c += ` DEFAULT ${column.default}`;
        if (column.onUpdate)
            c += ` ON UPDATE ${column.onUpdate}`;

        return c;
    }

    protected async getVersion(): Promise<string> {
        const result = await this.query(`SELECT VERSION() AS \`version\``);
        return result[0]["version"];
    }

}
