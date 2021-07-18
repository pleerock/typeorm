import { User } from "./User";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn
} from "../../../../src";

export class PostInfo {
    @OneToOne(type => User)
    @JoinColumn()
    author?: User;

    @Column({ nullable: true})
    authorId?: string;
}

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true})
    authorId?: string;

    @Column(type => PostInfo)
    info: PostInfo = new PostInfo();
}
