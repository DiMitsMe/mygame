import {Server} from "../../Server";
import {Player} from "../../entities/Player";
import {Building} from "../../entities/Building";
import {ClientPackets} from "../../enums/packets/ClientPackets";
import {EntityType} from "../../enums/types/EntityType";

export class TotemSystem {
    private server: Server;
    constructor(server: Server) {
        this.server = server;
    }

    public joinTeam(player: Player) {
        if(Date.now() - player.lastTotemLeave < 30000) return;

        const totem = this.server.map.getNearest(player, [EntityType.TOTEM], 100) as Building;

        if(totem.realPosition.distance(player.realPosition) > 100) return;
        if(player.totem) return;
        if(totem.info) return;

        player.totem = totem;

        totem.data.push(player.id);

        this.broadcastMemberId(totem, player.id);
        player.client.sendU8([ClientPackets.JOIN_NEW_TEAM, ...totem.data]);
    }

    public leaveTeam(player: Player) {
        if(!player.totem) return;

        this.broadcastExcludeMemberId(player.totem, player.id);

        player.totem.data = player.totem.data.filter((id: any) => id !== player.id);
        player.totem = null;
    }

    public kickTeam(player: Player, id: number) {
        if(!Number.isInteger(id) || !player.totem || player.id === id || player.totem.owner !== player) return;

        this.broadcastExcludeMemberId(player.totem, id);
        player.totem.data = player.totem.data.filter((i: any) => i !== id);
    }

    public lockTeam(player: Player) {
        if(!player.totem || player.totem.owner !== player) return;

        player.totem.info = Number(!player.totem.info);
    }

    public broadcastMemberId(totem: Building, id: number) {
        for (const i of totem.data) {
            if(i == id) continue;
            const p = this.server.findPlayerById(i) as Player;
            p.client.sendU8([ClientPackets.NEW_MEMBER_TEAM, id]);
        }
    }

    public broadcastDestroyTeam(totem: Building) {
        for (const i of totem.data) {
            const p = this.server.findPlayerById(i) as Player;
            p.totem = null;
            p.lastTotemLeave = Date.now();
            p.client.sendU8([ClientPackets.DESTROY_TEAM]);
        }
    }

    public broadcastExcludeMemberId(totem: Building, id: number) {
        for (const i of totem.data) {
            const p = this.server.findPlayerById(i) as Player;
            p.client.sendU8([ClientPackets.EXCLUDE_TEAM, id]);
        }
    }
}