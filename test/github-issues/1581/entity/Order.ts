import {DeliverySlot} from "./DeliverySlot";
import {User} from "./User";
import {OrderItem} from "./OrderItem";
import {Column, Entity, ManyToOne, OneToMany} from "../../../../src";
import {PrimaryColumn} from "../../../../src/decorator/columns/PrimaryColumn";

@Entity()
export class Order {

    @PrimaryColumn()
    deliverySlotId: number;

    @ManyToOne(type => DeliverySlot)
    deliverySlot: DeliverySlot;

    @ManyToOne(type => User, user => user.recurringOrders)
    user: User;

    @Column()
    enabled: boolean;

    @OneToMany(type => OrderItem, item => item.order)
    items: OrderItem[];
}
