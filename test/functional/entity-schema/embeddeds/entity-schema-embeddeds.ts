import { Connection } from "../../../../src";
import { createTestingConnections, reloadTestingDatabases, closeTestingConnections } from "../../../utils/test-utils";
import { PersonSchema } from "./entity/Person";

describe("entity schemas > embeddeds", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [
            PersonSchema
        ],
        enabledDrivers: ["mysql", "sqlite", "postgres"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should create columns for embeddeds entities", () => Promise.all(connections.map(async connection => {
        const queryRunner = connection.createQueryRunner();
        const table = (await queryRunner.getTable("person"))!;
        table.should.be.ok;
        table.findColumnByName("addressCity")!.should.be.ok;
        table.findColumnByName("addressZipcode")!.should.be.ok;
        table.findColumnByName("addressCoordinatesLongitude")!.should.be.ok;
        table.findColumnByName("addressCoordinatesLatitude")!.should.be.ok;
        await queryRunner.release();
    })));

    it("should insert and query records with embedded entities", () => Promise.all(connections.map(async connection => {
        const personRepository = connection.getRepository(PersonSchema);
        const person = personRepository.create({
            name: "test name",
            email: "test email",
            address: {
                city: "test city",
                zipcode: "test zipcode",
                coordinates: {
                    longitude: -40.3004474,
                    latitude: -20.2676419
                }
            }
        });
        await personRepository.save(person);
        const personReloaded = (await personRepository.findOne(person.id))!;
        personReloaded.should.be.ok;
        personReloaded.address.should.be.ok;
        personReloaded.address.coordinates.should.be.ok;
        personReloaded.address.city!.should.be.equal(person.address.city);
        personReloaded.address.zipcode.should.be.equal(person.address.zipcode);
        personReloaded.address.coordinates.longitude!.should.be.equal(person.address.coordinates.longitude);
        personReloaded.address.coordinates.latitude!.should.be.equal(person.address.coordinates.latitude);
    })));

});