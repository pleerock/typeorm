import "reflect-metadata";
import {Connection} from "../../../../src/connection/Connection";
import {expect} from "chai";
import {InitializedRelationError} from "../../../../src/error/InitializedRelationError";
import {Category} from "./entity/Category";
import {Post} from "./entity/Post";
import {Image} from "./entity/Image";
import {ImageInfo} from "./entity/ImageInfo";
import {Question} from "./entity/Question";
import { OldEntityFactory } from "../../../../src";

describe("entity-metadata-validator > initialized relations", () => {

    it("should throw error if relation with initialized array was found on many-to-many relation", () => {

        expect(() => {
            new Connection({ // dummy connection options, connection won't be established anyway
                type: "mysql",
                host: "localhost",
                username: "test",
                password: "test",
                database: "test",
                entities: [Post, Category],
                entityFactory: new OldEntityFactory()
            });
        }).to.throw(InitializedRelationError);
    });

    it("should throw error if relation with initialized array was found on one-to-many relation", () => {
        expect(() => {
            new Connection({ // dummy connection options, connection won't be established anyway
                type: "mysql",
                host: "localhost",
                username: "test",
                password: "test",
                database: "test",
                entities: [Image, ImageInfo],
                entityFactory: new OldEntityFactory()
            });
        }).to.throw(InitializedRelationError);
    });

    it("should not throw error if relation with initialized array was not found", () => {
        expect(() => {
            new Connection({ // dummy connection options, connection won't be established anyway
                type: "mysql",
                host: "localhost",
                username: "test",
                password: "test",
                database: "test",
                entities: [Category],
                entityFactory: new OldEntityFactory()
            });
        }).not.to.throw(InitializedRelationError);
    });

    it("should not throw error if relation with initialized array was found, but persistence for this relation was disabled", () => {
        expect(() => {
            new Connection({ // dummy connection options, connection won't be established anyway
                type: "mysql",
                host: "localhost",
                username: "test",
                password: "test",
                database: "test",
                entities: [Question, Category],
                entityFactory: new OldEntityFactory()
            });
        }).not.to.throw(InitializedRelationError);
    });

});
