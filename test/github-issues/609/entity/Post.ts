import {CreateDateColumn, Entity, PrimaryGeneratedColumn} from "../../../../src";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn({ precision: 0, default: () => "CURRENT_TIMESTAMP" })
    createDate: Date;

}