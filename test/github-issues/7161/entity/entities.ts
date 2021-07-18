import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryColumn,
    PrimaryGeneratedColumn,
} from "../../../../src";

export default abstract class Base<T> {
    constructor(args?: Partial<T>) {
        Object.assign(this, args ?? {});
    }
}

@Entity()
export class User extends Base<User> {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}

@Entity()
export class Product extends Base<Product> {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}

@Entity()
export class Order extends Base<Order> {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @ManyToOne(() => User)
    user: User;

    @ManyToMany(() => Product)
    @JoinTable()
    products: Product[];
}

@Entity()
export class COrder extends Base<COrder> {
    @PrimaryColumn()
    id: number;

    @PrimaryColumn()
    key: string;

    @Column()
    date: Date;

    @ManyToOne(() => User)
    user: User;

    @ManyToMany(() => Product)
    @JoinTable()
    products: Product[];
}
