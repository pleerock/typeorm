import {TableColumn} from "../schema-builder/table/TableColumn";
import {Table} from "../schema-builder/table/Table";
import {TableForeignKey} from "../schema-builder/table/TableForeignKey";
import {TableIndex} from "../schema-builder/table/TableIndex";
import {Connection} from "../connection/Connection";
import {ReadStream} from "../platform/PlatformTools";
import {EntityManager} from "../entity-manager/EntityManager";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {SqlInMemory} from "../driver/SqlInMemory";
import {TableUnique} from "../schema-builder/table/TableUnique";
import {Broadcaster} from "../subscriber/Broadcaster";
import {TableCheck} from "../schema-builder/table/TableCheck";
import {IsolationLevel} from "../driver/types/IsolationLevel";

/**
 * Runs queries on a single database connection.
 */
export interface QueryRunner {

    /**
     * Connection used by this query runner.
     */
    readonly connection: Connection;

    /**
     * Broadcaster used on this query runner to broadcast entity events.
     */
    readonly broadcaster: Broadcaster;

    /**
     * Entity manager working only with this query runner.
     */
    readonly manager: EntityManager;

    /**
     * Indicates if connection for this query runner is released.
     * Once its released, query runner cannot run queries anymore.
     */
    readonly isReleased: boolean;

    /**
     * Indicates if transaction is in progress.
     */
    readonly isTransactionActive: boolean;

    /**
     * Stores temporarily user data.
     * Useful for sharing data with subscribers.
     */
    data: ObjectLiteral;

    /**
     * All synchronized tables in the database.
     */
    loadedTables: Table[];

    /**
     * Creates/uses database connection from the connection pool to perform further operations.
     * Returns obtained database connection.
     */
    connect(): Promise<any>;

    /**
     * Releases used database connection.
     * You cannot use query runner methods after connection is released.
     */
    release(): Promise<void>;

    /**
     * Removes all tables from the currently connected database.
     * Be careful with using this method and avoid using it in production or migrations
     * (because it can clear all your database).
     */
    clearDatabase(database?: string): Promise<void>;

    /**
     * Starts transaction.
     */
    startTransaction(isolationLevel?: IsolationLevel): Promise<void>;

    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    commitTransaction(): Promise<void>;

    /**
     * Ends transaction.
     * Error will be thrown if transaction was not started.
     */
    rollbackTransaction(): Promise<void>;

    /**
     * Executes a given SQL query and returns raw database results.
     */
    query(query: string, parameters?: ReadonlyArray<any>): Promise<any>;

    /**
     * Returns raw data stream.
     */
    stream(query: string, parameters?: any[], onEnd?: Function, onError?: Function): Promise<ReadStream>;

    /**
     * Returns all available database names including system databases.
     */
    getDatabases(): Promise<string[]>;

    /**
     * Returns all available schema names including system schemas.
     * If database parameter specified, returns schemas of that database.
     * Useful for SQLServer and Postgres only.
     */
    getSchemas(database?: string): Promise<string[]>;

    /**
     * Loads a table by a given name from the database.
     */
    getTable(tableName: string): Promise<Table|undefined>;

    /**
     * Loads all tables from the database and returns them.
     *
     * todo: make tableNames optional
     */
    getTables(tableNames: string[]): Promise<Table[]>;

    /**
     * Checks if a database with the given name exist.
     */
    hasDatabase(database: string): Promise<boolean>;

    /**
     * Checks if a schema with the given name exist.
     */
    hasSchema(schema: string): Promise<boolean>;

    /**
     * Checks if a table with the given name exist.
     */
    hasTable(table: Table|string): Promise<boolean>;

    /**
     * Checks if a column exist in the table.
     */
    hasColumn(table: Table|string, columnName: string): Promise<boolean>;

    /**
     * Creates a new database.
     */
    createDatabase(database: string, ifNotExist?: boolean): Promise<void>;

    /**
     * Drops database.
     */
    dropDatabase(database: string, ifExist?: boolean): Promise<void>;

    /**
     * Creates a new table schema.
     */
    createSchema(schemaPath: string, ifNotExist?: boolean): Promise<void>;

    /**
     * Drops table schema.
     * For SqlServer can accept schema path (e.g. 'dbName.schemaName') as parameter.
     * If schema path passed, it will drop schema in specified database.
     */
    dropSchema(schemaPath: string, ifExist?: boolean, isCascade?: boolean): Promise<void>;

    /**
     * Creates a new table.
     */
    createTable(table: Table, ifNotExist?: boolean, createForeignKeys?: boolean, createIndices?: boolean): Promise<void>;

    /**
     * Drops a table.
     */
    dropTable(table: Table|string, ifExist?: boolean, dropForeignKeys?: boolean, dropIndices?: boolean): Promise<void>;

    /**
     * Renames a table.
     */
    renameTable(oldTableOrName: Table|string, newTableName: string): Promise<void>;

    /**
     * Adds a new column.
     */
    addColumn(table: Table|string, column: TableColumn): Promise<void>;

    /**
     * Adds new columns.
     */
    addColumns(table: Table|string, columns: TableColumn[]): Promise<void>;

    /**
     * Renames a column.
     */
    renameColumn(table: Table|string, oldColumnOrName: TableColumn|string, newColumnOrName: TableColumn|string): Promise<void>;

    /**
     * Changes a column in the table.
     */
    changeColumn(table: Table|string, oldColumn: TableColumn|string, newColumn: TableColumn): Promise<void>;

    /**
     * Changes columns in the table.
     */
    changeColumns(table: Table|string, changedColumns: { oldColumn: TableColumn, newColumn: TableColumn }[]): Promise<void>;

    /**
     * Drops a column in the table.
     */
    dropColumn(table: Table|string, column: TableColumn|string): Promise<void>;

    /**
     * Drops columns in the table.
     */
    dropColumns(table: Table|string, columns: TableColumn[]): Promise<void>;

    /**
     * Creates a new primary key.
     */
    createPrimaryKey(table: Table|string, columnNames: string[]): Promise<void>;

    /**
     * Updates composite primary keys.
     */
    updatePrimaryKeys(table: Table|string, columns: TableColumn[]): Promise<void>;

    /**
     * Drops a primary key.
     */
    dropPrimaryKey(table: Table|string): Promise<void>;

    /**
     * Creates a new unique constraint.
     */
    createUniqueConstraint(table: Table|string, uniqueConstraint: TableUnique): Promise<void>;

    /**
     * Creates new unique constraints.
     */
    createUniqueConstraints(table: Table|string, uniqueConstraints: TableUnique[]): Promise<void>;

    /**
     * Drops an unique constraint.
     */
    dropUniqueConstraint(table: Table|string, uniqueOrName: TableUnique|string): Promise<void>;

    /**
     * Drops unique constraints.
     */
    dropUniqueConstraints(table: Table|string, uniqueConstraints: TableUnique[]): Promise<void>;

    /**
     * Creates a new check constraint.
     */
    createCheckConstraint(table: Table|string, checkConstraint: TableCheck): Promise<void>;

    /**
     * Creates new check constraints.
     */
    createCheckConstraints(table: Table|string, checkConstraints: TableCheck[]): Promise<void>;

    /**
     * Drops a check constraint.
     */
    dropCheckConstraint(table: Table|string, checkOrName: TableCheck|string): Promise<void>;

    /**
     * Drops check constraints.
     */
    dropCheckConstraints(table: Table|string, checkConstraints: TableCheck[]): Promise<void>;

    /**
     * Creates a new foreign key.
     */
    createForeignKey(table: Table|string, foreignKey: TableForeignKey): Promise<void>;

    /**
     * Creates new foreign keys.
     */
    createForeignKeys(table: Table|string, foreignKeys: TableForeignKey[]): Promise<void>;

    /**
     * Drops a foreign key.
     */
    dropForeignKey(table: Table|string, foreignKeyOrName: TableForeignKey|string): Promise<void>;

    /**
     * Drops foreign keys.
     */
    dropForeignKeys(table: Table|string, foreignKeys: TableForeignKey[]): Promise<void>;

    /**
     * Creates a new index.
     */
    createIndex(table: Table|string, index: TableIndex): Promise<void>;

    /**
     * Creates new indices.
     */
    createIndices(table: Table|string, indices: TableIndex[]): Promise<void>;

    /**
     * Drops an index.
     */
    dropIndex(table: Table|string, index: TableIndex|string): Promise<void>;

    /**
     * Drops indices.
     */
    dropIndices(table: Table|string, indices: TableIndex[]): Promise<void>;

    /**
     * Clears all table contents.
     * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
     */
    clearTable(tableName: string): Promise<void>;

    /**
     * Enables special query runner mode in which sql queries won't be executed,
     * instead they will be memorized into a special variable inside query runner.
     * You can get memorized sql using getMemorySql() method.
     */
    enableSqlMemory(): void;

    /**
     * Disables special query runner mode in which sql queries won't be executed
     * started by calling enableSqlMemory() method.
     *
     * Previously memorized sql will be flushed.
     */
    disableSqlMemory(): void;

    /**
     * Flushes all memorized sqls.
     */
    clearSqlMemory(): void;

    /**
     * Gets sql stored in the memory. Parameters in the sql are already replaced.
     */
    getMemorySql(): SqlInMemory;

    /**
     * Executes up sql queries.
     */
    executeMemoryUpSql(): Promise<void>;

    /**
     * Executes down sql queries.
     */
    executeMemoryDownSql(): Promise<void>;

}