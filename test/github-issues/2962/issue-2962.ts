import "reflect-metadata";

import { expect } from "chai";

import { Connection } from "../../../src/connection/Connection";
import {
  closeTestingConnections,
  createTestingConnections,
  reloadTestingDatabases
} from "../../utils/test-utils";
import { Bar } from "./entity/Bar";
import { Foo } from "./entity/Foo";

describe("github issues > #2955 updates not cascading correctly", () => {
  let connections: Connection[];
  before(
    async () =>
      (connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["mysql", "mariadb", "postgres"],
        schemaCreate: true,
        dropSchema: true
      }))
  );
  beforeEach(() => reloadTestingDatabases(connections));
  after(() => closeTestingConnections(connections));

  it("should insert child entities", () =>
    Promise.all(
      connections.map(async function(connection) {
        const fooRepo = connection.getRepository(Foo);
        const barRepo = connection.getRepository(Bar);

        const bar1 = new Bar();
        const bar2 = new Bar();
        let foo: Foo | undefined = new Foo();
        foo.bars = [bar1, bar2];

        let saveResult = await fooRepo.save(foo);
        foo = await fooRepo.findOne(saveResult.id, { relations: ["bars"] });
        expect(foo!.bars.length).to.equal(2);
        let bars = await barRepo.find();
        expect(bars.length).to.equal(2);
        expect(bars[0].isTrapazoidal).to.be.false;
      })
    ));

  it("should update child entities", () =>
    Promise.all(
      connections.map(async function(connection) {
        const fooRepo = connection.getRepository(Foo);
        const barRepo = connection.getRepository(Bar);

        const bar1 = new Bar();
        const bar2 = new Bar();
        let foo: Foo | undefined = new Foo();
        foo.bars = [bar1, bar2];

        const saveResult = await fooRepo.save(foo);
        foo = await fooRepo.findOne(saveResult.id, { relations: ["bars"] });

        foo!.bars = foo!.bars.map(bar => ({ ...bar, isTrapazoidal: true }));
        foo!.hasStuff = true;
        await fooRepo.save(foo!);
        foo = await fooRepo.findOne(saveResult.id, { relations: ["bars"] });
        const bars = await barRepo.find();
        bars.map(bar => {
          expect(bar.isTrapazoidal).to.be.true;
        });
      })
    ));

  it("should delete child entities that would be orphaned", () =>
    Promise.all(
      connections.map(async function(connection) {
        const fooRepo = connection.getRepository(Foo);

        const bar1 = new Bar();
        const bar2 = new Bar();
        let foo: Foo | undefined = new Foo();
        foo.bars = [bar1, bar2];

        const saveResult = await fooRepo.save(foo);
        foo = await fooRepo.findOne(saveResult.id, { relations: ["bars"] });

        foo!.bars = [];
        foo = await fooRepo.save(foo!);
        expect(foo!.bars.length).to.equal(0);
      })
    ));

  it("should cascade delete child entities", () =>
    Promise.all(
      connections.map(async function(connection) {
        const fooRepo = connection.getRepository(Foo);
        const barRepo = connection.getRepository(Bar);

        const bar1 = new Bar();
        const bar2 = new Bar();
        let foo: Foo | undefined = new Foo();
        foo.bars = [bar1, bar2];

        await fooRepo.save(foo);
        let foos = await fooRepo.find();
        let bars = await barRepo.find();
        expect(foos.length).to.equal(1);
        expect(bars.length).to.equal(2);
        await fooRepo.remove(foos);
        foos = await fooRepo.find();
        bars = await barRepo.find();
        expect(foos.length).to.equal(0);
        expect(bars.length).to.equal(0);
      })
    ));
});
