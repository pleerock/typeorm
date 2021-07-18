import {Entity, PrimaryGeneratedColumn, JoinColumn, Column} from "../../../../src";
import {ManyToOne} from "../../../../src/decorator/relations/ManyToOne";
import {Item} from "./Item";

@Entity()
export class Auction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    price: number;

    @ManyToOne(type => Item, item => item.auctions, { cascade: ['insert', 'update'] })
    @JoinColumn()
    item: Item;
}