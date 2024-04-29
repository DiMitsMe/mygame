import {Vector} from "../modules/Vector";
import {objects} from "../JSON/Resouces.json";
import {Biome} from "./map/Biome";
import {Tile} from "./map/Tile";
import {Entity} from "../entities/Entity";
import {Server} from "../Server";
import NanoTimer from "../nanotimer";
import {TileType} from "../enums/types/TileType";
import {EntityType} from "../enums/types/EntityType";
import {BiomeType} from "../enums/types/BiomeType";
import {BeachDirection} from "../enums/BeachDirection";
import {defaultMap} from "../default/defaultMap";
import {Player} from "../entities/Player";

interface Chunk {
    entities: Entity[];
    tiles: Tile[];
}

export class Map {
    private readonly objects: any[] = [];
    private readonly server: Server;

    public width: number;
    public height: number;

    public tiles: Tile[] = [];
    public grid: Chunk[][] = [];
    public biomes: Biome[] = [];

    private resourcesTimeStamp: number = 0;
    constructor(server: Server) {
        this.server = server;
        this.objects = server.config.important.custom_map.length ? server.config.important.custom_map : defaultMap;
        this.width = server.config.important.map_width * 100;
        this.height = server.config.important.map_height * 100;
        this.initCollision();
        this.initBiomes();

        new NanoTimer().setInterval(() => {
            if(Date.now() - this.resourcesTimeStamp < this.server.config.resource_delay - ((this.server.config.resource_delay - this.server.config.resource_delay_min) * (this.server.players.length / 100))) return;
            this.resourcesTimeStamp = Date.now();
            for (const tile of this.tiles) {
                tile.count = Math.clamp(tile.count + Math.ceil(tile.limit / 15), 0, tile.limit);
                if(tile.entity) {
                    tile.entity.info = tile.count;
                }
            }
        }, [], "1s");
    }

    public initBiomes() {
        const map = [];
        
        for (var i = 0; i < ~~(this.height / 100); i++) {
            map[i] = new Array(~~(this.width / 100));
            for (var j = 0; j < ~~(this.width / 100); j++) map[i][j] = 0;
        }
        
        for (const tile of this.objects) {
            const [type, x, y, sx, sy, meta] = tile.slice(1, 7);
            if (!this.isTileTypeBiome(type)) continue;
            if (type === "FOREST") {
                meta & BeachDirection.RIGHT && this.biomes.push(new Biome(BiomeType.BEACH, new Vector(sx * 100 + 300, y * 100 + 250), new Vector(300, sy * 100 - 400)));
            }

            this.biomes.push(new Biome(type, new Vector(x * 100 + 30, y * 100 + 250), new Vector(sx * 100, sy * 100 - 400), meta));
        }

        for (const biome of this.biomes) {
            const endPos = biome.endPosition.divide(100).floor();
            const pos = biome.position.divide(100).floor();
            for (let x = pos.x; x < endPos.x; x++) {
                for (let y = pos.y; y < endPos.y; y++) {
                    map[y][x] = 1;
                }
            }
        }

        for (let y = 0; y < ~~(this.height / 100); y++) {
            for (let x = 0; x < ~~(this.width / 100); x++) {
                if(map[y][x] === 0) {
                    this.addSeaBiome(map, x, y);
                }
            }
        }
    }

    public distanceFromSand(bid: number, x: number, y: number) {
        let biome = this.biomes[bid];
        let is_sand = 0;

        let x1 = biome.position.x + 30 + ((biome.meta & BeachDirection.LEFT) === 0 ? 150 : 0);
        let d = x - x1;
        if ((biome.meta & BeachDirection.LEFT) > 0 && d > 0 && d < 320) is_sand = 1;
        let y1 = biome.position.y + 250 + ((biome.meta & BeachDirection.TOP) === 0 ? 150 : 0);
        d = y - y1;
        if ((biome.meta & BeachDirection.TOP) > 0 && d > 0 && d < 320) is_sand = 1;
        let x2 = biome.endPosition.x + 80 + ((biome.meta & BeachDirection.RIGHT) === 0 ? -200 : 0);
        d = x2 - x;
        if ((biome.meta & BeachDirection.RIGHT) > 0 && d > 0 && d < 320) is_sand = 1;
        let y2 = biome.endPosition.y - 200 + ((biome.meta & BeachDirection.BOTTOM) === 0 ? -200 : 0);
        d = y2 - y;
        if ((biome.meta & BeachDirection.BOTTOM) > 0 && d > 0 && d < 320) is_sand = 1;

        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return is_sand;

        return 0;
    }
    
    public addSeaBiome(map: any, sx: number, sy: number) {
        var xMax = sx;  
        for (var y = sy; y < ~~(this.height / 100); y++) {
            for (var x = sx; x < ~~(this.width / 100); x++) {
                if (y === sy) xMax = Math.max(x, xMax);

                if (x > xMax) break;

                // Add a new sea biome
                if (map[y][x] === 1) break;

                map[y][x] = 1;
            }

            if (x < xMax) break;
        }

        this.biomes.push(new Biome(BiomeType.SEA, new Vector(sx * 100, sy * 100), new Vector((xMax - sx + 1) * 100, (y - sy) * 100)));
    }

    /**
     * Initialize chunks to map
     */
    public initCollision() {
        const width = Math.ceil(this.width / 100);
        const height = Math.ceil(this.height / 100);
        for (let y = 0; y < height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < width; x++) {
                this.grid[y][x] = {
                    tiles: [],
                    entities: []
                };
            }
        }

        for (const tile of this.objects) {
            if(tile[1] !== "isl") continue;
            let [subtype, x, y] = tile.slice(2);

            for (let k = 0; k < 4; k++) {
                for (let l = 0; l < 3; l++) {
                    this.objects.push([0, TileType.SAND, 0, x - k, y - l, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - k, y + l, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + k, y + l, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + k, y - l, 0]);
                }
            }

            if(subtype === 0) {
                for (let k = 0; k < 2; k++) {
                    this.objects.push([0, TileType.SAND, 0, x - 4, y - k,  0]);
                    this.objects.push([0, TileType.SAND, 0, x - 4, y + k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + 4, y - k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + 4, y + k, 0]);
                }

                for (let k = 0; k < 3; k++) {
                    this.objects.push([0, TileType.SAND, 0, x + k, y - 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + k, y + 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - k, y - 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - k, y + 3, 0]);
                }

                this.objects.push([0, TileType.SAND, 0, x - 2, y - 4, 0]);
                this.objects.push([0, TileType.SAND, 0, x - 3, y - 3, 0]);
                this.objects.push([0, TileType.SAND, 0, x + 2, y + 4, 0]);
                this.objects.push([0, TileType.SAND, 0, x + 3, y + 3, 0]);
            }
            else if (subtype === 1) {
                for (let k = 0; k < 3; k++) {
                    this.objects.push([0, TileType.SAND, 0, x - 4, y - k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - 4, y + k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + 4, y - k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + 4, y + k, 0]);
                }
                for (let k = 0; k < 4; k++) {
                    this.objects.push([0, TileType.SAND, 0, x + k, y - 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + k, y + 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - k, y - 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - k, y + 3, 0]);
                }
            }
            else if (subtype === 2) {
                for (let k = 0; k < 3; k++) {
                    this.objects.push([0, TileType.SAND, 0, x - 4, y - k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - 4, y + k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + 4, y - k, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + 4, y + k, 0]);
                }
                for (let k = 0; k < 3; k++) {
                    this.objects.push([0, TileType.SAND, 0, x + k, y - 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x + k, y + 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - k, y - 3, 0]);
                    this.objects.push([0, TileType.SAND, 0, x - k, y + 3, 0]);
                }
            }

        }

        for (let tile of this.objects) {
            const type = tile[1];
            let subtype = 0;
            let x;
            let y;
            let meta = 0;

            if(tile.length <= 5) {
                x = tile[2];
                y = tile[3];
                meta = tile[4];
            } else {
                subtype = tile[2];
                x = tile[3];
                y = tile[4];
                meta = tile[5];
            }

            if (this.isTileTypeBiome(type)) continue;

            const object = objects.find((object) => object.type == type && object.subtype == subtype);

            if (object && this.grid[y] && this.grid[y][x]) {
                const tile = new Tile(new Vector(x, y), meta, object);
                this.grid[y][x].tiles.push(tile);

                if (tile.type === TileType.BERRY) {
                    const fruit = new Entity(EntityType.FRUIT, this.server);
                    tile.entity = fruit;
                    fruit.position = tile.realPosition;
                    fruit.id = this.server.entityPool.createId();
                    this.server.entities.push(fruit);
                }

                this.tiles.push(tile);
            }
        }

    }

    public updateEntitiesInChunks() {
        this.grid.forEach((chunkRow) => {
            chunkRow.forEach((chunk) => {
                chunk.entities = [];
            });
        });

        if(this.server.entities.length > 0) {
            for (const entity of this.server.entities) {
                const chunkX = Math.floor(entity.position.x / 100);
                const chunkY = Math.floor(entity.position.y / 100);
                if(!this.grid[chunkY] || !this.grid[chunkY][chunkX]) continue;
                this.grid[chunkY][chunkX].entities.push(entity);
            }
        }
    }

    public getChunk(x: number, y: number): Chunk | undefined {
        const chunkX = Math.floor(Math.clamp(x, 0, this.width) / 100);
        const chunkY = Math.floor(Math.clamp(y, 0, this.height) / 100);

        if (!this.grid[chunkY]) return;

        return this.grid[chunkY][chunkX];
    }

    public getNearest(self: Entity, types: number[], distance = Infinity): Entity | null {
        const entities = this.getEntities(self.realPosition.x, self.realPosition.y, Math.round(distance / 100));
        let minDist = Infinity;
        let target = null;

        for (const entity of entities) {
            if(entity === self || !types.includes(entity.type)) continue;

            const dist = self.realPosition.distance(entity.realPosition);
            if(dist < distance && dist < minDist) {
                target = entity;
                minDist = dist;
            }
        }

        return target;
    }

    public getEntitiesInDistance(position: Vector, types: number[], distance = Infinity) {
        const dist = Math.round(distance / 100);
        return (
            this.server.entities.length < dist ** 2 ?
            this.server.entities
                .filter(entity =>
                    types.includes(entity.type) && entity.position.distance(position) < distance
                ): this.getEntities(position.x, position.y, dist)
                .filter(entity =>
                    types.includes(entity.type) && entity.position.distance(position) < distance
                )
        );
    }

    public getPlayersInDistance(position: Vector, distance = Infinity) {
        const dist = Math.round(distance / 100);
        return (
            this.server.players.length < dist ** 2 ?
                this.server.players
                .filter(player =>
                    player.position.distance(position) < distance
                ): this.getEntities(position.x, position.y, dist)
                .filter(entity =>
                    entity.type === EntityType.PLAYER && entity.position.distance(position) < distance
                )
        ) as Player[];
    }

    public queryCircle(position: Vector, distance: number, types?: number[]) {
        const entities = this.getEntities(position.x, position.y, Math.ceil(distance / 100));
        const tiles = this.getTiles(position.x, position.y, Math.ceil(distance / 100));

        return [...tiles.filter(tile => tile.realPosition.distance(position) < distance + tile.radius),
                ...entities.filter(entity => entity.realPosition.distance(position) < distance + entity.radius)];
    }

    /**
     * Retrieves the chunks of data from a 2D grid based on the provided coordinates and size.
     *
     * @param {number} x - The X-coordinate to start retrieving chunks from.
     * @param {number} y - The Y-coordinate to start retrieving chunks from.
     * @param {number} size - The size of the area to retrieve chunks around the specified coordinates.
     * @returns {Chunk[]} An array containing the chunks of data retrieved from the grid.
     */
    public getChunks(x: number, y: number, size: number): Chunk[] {
        const chunkX = Math.floor(x / 100);
        const chunkY = Math.floor(y / 100);
        const chunks = [];

        for (let offsetY = -size; offsetY <= size; offsetY++) {
            const chunkRow = this.grid[chunkY + offsetY];

            for (let offsetX = -size; offsetX <= size; offsetX++) {
                const chunk = chunkRow && chunkRow[chunkX + offsetX];
                if (chunk) {
                    chunks.push(chunk);
                }
            }
        }
        return chunks;
    }

    public getTiles(x: number, y: number, size: number): Tile[] {
        const chunkX = Math.floor(x / 100);
        const chunkY = Math.floor(y / 100);
        const tiles = [];

        for (let offsetY = -size; offsetY <= size; offsetY++) {
            const chunkRow = this.grid[chunkY + offsetY];

            for (let offsetX = -size; offsetX <= size; offsetX++) {
                const chunk = chunkRow && chunkRow[chunkX + offsetX];
                if (chunk) {
                    tiles.push(...chunk.tiles);
                }
            }
        }

        return tiles;
    }

    public getEntities(x: number, y: number, size: number): Entity[] {
        const chunkX = Math.floor(x / 100);
        const chunkY = Math.floor(y / 100);
        const entities = [];

        for (let offsetY = -size; offsetY <= size; offsetY++) {
            const chunkRow = this.grid[chunkY + offsetY];

            for (let offsetX = -size; offsetX <= size; offsetX++) {
                const chunk = chunkRow && chunkRow[chunkX + offsetX];
                if (chunk) {
                    entities.push(...chunk.entities);
                }
            }
        }

        return entities;
    }


    public getDistFromBiome(biome: Biome, x: number, y: number) {
        let x1 = biome.position.x + 30;
        let y1 = biome.position.y + 250;
        let x2 = biome.position.x + biome.size.x + 80;
        let y2 = biome.position.y + biome.size.y - 200;

        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return Math.min(x - x1, x2 - x, y - y1, y2 - y);

        let dist = -1000000;
        if (x - x1 < 0) dist = Math.max(dist, x - x1);
        else if (x2 - x < 0) dist = Math.max(dist, x2 - x);

        let distY = -1000000;
        if (y < y1 || y > y2) {
            if (y - y1 < 0) distY = Math.max(distY, y - y1);
            else distY = Math.max(distY, y2 - y);

            if (dist !== -1000000 && distY !== -1000000) dist = Math.min(dist, distY);
            else dist = distY;
        }

        return dist;
    }

    /**
     * Returns the biomes at the entity's current position.
     *
     * @param {Vector} position - The position for which to retrieve biomes.
     * @returns {Biome[]} An array containing the biomes at the entity's current position.
     */
    public getBiomesAtEntityPosition(position: Vector): string[] {
        const biomes: string[] = [];
        for (const biome of this.biomes) {
            if (biome.position.isVectorInsideRectangle(position, biome.size.x + 25, biome.size.y + 25)) {
                biomes.push(biome.type);
            }
        }

        return biomes;
    }

    private isTileTypeBiome(type: string): boolean {
        const biomeTypes = ["FOREST", "DRAGON", "DESERT", "LAVA", "WINTER"];
        return biomeTypes.includes(type);
    }
}
