import { Connection } from "../../../src/connection/Connection";

import {
    createTestingConnections,
    closeTestingConnections,
    reloadTestingDatabases,
} from "../../utils/test-utils";

import { Customer } from "./entity/Customer";

describe("github issues > #4293 Transformed value not returned on save", () => {
    let connections: Connection[];

    before(async () => {
        connections = await createTestingConnections({
            entities: [Customer],
            schemaCreate: true,
            dropSchema: true,
        });
    });

    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should return transformed value on save new entity", () => {
        return Promise.all(
            connections.map(async (connection) => {
                const repo = connection.manager.getRepository(Customer);

                const customer = await repo.save({
                    firstName: " Foo ",
                    lastName: " Bar ",
                });

                customer.firstName.should.eql("Foo");
                customer.lastName.should.eql("Bar");
            })
        );
    });

    it("should return transformed value on update entity", () => {
        return Promise.all(
            connections.map(async (connection) => {
                const repo = connection.manager.getRepository(Customer);

                const { id: customerId } = await repo.save({
                    firstName: "Foo",
                    lastName: "Bar",
                });

                const updatedCustomer = await repo.save({
                    id: customerId,
                    firstName: " Bar ",
                    lastName: " Foo ",
                });

                updatedCustomer.firstName.should.eql("Bar");
                updatedCustomer.lastName.should.eql("Foo");
            })
        );
    });
});
