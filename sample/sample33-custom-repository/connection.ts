import "reflect-metadata";
import {connection} from "../../src/index";

export const Sample33CustomRepositoryConnection = connection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "admin",
    database: "test",
    synchronize: true,
    logging: ["query", "error"],
});
