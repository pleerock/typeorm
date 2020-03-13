import {Entity} from "../../../../src/decorator/entity/Entity";
import {Column} from "../../../../src/decorator/columns/Column";
import {OneToOne} from "../../../../src/decorator/relations/OneToOne";
import {JoinColumn} from "../../../../src/decorator/relations/JoinColumn";
import {User} from "./User";
import {PrimaryColumn} from "../../../../src/decorator/columns/PrimaryColumn";

@Entity()
export class UserCredential {

    @PrimaryColumn()
    id: number;

    @OneToOne(() => User, {
        cascade: true,
    })
    @JoinColumn({
        name: "id",
        referencedColumnName: "id",
    })
    user: User;

    @Column()
    password: string;

    @Column()
    salt: string;

}