import {Entity} from "../../entities/Entity";
import {TileType} from "../../enums/types/TileType";
import {EntityType} from "../../enums/types/EntityType";
import {State} from "../../enums/State";

export class StateSystem {
    private entity: Entity;
    public states: boolean[];
    constructor(entity: Entity) {
        this.entity = entity;
        this.states = new Array(16);
    }

    public update() {
        let [
            isWater, isRiver, isLake,
            isForest, isWinter, isLavaBiome, isDesert,
            isBeach, isIsland, isCave,
            isBridge, isRoof, isTower, isBed,
            isLava, onFire
        ] = this.states;
        const thisChunk = this.entity.server.map.getChunk(this.entity.position.x, this.entity.position.y);
        const biomes = this.entity.server.map.getBiomesAtEntityPosition(this.entity.position);

        if(biomes.length >= 1) {
            this.states[State.isDesert] = biomes.includes("DESERT");
            this.states[State.isWinter] = biomes.includes("WINTER") || biomes.includes("DRAGON");
            this.states[State.isLavaBiome] = biomes.includes("LAVA");
            this.states[State.isBeach] = biomes.includes("BEACH");
            this.states[State.isForest] = biomes.includes("FOREST");
            this.states[State.isCave] = biomes.includes("DRAGON");
            this.states[State.isWater] = isWater || biomes.includes("SEA") && !isIsland;
        } else this.states[State.isWater] = true;

        if(!thisChunk) return;

        for (const tile of thisChunk.tiles) {
            if(tile.type === TileType.SAND) this.states[State.isIsland] = true;
            if(tile.type === TileType.RIVER) {
                this.states[State.isLake] = true;
                this.states[State.isWater] = true;
                if(tile.meta) this.states[State.isWater] = true;
            }
        }

        for (const entity of thisChunk.entities) {
            this.states[State.isBridge] = entity.type === EntityType.BRIDGE;
            this.states[State.isRoof] = entity.type === EntityType.ROOF;
            this.states[State.isTower] = entity.type === EntityType.WOOD_TOWER;
            this.states[State.isBed] = entity.type === EntityType.BED;
            this.states[State.onFire] = entity.type === EntityType.FIRE;
        }
    }
}