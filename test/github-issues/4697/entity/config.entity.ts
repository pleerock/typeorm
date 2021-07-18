import { ObjectId } from "mongodb";
import {Entity, ObjectIdColumn, Column} from "../../../../src";

/**
 * @deprecated use item config instead
 */
@Entity()
export class Config {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  itemId: string;

  @Column({ type: "json" })
  data: any;
}
