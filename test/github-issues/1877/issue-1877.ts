import "reflect-metadata";
import {Connection} from "../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections} from "../../utils/test-utils";
import {Item} from "./entity/Item";
import {Auction} from "./entity/Auction";
import { PostgresDriver } from "../../../src/driver/postgres/PostgresDriver";

describe("github issues > #1877 Constraint unique for relations problem", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["postgres"],
            schemaCreate: true,
            dropSchema: true,
        });
    });
    after(() => closeTestingConnections(connections));

    it("should create two async saves with cascade", () => Promise.all(connections.map(async connection => {
        if (connection.driver instanceof PostgresDriver) {
            const auctionRepository = connection.getRepository(Auction);
            const itemRepository = connection.getRepository(Item);

            const createAuction = async () => {
                const auction = new Auction();

                let item = await itemRepository.findOne(1);

                if (!item) {
                    item = {
                        id: 1
                    } as Item;
                }

                auction.item = item;
                auction.price = 20;
                const savedAuction = await auctionRepository.save(auction);
                console.log('Created auction:', savedAuction);
            };
            
            const createItem = async () => {
                // await sleep(100);
                const item = new Item();
                item.id = 1;
                item.name = "Test";
                const savedItem = await itemRepository.save(item);
                console.log('Created item:', savedItem);
            };

            // const sleep = async (ms: number) => {
            //     return new Promise(resolve => setTimeout(resolve, ms));
            // }

            await Promise.all([createAuction(), createItem()]);
        }
    })));

});
