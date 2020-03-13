import {Entity} from "../../../../../src/decorator/entity/Entity";
import {PrimaryColumn} from "../../../../../src/decorator/columns/PrimaryColumn";
import {Column} from "../../../../../src/decorator/columns/Column";
import {Post} from "./Post";
import {OneToMany} from "../../../../../src/decorator/relations/OneToMany";
import {Generated} from "../../../../../src/decorator/Generated";


@Entity()
export class Category {

    @PrimaryColumn()
    @Generated()
    categoryId: number;

    @Column()
    name: string;

    @OneToMany(type => Post, post => post.category)
    posts: Post[];

}
