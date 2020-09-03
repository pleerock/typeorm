import { BaseEntity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Entity } from "../../../../src";
import User from "./User";
import Category from "./Category";

@Entity()
export default class Post extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    code: string;

    @Column()
    authorId: number;

    @Column()
    categoryId: number;

    @Column()
    subject: string;

    @Column()
    body: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, user => user.posts)
    author: User;

    @ManyToOne(() => Category, category => category.posts)
    category: Category;
}
