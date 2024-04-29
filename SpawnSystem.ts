import {Map} from "../../world/Map";
import {Biome} from "../../world/map/Biome";
import {Vector} from "../../modules/Vector";
import {TileType} from "../../enums/types/TileType";

export class SpawnSystem {
    private map: Map;
    constructor(map: Map) {
        this.map = map;
    }

    public getSpawnPoint(biomeName: string) {
        const biome = this.getRandomBiome(biomeName);
        if(!biome && biomeName !== "ISLAND") return new Vector(0, 0);

        let attempt = 10000;
        let position = Vector.zero();

        if(biomeName === "ISLAND") {
            while (attempt) {
                attempt--;

                position.x = Math.random_clamp(10000, this.map.width - 1);
                position.y = Math.random_clamp(5000, this.map.height - 1);

                let chunk = this.map.getChunk(position.x, position.y);
                if(!chunk || !chunk.tiles) continue;
                const tile = chunk.tiles.find(tile => tile.type === TileType.SAND);

                if(tile) {
                    attempt = 0;
                }
            }
        } else {
            while (attempt) {
                attempt--;

                position.x = Math.random_clamp(biome.position.x, biome.position.x + biome.size.x);
                position.y = Math.random_clamp(biome.position.y, biome.position.y + biome.size.y);

                const tiles = this.map.getTiles(position.x, position.y, 2);
                const entities = this.map.getEntities(position.x, position.y, 2);

                if(tiles.length === 0 && entities.length === 0) {
                    attempt = 0;
                }
            }
        }

        return position;
    }

    private getRandomBiome(biomeName: string): Biome {
        const biomes = this.map.biomes.filter(biome => biome.type === biomeName);
        return biomes[~~(Math.random() * biomes.length)];
    }
}