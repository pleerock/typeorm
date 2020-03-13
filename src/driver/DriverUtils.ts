import {Driver} from "./Driver";
import { hash } from "../util/StringUtils";

/**
 * Common driver utility functions.
 */
export class DriverUtils {

    // -------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------

    /**
     * Normalizes and builds a new driver options.
     * Extracts settings from connection url and sets to a new options object.
     */
    static buildDriverOptions(options: any, buildOptions?: { useSid: boolean }): any {
        if (options.url) {
            const parsedUrl = this.parseConnectionUrl(options.url);
            let urlDriverOptions: any = {
                type: parsedUrl.type,
                host: parsedUrl.host,
                username: parsedUrl.username,
                password: parsedUrl.password,
                port: parsedUrl.port,
                database: parsedUrl.database
            };
            if (buildOptions && buildOptions.useSid) {
                urlDriverOptions.sid = parsedUrl.database;
            }
            return Object.assign({}, options, urlDriverOptions);
        }
        return Object.assign({}, options);
    }

    /**
     * Builds column alias from given alias name and column name.
     *
     * If alias length is greater than the limit (if any) allowed by the current
     * driver, replaces it with a hashed string.
     *
     * @param driver Current `Driver`.
     * @param alias Alias part.
     * @param column Name of the column to be concatened to `alias`.
     *
     * @return An alias allowing to select/transform the target `column`.
     */
    static buildColumnAlias({ maxAliasLength }: Driver, alias: string, column: string): string {
        const columnAliasName = alias + "_" + column;

        if (maxAliasLength && maxAliasLength > 0 && columnAliasName.length > maxAliasLength) {
            return hash(columnAliasName, { length: maxAliasLength });
        }

        return columnAliasName;
    }

    // -------------------------------------------------------------------------
    // Private Static Methods
    // -------------------------------------------------------------------------

    /**
     * Extracts connection data from the connection url.
     */
    private static parseConnectionUrl(url: string) {
        const type = url.split(":")[0];
        const firstSlashes = url.indexOf("//");
        const preBase = url.substr(firstSlashes + 2);
        const secondSlash = preBase.indexOf("/");
        const base = (secondSlash !== -1) ? preBase.substr(0, secondSlash) : preBase;
        const afterBase = (secondSlash !== -1) ? preBase.substr(secondSlash + 1) : undefined;

        const lastAtSign = base.lastIndexOf("@");
        const usernameAndPassword = base.substr(0, lastAtSign);
        const hostAndPort = base.substr(lastAtSign + 1);

        let username = usernameAndPassword;
        let password = "";
        const firstColon = usernameAndPassword.indexOf(":");
        if (firstColon !== -1) {
            username = usernameAndPassword.substr(0, firstColon);
            password = usernameAndPassword.substr(firstColon + 1);
        }
        const [host, port] = hostAndPort.split(":");

        return {
            type: type,
            host: host,
            username: decodeURIComponent(username),
            password: decodeURIComponent(password),
            port: port ? parseInt(port) : undefined,
            database: afterBase || undefined
        };
    }
}
