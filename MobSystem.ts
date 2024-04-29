import {Server} from "../../Server";
import {EntityType} from "../../enums/types/EntityType";
import {Animal} from "../../entities/Animal";
import {BiomeType} from "../../enums/types/BiomeType";
import {TileType} from "../../enums/types/TileType";

export class MobSystem {
    public server: Server;
    public hasForestBiome: boolean;
    public hasWinterBiome: boolean;
    public hasDragonCave: boolean;
    public hasLavaBiome: boolean;
    public hasDesertBiome: boolean;
    public hasIslandBiome: boolean;

    public animalCounter: number[] = new Array(100).fill(0);

    constructor(server: Server) {
        this.server = server;
        const biomes = server.map.biomes.map(biome => biome.type);

        this.hasForestBiome = biomes.includes(BiomeType.FOREST);
        this.hasWinterBiome = biomes.includes(BiomeType.WINTER);
        this.hasLavaBiome = biomes.includes(BiomeType.LAVA);
        this.hasDragonCave = biomes.includes(BiomeType.DRAGON);
        this.hasDesertBiome = biomes.includes(BiomeType.DESERT);
        this.hasIslandBiome = server.map.tiles.findIndex(tile => tile.type === TileType.SAND) !== -1;
    }

    public tick() {
        if(this.hasForestBiome) {
            while (this.animalCounter[EntityType.WOLF] < this.server.config.max_wolf) {
                const entity = new Animal(EntityType.WOLF, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.SPIDER] < this.server.config.max_spider) {
                const entity = new Animal(EntityType.SPIDER, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.RABBIT] < this.server.config.max_rabbit) {
                const entity = new Animal(EntityType.RABBIT, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.BOAR] < this.server.config.max_boar) {
                const entity = new Animal(EntityType.BOAR, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.HAWK] < this.server.config.max_hawk) {
                const entity = new Animal(EntityType.HAWK, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.WHEAT_MOB] < this.server.config.max_wheat) {
                const entity = new Animal(EntityType.WHEAT_MOB, this.server);

                entity.position = this.server.spawnSystem.getSpawnPoint("FOREST");

                entity.realPosition.set(entity.position);

                this.server.entities.push(entity);
            }
        }

        while (this.animalCounter[EntityType.PIRANHA] < this.server.config.max_piranha) {
            const entity = new Animal(EntityType.PIRANHA, this.server);

            this.server.entities.push(entity);
        }

        while (this.animalCounter[EntityType.KRAKEN] < this.server.config.max_kraken) {
            const entity = new Animal(EntityType.KRAKEN, this.server);

            this.server.entities.push(entity);
        }

        if(this.hasWinterBiome) {
            while (this.animalCounter[EntityType.FOX] < this.server.config.max_fox) {
                const entity = new Animal(EntityType.FOX, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.BEAR] < this.server.config.max_bear) {
                const entity = new Animal(EntityType.BEAR, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.PENGUIN] < this.server.config.max_penguin) {
                const entity = new Animal(EntityType.PENGUIN, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.BABY_MAMMOTH] < this.server.config.max_baby_mammoth) {
                const entity = new Animal(EntityType.BABY_MAMMOTH, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.MAMMOTH] < this.server.config.max_mammoth) {
                const entity = new Animal(EntityType.MAMMOTH, this.server);

                this.server.entities.push(entity);
            }
        }

        if(this.hasDragonCave) {
            while (this.animalCounter[EntityType.DRAGON] < this.server.config.max_dragon) {
                const entity = new Animal(EntityType.DRAGON, this.server);

                this.server.entities.push(entity);
            }
            while (this.animalCounter[EntityType.BABY_DRAGON] < this.server.config.max_baby_dragon) {
                const entity = new Animal(EntityType.BABY_DRAGON, this.server);

                this.server.entities.push(entity);
            }
        }

        if(this.hasDesertBiome) {
            while (this.animalCounter[EntityType.SAND_WORM] < this.server.config.max_sand_worm) {
                const entity = new Animal(EntityType.SAND_WORM, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.VULTURE] < this.server.config.max_vulture) {
                const entity = new Animal(EntityType.VULTURE, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.ALOE_VERA_MOB] < 100) {
                const entity = new Animal(EntityType.ALOE_VERA_MOB, this.server);

                this.server.entities.push(entity);
            }
        }

        if(this.hasLavaBiome) {
            while (this.animalCounter[EntityType.LAVA_DRAGON] < this.server.config.max_lava_dragon) {
                const entity = new Animal(EntityType.LAVA_DRAGON, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.BABY_LAVA] < this.server.config.max_baby_lava) {
                const entity = new Animal(EntityType.BABY_LAVA, this.server);

                this.server.entities.push(entity);
            }

            while (this.animalCounter[EntityType.FLAME] < this.server.config.max_flame) {
                const entity = new Animal(EntityType.FLAME, this.server);

                this.server.entities.push(entity);
            }
        }

        if(this.hasIslandBiome) {
            while (this.animalCounter[EntityType.TREASURE_CHEST] < this.server.config.max_treasure) {
                const entity = new Animal(EntityType.TREASURE_CHEST, this.server);
                entity.position = this.server.spawnSystem.getSpawnPoint("ISLAND");

                entity.realPosition.set(entity.position);

                this.server.entities.push(entity);
            }
        }
    }
}