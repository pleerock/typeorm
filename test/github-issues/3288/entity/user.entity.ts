import {Entity} from "../../../../src/decorator/entity/Entity";
import { PrimaryGeneratedColumn } from "../../../../src";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id: number;
}
  