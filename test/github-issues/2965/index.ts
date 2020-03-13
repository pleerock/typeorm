import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src";
import {Person} from "./entity/person";
import {Note} from "./entity/note";

// todo: this functionality is broken in 0.3.x, fix it if we are interested in maintaining lazy relations
describe.skip("github issues > #2965 Reuse preloaded lazy relations", () => {
    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [ __dirname + "/entity/*{.js,.ts}" ],
        // use for manual validation
        // logging: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should resuse preloaded lazy relations", () => Promise.all(connections.map(async connection => {

        const repoPerson = connection.getRepository(Person);
        const repoNote = connection.getRepository(Note);

        const personA = await repoPerson.create({ name: "personA" });
        const personB = await repoPerson.create({ name: "personB" });

        await repoPerson.save([
            personA,
            personB,
        ]);

        await repoNote.insert({ label: "note1", owner: personA });
        await repoNote.insert({ label: "note2", owner: personB });

        const originalLoad: (...args: any[]) => Promise<any[]> = connection.relationLoader.load;
        let loadCalledCounter = 0;
        connection.relationLoader.load = (...args: any[]): Promise<any[]> => {
            loadCalledCounter++;
            return originalLoad.call(connection.relationLoader, ...args);
        };

        {
            const res = await repoPerson.find({ relations: ["notes"] });
            const personANotes = await res[0].notes;
            loadCalledCounter.should.be.equal(0);
            personANotes[0].label.should.be.equal("note1");
        }

        {
            const res = await repoPerson.find();
            const personBNotes = await res[1].notes;
            loadCalledCounter.should.be.equal(1);
            personBNotes[0].label.should.be.equal("note2");
        }

        connection.relationLoader.load = originalLoad;
    })));

});
