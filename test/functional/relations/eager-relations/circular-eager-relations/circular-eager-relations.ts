import { expect } from "chai";
import "reflect-metadata";
import { Connection } from "../../../../../src/connection/Connection";

describe("relations > eager relations > circular eager relations", () => {

    it("should throw error if eager: true is set on both sides of relationship", () => {
        expect(() => {
            new Connection({ // dummy connection options, connection won't be established anyway
                type: "mysql",
                host: "localhost",
                username: "test",
                password: "test",
                database: "test",
                entities: [__dirname + "/entity/*{.js,.ts}"]
            });
        }).to.throw(Error);
    });

});
