import {Entity} from "../../../../src/decorator/entity/Entity";
import {Column} from "../../../../src/decorator/columns/Column";
import {PrimaryGeneratedColumn} from "../../../../src/decorator/columns/PrimaryGeneratedColumn";
import {ManyToOne} from "../../../../src/decorator/relations/ManyToOne";
import {User} from "./User";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    content: string;

    @Column({ default: 0 })
    order: number;

    @ManyToOne(
      type => User,
      user => user.posts
    )
    user: User;
}
