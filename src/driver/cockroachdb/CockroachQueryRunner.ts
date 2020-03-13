import {QueryRunner} from "../../query-runner/QueryRunner";
import {ObjectLiteral} from "../../common/ObjectLiteral";
import {TransactionAlreadyStartedError} from "../../error/TransactionAlreadyStartedError";
import {TransactionNotStartedError} from "../../error/TransactionNotStartedError";
import {NotImplementedError} from "../../error/NotImplementedError";
import {TableColumn} from "../../schema-builder/table/TableColumn";
import {Table} from "../../schema-builder/table/Table";
import {TableIndex} from "../../schema-builder/table/TableIndex";
import {TableForeignKey} from "../../schema-builder/table/TableForeignKey";
import {QueryRunnerAlreadyReleasedError} from "../../error/QueryRunnerAlreadyReleasedError";
import {View} from "../../schema-builder/view/View";
import {Query} from "../Query";
import {CockroachDriver} from "./CockroachDriver";
import {ReadStream} from "../../platform/PlatformTools";
import {QueryFailedError} from "../../error/QueryFailedError";
import {Broadcaster} from "../../subscriber/Broadcaster";
import {TableIndexOptions} from "../../schema-builder/options/TableIndexOptions";
import {TableUnique} from "../../schema-builder/table/TableUnique";
import {BaseQueryRunner} from "../../query-runner/BaseQueryRunner";
import {OrmUtils} from "../../util/OrmUtils";
import {PromiseUtils} from "../../";
import {TableCheck} from "../../schema-builder/table/TableCheck";
import {ColumnType} from "../../index";
import {IsolationLevel} from "../types/IsolationLevel";
import {TableExclusion} from "../../schema-builder/table/TableExclusion";

/**
 * Runs queries on a single postgres database connection.
 */
export class CockroachQueryRunner extends BaseQueryRunner implements QueryRunner {

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Database driver used by connection.
     */
    driver: CockroachDriver;

    // -------------------------------------------------------------------------
    // Protected Properties
    // -------------------------------------------------------------------------

    /**
     * Promise used to obtain a database connection for a first time.
     */
    protected databaseConnectionPromise: Promise<any>;

    /**
     * Special callback provided by a driver used to release a created connection.
     */
    protected releaseCallback: Function;

    /**
     * Stores all executed queries to be able to run them again if transaction fails.
     */
    protected queries: { query: string, parameters?: any[] }[] = [];

    /**
     * Indicates if running queries must be stored
     */
    protected storeQueries: boolean = false;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(driver: CockroachDriver, mode: "master"|"slave" = "master") {
        super();
        this.driver = driver;
        this.connection = driver.connection;
        this.mode = mode;
        this.broadcaster = new Broadcaster(this);
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

        if (this.mode === "slave" && this.driver.isReplicated)  {
            this.databaseConnectionPromise = this.driver.obtainSlaveConnection().then(([ connection, release]: any[]) => {
                this.driver.connectedQueryRunners.push(this);
                this.databaseConnection = connection;
                this.releaseCallback = release;
                return this.databaseConnection;
            });

        } else { // master
            this.databaseConnectionPromise = this.driver.obtainMasterConnection().then(([connection, release]: any[]) => {
                this.driver.connectedQueryRunners.push(this);
                this.databaseConnection = connection;
                this.releaseCallback = release;
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
        if (this.releaseCallback)
            this.releaseCallback();

        const index = this.driver.connectedQueryRunners.indexOf(this);
        if (index !== -1) this.driver.connectedQueryRunners.splice(index);

        return Promise.resolve();
    }

    /**
     * Starts transaction.
     */
    async startTransaction(isolationLevel?: IsolationLevel): Promise<void> {
        if (this.isTransactionActive)
            throw new TransactionAlreadyStartedError();

        this.isTransactionActive = true;
        await this.query("START TRANSACTION");
        await this.query("SAVEPOINT cockroach_restart");
        if (isolationLevel) {
            await this.query("SET TRANSACTION ISOLATION LEVEL " + isolationLevel);
        }
        this.storeQueries = true;
    }

    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    async commitTransaction(): Promise<void> {
        if (!this.isTransactionActive)
            throw new TransactionNotStartedError();

        this.storeQueries = false;

        try {
            await this.query("RELEASE SAVEPOINT cockroach_restart");
            await this.query("COMMIT");
            this.queries = [];
            this.isTransactionActive = false;

        } catch (e) {
            if (e.code === "40001") {
                await this.query("ROLLBACK TO SAVEPOINT cockroach_restart");
                await PromiseUtils.runInSequence(this.queries, q => this.query(q.query, q.parameters));
                await this.commitTransaction();
            }
        }
    }

    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     */
    async rollbackTransaction(): Promise<void> {
        if (!this.isTransactionActive)
            throw new TransactionNotStartedError();

        this.storeQueries = false;
        await this.query("ROLLBACK");
        this.queries = [];
        this.isTransactionActive = false;
    }

    /**
     * Executes a given SQL query.
     */
    query(query: string, parameters?: any[], options?: {  }): Promise<any> {
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError();

        return new Promise<any[]>(async (ok, fail) => {
            try {
                const databaseConnection = await this.connect();
                this.driver.connection.logger.logQuery(query, parameters, this);
                const queryStartTime = +new Date();

                databaseConnection.query(query, parameters, (err: any, result: any) => {
                    if (this.isTransactionActive && this.storeQueries)
                        this.queries.push({ query, parameters });

                    // log slow queries if maxQueryExecution time is set
                    const maxQueryExecutionTime = this.driver.connection.options.maxQueryExecutionTime;
                    const queryEndTime = +new Date();
                    const queryExecutionTime = queryEndTime - queryStartTime;
                    if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
                        this.driver.connection.logger.logQuerySlow(queryExecutionTime, query, parameters, this);

                    if (err) {
                        if (err.code !== "40001")
                            this.driver.connection.logger.logQueryError(err, query, parameters, this);
                        fail(new QueryFailedError(query, parameters, err));
                    } else {
                        switch (result.command) {
                            case "DELETE":
                                // for DELETE query additionally return number of affected rows
                                ok([result.rows, result.rowCount]);
                                break;
                            default:
                                ok(result.rows);
                        }
                    }
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
        const QueryStream = this.driver.loadStreamDependency();
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError();

        return new Promise(async (ok, fail) => {
            try {
                const databaseConnection = await this.connect();
                this.driver.connection.logger.logQuery(query, parameters, this);
                const stream = databaseConnection.query(new QueryStream(query, parameters));
                if (onEnd) stream.on("end", onEnd);
                if (onError) stream.on("error", onError);
                ok(stream);

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
        throw new NotImplementedError();
    }

    /**
     * Checks if database with the given name exist.
     */
    async hasDatabase(database: string): Promise<boolean> {
        const result = await this.query(`SELECT * FROM "pg_database" WHERE "datname" = '${database}'`);
        return result.length ? true : false;
    }

    /**
     * Checks if schema with the given name exist.
     */
    async hasSchema(schema: string): Promise<boolean> {
        const result = await this.query(`SELECT * FROM "information_schema"."schemata" WHERE "schema_name" = '${schema}'`);
        return result.length ? true : false;
    }

    /**
     * Checks if table with the given name exist in the database.
     */
    async hasTable(tableOrName: Table|string): Promise<boolean> {
        const parsedTableName = this.parseTableName(tableOrName);
        const sql = `SELECT * FROM "information_schema"."tables" WHERE "table_schema" = ${parsedTableName.schema} AND "table_name" = ${parsedTableName.tableName}`;
        const result = await this.query(sql);
        return result.length ? true : false;
    }

    /**
     * Checks if column with the given name exist in the given table.
     */
    async hasColumn(tableOrName: Table|string, columnName: string): Promise<boolean> {
        const parsedTableName = this.parseTableName(tableOrName);
        const sql = `SELECT * FROM "information_schema"."columns" WHERE "table_schema" = ${parsedTableName.schema} AND "table_name" = ${parsedTableName.tableName} AND "column_name" = '${columnName}'`;
        const result = await this.query(sql);
        return result.length ? true : false;
    }

    /**
     * Creates a new database.
     */
    async createDatabase(database: string, ifNotExist?: boolean): Promise<void> {
        const up = `CREATE DATABASE ${ifNotExist ? "IF NOT EXISTS " : ""} "${database}"`;
        const down = `DROP DATABASE "${database}"`;
        await this.executeQueries(new Query(up), new Query(down));
    }

    /**
     * Drops database.
     */
    async dropDatabase(database: string, ifExist?: boolean): Promise<void> {
        const up = `DROP DATABASE ${ifExist ? "IF EXISTS " : ""} "${database}"`;
        const down = `CREATE DATABASE "${database}"`;
        await this.executeQueries(new Query(up), new Query(down));
    }

    /**
     * Creates a new table schema.
     */
    async createSchema(schema: string, ifNotExist?: boolean): Promise<void> {
        const up = ifNotExist ? `CREATE SCHEMA IF NOT EXISTS "${schema}"` : `CREATE SCHEMA "${schema}"`;
        const down = `DROP SCHEMA "${schema}" CASCADE`;
        await this.executeQueries(new Query(up), new Query(down));
    }

    /**
     * Drops table schema.
     */
    async dropSchema(schemaPath: string, ifExist?: boolean, isCascade?: boolean): Promise<void> {
        const schema = schemaPath.indexOf(".") === -1 ? schemaPath : schemaPath.split(".")[0];
        const up = ifExist ? `DROP SCHEMA IF EXISTS "${schema}" ${isCascade ? "CASCADE" : ""}` : `DROP SCHEMA "${schema}" ${isCascade ? "CASCADE" : ""}`;
        const down = `CREATE SCHEMA "${schema}"`;
        await this.executeQueries(new Query(up), new Query(down));
    }

    /**
     * Creates a new table.
     */
    async createTable(table: Table, ifNotExist: boolean = false, createForeignKeys: boolean = true, createIndices: boolean = true): Promise<void> {
        if (ifNotExist) {
            const isTableExist = await this.hasTable(table);
            if (isTableExist) return Promise.resolve();
        }
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        table.columns
            .filter(column => column.isGenerated && column.generationStrategy === "increment")
            .forEach(column => {
                upQueries.push(new Query(`CREATE SEQUENCE ${this.buildSequenceName(table, column)}`));
                downQueries.push(new Query(`DROP SEQUENCE ${this.buildSequenceName(table, column)}`));
            });

        upQueries.push(this.createTableSql(table, createForeignKeys));
        downQueries.push(this.dropTableSql(table));

        // if createForeignKeys is true, we must drop created foreign keys in down query.
        // createTable does not need separate method to create foreign keys, because it create fk's in the same query with table creation.
        if (createForeignKeys)
            table.foreignKeys.forEach(foreignKey => downQueries.push(this.dropForeignKeySql(table, foreignKey)));

        if (createIndices) {
            table.indices
                .filter(index => !index.isUnique)
                .forEach(index => {

                    // new index may be passed without name. In this case we generate index name manually.
                    if (!index.name)
                        index.name = this.connection.namingStrategy.indexName(table.name, index.columnNames, index.where);
                    upQueries.push(this.createIndexSql(table, index));
                    downQueries.push(this.dropIndexSql(table, index));
                });
        }

        await this.executeQueries(upQueries, downQueries);
    }

    /**
     * Drops the table.
     */
    async dropTable(target: Table|string, ifExist?: boolean, dropForeignKeys: boolean = true, dropIndices: boolean = true): Promise<void> {// It needs because if table does not exist and dropForeignKeys or dropIndices is true, we don't need
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

        // foreign keys must be dropped before indices, because fk's rely on indices
        if (dropForeignKeys)
            table.foreignKeys.forEach(foreignKey => upQueries.push(this.dropForeignKeySql(table, foreignKey)));

        if (dropIndices) {
            table.indices.forEach(index => {
                upQueries.push(this.dropIndexSql(table, index));
                downQueries.push(this.createIndexSql(table, index));
            });
        }

        upQueries.push(this.dropTableSql(table));
        downQueries.push(this.createTableSql(table, createForeignKeys));

        table.columns
            .filter(column => column.isGenerated && column.generationStrategy === "increment")
            .forEach(column => {
                upQueries.push(new Query(`DROP SEQUENCE ${this.buildSequenceName(table, column)}`));
                downQueries.push(new Query(`CREATE SEQUENCE ${this.buildSequenceName(table, column)}`));
            });

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
     * Renames the given table.
     */
    async renameTable(oldTableOrName: Table|string, newTableName: string): Promise<void> {
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];
        const oldTable = oldTableOrName instanceof Table ? oldTableOrName : await this.getCachedTable(oldTableOrName);
        const newTable = oldTable.clone();
        const oldTableName = oldTable.name.indexOf(".") === -1 ? oldTable.name : oldTable.name.split(".")[1];
        const schemaName = oldTable.name.indexOf(".") === -1 ? undefined : oldTable.name.split(".")[0];
        newTable.name = schemaName ? `${schemaName}.${newTableName}` : newTableName;

        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(oldTable)} RENAME TO "${newTableName}"`));
        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME TO "${oldTableName}"`));

        // rename column primary key constraint
        if (newTable.primaryColumns.length > 0) {
            const columnNames = newTable.primaryColumns.map(column => column.name);

            const oldPkName = this.connection.namingStrategy.primaryKeyName(oldTable, columnNames);
            const newPkName = this.connection.namingStrategy.primaryKeyName(newTable, columnNames);

            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${oldPkName}" TO "${newPkName}"`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${newPkName}" TO "${oldPkName}"`));
        }

        // rename unique constraints
        newTable.uniques.forEach(unique => {
            // build new constraint name
            const newUniqueName = this.connection.namingStrategy.uniqueConstraintName(newTable, unique.columnNames);

            // build queries
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${unique.name}" TO "${newUniqueName}"`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${newUniqueName}" TO "${unique.name}"`));

            // replace constraint name
            unique.name = newUniqueName;
        });

        // rename index constraints
        newTable.indices.forEach(index => {
            // build new constraint name
            const schema = this.extractSchema(newTable);
            const newIndexName = this.connection.namingStrategy.indexName(newTable, index.columnNames, index.where);

            // build queries
            const up = schema ? `ALTER INDEX "${schema}"."${index.name}" RENAME TO "${newIndexName}"` : `ALTER INDEX "${index.name}" RENAME TO "${newIndexName}"`;
            const down = schema ? `ALTER INDEX "${schema}"."${newIndexName}" RENAME TO "${index.name}"` : `ALTER INDEX "${newIndexName}" RENAME TO "${index.name}"`;
            upQueries.push(new Query(up));
            downQueries.push(new Query(down));

            // replace constraint name
            index.name = newIndexName;
        });

        // rename foreign key constraints
        newTable.foreignKeys.forEach(foreignKey => {
            // build new constraint name
            const newForeignKeyName = this.connection.namingStrategy.foreignKeyName(newTable, foreignKey.columnNames, foreignKey.referencedTableName, foreignKey.referencedColumnNames);

            // build queries
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${foreignKey.name}" TO "${newForeignKeyName}"`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(newTable)} RENAME CONSTRAINT "${newForeignKeyName}" TO "${foreignKey.name}"`));

            // replace constraint name
            foreignKey.name = newForeignKeyName;
        });

        await this.executeQueries(upQueries, downQueries);
    }

    /**
     * Creates a new column from the column in the table.
     */
    async addColumn(tableOrName: Table|string, column: TableColumn): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const clonedTable = table.clone();
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        if (column.generationStrategy === "increment") {
            throw new Error(`Adding sequential generated columns into existing table is not supported`);
        }

        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD ${this.buildCreateColumnSql(table, column)}`));
        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP COLUMN "${column.name}"`));

        // create or update primary key constraint
        if (column.isPrimary) {
            const primaryColumns = clonedTable.primaryColumns;
            // if table already have primary key, me must drop it and recreate again
            // todo: altering pk is not supported yet https://github.com/cockroachdb/cockroach/issues/19141
            if (primaryColumns.length > 0) {
                const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
            }

            primaryColumns.push(column);
            const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
            const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
        }

        // create column index
        const columnIndex = clonedTable.indices.find(index => index.columnNames.length === 1 && index.columnNames[0] === column.name);
        if (columnIndex) {
            // CockroachDB stores unique indices as UNIQUE constraints
            if (columnIndex.isUnique) {
                const unique = new TableUnique({
                    name: this.connection.namingStrategy.uniqueConstraintName(table.name, columnIndex.columnNames),
                    columnNames: columnIndex.columnNames
                });
                upQueries.push(this.createUniqueConstraintSql(table, unique));
                downQueries.push(this.dropIndexSql(table, unique));
                clonedTable.uniques.push(unique);

            } else {
                upQueries.push(this.createIndexSql(table, columnIndex));
                downQueries.push(this.dropIndexSql(table, columnIndex));
            }
        }

        // create unique constraint
        if (column.isUnique) {
            const uniqueConstraint = new TableUnique({
                name: this.connection.namingStrategy.uniqueConstraintName(table.name, [column.name]),
                columnNames: [column.name]
            });
            clonedTable.uniques.push(uniqueConstraint);
            upQueries.push(this.createUniqueConstraintSql(table, uniqueConstraint));
            downQueries.push(this.dropIndexSql(table, uniqueConstraint.name!)); // CockroachDB creates indices for unique constraints
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

        let newColumn;
        if (newTableColumnOrName instanceof TableColumn) {
            newColumn = newTableColumnOrName;
        } else {
            newColumn = oldColumn.clone();
            newColumn.name = newTableColumnOrName;
        }

        return this.changeColumn(table, oldColumn, newColumn);
    }

    /**
     * Changes a column in the table.
     */
    async changeColumn(tableOrName: Table|string, oldTableColumnOrName: TableColumn|string, newColumn: TableColumn): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        let clonedTable = table.clone();
        const upQueries: Query[] = [];
        const downQueries: Query[] = [];

        const oldColumn = oldTableColumnOrName instanceof TableColumn
            ? oldTableColumnOrName
            : table.columns.find(column => column.name === oldTableColumnOrName);
        if (!oldColumn)
            throw new Error(`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`);

        if (oldColumn.type !== newColumn.type || oldColumn.length !== newColumn.length) {
            // To avoid data conversion, we just recreate column
            await this.dropColumn(table, oldColumn);
            await this.addColumn(table, newColumn);

            // update cloned table
            clonedTable = table.clone();

        } else {
            if (oldColumn.name !== newColumn.name) {
                // rename column
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME COLUMN "${oldColumn.name}" TO "${newColumn.name}"`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME COLUMN "${newColumn.name}" TO "${oldColumn.name}"`));

                // rename column primary key constraint
                if (oldColumn.isPrimary === true) {
                    const primaryColumns = clonedTable.primaryColumns;

                    // build old primary constraint name
                    const columnNames = primaryColumns.map(column => column.name);
                    const oldPkName = this.connection.namingStrategy.primaryKeyName(clonedTable, columnNames);

                    // replace old column name with new column name
                    columnNames.splice(columnNames.indexOf(oldColumn.name), 1);
                    columnNames.push(newColumn.name);

                    // build new primary constraint name
                    const newPkName = this.connection.namingStrategy.primaryKeyName(clonedTable, columnNames);

                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${oldPkName}" TO "${newPkName}"`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newPkName}" TO "${oldPkName}"`));
                }

                // rename unique constraints
                clonedTable.findColumnUniques(oldColumn).forEach(unique => {
                    // build new constraint name
                    unique.columnNames.splice(unique.columnNames.indexOf(oldColumn.name), 1);
                    unique.columnNames.push(newColumn.name);
                    const newUniqueName = this.connection.namingStrategy.uniqueConstraintName(clonedTable, unique.columnNames);

                    // build queries
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${unique.name}" TO "${newUniqueName}"`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newUniqueName}" TO "${unique.name}"`));

                    // replace constraint name
                    unique.name = newUniqueName;
                });

                // rename index constraints
                clonedTable.findColumnIndices(oldColumn).forEach(index => {
                    // build new constraint name
                    index.columnNames.splice(index.columnNames.indexOf(oldColumn.name), 1);
                    index.columnNames.push(newColumn.name);
                    const schema = this.extractSchema(table);
                    const newIndexName = this.connection.namingStrategy.indexName(clonedTable, index.columnNames, index.where);

                    // build queries
                    const up = schema ? `ALTER INDEX "${schema}"."${index.name}" RENAME TO "${newIndexName}"` : `ALTER INDEX "${index.name}" RENAME TO "${newIndexName}"`;
                    const down = schema ? `ALTER INDEX "${schema}"."${newIndexName}" RENAME TO "${index.name}"` : `ALTER INDEX "${newIndexName}" RENAME TO "${index.name}"`;
                    upQueries.push(new Query(up));
                    downQueries.push(new Query(down));

                    // replace constraint name
                    index.name = newIndexName;
                });

                // rename foreign key constraints
                clonedTable.findColumnForeignKeys(oldColumn).forEach(foreignKey => {
                    // build new constraint name
                    foreignKey.columnNames.splice(foreignKey.columnNames.indexOf(oldColumn.name), 1);
                    foreignKey.columnNames.push(newColumn.name);
                    const newForeignKeyName = this.connection.namingStrategy.foreignKeyName(clonedTable, foreignKey.columnNames, foreignKey.referencedTableName, foreignKey.referencedColumnNames);

                    // build queries
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${foreignKey.name}" TO "${newForeignKeyName}"`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} RENAME CONSTRAINT "${newForeignKeyName}" TO "${foreignKey.name}"`));

                    // replace constraint name
                    foreignKey.name = newForeignKeyName;
                });

                // rename old column in the Table object
                const oldTableColumn = clonedTable.columns.find(column => column.name === oldColumn.name);
                clonedTable.columns[clonedTable.columns.indexOf(oldTableColumn!)].name = newColumn.name;
                oldColumn.name = newColumn.name;
            }

            if (newColumn.precision !== oldColumn.precision || newColumn.scale !== oldColumn.scale) {
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${this.driver.createFullType(newColumn)}`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" TYPE ${this.driver.createFullType(oldColumn)}`));
            }

            if (oldColumn.isNullable !== newColumn.isNullable) {
                if (newColumn.isNullable) {
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" DROP NOT NULL`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" SET NOT NULL`));
                } else {
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" SET NOT NULL`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${oldColumn.name}" DROP NOT NULL`));
                }
            }

            if (oldColumn.comment !== newColumn.comment) {
                upQueries.push(new Query(`COMMENT ON COLUMN ${this.escapePath(table)}."${oldColumn.name}" IS '${newColumn.comment}'`));
                downQueries.push(new Query(`COMMENT ON COLUMN ${this.escapePath(table)}."${newColumn.name}" IS '${oldColumn.comment}'`));
            }

            if (newColumn.isPrimary !== oldColumn.isPrimary) {
                const primaryColumns = clonedTable.primaryColumns;

                // if primary column state changed, we must always drop existed constraint.
                if (primaryColumns.length > 0) {
                    const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                    const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                }

                if (newColumn.isPrimary === true) {
                    primaryColumns.push(newColumn);
                    // update column in table
                    const column = clonedTable.columns.find(column => column.name === newColumn.name);
                    column!.isPrimary = true;
                    const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                    const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));

                } else {
                    const primaryColumn = primaryColumns.find(c => c.name === newColumn.name);
                    primaryColumns.splice(primaryColumns.indexOf(primaryColumn!), 1);

                    // update column in table
                    const column = clonedTable.columns.find(column => column.name === newColumn.name);
                    column!.isPrimary = false;

                    // if we have another primary keys, we must recreate constraint.
                    if (primaryColumns.length > 0) {
                        const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
                        const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
                        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
                    }
                }
            }

            if (newColumn.isUnique !== oldColumn.isUnique) {
                if (newColumn.isUnique) {
                    const uniqueConstraint = new TableUnique({
                        name: this.connection.namingStrategy.uniqueConstraintName(table.name, [newColumn.name]),
                        columnNames: [newColumn.name]
                    });
                    clonedTable.uniques.push(uniqueConstraint);
                    upQueries.push(this.createUniqueConstraintSql(table, uniqueConstraint));
                    // CockroachDB creates index for UNIQUE constraint.
                    // We must use DROP INDEX ... CASCADE instead of DROP CONSTRAINT.
                    downQueries.push(this.dropIndexSql(table, uniqueConstraint));

                } else {
                    const uniqueConstraint = clonedTable.uniques.find(unique => {
                        return unique.columnNames.length === 1 && !!unique.columnNames.find(columnName => columnName === newColumn.name);
                    });
                    clonedTable.uniques.splice(clonedTable.uniques.indexOf(uniqueConstraint!), 1);
                    // CockroachDB creates index for UNIQUE constraint.
                    // We must use DROP INDEX ... CASCADE instead of DROP CONSTRAINT.
                    upQueries.push(this.dropIndexSql(table, uniqueConstraint!));
                    downQueries.push(this.createUniqueConstraintSql(table, uniqueConstraint!));
                }
            }

            if (oldColumn.isGenerated !== newColumn.isGenerated && newColumn.generationStrategy !== "uuid") {
                if (newColumn.isGenerated) {
                    if (newColumn.generationStrategy === "increment") {
                        throw new Error(`Adding sequential generated columns into existing table is not supported`);

                    } else if (newColumn.generationStrategy === "rowid") {
                        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT unique_rowid()`));
                        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    }

                } else {
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT unique_rowid()`));
                }
            }

            if (newColumn.default !== oldColumn.default) {
                if (newColumn.default !== null && newColumn.default !== undefined) {
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${newColumn.default}`));

                    if (oldColumn.default !== null && oldColumn.default !== undefined) {
                        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${oldColumn.default}`));
                    } else {
                        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    }

                } else if (oldColumn.default !== null && oldColumn.default !== undefined) {
                    upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" DROP DEFAULT`));
                    downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ALTER COLUMN "${newColumn.name}" SET DEFAULT ${oldColumn.default}`));
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
        // todo: altering pk is not supported yet https://github.com/cockroachdb/cockroach/issues/19141
        if (column.isPrimary) {
            const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, clonedTable.primaryColumns.map(column => column.name));
            const columnNames = clonedTable.primaryColumns.map(primaryColumn => `"${primaryColumn.name}"`).join(", ");
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} DROP CONSTRAINT "${pkName}"`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));

            // update column in table
            const tableColumn = clonedTable.findColumnByName(column.name);
            tableColumn!.isPrimary = false;

            // if primary key have multiple columns, we must recreate it without dropped column
            if (clonedTable.primaryColumns.length > 0) {
                const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, clonedTable.primaryColumns.map(column => column.name));
                const columnNames = clonedTable.primaryColumns.map(primaryColumn => `"${primaryColumn.name}"`).join(", ");
                upQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNames})`));
                downQueries.push(new Query(`ALTER TABLE ${this.escapePath(clonedTable)} DROP CONSTRAINT "${pkName}"`));
            }
        }

        // drop column index
        const columnIndex = clonedTable.indices.find(index => index.columnNames.length === 1 && index.columnNames[0] === column.name);
        if (columnIndex) {
            clonedTable.indices.splice(clonedTable.indices.indexOf(columnIndex), 1);
            upQueries.push(this.dropIndexSql(table, columnIndex));
            downQueries.push(this.createIndexSql(table, columnIndex));
        }

        // drop column check
        const columnCheck = clonedTable.checks.find(check => !!check.columnNames && check.columnNames.length === 1 && check.columnNames[0] === column.name);
        if (columnCheck) {
            clonedTable.checks.splice(clonedTable.checks.indexOf(columnCheck), 1);
            upQueries.push(this.dropCheckConstraintSql(table, columnCheck));
            downQueries.push(this.createCheckConstraintSql(table, columnCheck));
        }

        // drop column unique
        const columnUnique = clonedTable.uniques.find(unique => unique.columnNames.length === 1 && unique.columnNames[0] === column.name);
        if (columnUnique) {
            clonedTable.uniques.splice(clonedTable.uniques.indexOf(columnUnique), 1);
            upQueries.push(this.dropIndexSql(table, columnUnique.name!)); // CockroachDB creates indices for unique constraints
            downQueries.push(this.createUniqueConstraintSql(table, columnUnique));
        }

        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP COLUMN "${column.name}"`));
        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD ${this.buildCreateColumnSql(table, column)}`));

        if (column.generationStrategy === "increment") {
            upQueries.push(new Query(`DROP SEQUENCE ${this.buildSequenceName(table, column)}`));
            downQueries.push(new Query(`CREATE SEQUENCE ${this.buildSequenceName(table, column)}`));
        }

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

        // mark columns as primary, because dropPrimaryKeySql build constraint name from table primary column names.
        clonedTable.columns.forEach(column => {
            if (columnNames.find(columnName => columnName === column.name))
                column.isPrimary = true;
        });
        const down = this.dropPrimaryKeySql(clonedTable);

        await this.executeQueries(up, down);
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

        // if table already have primary columns, we must drop them.
        const primaryColumns = clonedTable.primaryColumns;
        if (primaryColumns.length > 0) {
            const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, primaryColumns.map(column => column.name));
            const columnNamesString = primaryColumns.map(column => `"${column.name}"`).join(", ");
            upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));
            downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNamesString})`));
        }

        // update columns in table.
        clonedTable.columns
            .filter(column => columnNames.indexOf(column.name) !== -1)
            .forEach(column => column.isPrimary = true);

        const pkName = this.connection.namingStrategy.primaryKeyName(clonedTable.name, columnNames);
        const columnNamesString = columnNames.map(columnName => `"${columnName}"`).join(", ");
        upQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${pkName}" PRIMARY KEY (${columnNamesString})`));
        downQueries.push(new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${pkName}"`));

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
     * Creates new unique constraint.
     */
    async createUniqueConstraint(tableOrName: Table|string, uniqueConstraint: TableUnique): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);

        // new unique constraint may be passed without name. In this case we generate unique name manually.
        if (!uniqueConstraint.name)
            uniqueConstraint.name = this.connection.namingStrategy.uniqueConstraintName(table.name, uniqueConstraint.columnNames);

        const up = this.createUniqueConstraintSql(table, uniqueConstraint);
        // CockroachDB creates index for UNIQUE constraint.
        // We must use DROP INDEX ... CASCADE instead of DROP CONSTRAINT.
        const down = this.dropIndexSql(table, uniqueConstraint);
        await this.executeQueries(up, down);
        table.addUniqueConstraint(uniqueConstraint);
    }

    /**
     * Creates new unique constraints.
     */
    async createUniqueConstraints(tableOrName: Table|string, uniqueConstraints: TableUnique[]): Promise<void> {
        await PromiseUtils.runInSequence(uniqueConstraints, uniqueConstraint => this.createUniqueConstraint(tableOrName, uniqueConstraint));
    }

    /**
     * Drops unique constraint.
     */
    async dropUniqueConstraint(tableOrName: Table|string, uniqueOrName: TableUnique|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const uniqueConstraint = uniqueOrName instanceof TableUnique ? uniqueOrName : table.uniques.find(u => u.name === uniqueOrName);
        if (!uniqueConstraint)
            throw new Error(`Supplied unique constraint was not found in table ${table.name}`);

        // CockroachDB creates index for UNIQUE constraint.
        // We must use DROP INDEX ... CASCADE instead of DROP CONSTRAINT.
        const up = this.dropIndexSql(table, uniqueConstraint);
        const down = this.createUniqueConstraintSql(table, uniqueConstraint);
        await this.executeQueries(up, down);
        table.removeUniqueConstraint(uniqueConstraint);
    }

    /**
     * Drops unique constraints.
     */
    async dropUniqueConstraints(tableOrName: Table|string, uniqueConstraints: TableUnique[]): Promise<void> {
        await PromiseUtils.runInSequence(uniqueConstraints, uniqueConstraint => this.dropUniqueConstraint(tableOrName, uniqueConstraint));
    }

    /**
     * Creates new check constraint.
     */
    async createCheckConstraint(tableOrName: Table|string, checkConstraint: TableCheck): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);

        // new unique constraint may be passed without name. In this case we generate unique name manually.
        if (!checkConstraint.name)
            checkConstraint.name = this.connection.namingStrategy.checkConstraintName(table.name, checkConstraint.expression!);

        const up = this.createCheckConstraintSql(table, checkConstraint);
        const down = this.dropCheckConstraintSql(table, checkConstraint);
        await this.executeQueries(up, down);
        table.addCheckConstraint(checkConstraint);
    }

    /**
     * Creates new check constraints.
     */
    async createCheckConstraints(tableOrName: Table|string, checkConstraints: TableCheck[]): Promise<void> {
        const promises = checkConstraints.map(checkConstraint => this.createCheckConstraint(tableOrName, checkConstraint));
        await Promise.all(promises);
    }

    /**
     * Drops check constraint.
     */
    async dropCheckConstraint(tableOrName: Table|string, checkOrName: TableCheck|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const checkConstraint = checkOrName instanceof TableCheck ? checkOrName : table.checks.find(c => c.name === checkOrName);
        if (!checkConstraint)
            throw new Error(`Supplied check constraint was not found in table ${table.name}`);

        const up = this.dropCheckConstraintSql(table, checkConstraint);
        const down = this.createCheckConstraintSql(table, checkConstraint);
        await this.executeQueries(up, down);
        table.removeCheckConstraint(checkConstraint);
    }

    /**
     * Drops check constraints.
     */
    async dropCheckConstraints(tableOrName: Table|string, checkConstraints: TableCheck[]): Promise<void> {
        const promises = checkConstraints.map(checkConstraint => this.dropCheckConstraint(tableOrName, checkConstraint));
        await Promise.all(promises);
    }

    /**
     * Creates new exclusion constraint.
     */
    async createExclusionConstraint(tableOrName: Table|string, exclusionConstraint: TableExclusion): Promise<void> {
        throw new Error(`CockroachDB does not support exclusion constraints.`);
    }

    /**
     * Creates new exclusion constraints.
     */
    async createExclusionConstraints(tableOrName: Table|string, exclusionConstraints: TableExclusion[]): Promise<void> {
        throw new Error(`CockroachDB does not support exclusion constraints.`);
    }

    /**
     * Drops exclusion constraint.
     */
    async dropExclusionConstraint(tableOrName: Table|string, exclusionOrName: TableExclusion|string): Promise<void> {
        throw new Error(`CockroachDB does not support exclusion constraints.`);
    }

    /**
     * Drops exclusion constraints.
     */
    async dropExclusionConstraints(tableOrName: Table|string, exclusionConstraints: TableExclusion[]): Promise<void> {
        throw new Error(`CockroachDB does not support exclusion constraints.`);
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
        await PromiseUtils.runInSequence(foreignKeys, foreignKey => this.createForeignKey(tableOrName, foreignKey));
    }

    /**
     * Drops a foreign key from the table.
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
        await PromiseUtils.runInSequence(foreignKeys, foreignKey => this.dropForeignKey(tableOrName, foreignKey));
    }

    /**
     * Creates a new index.
     */
    async createIndex(tableOrName: Table|string, index: TableIndex): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);

        // new index may be passed without name. In this case we generate index name manually.
        if (!index.name)
            index.name = this.connection.namingStrategy.indexName(table.name, index.columnNames, index.where);

        // CockroachDB stores unique indices and UNIQUE constraints
        if (index.isUnique) {
            const unique = new TableUnique({
                name: index.name,
                columnNames: index.columnNames
            });
            const up = this.createUniqueConstraintSql(table, unique);
            // CockroachDB also creates index for UNIQUE constraints.
            // We can't drop UNIQUE constraint with DROP CONSTRAINT. We must use DROP INDEX ... CASCADE instead.
            const down = this.dropIndexSql(table, unique);
            await this.executeQueries(up, down);
            table.addUniqueConstraint(unique);

        } else {
            const up = this.createIndexSql(table, index);
            const down = this.dropIndexSql(table, index);
            await this.executeQueries(up, down);
            table.addIndex(index);
        }
    }

    /**
     * Creates a new indices
     */
    async createIndices(tableOrName: Table|string, indices: TableIndex[]): Promise<void> {
        await PromiseUtils.runInSequence(indices, index => this.createIndex(tableOrName, index));
    }

    /**
     * Drops an index from the table.
     */
    async dropIndex(tableOrName: Table|string, indexOrName: TableIndex|string): Promise<void> {
        const table = tableOrName instanceof Table ? tableOrName : await this.getCachedTable(tableOrName);
        const index = indexOrName instanceof TableIndex ? indexOrName : table.indices.find(i => i.name === indexOrName);
        if (!index)
            throw new Error(`Supplied index was not found in table ${table.name}`);

        const up = this.dropIndexSql(table, index);
        const down = this.createIndexSql(table, index);
        await this.executeQueries(up, down);
        table.removeIndex(index);
    }

    /**
     * Drops an indices from the table.
     */
    async dropIndices(tableOrName: Table|string, indices: TableIndex[]): Promise<void> {
        await PromiseUtils.runInSequence(indices, index => this.dropIndex(tableOrName, index));
    }

    /**
     * Clears all table contents.
     * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
     */
    async clearTable(tableName: string): Promise<void> {
        await this.query(`TRUNCATE TABLE ${this.escapePath(tableName)}`);
    }

    /**
     * Removes all tables from the currently connected database.
     */
    async clearDatabase(): Promise<void> {
        const schemas: string[] = [];
        this.connection.entityMetadatas
            .filter(metadata => metadata.schema)
            .forEach(metadata => {
                const isSchemaExist = !!schemas.find(schema => schema === metadata.schema);
                if (!isSchemaExist)
                    schemas.push(metadata.schema!);
            });
        schemas.push(this.driver.options.schema || "current_schema()");
        const schemaNamesString = schemas.map(name => {
            return name === "current_schema()" ? name : "'" + name + "'";
        }).join(", ");

        await this.startTransaction();
        try {
            const selectViewDropsQuery = `SELECT 'DROP VIEW IF EXISTS "' || schemaname || '"."' || viewname || '" CASCADE;' as "query" ` +
                `FROM "pg_views" WHERE "schemaname" IN (${schemaNamesString})`;
            const dropViewQueries: ObjectLiteral[] = await this.query(selectViewDropsQuery);
            await Promise.all(dropViewQueries.map(q => this.query(q["query"])));

            const selectDropsQuery = `SELECT 'DROP TABLE IF EXISTS "' || table_schema || '"."' || table_name || '" CASCADE;' as "query" FROM "information_schema"."tables" WHERE "table_schema" IN (${schemaNamesString})`;
            const dropQueries: ObjectLiteral[] = await this.query(selectDropsQuery);
            await Promise.all(dropQueries.map(q => this.query(q["query"])));

            const selectSequenceDropsQuery = `SELECT 'DROP SEQUENCE "' || sequence_schema || '"."' || sequence_name || '";' as "query" FROM "information_schema"."sequences" WHERE "sequence_schema" IN (${schemaNamesString})`;
            const sequenceDropQueries: ObjectLiteral[] = await this.query(selectSequenceDropsQuery);
            await Promise.all(sequenceDropQueries.map(q => this.query(q["query"])));

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

    protected async loadViews(viewNames: string[]): Promise<View[]> {
        const hasTable = await this.hasTable(this.getTypeormMetadataTableName());
        if (!hasTable)
            return Promise.resolve([]);

        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];

        const viewsCondition = viewNames.map(viewName => {
            let [schema, name] = viewName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("t"."schema" = '${schema}' AND "t"."name" = '${name}')`;
        }).join(" OR ");

        const query = `SELECT "t".*, "v"."check_option" FROM ${this.escapePath(this.getTypeormMetadataTableName())} "t" ` +
            `INNER JOIN "information_schema"."views" "v" ON "v"."table_schema" = "t"."schema" AND "v"."table_name" = "t"."name" WHERE "t"."type" = 'VIEW' ${viewsCondition ? `AND (${viewsCondition})` : ""}`;
        const dbViews = await this.query(query);
        return dbViews.map((dbView: any) => {
            const view = new View();
            const schema = dbView["schema"] === currentSchema && !this.driver.options.schema ? undefined : dbView["schema"];
            view.name = this.driver.buildTableName(dbView["name"], schema);
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

        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];

        const tablesCondition = tableNames.map(tableName => {
            let [schema, name] = tableName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("table_schema" = '${schema}' AND "table_name" = '${name}')`;
        }).join(" OR ");
        const tablesSql = `SELECT * FROM "information_schema"."tables" WHERE ` + tablesCondition;
        const columnsSql = `SELECT * FROM "information_schema"."columns" WHERE "is_hidden" = 'NO' AND ` + tablesCondition;

        const constraintsCondition = tableNames.map(tableName => {
            let [schema, name] = tableName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("ns"."nspname" = '${schema}' AND "t"."relname" = '${name}')`;
        }).join(" OR ");

        const constraintsSql = `SELECT "ns"."nspname" AS "table_schema", "t"."relname" AS "table_name", "cnst"."conname" AS "constraint_name", ` +
            `pg_get_constraintdef("cnst"."oid") AS "expression", ` +
            `CASE "cnst"."contype" WHEN 'p' THEN 'PRIMARY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' WHEN 'x' THEN 'EXCLUDE' END AS "constraint_type", "a"."attname" AS "column_name" ` +
            `FROM "pg_constraint" "cnst" ` +
            `INNER JOIN "pg_class" "t" ON "t"."oid" = "cnst"."conrelid" ` +
            `INNER JOIN "pg_namespace" "ns" ON "ns"."oid" = "cnst"."connamespace" ` +
            `LEFT JOIN "pg_attribute" "a" ON "a"."attrelid" = "cnst"."conrelid" AND "a"."attnum" = ANY ("cnst"."conkey") ` +
            `WHERE "t"."relkind" = 'r' AND (${constraintsCondition})`;

        const indicesSql = `SELECT "ns"."nspname" AS "table_schema", "t"."relname" AS "table_name", "i"."relname" AS "constraint_name", "a"."attname" AS "column_name", ` +
            `CASE "ix"."indisunique" WHEN 't' THEN 'TRUE' ELSE'FALSE' END AS "is_unique", pg_get_expr("ix"."indpred", "ix"."indrelid") AS "condition", ` +
            `"types"."typname" AS "type_name" ` +
            `FROM "pg_class" "t" ` +
            `INNER JOIN "pg_index" "ix" ON "ix"."indrelid" = "t"."oid" ` +
            `INNER JOIN "pg_attribute" "a" ON "a"."attrelid" = "t"."oid"  AND "a"."attnum" = ANY ("ix"."indkey") ` +
            `INNER JOIN "pg_namespace" "ns" ON "ns"."oid" = "t"."relnamespace" ` +
            `INNER JOIN "pg_class" "i" ON "i"."oid" = "ix"."indexrelid" ` +
            `INNER JOIN "pg_type" "types" ON "types"."oid" = "a"."atttypid" ` +
            `LEFT JOIN "pg_constraint" "cnst" ON "cnst"."conname" = "i"."relname" ` +
            `WHERE "t"."relkind" = 'r' AND "cnst"."contype" IS NULL AND (${constraintsCondition})`;

        const foreignKeysCondition = tableNames.map(tableName => {
            let [schema, name] = tableName.split(".");
            if (!name) {
                name = schema;
                schema = this.driver.options.schema || currentSchema;
            }
            return `("ns"."nspname" = '${schema}' AND "cl"."relname" = '${name}')`;
        }).join(" OR ");
        const foreignKeysSql = `SELECT "con"."conname" AS "constraint_name", "con"."nspname" AS "table_schema", "con"."relname" AS "table_name", "att2"."attname" AS "column_name", ` +
            `"ns"."nspname" AS "referenced_table_schema", "cl"."relname" AS "referenced_table_name", "att"."attname" AS "referenced_column_name", "con"."confdeltype" AS "on_delete", "con"."confupdtype" AS "on_update" ` +
            `FROM ( ` +
            `SELECT UNNEST ("con1"."conkey") AS "parent", UNNEST ("con1"."confkey") AS "child", "con1"."confrelid", "con1"."conrelid", "con1"."conname", "con1"."contype", "ns"."nspname", "cl"."relname", ` +
            `CASE "con1"."confdeltype" WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END as "confdeltype", ` +
            `CASE "con1"."confupdtype" WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END as "confupdtype" ` +
            `FROM "pg_class" "cl" ` +
            `INNER JOIN "pg_namespace" "ns" ON "cl"."relnamespace" = "ns"."oid" ` +
            `INNER JOIN "pg_constraint" "con1" ON "con1"."conrelid" = "cl"."oid" ` +
            `WHERE "con1"."contype" = 'f' AND (${foreignKeysCondition}) ` +
            `) "con" ` +
            `INNER JOIN "pg_attribute" "att" ON "att"."attrelid" = "con"."confrelid" AND "att"."attnum" = "con"."child" ` +
            `INNER JOIN "pg_class" "cl" ON "cl"."oid" = "con"."confrelid" ` +
            `INNER JOIN "pg_namespace" "ns" ON "cl"."relnamespace" = "ns"."oid" ` +
            `INNER JOIN "pg_attribute" "att2" ON "att2"."attrelid" = "con"."conrelid" AND "att2"."attnum" = "con"."parent"`;
        const [dbTables, dbColumns, dbConstraints, dbIndices, dbForeignKeys]: ObjectLiteral[][] = await Promise.all([
            this.query(tablesSql),
            this.query(columnsSql),
            this.query(constraintsSql),
            this.query(indicesSql),
            this.query(foreignKeysSql),
        ]);

        // if tables were not found in the db, no need to proceed
        if (!dbTables.length)
            return [];

        // create tables for loaded tables
        return Promise.all(dbTables.map(async dbTable => {
            const table = new Table();

            // We do not need to join schema name, when database is by default.
            // In this case we need local variable `tableFullName` for below comparision.
            const schema = dbTable["table_schema"] === currentSchema && !this.driver.options.schema ? undefined : dbTable["table_schema"];
            table.name = this.driver.buildTableName(dbTable["table_name"], schema);
            const tableFullName = this.driver.buildTableName(dbTable["table_name"], dbTable["table_schema"]);

            // create columns from the loaded columns
            table.columns = await Promise.all(dbColumns
                .filter(dbColumn => this.driver.buildTableName(dbColumn["table_name"], dbColumn["table_schema"]) === tableFullName)
                .map(async dbColumn => {

                    const columnConstraints = dbConstraints.filter(dbConstraint => {
                        return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName && dbConstraint["column_name"] === dbColumn["column_name"];
                    });

                    const tableColumn = new TableColumn();
                    tableColumn.name = dbColumn["column_name"];

                    tableColumn.type = dbColumn["crdb_sql_type"].toLowerCase();
                    if (dbColumn["crdb_sql_type"].indexOf("COLLATE") !== -1) {
                        tableColumn.collation = dbColumn["crdb_sql_type"].substr(dbColumn["crdb_sql_type"].indexOf("COLLATE") + "COLLATE".length + 1, dbColumn["crdb_sql_type"].length);
                        tableColumn.type = tableColumn.type.substr(0, dbColumn["crdb_sql_type"].indexOf("COLLATE") - 1);
                    }

                    if (tableColumn.type.indexOf("(") !== -1)
                        tableColumn.type = tableColumn.type.substr(0, tableColumn.type.indexOf("("));

                    if (tableColumn.type === "numeric" || tableColumn.type === "decimal") {
                        if (dbColumn["numeric_precision"] !== null && !this.isDefaultColumnPrecision(table, tableColumn, dbColumn["numeric_precision"])) {
                            tableColumn.precision = parseInt(dbColumn["numeric_precision"]);
                        } else if (dbColumn["numeric_scale"] !== null && !this.isDefaultColumnScale(table, tableColumn, dbColumn["numeric_scale"])) {
                            tableColumn.precision = undefined;
                        }
                        if (dbColumn["numeric_scale"] !== null && !this.isDefaultColumnScale(table, tableColumn, dbColumn["numeric_scale"])) {
                            tableColumn.scale = parseInt(dbColumn["numeric_scale"]);
                        } else if (dbColumn["numeric_precision"] !== null && !this.isDefaultColumnPrecision(table, tableColumn, dbColumn["numeric_precision"])) {
                            tableColumn.scale = undefined;
                        }
                    }

                    if (dbColumn["data_type"].toLowerCase() === "array") {
                        tableColumn.isArray = true;
                        const type = dbColumn["crdb_sql_type"].replace("[]", "").toLowerCase();
                        tableColumn.type = this.connection.driver.normalizeType({type: type});
                    }

                    // check only columns that have length property
                    if (this.driver.withLengthColumnTypes.indexOf(tableColumn.type as ColumnType) !== -1 && dbColumn["character_maximum_length"]) {
                        const length = dbColumn["character_maximum_length"].toString();
                        tableColumn.length = !this.isDefaultColumnLength(table, tableColumn, length) ? length : "";
                    }
                    tableColumn.isNullable = dbColumn["is_nullable"] === "YES";
                    tableColumn.isPrimary = !!columnConstraints.find(constraint => constraint["constraint_type"] === "PRIMARY");

                    const uniqueConstraint = columnConstraints.find(constraint => constraint["constraint_type"] === "UNIQUE");
                    const isConstraintComposite = uniqueConstraint
                        ? !!dbConstraints.find(dbConstraint => dbConstraint["constraint_type"] === "UNIQUE"
                            && dbConstraint["constraint_name"] === uniqueConstraint["constraint_name"]
                            && dbConstraint["column_name"] !== dbColumn["column_name"])
                        : false;
                    tableColumn.isUnique = !!uniqueConstraint && !isConstraintComposite;

                    if (dbColumn["column_default"] !== null && dbColumn["column_default"] !== undefined) {
                        if (dbColumn["column_default"] === "unique_rowid()") {
                            tableColumn.isGenerated = true;
                            tableColumn.generationStrategy = "rowid";

                        } else if (dbColumn["column_default"].indexOf("nextval") !== -1) {
                            tableColumn.isGenerated = true;
                            tableColumn.generationStrategy = "increment";

                        } else if (dbColumn["column_default"] === "gen_random_uuid()") {
                            tableColumn.isGenerated = true;
                            tableColumn.generationStrategy = "uuid";

                        } else {
                            tableColumn.default = dbColumn["column_default"].replace(/:::.*/, "");
                        }
                    }

                    tableColumn.comment = ""; // dbColumn["COLUMN_COMMENT"];
                    if (dbColumn["character_set_name"])
                        tableColumn.charset = dbColumn["character_set_name"];

                    return tableColumn;
                }));

            // find unique constraints of table, group them by constraint name and build TableUnique.
            const tableUniqueConstraints = OrmUtils.uniq(dbConstraints.filter(dbConstraint => {
                return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName
                    && dbConstraint["constraint_type"] === "UNIQUE";
            }), dbConstraint => dbConstraint["constraint_name"]);

            table.uniques = tableUniqueConstraints.map(constraint => {
                const uniques = dbConstraints.filter(dbC => dbC["constraint_name"] === constraint["constraint_name"]);
                return new TableUnique({
                    name: constraint["constraint_name"],
                    columnNames: uniques.map(u => u["column_name"])
                });
            });

            // find check constraints of table, group them by constraint name and build TableCheck.
            const tableCheckConstraints = OrmUtils.uniq(dbConstraints.filter(dbConstraint => {
                return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName
                    && dbConstraint["constraint_type"] === "CHECK";
            }), dbConstraint => dbConstraint["constraint_name"]);

            table.checks = tableCheckConstraints.map(constraint => {
                const checks = dbConstraints.filter(dbC => dbC["constraint_name"] === constraint["constraint_name"]);
                return new TableCheck({
                    name: constraint["constraint_name"],
                    columnNames: checks.map(c => c["column_name"]),
                    expression: constraint["expression"].replace(/^\s*CHECK\s*\((.*)\)\s*$/i, "$1")
                });
            });

            // find exclusion constraints of table, group them by constraint name and build TableExclusion.
            const tableExclusionConstraints = OrmUtils.uniq(dbConstraints.filter(dbConstraint => {
                return this.driver.buildTableName(dbConstraint["table_name"], dbConstraint["table_schema"]) === tableFullName
                    && dbConstraint["constraint_type"] === "EXCLUDE";
            }), dbConstraint => dbConstraint["constraint_name"]);

            table.exclusions = tableExclusionConstraints.map(constraint => {
                return new TableExclusion({
                    name: constraint["constraint_name"],
                    expression: constraint["expression"].substring(8) // trim EXCLUDE from start of expression
                });
            });

            // find foreign key constraints of table, group them by constraint name and build TableForeignKey.
            const tableForeignKeyConstraints = OrmUtils.uniq(dbForeignKeys.filter(dbForeignKey => {
                return this.driver.buildTableName(dbForeignKey["table_name"], dbForeignKey["table_schema"]) === tableFullName;
            }), dbForeignKey => dbForeignKey["constraint_name"]);

            table.foreignKeys = tableForeignKeyConstraints.map(dbForeignKey => {
                const foreignKeys = dbForeignKeys.filter(dbFk => dbFk["constraint_name"] === dbForeignKey["constraint_name"]);

                // if referenced table located in currently used schema, we don't need to concat schema name to table name.
                const schema = dbForeignKey["referenced_table_schema"] === currentSchema ? undefined : dbForeignKey["referenced_table_schema"];
                const referencedTableName = this.driver.buildTableName(dbForeignKey["referenced_table_name"], schema);

                return new TableForeignKey({
                    name: dbForeignKey["constraint_name"],
                    columnNames: foreignKeys.map(dbFk => dbFk["column_name"]),
                    referencedTableName: referencedTableName,
                    referencedColumnNames: foreignKeys.map(dbFk => dbFk["referenced_column_name"]),
                    onDelete: dbForeignKey["on_delete"],
                    onUpdate: dbForeignKey["on_update"]
                });
            });

            // find index constraints of table, group them by constraint name and build TableIndex.
            const tableIndexConstraints = OrmUtils.uniq(dbIndices.filter(dbIndex => {
                return this.driver.buildTableName(dbIndex["table_name"], dbIndex["table_schema"]) === tableFullName;
            }), dbIndex => dbIndex["constraint_name"]);

            table.indices = tableIndexConstraints.map(constraint => {
                const indices = dbIndices.filter(index => index["constraint_name"] === constraint["constraint_name"]);
                return new TableIndex(<TableIndexOptions>{
                    table: table,
                    name: constraint["constraint_name"],
                    columnNames: indices.map(i => i["column_name"]),
                    isUnique: constraint["is_unique"] === "TRUE",
                    where: constraint["condition"],
                    isSpatial: indices.every(i => this.driver.spatialTypes.indexOf(i["type_name"]) >= 0),
                    isFulltext: false
                });
            });

            return table;
        }));
    }

    /**
     * Builds create table sql.
     */
    protected createTableSql(table: Table, createForeignKeys?: boolean): Query {
        const columnDefinitions = table.columns.map(column => this.buildCreateColumnSql(table, column)).join(", ");
        let sql = `CREATE TABLE ${this.escapePath(table)} (${columnDefinitions}`;

        table.columns
            .filter(column => column.isUnique)
            .forEach(column => {
                const isUniqueExist = table.uniques.some(unique => unique.columnNames.length === 1 && unique.columnNames[0] === column.name);
                if (!isUniqueExist)
                    table.uniques.push(new TableUnique({
                        name: this.connection.namingStrategy.uniqueConstraintName(table.name, [column.name]),
                        columnNames: [column.name]
                    }));
            });

        table.indices
            .filter(index => index.isUnique)
            .forEach(index => {
                table.uniques.push(new TableUnique({
                    name: this.connection.namingStrategy.uniqueConstraintName(table.name, index.columnNames),
                    columnNames: index.columnNames
                }));
            });

        if (table.uniques.length > 0) {
            const uniquesSql = table.uniques.map(unique => {
                const uniqueName = unique.name ? unique.name : this.connection.namingStrategy.uniqueConstraintName(table.name, unique.columnNames);
                const columnNames = unique.columnNames.map(columnName => `"${columnName}"`).join(", ");
                return `CONSTRAINT "${uniqueName}" UNIQUE (${columnNames})`;
            }).join(", ");

            sql += `, ${uniquesSql}`;
        }

        if (table.checks.length > 0) {
            const checksSql = table.checks.map(check => {
                const checkName = check.name ? check.name : this.connection.namingStrategy.checkConstraintName(table.name, check.expression!);
                return `CONSTRAINT "${checkName}" CHECK (${check.expression})`;
            }).join(", ");

            sql += `, ${checksSql}`;
        }

        if (table.foreignKeys.length > 0 && createForeignKeys) {
            const foreignKeysSql = table.foreignKeys.map(fk => {
                const columnNames = fk.columnNames.map(columnName => `"${columnName}"`).join(", ");
                if (!fk.name)
                    fk.name = this.connection.namingStrategy.foreignKeyName(table.name, fk.columnNames, fk.referencedTableName, fk.referencedColumnNames);
                const referencedColumnNames = fk.referencedColumnNames.map(columnName => `"${columnName}"`).join(", ");

                let constraint = `CONSTRAINT "${fk.name}" FOREIGN KEY (${columnNames}) REFERENCES ${this.escapePath(fk.referencedTableName)} (${referencedColumnNames})`;
                if (fk.onDelete)
                    constraint += ` ON DELETE ${fk.onDelete}`;
                if (fk.onUpdate)
                    constraint += ` ON UPDATE ${fk.onUpdate}`;

                return constraint;
            }).join(", ");

            sql += `, ${foreignKeysSql}`;
        }

        const primaryColumns = table.columns.filter(column => column.isPrimary);
        if (primaryColumns.length > 0) {
            const primaryKeyName = this.connection.namingStrategy.primaryKeyName(table.name, primaryColumns.map(column => column.name));
            const columnNames = primaryColumns.map(column => `"${column.name}"`).join(", ");
            sql += `, CONSTRAINT "${primaryKeyName}" PRIMARY KEY (${columnNames})`;
        }

        sql += `)`;

        return new Query(sql);
    }

    /**
     * Extracts schema name from given Table object or table name string.
     */
    protected extractSchema(target: Table|string): string|undefined {
        const tableName = target instanceof Table ? target.name : target;
        return tableName.indexOf(".") === -1 ? this.driver.options.schema : tableName.split(".")[0];
    }

    /**
     * Builds drop table sql.
     */
    protected dropTableSql(tableOrPath: Table|string): Query {
        return new Query(`DROP TABLE ${this.escapePath(tableOrPath)}`);
    }

    protected createViewSql(view: View): Query {
        if (typeof view.expression === "string") {
            return new Query(`CREATE VIEW ${this.escapePath(view)} AS ${view.expression}`);
        } else {
            return new Query(`CREATE VIEW ${this.escapePath(view)} AS ${view.expression(this.connection).getQuery()}`);
        }
    }

    protected async insertViewDefinitionSql(view: View): Promise<Query> {
        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];
        const splittedName = view.name.split(".");
        let schema = this.driver.options.schema || currentSchema;
        let name = view.name;
        if (splittedName.length === 2) {
            schema = splittedName[0];
            name = splittedName[1];
        }

        const expression = typeof view.expression === "string" ? view.expression.trim() : view.expression(this.connection).getQuery();
        const [query, parameters] = this.connection.createQueryBuilder()
            .insert()
            .into(this.getTypeormMetadataTableName())
            .values({ type: "VIEW", schema: schema, name: name, value: expression })
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
        const currentSchemaQuery = await this.query(`SELECT * FROM current_schema()`);
        const currentSchema = currentSchemaQuery[0]["current_schema"];
        const viewName = viewOrPath instanceof View ? viewOrPath.name : viewOrPath;
        const splittedName = viewName.split(".");
        let schema = this.driver.options.schema || currentSchema;
        let name = viewName;
        if (splittedName.length === 2) {
            schema = splittedName[0];
            name = splittedName[1];
        }

        const qb = this.connection.createQueryBuilder();
        const [query, parameters] = qb.delete()
            .from(this.getTypeormMetadataTableName())
            .where(`${qb.escape("type")} = 'VIEW'`)
            .andWhere(`${qb.escape("schema")} = :schema`, { schema })
            .andWhere(`${qb.escape("name")} = :name`, { name })
            .getQueryAndParameters();

        return new Query(query, parameters);
    }

    /**
     * Builds create index sql.
     * UNIQUE indices creates as UNIQUE constraints.
     */
    protected createIndexSql(table: Table, index: TableIndex): Query {
        const columns = index.columnNames.map(columnName => `"${columnName}"`).join(", ");
        return new Query(`CREATE INDEX "${index.name}" ON ${this.escapePath(table)} (${columns}) ${index.where ? "WHERE " + index.where : ""}`);
    }

    /**
     * Builds drop index sql.
     */
    protected dropIndexSql(table: Table, indexOrName: TableIndex|TableUnique|string): Query {
        let indexName = (indexOrName instanceof TableIndex || indexOrName instanceof TableUnique) ? indexOrName.name : indexOrName;
        return new Query(`DROP INDEX ${this.escapePath(table)}@"${indexName}" CASCADE`);
    }

    /**
     * Builds create primary key sql.
     */
    protected createPrimaryKeySql(table: Table, columnNames: string[]): Query {
        const primaryKeyName = this.connection.namingStrategy.primaryKeyName(table.name, columnNames);
        const columnNamesString = columnNames.map(columnName => `"${columnName}"`).join(", ");
        return new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${primaryKeyName}" PRIMARY KEY (${columnNamesString})`);
    }

    /**
     * Builds drop primary key sql.
     */
    protected dropPrimaryKeySql(table: Table): Query {
        const columnNames = table.primaryColumns.map(column => column.name);
        const primaryKeyName = this.connection.namingStrategy.primaryKeyName(table.name, columnNames);
        return new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${primaryKeyName}"`);
    }

    /**
     * Builds create unique constraint sql.
     */
    protected createUniqueConstraintSql(table: Table, uniqueConstraint: TableUnique|TableIndex): Query {
        const columnNames = uniqueConstraint.columnNames.map(column => `"` + column + `"`).join(", ");
        return new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${uniqueConstraint.name}" UNIQUE (${columnNames})`);
    }

    /**
     * Builds drop unique constraint sql.
     */
    protected dropUniqueConstraintSql(table: Table, uniqueOrName: TableUnique|string): Query {
        const uniqueName = uniqueOrName instanceof TableUnique ? uniqueOrName.name : uniqueOrName;
        return new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${uniqueName}"`);
    }

    /**
     * Builds create check constraint sql.
     */
    protected createCheckConstraintSql(table: Table, checkConstraint: TableCheck): Query {
        return new Query(`ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${checkConstraint.name}" CHECK (${checkConstraint.expression})`);
    }

    /**
     * Builds drop check constraint sql.
     */
    protected dropCheckConstraintSql(table: Table, checkOrName: TableCheck|string): Query {
        const checkName = checkOrName instanceof TableCheck ? checkOrName.name : checkOrName;
        return new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${checkName}"`);
    }

    /**
     * Builds create foreign key sql.
     */
    protected createForeignKeySql(table: Table, foreignKey: TableForeignKey): Query {
        const columnNames = foreignKey.columnNames.map(column => `"` + column + `"`).join(", ");
        const referencedColumnNames = foreignKey.referencedColumnNames.map(column => `"` + column + `"`).join(",");
        let sql = `ALTER TABLE ${this.escapePath(table)} ADD CONSTRAINT "${foreignKey.name}" FOREIGN KEY (${columnNames}) ` +
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
        return new Query(`ALTER TABLE ${this.escapePath(table)} DROP CONSTRAINT "${foreignKeyName}"`);
    }

    /**
     * Builds sequence name from given table and column.
     */
    protected buildSequenceName(table: Table, columnOrName: TableColumn|string, disableEscape?: true): string {
        const columnName = columnOrName instanceof TableColumn ? columnOrName.name : columnOrName;
        return disableEscape ? `${table.name}_${columnName}_seq` : `"${table.name}_${columnName}_seq"`;
    }

    /**
     * Escapes given table or view path.
     */
    protected escapePath(target: Table|View|string, disableEscape?: boolean): string {
        let tableName = target instanceof Table || target instanceof View ? target.name : target;
        tableName = tableName.indexOf(".") === -1 && this.driver.options.schema ? `${this.driver.options.schema}.${tableName}` : tableName;

        return tableName.split(".").map(i => {
            return disableEscape ? i : `"${i}"`;
        }).join(".");
    }

    /**
     * Returns object with table schema and table name.
     */
    protected parseTableName(target: Table|string) {
        const tableName = target instanceof Table ? target.name : target;
        if (tableName.indexOf(".") === -1) {
            return {
                schema: this.driver.options.schema ? `'${this.driver.options.schema}'` : "current_schema()",
                tableName: `'${tableName}'`
            };
        } else {
            return {
                schema: `'${tableName.split(".")[0]}'`,
                tableName: `'${tableName.split(".")[1]}'`
            };
        }
    }

    /**
     * Builds a query for create column.
     */
    protected buildCreateColumnSql(table: Table, column: TableColumn) {
        let c = "\"" + column.name + "\"";

        if (column.isGenerated) {
            if (column.generationStrategy === "increment") {
                c += ` INT4 DEFAULT nextval('${this.buildSequenceName(table, column)}')`;

            } else if (column.generationStrategy === "rowid") {
                c += " INT DEFAULT unique_rowid()";

            } else if (column.generationStrategy === "uuid") {
                c += " UUID DEFAULT gen_random_uuid()";
            }
        }
        if (!column.isGenerated)
            c += " " + this.connection.driver.createFullType(column);
        if (column.charset)
            c += " CHARACTER SET \"" + column.charset + "\"";
        if (column.collation)
            c += " COLLATE \"" + column.collation + "\"";
        if (!column.isNullable)
            c += " NOT NULL";
        if (!column.isGenerated && column.default !== undefined && column.default !== null)
            c += " DEFAULT " + column.default;

        return c;
    }

}
