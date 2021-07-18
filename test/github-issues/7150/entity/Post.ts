import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ValueTransformer,
} from "../../../../src";

const unixTimestamp: ValueTransformer = {
  from: (value: Date | null | undefined): number | null | undefined => {
    return value ? value.getTime() : value;
  },
  to: (value: number | null | undefined): Date | null | undefined => {
    return typeof value === "number" ? new Date(value) : value;
  },
};


@Entity({ name: "posts" })
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn({
        name: "created_at",
        type: "timestamptz",
        transformer: unixTimestamp,
    })
    createdAt: number;

    @UpdateDateColumn({
        name: "updated_at",
        type: "timestamptz",
        transformer: unixTimestamp,
    })

    updatedAt: number;

    @Column({
      name: "content",
      type: "text",
    })
    content: string;
}
