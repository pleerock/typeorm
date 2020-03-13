import {Table} from "../schema-builder/table/Table";
import {Connection} from "../connection/Connection";
import {Migration} from "./Migration";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {PromiseUtils} from "../util/PromiseUtils";
import {QueryRunner} from "../query-runner/QueryRunner";
import {SqlServerDriver} from "../driver/sqlserver/SqlServerDriver";
import {MssqlParameter} from "../driver/sqlserver/MssqlParameter";
import {SqlServerConnectionOptions} from "../driver/sqlserver/SqlServerConnectionOptions";
import {PostgresConnectionOptions} from "../driver/postgres/PostgresConnectionOptions";
import {MongoDriver} from "../driver/mongodb/MongoDriver";
import {MongoQueryRunner} from "../driver/mongodb/MongoQueryRunner";

/**
 * Executes migrations: runs pending and reverts previously executed migrations.
 */
export class MigrationExecutor {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Indicates how migrations should be run in transactions.
     *   all: all migrations are run in a single transaction
     *   none: all migrations are run without a transaction
     *   each: each migration is run in a separate transaction
     */
    transaction: "all" | "none" | "each" = "all";

    // -------------------------------------------------------------------------
    // Private Properties
    // -------------------------------------------------------------------------

    private readonly migrationsTable: string;
    private readonly migrationsTableName: string;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(protected connection: Connection,
                protected queryRunner?: QueryRunner) {

        const options = <SqlServerConnectionOptions|PostgresConnectionOptions>this.connection.driver.options;
        this.migrationsTableName = connection.options.migrationsTableName || "migrations";
        this.migrationsTable = this.connection.driver.buildTableName(this.migrationsTableName, options.schema, options.database);
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Tries to execute a single migration given.
     */
    public async executeMigration(migration: Migration): Promise<Migration> {
        return this.withQueryRunner(async (queryRunner) => {
            await this.createMigrationsTableIfNotExist(queryRunner);
            await (migration.instance as any).up(queryRunner);
            await this.insertExecutedMigration(queryRunner, migration);

            return migration;
        });
    }

    /**
     * Returns an array of all migrations.
     */
    public async getAllMigrations(): Promise<Migration[]> {
        return Promise.resolve(this.getMigrations());
    }

    /**
     * Returns an array of all executed migrations.
     */
    public async getExecutedMigrations(): Promise<Migration[]> {
        return this.withQueryRunner(async queryRunner => {
            await this.createMigrationsTableIfNotExist(queryRunner);

            return await this.loadExecutedMigrations(queryRunner);
        });
    }

    /**
     * Returns an array of all pending migrations.
     */
    public async getPendingMigrations(): Promise<Migration[]> {
        const allMigrations = await this.getAllMigrations();
        const executedMigrations = await this.getExecutedMigrations();

        return allMigrations.filter(migration =>
            executedMigrations.find(
                executedMigration =>
                    executedMigration.name === migration.name
            )
        );
    }

    /**
     * Inserts an executed migration.
     */
    public insertMigration(migration: Migration): Promise<void> {
        return new Promise((resolve, reject) => {
            this.withQueryRunner(queryRunner => {
                this.insertExecutedMigration(queryRunner, migration)
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    /**
     * Deletes an executed migration.
     */
    public deleteMigration(migration: Migration): Promise<void> {
        return new Promise((resolve, reject) => {
            this.withQueryRunner(queryRunner => {
                this.deleteExecutedMigration(queryRunner, migration)
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    /**
     * Lists all migrations and whether they have been executed or not
     * returns true if there are unapplied migrations
     */
    async showMigrations(): Promise<boolean> {
        let hasUnappliedMigrations = false;
        const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");
        // create migrations table if its not created yet
        await this.createMigrationsTableIfNotExist(queryRunner);
        // get all migrations that are executed and saved in the database
        const executedMigrations = await this.loadExecutedMigrations(queryRunner);

        // get all user's migrations in the source code
        const allMigrations = this.getMigrations();

        for (const migration of allMigrations) {
            const executedMigration = executedMigrations.find(executedMigration => executedMigration.name === migration.name);

            if (executedMigration) {
                this.connection.logger.logSchemaBuild(` [X] ${migration.name}`);
            } else {
                hasUnappliedMigrations = true;
                this.connection.logger.logSchemaBuild(` [ ] ${migration.name}`);
            }
        }

        // if query runner was created by us then release it
        if (!this.queryRunner) {
            await queryRunner.release();
        }

        return hasUnappliedMigrations;
    }

    /**
     * Executes all pending migrations. Pending migrations are migrations that are not yet executed,
     * thus not saved in the database.
     */
    async executePendingMigrations(): Promise<Migration[]> {

        const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");
        // create migrations table if its not created yet
        await this.createMigrationsTableIfNotExist(queryRunner);
        // get all migrations that are executed and saved in the database
        const executedMigrations = await this.loadExecutedMigrations(queryRunner);

        // get the time when last migration was executed
        let lastTimeExecutedMigration = this.getLatestTimestampMigration(executedMigrations);

        // get all user's migrations in the source code
        const allMigrations = this.getMigrations();

        // variable to store all migrations we did successefuly
        const successMigrations: Migration[] = [];

        // find all migrations that needs to be executed
        const pendingMigrations = allMigrations.filter(migration => {
            // check if we already have executed migration
            const executedMigration = executedMigrations.find(executedMigration => executedMigration.name === migration.name);
            if (executedMigration)
                return false;

            // migration is new and not executed. now check if its timestamp is correct
            // if (lastTimeExecutedMigration && migration.timestamp < lastTimeExecutedMigration.timestamp)
            //     throw new Error(`New migration found: ${migration.name}, however this migration's timestamp is not valid. Migration's timestamp should not be older then migrations already executed in the database.`);

            // every check is passed means that migration was not run yet and we need to run it
            return true;
        });

        // if no migrations are pending then nothing to do here
        if (!pendingMigrations.length) {
            this.connection.logger.logSchemaBuild(`No migrations are pending`);
            // if query runner was created by us then release it
            if (!this.queryRunner)
                await queryRunner.release();
            return [];
        }

        // log information about migration execution
        this.connection.logger.logSchemaBuild(`${executedMigrations.length} migrations are already loaded in the database.`);
        this.connection.logger.logSchemaBuild(`${allMigrations.length} migrations were found in the source code.`);
        if (lastTimeExecutedMigration)
            this.connection.logger.logSchemaBuild(`${lastTimeExecutedMigration.name} is the last executed migration. It was executed on ${new Date(lastTimeExecutedMigration.timestamp).toString()}.`);
        this.connection.logger.logSchemaBuild(`${pendingMigrations.length} migrations are new migrations that needs to be executed.`);

        // start transaction if its not started yet
        let transactionStartedByUs = false;
        if (this.transaction === "all" && !queryRunner.isTransactionActive) {
            await queryRunner.startTransaction();
            transactionStartedByUs = true;
        }

        // run all pending migrations in a sequence
        try {
            await PromiseUtils.runInSequence(pendingMigrations, async migration => {
                if (this.transaction === "each" && !queryRunner.isTransactionActive) {
                    await queryRunner.startTransaction();
                    transactionStartedByUs = true;
                }

                return migration.instance!.up(queryRunner)
                    .then(async () => { // now when migration is executed we need to insert record about it into the database
                        await this.insertExecutedMigration(queryRunner, migration);
                        // commit transaction if we started it
                        if (this.transaction === "each" && transactionStartedByUs)
                            await queryRunner.commitTransaction();
                    })
                    .then(() => { // informative log about migration success
                        successMigrations.push(migration);
                        this.connection.logger.logSchemaBuild(`Migration ${migration.name} has been executed successfully.`);
                    });
            });

            // commit transaction if we started it
            if (this.transaction === "all" && transactionStartedByUs)
                await queryRunner.commitTransaction();

        } catch (err) { // rollback transaction if we started it
            if (transactionStartedByUs) {
                try { // we throw original error even if rollback thrown an error
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }

            throw err;

        } finally {

            // if query runner was created by us then release it
            if (!this.queryRunner)
                await queryRunner.release();
        }
        return successMigrations;

    }

    /**
     * Reverts last migration that were run.
     */
    async undoLastMigration(): Promise<void> {

        const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");

        // create migrations table if its not created yet
        await this.createMigrationsTableIfNotExist(queryRunner);

        // get all migrations that are executed and saved in the database
        const executedMigrations = await this.loadExecutedMigrations(queryRunner);

        // get the time when last migration was executed
        let lastTimeExecutedMigration = this.getLatestExecutedMigration(executedMigrations);

        // if no migrations found in the database then nothing to revert
        if (!lastTimeExecutedMigration) {
            this.connection.logger.logSchemaBuild(`No migrations was found in the database. Nothing to revert!`);
            return;
        }

        // get all user's migrations in the source code
        const allMigrations = this.getMigrations();

        // find the instance of the migration we need to remove
        const migrationToRevert = allMigrations.find(migration => migration.name === lastTimeExecutedMigration!.name);

        // if no migrations found in the database then nothing to revert
        if (!migrationToRevert)
            throw new Error(`No migration ${lastTimeExecutedMigration.name} was found in the source code. Make sure you have this migration in your codebase and its included in the connection options.`);

        // log information about migration execution
        this.connection.logger.logSchemaBuild(`${executedMigrations.length} migrations are already loaded in the database.`);
        this.connection.logger.logSchemaBuild(`${lastTimeExecutedMigration.name} is the last executed migration. It was executed on ${new Date(lastTimeExecutedMigration.timestamp).toString()}.`);
        this.connection.logger.logSchemaBuild(`Now reverting it...`);

        // start transaction if its not started yet
        let transactionStartedByUs = false;
        if ((this.transaction !== "none") && !queryRunner.isTransactionActive) {
            await queryRunner.startTransaction();
            transactionStartedByUs = true;
        }

        try {
            await migrationToRevert.instance!.down(queryRunner);
            await this.deleteExecutedMigration(queryRunner, migrationToRevert);
            this.connection.logger.logSchemaBuild(`Migration ${migrationToRevert.name} has been reverted successfully.`);

            // commit transaction if we started it
            if (transactionStartedByUs)
                await queryRunner.commitTransaction();

        } catch (err) { // rollback transaction if we started it
            if (transactionStartedByUs) {
                try { // we throw original error even if rollback thrown an error
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) { }
            }

            throw err;

        } finally {

            // if query runner was created by us then release it
            if (!this.queryRunner)
                await queryRunner.release();
        }
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates table "migrations" that will store information about executed migrations.
     */
    protected async createMigrationsTableIfNotExist(queryRunner: QueryRunner): Promise<void> {
        // If driver is mongo no need to create
        if (this.connection.driver instanceof MongoDriver) {
            return;
        }
        const tableExist = await queryRunner.hasTable(this.migrationsTable); // todo: table name should be configurable
        if (!tableExist) {
            await queryRunner.createTable(new Table(
                {
                    name: this.migrationsTable,
                    columns: [
                        {
                            name: "id",
                            type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.migrationId}),
                            isGenerated: true,
                            generationStrategy: "increment",
                            isPrimary: true,
                            isNullable: false
                        },
                        {
                            name: "timestamp",
                            type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.migrationTimestamp}),
                            isPrimary: false,
                            isNullable: false
                        },
                        {
                            name: "name",
                            type: this.connection.driver.normalizeType({type: this.connection.driver.mappedDataTypes.migrationName}),
                            isNullable: false
                        },
                    ]
                },
            ));
        }
    }

    /**
     * Loads all migrations that were executed and saved into the database (sorts by id).
     */
    protected async loadExecutedMigrations(queryRunner: QueryRunner): Promise<Migration[]> {
        if (this.connection.driver instanceof MongoDriver) {
            const mongoRunner = queryRunner as MongoQueryRunner;
            return await mongoRunner.databaseConnection
            .db(this.connection.driver.database!)
            .collection(this.migrationsTableName)
            .find<Migration>()
            .sort({"_id": -1})
            .toArray();
        } else {
            const migrationsRaw: ObjectLiteral[] = await this.connection.manager
            .createQueryBuilder(queryRunner)
            .select()
            .orderBy(this.connection.driver.escape("id"), "DESC")
            .from(this.migrationsTable, this.migrationsTableName)
            .getRawMany();
            return migrationsRaw.map(migrationRaw => {
                return new Migration(parseInt(migrationRaw["id"]), parseInt(migrationRaw["timestamp"]), migrationRaw["name"]);
            });
        }
    }

    /**
     * Gets all migrations that setup for this connection.
     */
    protected getMigrations(): Migration[] {
        const migrations = this.connection.migrations.map(migration => {
            const migrationClassName = migration.name || (migration.constructor as any).name;
            const migrationTimestamp = parseInt(migrationClassName.substr(-13), 10);
            if (!migrationTimestamp || isNaN(migrationTimestamp)) {
                throw new Error(`${migrationClassName} migration name is wrong. Migration class name should have a JavaScript timestamp appended.`);
            }

            return new Migration(undefined, migrationTimestamp, migrationClassName, migration);
        });

        this.checkForDuplicateMigrations(migrations);

        // sort them by timestamp
        return migrations.sort((a, b) => a.timestamp - b.timestamp);
    }

    protected checkForDuplicateMigrations(migrations: Migration[]) {
        const migrationNames = migrations.map(migration => migration.name);
        const duplicates = Array.from(new Set(migrationNames.filter((migrationName, index) => migrationNames.indexOf(migrationName) < index)));
        if (duplicates.length > 0) {
            throw Error(`Duplicate migrations: ${duplicates.join(", ")}`);
        }
    }

    /**
     * Finds the latest migration (sorts by timestamp) in the given array of migrations.
     */
    protected getLatestTimestampMigration(migrations: Migration[]): Migration|undefined {
        const sortedMigrations = migrations.map(migration => migration).sort((a, b) => (a.timestamp - b.timestamp) * -1);
        return sortedMigrations.length > 0 ? sortedMigrations[0] : undefined;
    }

    /**
     * Finds the latest migration in the given array of migrations.
     * PRE: Migration array must be sorted by descending id.
     */
    protected getLatestExecutedMigration(sortedMigrations: Migration[]): Migration|undefined {
        return sortedMigrations.length > 0 ? sortedMigrations[0] : undefined;
    }

    /**
     * Inserts new executed migration's data into migrations table.
     */
    protected async insertExecutedMigration(queryRunner: QueryRunner, migration: Migration): Promise<void> {
        const values: ObjectLiteral = {};
        if (this.connection.driver instanceof SqlServerDriver) {
            values["timestamp"] = new MssqlParameter(migration.timestamp, this.connection.driver.normalizeType({ type: this.connection.driver.mappedDataTypes.migrationTimestamp }) as any);
            values["name"] = new MssqlParameter(migration.name, this.connection.driver.normalizeType({ type: this.connection.driver.mappedDataTypes.migrationName }) as any);
        } else {
            values["timestamp"] = migration.timestamp;
            values["name"] = migration.name;
        }
        if (this.connection.driver instanceof MongoDriver) {
            const mongoRunner = queryRunner as MongoQueryRunner;
            await mongoRunner.databaseConnection.db(this.connection.driver.database!).collection(this.migrationsTableName).insert(values);
        } else {
            const qb = queryRunner.manager.createQueryBuilder();
            await qb.insert()
                .into(this.migrationsTable)
                .values(values)
                .execute();
        }
    }

    /**
     * Delete previously executed migration's data from the migrations table.
     */
    protected async deleteExecutedMigration(queryRunner: QueryRunner, migration: Migration): Promise<void> {

        const conditions: ObjectLiteral = {};
        if (this.connection.driver instanceof SqlServerDriver) {
            conditions["timestamp"] = new MssqlParameter(migration.timestamp, this.connection.driver.normalizeType({ type: this.connection.driver.mappedDataTypes.migrationTimestamp }) as any);
            conditions["name"] = new MssqlParameter(migration.name, this.connection.driver.normalizeType({ type: this.connection.driver.mappedDataTypes.migrationName }) as any);
        } else {
            conditions["timestamp"] = migration.timestamp;
            conditions["name"] = migration.name;
        }

        if (this.connection.driver instanceof MongoDriver) {
            const mongoRunner = queryRunner as MongoQueryRunner;
            await mongoRunner.databaseConnection.db(this.connection.driver.database!).collection(this.migrationsTableName).deleteOne(conditions);
        } else {
            const qb = queryRunner.manager.createQueryBuilder();
            await qb.delete()
                .from(this.migrationsTable)
                .where(`${qb.escape("timestamp")} = :timestamp`)
                .andWhere(`${qb.escape("name")} = :name`)
                .setParameters(conditions)
                .execute();
        }

    }

    protected async withQueryRunner<T extends any>(callback: (queryRunner: QueryRunner) => T) {
        const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");

        try {
            return callback(queryRunner);
        } finally {
            if (!this.queryRunner) {
                await queryRunner.release();
            }
        }
    }
}
