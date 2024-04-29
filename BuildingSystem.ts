import {Server} from "../../Server";
import {EntityType} from "../../enums/types/EntityType";
import {Player} from "../../entities/Player";
import {ItemType} from "../../enums/types/ItemType";
import {ClientPackets} from "../../enums/packets/ClientPackets";
import {Building} from "../../entities/Building";
import {Utils} from "../../modules/Utils";
import { TileType } from "../../enums/types/TileType";

export class BuildingSystem {
    private readonly server: Server;
    constructor(server: Server) {
        this.server = server;
    }

    public async request(player: Player, dat: number[]) {
        if(player.isCollideFlying) {
            return;
        };
        const data: number[] = dat;
        data.shift();
        if(data.length < 3 || Date.now() - player.lastBuildingStamp <= this.server.config.build_delay) return;

        for (let i = 0; i < data.length; i++) {
            if(!Number.isInteger(data[i])) return;
        }

        const id = data[0];
        const type = EntityType[ItemType[id] as any] as any;
        const angle = data[1];
        const isGrid = data[2];

        if((isGrid !== 0 && isGrid !== 1) || angle < 0 || angle > 255 || !type || !player.inventory.containsItem(id, 1)) return;
        if(player.totem?.data.length > 0 && type === EntityType.TOTEM) return;
        if(player.machine && type === EntityType.EMERALD_MACHINE) return;
        let building = new Building(type, player, this.server);

        building.angle = angle;
        building.position = Utils.getOffsetVector(player.realPosition, 120, angle);

        this.server.collision.updateState(building);

        if(isGrid || building.isGrid() || (building.isSeed() && building.plot)) {
            building.angle = 0;

            building.position.x = Math.floor(building.position.x / 100) * 100 + 50;
            building.position.y = Math.floor(building.position.y / 100) * 100 + 50;
        }

        const entities = this.server.map.getEntities(building.position.x, building.position.y, 3);
        const tiles = this.server.map.getTiles(building.position.x, building.position.y, 3);

        if(!building.isGrid() && building.water && !building.bridge && !building.island) return;
        if(building.isSeed() && !building.plot && (building.water || building.winter || building.lavaBiome || building.desert)) return;

        if(building.roof && building.type === EntityType.ROOF) return;
        if(building.bridge && building.type === EntityType.BRIDGE) return;
        if(building.tower && building.type === EntityType.WOOD_TOWER) return;
        if(building.bed && building.type === EntityType.BED) return;
        if(building.plot && building.type === EntityType.PLOT) return;
        if(building.isSeed() && (building.plot && building.seed) || (building.bridge && building.seed)) return;
        if(building.type === EntityType.EMERALD_MACHINE && !building.island && building.water) return;

        if(!building.isGrid() && !(building.isSeed() && building.plot) || [EntityType.BED, EntityType.PLOT].includes(building.type)) {
            for (const entity of entities) {
                const dist = entity.position.distance(building.position);
                if ((building.bridge && !building.infire) && !entity.collide && entity.type !== EntityType.PLOT) continue;
                if (dist < entity.radius + 45) return;
            }

            for (const tile of tiles) {
                const dist = tile.realPosition.distance(building.position);
                if(tile.type === TileType.SAND) continue;
                if(building.bridge && !tile.collide) continue;
                if(dist < tile.radius + building.radius) return;
            }
        }


        player.lastBuildingStamp = Date.now();
        player.inventory.removeItem(id, 1);
        player.client.sendU8([ClientPackets.ACCEPT_BUILD, id]);
        player.buildings.push(building);

        building.onPlaced();
        this.server.entities.push(building);


    }



}