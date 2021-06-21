import mkdirp from 'mkdirp';
import path from 'path';
import { DriverOptionNotSetError } from "../../error/DriverOptionNotSetError";
import { Connection } from "../../connection/Connection";
import { ColumnType } from "../types/ColumnTypes";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import { BetterSqlite3ConnectionOptions } from "./BetterSqlite3ConnectionOptions";
import { BetterSqlite3QueryRunner } from "./BetterSqlite3QueryRunner";
import { ReplicationMode } from "../types/ReplicationMode";
import { filepathToName, isAbsolute } from '../../util/PathUtils';
import { PlatformTools } from '../../platform/PlatformTools';
import { DriverPackageNotInstalledError } from '../../error/DriverPackageNotInstalledError';

/**
 * Organizes communication with sqlite DBMS.
 */
export class BetterSqlite3Driver extends AbstractSqliteDriver {

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Connection options.
     */
    options: BetterSqlite3ConnectionOptions;

    /**
     * SQLite underlying library.
     */
    sqlite: any;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection) {
        super(connection);

        this.connection = connection;
        this.options = connection.options as BetterSqlite3ConnectionOptions;
        this.database = this.options.database;

        // validate options to make sure everything is set
        if (!this.options.database)
            throw new DriverOptionNotSetError("database");

        // load sqlite package
        this.loadDependencies();
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    async afterConnect(): Promise<void> {
        return this.attachDatabases();
    }

    /**
     * Closes connection with database.
     */
    async disconnect(): Promise<void> {
        this.queryRunner = undefined;
        this.databaseConnection.close();
    }

    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: ReplicationMode): QueryRunner {
        if (!this.queryRunner)
            this.queryRunner = new BetterSqlite3QueryRunner(this);

        return this.queryRunner;
    }

    normalizeType(column: { type?: ColumnType, length?: number | string, precision?: number | null, scale?: number }): string {
        if ((column.type as any) === Buffer) {
            return "blob";
        }

        return super.normalizeType(column);
    }

    /**
     * For SQLite, the database may be added in the decorator metadata. It will be a filepath to a database file.
     */
    buildTableName(tableName: string, _schema?: string, database?: string): string {

        if (!database) return tableName;
        if (this.attachedDatabases[database]) return `${this.attachedDatabases[database].attachHandle}.${tableName}`;

        if (database === this.options.database) return tableName;

        // we use the decorated name as supplied when deriving attach handle (ideally without non-portable absolute path)
        const identifierHash = filepathToName(database);
        // decorated name will be assumed relative to main database file when non absolute. Paths supplied as absolute won't be portable
        const absFilepath = isAbsolute(database) ? database : path.join(this.getMainDatabasePath(), database);

        this.attachedDatabases[database] = {
            attachFilepath: absFilepath,
            attachHandle: identifierHash,
        };

        return `${identifierHash}.${tableName}`;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates connection with the database.
     */
    protected async createDatabaseConnection() {
        // not to create database directory if is in memory
        if (this.options.database !== ":memory:")
            await this.createDatabaseDirectory(path.dirname(this.options.database));

        const {
            database,
            readonly = false,
            fileMustExist = false,
            timeout = 5000,
            verbose = null,
            prepareDatabase
        } = this.options;
        const databaseConnection = this.sqlite(database, { readonly, fileMustExist, timeout, verbose });

        // we need to enable foreign keys in sqlite to make sure all foreign key related features
        // working properly. this also makes onDelete to work with sqlite.
        databaseConnection.exec(`PRAGMA foreign_keys = ON`);

        // turn on WAL mode to enhance performance
        databaseConnection.exec(`PRAGMA journal_mode = WAL`);

        // in the options, if encryption key for SQLCipher is setted.
        if (this.options.key) {
            databaseConnection.exec(`PRAGMA key = ${JSON.stringify(this.options.key)}`);
        }

        if (typeof prepareDatabase === "function") {
            prepareDatabase(databaseConnection);
        }

        return databaseConnection;
    }

    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void {
        try {
            this.sqlite = PlatformTools.load("better-sqlite3");

        } catch (e) {
            throw new DriverPackageNotInstalledError("SQLite", "better-sqlite3");
        }
    }

    /**
     * Auto creates database directory if it does not exist.
     */
    protected async createDatabaseDirectory(dbPath: string): Promise<void> {
        await mkdirp(dbPath);
    }

    /**
     * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
     * during EntityMetadata production (see EntityMetadata#buildTablePath)
     *
     * https://sqlite.org/lang_attach.html
     */
    protected async attachDatabases() {

        // @todo - possibly check number of databases (but unqueriable at runtime sadly) - https://www.sqlite.org/limits.html#max_attached
        for await (const {attachHandle, attachFilepath} of Object.values(this.attachedDatabases)) {
            await this.createDatabaseDirectory(path.dirname(attachFilepath));
            await this.connection.query(`ATTACH "${attachFilepath}" AS "${attachHandle}"`);
        }
    }

    protected getMainDatabasePath(): string {
        const optionsDb = this.options.database;
        return path.dirname(isAbsolute(optionsDb) ? optionsDb : path.join(this.options.baseDirectory!, optionsDb));
    }
}
