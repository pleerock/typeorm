import {Entity, OneToMany, PrimaryColumn, Column} from "../../../../src";
import {Auction} from "./Auction";

@Entity()
export class Item {
    @PrimaryColumn()
    id: number;

    @Column({
        nullable: true
    })
    name: string;

    @OneToMany(type => Auction, auction => auction.item)
    auctions: Auction[];
}