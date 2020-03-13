import {Entity} from "../../../../../../src/decorator/entity/Entity";
import {ManyToOne} from "../../../../../../src/decorator/relations/ManyToOne";
import {Event} from "./Event";
import {User} from "./User";
import {PrimaryColumn} from "../../../../../../src/decorator/columns/PrimaryColumn";

@Entity()
export class EventMember {

    @PrimaryColumn()
    eventId: number;

    @PrimaryColumn()
    userId: number;

    @ManyToOne(type => Event, event => event.members)
    event: Event;

    @ManyToOne(type => User, user => user.members)
    user: User;

}