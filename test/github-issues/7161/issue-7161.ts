import { Connection } from "../../../src/connection/Connection";
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../utils/test-utils";
import { COrder, Order, Product, User } from "./entity/entities";

describe("github issues > #7161 Add support for non-distinct count in getCount()", () => {
    let connections: Connection[];
    before(
        async () =>
            (connections = await createTestingConnections({
                entities: [__dirname + "/entity/*{.js,.ts}"],
                schemaCreate: true,
                dropSchema: true,
            }))
    );
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    const createData = async (connection: Connection) => {
        const userA = new User({ id: 1, name: "A" });
        const userB = new User({ id: 2, name: "B" });
        const userC = new User({ id: 3, name: "C" });
        const users = [userA, userB, userC];

        const userRepository = connection.getRepository(User);
        await userRepository.save(userA);
        await userRepository.save(userB);
        await userRepository.save(userC);

        const productRepository = connection.getRepository(Product);
        const p1 = await productRepository.save(
            new Product({ id: 1, name: "Product 1" })
        );
        const p2 = await productRepository.save(
            new Product({ id: 2, name: "Product 2" })
        );
        const p3 = await productRepository.save(
            new Product({ id: 3, name: "Product 3" })
        );

        const now = new Date();
        const orderRepository = connection.getRepository(Order);
        await orderRepository.save(
            new Order({
                id: 1,
                date: now,
                user: userA,
                products: [p1, p2, p3],
            })
        );
        await orderRepository.save(
            new Order({
                id: 2,
                date: now,
                user: userA,
                products: [p1],
            })
        );
        await orderRepository.save(
            new Order({
                id: 3,
                date: now,
                user: userB,
                products: [p1, p3],
            })
        );
        await orderRepository.save(
            new Order({
                id: 4,
                date: now,
                user: userB,
                products: [p1, p2],
            })
        );
        await orderRepository.save(
            new Order({
                id: 5,
                date: now,
                user: userC,
                products: [p1, p2],
            })
        );

        const compositeOrderRepository =
            connection.getRepository(COrder);
        await compositeOrderRepository.save(
            new COrder({
                id: 1,
                key: "a",
                date: now,
                user: userA,
                products: [p1, p2, p3],
            })
        );
        await compositeOrderRepository.save(
            new COrder({
                id: 1,
                key: "b",
                date: now,
                user: userA,
                products: [p1, p2, p3],
            })
        );

        return users;
    };

    it("Repository.count()", () =>
        Promise.all(
            connections.map(async (connection) => {
                const data = await createData(connection);
                const userA = data[0];

                const userRepository = connection.getRepository(User);
                const userCount = await userRepository.count();
                userCount.should.eql(3);

                const orderRepository = connection.getRepository(Order);
                const orderByUser = await orderRepository.count({
                    relations: ["user"],
                    where: { user: userA },
                });
                orderByUser.should.eql(2);

                const orderByUserWithoutDistinct = await orderRepository.count({
                    distinct: false,
                    relations: ["user"],
                    where: { user: userA },
                });
                orderByUserWithoutDistinct.should.eql(2);

                const orderWithProducts = await orderRepository.count({
                    relations: ["user", "products"],
                    where: { user: userA },
                });
                orderWithProducts.should.eql(2);

                const orderWithProductsWithDistinct =
                    await orderRepository.count({
                        distinct: true,
                        relations: ["user", "products"],
                        where: { user: userA },
                    });
                orderWithProductsWithDistinct.should.eql(2);

                const orderWithProductsWithoutDistinct =
                    await orderRepository.count({
                        distinct: false,
                        relations: ["user", "products"],
                        where: { user: userA },
                    });
                orderWithProductsWithoutDistinct.should.eql(4);

                const compositeOrderRepository =
                    connection.getRepository(COrder);
                const compositeWithProducts =
                    await compositeOrderRepository.count({
                        relations: ["user", "products"],
                        where: { user: userA },
                    });
                compositeWithProducts.should.eql(2);

                const compositeWithProductsWithoutDistinct =
                    await compositeOrderRepository.count({
                        distinct: false,
                        relations: ["user", "products"],
                        where: { user: userA },
                    });
                compositeWithProductsWithoutDistinct.should.eql(6);
            })
        ));

    it("QueryBuilder.getCount() with setOption()", () =>
        Promise.all(
            connections.map(async (connection) => {
                const users = await createData(connection);
                const userA = users[0];

                const userRepository = connection.getRepository(User);
                const userCount = await userRepository
                    .createQueryBuilder("user")
                    .getCount();
                userCount.should.eql(3);

                const orderRepository = connection.getRepository(Order);
                const orderByUser = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .where("user.id = :id", { id: userA.id })
                    .getCount();
                orderByUser.should.eql(2);

                const orderByUserWithoutDistinct = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .where("user.id = :id", { id: userA.id })
                    .setOption("disable-count-distinct")
                    .getCount();
                orderByUserWithoutDistinct.should.eql(2);

                const orderWithProducts = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .leftJoin("order.products", "product")
                    .where("user.id = :id", { id: userA.id })
                    .getCount();
                orderWithProducts.should.eql(2);

                const orderWithProductsWithoutDistinct = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .leftJoin("order.products", "product")
                    .where("user.id = :id", { id: userA.id })
                    .setOption("disable-count-distinct")
                    .getCount();
                orderWithProductsWithoutDistinct.should.eql(4);

                const compositeOrderRepository =
                    connection.getRepository(COrder);
                const compositeOrderWithProducts =
                    await compositeOrderRepository
                        .createQueryBuilder("c_order")
                        .leftJoin("c_order.user", "user")
                        .leftJoin("c_order.products", "product")
                        .where("user.id = :id", { id: userA.id })
                        .getCount();
                compositeOrderWithProducts.should.eql(2);

                const compositeOrderWithProductsWithoutDistinct =
                    await compositeOrderRepository
                        .createQueryBuilder("c_order")
                        .leftJoin("c_order.user", "user")
                        .leftJoin("c_order.products", "product")
                        .where("user.id = :id", { id: userA.id })
                        .setOption("disable-count-distinct")
                        .getCount();
                compositeOrderWithProductsWithoutDistinct.should.eql(6);
            })
        ));

    it("QueryBuilder.getCount(options)", () =>
        Promise.all(
            connections.map(async (connection) => {
                const users = await createData(connection);
                const userA = users[0];

                const userRepository = connection.getRepository(User);
                const userCount = await userRepository
                    .createQueryBuilder("user")
                    .getCount({distinct: true});
                userCount.should.eql(3);

                const orderRepository = connection.getRepository(Order);
                const orderByUser = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .where("user.id = :id", { id: userA.id })
                    .getCount({distinct: true});
                orderByUser.should.eql(2);

                const orderByUserWithoutDistinct = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .where("user.id = :id", { id: userA.id })
                    .getCount({distinct: false});
                orderByUserWithoutDistinct.should.eql(2);

                const orderWithProducts = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .leftJoin("order.products", "product")
                    .where("user.id = :id", { id: userA.id })
                    .getCount({distinct: true});
                orderWithProducts.should.eql(2);

                const orderWithProductsWithoutDistinct = await orderRepository
                    .createQueryBuilder("order")
                    .leftJoin("order.user", "user")
                    .leftJoin("order.products", "product")
                    .where("user.id = :id", { id: userA.id })
                    .getCount({distinct: false});
                orderWithProductsWithoutDistinct.should.eql(4);

                const compositeOrderRepository =
                    connection.getRepository(COrder);
                const compositeOrderWithProducts =
                    await compositeOrderRepository
                        .createQueryBuilder("c_order")
                        .leftJoin("c_order.user", "user")
                        .leftJoin("c_order.products", "product")
                        .where("user.id = :id", { id: userA.id })
                        .getCount({distinct: true});
                compositeOrderWithProducts.should.eql(2);

                const compositeOrderWithProductsWithoutDistinct =
                    await compositeOrderRepository
                        .createQueryBuilder("c_order")
                        .leftJoin("c_order.user", "user")
                        .leftJoin("c_order.products", "product")
                        .where("user.id = :id", { id: userA.id })
                        .getCount({distinct: false});
                compositeOrderWithProductsWithoutDistinct.should.eql(6);
            })
        ));
});
