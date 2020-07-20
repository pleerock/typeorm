import {QueryRunnerAlreadyReleasedError} from "../../error/QueryRunnerAlreadyReleasedError";
import {AbstractSqliteQueryRunner} from "../sqlite-abstract/AbstractSqliteQueryRunner";
import {SqljsDriver} from "./SqljsDriver";
import {QueryFailedError} from "../../error/QueryFailedError";
import {Logger} from "../../logger/Logger";

/**
 * Runs queries on a single sqlite database connection.
 */
export class SqljsQueryRunner extends AbstractSqliteQueryRunner {

    /**
     * Database driver used by connection.
     */
    driver: SqljsDriver;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(driver: SqljsDriver, logger: Logger) {
        super(driver, logger);
        this.driver = driver;
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    async commitTransaction(): Promise<void> {
        await super.commitTransaction();
        await this.driver.autoSave();
    }

    /**
     * Executes a given SQL query.
     */
    query(query: string, parameters: any[] = []): Promise<any> {
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError();

        return new Promise<any[]>(async (ok, fail) => {
            const databaseConnection = this.driver.databaseConnection;
            this.logger.logQuery(query, parameters, this);
            const queryStartTime = +new Date();
            let statement: any;
            try {
                statement = databaseConnection.prepare(query);
                if (parameters) {
                    statement.bind(parameters);
                }

                // log slow queries if maxQueryExecution time is set
                const maxQueryExecutionTime = this.driver.connection.options.maxQueryExecutionTime;
                const queryEndTime = +new Date();
                const queryExecutionTime = queryEndTime - queryStartTime;
                if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
                    this.logger.logQuerySlow(queryExecutionTime, query, parameters, this);

                const result: any[] = [];

                while (statement.step()) {
                    result.push(statement.getAsObject());
                }

                statement.free();
                ok(result);
            }
            catch (e) {
                if (statement) {
                    statement.free();
                }

                this.logger.logQueryError(e, query, parameters, this);
                fail(new QueryFailedError(query, parameters, e));
            }
        });
    }
}
