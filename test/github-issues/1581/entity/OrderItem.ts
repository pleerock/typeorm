import {Column, Entity, ManyToOne} from "../../../../src";
import {Order} from "./Order";
import {Product} from "./Product";
import {PrimaryColumn} from "../../../../src/decorator/columns/PrimaryColumn";

@Entity()
export class OrderItem {

    @PrimaryColumn()
    orderId: number;

    @PrimaryColumn()
    productId: number;

    @ManyToOne(type => Order, recurringOrder => recurringOrder.items)
    order: Order;

    @ManyToOne(type => Product)
    product: Product;

    @Column()
    amount: number;

}
