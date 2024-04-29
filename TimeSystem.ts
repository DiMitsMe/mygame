import { Server } from "../../Server";
import { ClientPackets } from "../../enums/packets/ClientPackets";
import { BinaryWriter } from "../../modules/BinaryWriter";
import {WorldTime} from "../../enums/WorldTime";

export class TimeSystem {
    private readonly CYCLE: number = 8 * 60 * 1000;
    private server: Server;
    public time: 1 | 0;
    public sent: boolean = false;
    public clock: number = Date.now();

    constructor(server: Server) {
        this.server = server;
        this.time = 0;
    }

    public tick() {
        if(this.getGameTime() > this.CYCLE / 2 && !this.sent) {
            this.time = WorldTime.NIGHT;
            this.sent = true;
            this.send();
        }
        if(this.getGameTime() > this.CYCLE) {
            this.time = WorldTime.DAY;
            this.sent = false;
            this.clock = Date.now();
            this.send();
        }
    }

    public getGameTime() {
        return Date.now() - this.clock;
    }

    public send() {
        const writer = new BinaryWriter(2);

        writer.writeUInt8(ClientPackets.GET_TIME);
        writer.writeUInt8(this.time);

        this.server.broadcast(writer.toBuffer(), true);
    }

}