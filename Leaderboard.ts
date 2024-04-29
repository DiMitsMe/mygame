import {Server} from "../Server";
import {BinaryWriter} from "../modules/BinaryWriter";
import {ClientPackets} from "../enums/packets/ClientPackets";

export class Leaderboard {
    private server: Server;
    constructor(server: Server) {
        this.server = server;
    }

    private restore_number(n: number) {
        if (n >= 1e10) n = n / 1e7 + 60000;
        else if (n >= 1e9) n = n / 1e6 + 50000;
        else if (n >= 1e8) n = n / 1e5 + 40000;
        else if (n >= 1e7) n = n / 1e4 + 30000;
        else if (n >= 1e6) n = n / 1e3 + 20000;
        else if (n >= 1e4) n = n / 1e2 + 10000;

        return n;
    }

    public tick() {
        const writer = new BinaryWriter();
        const leaderboard = this.server.players.sort((a, b) => b.score - a.score).slice(0, 10);

        writer.writeUInt16(ClientPackets.LEADERBOARD);
        writer.writeUInt16(0);
        for (const player of leaderboard) {
            writer.writeUInt16(player.id);
            writer.writeUInt16(player.score);
        }

        this.server.broadcast(writer.toBuffer(), true);
    }
}
