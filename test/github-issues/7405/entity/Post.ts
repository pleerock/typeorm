import { Column, Entity, PrimaryGeneratedColumn } from "../../../../src";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    constructor(id: number, title: string) {
      this.id = id;
      this.title = title;
  }

}
