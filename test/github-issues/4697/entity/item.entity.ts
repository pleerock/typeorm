import { ObjectId } from "mongodb";
import {Entity, ObjectIdColumn, Column} from "../../../../src";

@Entity()
export class Item {
  @ObjectIdColumn()
  public _id: ObjectId;

  /**
   * @deprecated use contacts instead
   */
  @Column()
  public contact?: string;

  @Column({ array: true })
  public contacts: Array<string>;

  @Column({ type: "json" })
  config: any;
}
