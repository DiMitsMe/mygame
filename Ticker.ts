import {Server} from "../Server";
import NanoTimer from "../nanotimer";
import {EntityPacket} from "../packets/EntityPacket";
import {ActionType} from "../enums/types/ActionType";
import {Player} from "../entities/Player";
import {Animal} from "../entities/Animal";

export class Ticker {
    private server: Server;
    constructor(server: Server) {
        this.server = server;

        new NanoTimer().setInterval(() => {
            this.server.map.updateEntitiesInChunks();
            this.server.timeSystem.tick();
            this.server.mobSystem.tick();
            this.server.combatSystem.tick();
            this.server.eventSystem.tick();
            
            for (const entity of this.server.entities) {
                entity.onTick();

                if(entity instanceof Animal || entity instanceof Player) {
                    entity.movement.tick();
                }

                if(entity instanceof Player) {
                    new EntityPacket(entity);
                    this.server.collision.updateState(entity);
                }
            }

            for (const entity of this.server.entities) {
                entity.lastTick();
            }
        },[],1 / this.server.settings.tps + "s");

        new NanoTimer().setInterval(() => {
            this.server.leaderboard.tick();
        }, [], "1s");
    }
}
