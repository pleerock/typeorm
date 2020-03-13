import {QueryRunnerAlreadyReleasedError} from "../../error/QueryRunnerAlreadyReleasedError";
import {QueryFailedError} from "../../error/QueryFailedError";
import {AbstractSqliteQueryRunner} from "../sqlite-abstract/AbstractSqliteQueryRunner";
import {SqliteConnectionOptions} from "./SqliteConnectionOptions";
import {SqliteDriver} from "./SqliteDriver";
import {Broadcaster} from "../../subscriber/Broadcaster";

/**
 * Runs queries on a single sqlite database connection.
 *
 * Does not support compose primary keys with autoincrement field.
 * todo: need to throw exception for this case.
 */
export class SqliteQueryRunner extends AbstractSqliteQueryRunner {

    /**
     * Database driver used by connection.
     */
    driver: SqliteDriver;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(driver: SqliteDriver) {
        super();
        this.driver = driver;
        this.connection = driver.connection;
        this.broadcaster = new Broadcaster(this);
    }

    /**
     * Executes a given SQL query.
     */
    query(query: string, parameters?: any[]): Promise<any> {
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError();

        const connection = this.driver.connection;
        const options = connection.options as SqliteConnectionOptions;

        return new Promise<any[]>(async (ok, fail) => {

            const databaseConnection = await this.connect();
            this.driver.connection.logger.logQuery(query, parameters, this);
            const queryStartTime = +new Date();
            const isInsertQuery = query.substr(0, 11) === "INSERT INTO";

            const execute = async () => {
                if (isInsertQuery) {
                    databaseConnection.run(query, parameters, handler);
                } else {
                    databaseConnection.all(query, parameters, handler);
                }
            };

            const handler = function (err: any, result: any) {

                if (err) {
                    if (err.toString().indexOf("SQLITE_BUSY:") !== -1 &&
                        typeof options.busyErrorRetry === "number" &&
                        options.busyErrorRetry) {
                        setTimeout(execute, options.busyErrorRetry);
                        return;
                    }
                }

                // log slow queries if maxQueryExecution time is set
                const maxQueryExecutionTime = connection.options.maxQueryExecutionTime;
                const queryEndTime = +new Date();
                const queryExecutionTime = queryEndTime - queryStartTime;
                if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
                    connection.logger.logQuerySlow(queryExecutionTime, query, parameters, this);

                if (err) {
                    connection.logger.logQueryError(err, query, parameters, this);
                    fail(new QueryFailedError(query, parameters, err));
                } else {
                    ok(isInsertQuery ? this["lastID"] : result);
                }
            };

            await execute();
        });
    }
}