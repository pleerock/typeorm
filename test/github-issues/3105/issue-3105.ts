import "reflect-metadata";
import { closeTestingConnections, createTestingConnections,
	reloadTestingDatabases } from "../../utils/test-utils";
import { Connection, EntityManager, getManager } from "../../../src";
import { Parent } from "./entity/Parent";
import { Child } from "./entity/Child";


describe("github issues > #3105 Error with cascading saves using EntityManager in a transaction", () => {
	let connections: Connection[];

	before(async () => connections = await createTestingConnections({
		entities: [__dirname + "/entity/*{.js,.ts}"]
	}));

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("if entity was changed, subscriber should be take updated columns", () => Promise.all(connections.map(async function (connection) {
		await getManager().transaction(async (transactionalEntityManager: EntityManager) => {
			const parent = new Parent();
			parent.children = [new Child(1), new Child(2)];

			let newParent = await transactionalEntityManager.save(parent);

			newParent.children = [new Child(4), new Child(5)];
			newParent = await transactionalEntityManager.save(parent);


			// Check that the correct children are persisted with the parent.
			const findChildOne = newParent.children.find(child => {
				return child.data === 4;
			})

			const findChildTwo = newParent.children.find(child => {
				return child.data === 5;
			})

			findChildOne!.should.be.not.null;
			findChildTwo!.should.be.not.null;
		});
	})));
});
