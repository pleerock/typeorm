import {Entity, JoinColumn, OneToMany, OneToOne} from "../../../../src";
import {PrimaryGeneratedColumn} from "../../../../src";
import {Column} from "../../../../src";
import {User} from "./User";
import {Comment} from "./Comment";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    userId: number;

    @OneToOne(type => User, user => user.post)
    @JoinColumn()
    user: User;

    @OneToMany(type => Comment, comment => comment.post)
    comments: Comment[];

    hasTitle?: boolean;
}
