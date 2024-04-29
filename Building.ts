import {Server} from "../Server";
import {Entity} from "./Entity";
import {Player} from "./Player";
import {EntityType} from "../enums/types/EntityType";
import {ItemType} from "../enums/types/ItemType";
import {ActionType} from "../enums/types/ActionType";
import {DeathReason} from "../enums/DeathReason";
import {ClientPackets} from "../enums/packets/ClientPackets";
import {BinaryWriter} from "../modules/BinaryWriter";
import { Animal } from "./Animal";

export class Building extends Entity {
    public data: any;
    public owner: Player;
    public timestamps: number[];
    constructor(type: number, owner: Player, server: Server) {
        super(type, server);

        this.owner = owner;
        this.data = [];
        this.timestamps = new Array(5).fill(Date.now());
    }

    // public shake(): any[] {
    //     console.log(this.id)
    //     return [13, [this.id, this.pid, this.angle]];
    // }

    public wait(ms: any) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

    public async onPlaced() {
        this.realPosition.set(this.position);

        if(this.isSeed()) {
            this.info = 10;
            if(this.owner.helmet.id === ItemType.PEASANT) this.data = 1;
            if(this.owner.helmet.id === ItemType.WINTER_PEASANT) this.data = 2;
        }

        if(this.isVisualHealth()) this.info = 100;
        if(this.isDoor()) this.info = 200;

        this.id = await this.server.entityPool.createId();
        
        this.type === EntityType.TOTEM && (this.data = [this.owner.id], this.owner.totem = this);
        this.type === EntityType.EMERALD_MACHINE && (this.owner.machine = this);

        [EntityType.FURNACE, EntityType.WELL].includes(this.type) && (this.data = [0]);
        if(this.type === EntityType.CHEST) {
            this.data = [-1, 0];
        }
        if(EntityType.WINDMILL === this.type || this.isExtractor()) {
            this.data = [0, 0];
        }
        if(EntityType.BREAD_OVEN === this.type) {
            this.data = [0, 0, 0];
        }

        [EntityType.TOTEM, EntityType.CHEST].includes(this.type) && (this.pid = this.owner.id);
    }

    public mathclamp(variable: number, min: number, max: number) {
        return Math.max(min, Math.min(variable, max));
    }

    public onTick() {
        let now = Date.now();
        if(this.isSeed()) {
            const isPeasant = this.data === 1;
            const isWinterPeasant = this.data === 2;

            const hasBorn = now - this.createdAt >= this.server.configSystem.seedBirth[this.type] * (this.plot ? isPeasant ? 0.6 : 0.8 : isPeasant ? 0.8 : 1) * (isWinterPeasant ? 0.6 : 1);
            const hasGrowth = now - this.timestamps[0] >= this.server.configSystem.seedGrowth[this.type] * (this.plot ? isPeasant ? 0.6 : 0.8 : isPeasant ? 0.8 : 1) * (isWinterPeasant ? 0.6 : 1);
            const hasDrain = now - this.timestamps[1] >= this.server.configSystem.seedDrain[this.type] * (this.plot ? isPeasant ? 1.4 : 1.2 : isPeasant ? 1.2 : 1) * (isWinterPeasant ? 1.4 : 1);
            const needDelete = now - this.createdAt >= this.server.configSystem.seedLife[this.type];

            if(hasDrain && this.info !== 10 && !(this.info & 16)) {
                this.timestamps[1] = now;
                this.info |= 16;
            }

            if(hasGrowth && this.info !== 10 && !(this.info & 16)) {
                this.timestamps[0] = now;
                this.info = Math.min(this.server.configSystem.seedFruitsCount[this.type], this.info + 1);
            }

            if(hasBorn && this.info === 10) {
                this.info = 0;
                this.timestamps[0] = now;
                this.timestamps[1] = now;
            }

            needDelete && this.delete();
        } else if (this.isDoor()) {
            this.info = ~~(this.healthSystem.health / this.healthSystem.maxHealth * 200);
            if ((!this.collide && !(this.info % 2)) || (this.collide && this.info % 2)) this.info -= 1;
        } else if (this.isVisualHealth()) {
            this.info = ~~(this.healthSystem.health / this.healthSystem.maxHealth * 100);
        }
        
        ([EntityType.FIRE, EntityType.BIG_FIRE].includes(this.type) && now - this.createdAt > (this.type === EntityType.BIG_FIRE ? 240000 : 120000)) && this.delete();

        if(this.type === EntityType.TOTEM && now - this.timestamps[0] >= 3000) {
            this.timestamps[0] = now;

            const positions = new BinaryWriter();
            positions.writeUInt8(ClientPackets.MINIMAP);

            for (const id of this.data) {
                const player = this.server.findPlayerById(id);
                if(player) positions.writeUInt8(player.position.x / this.server.map.width * 250, player.position.y / this.server.map.height * 250);
            }

            for (const id of this.data) {
                const player = this.server.findPlayerById(id);
                if(player) player.client.sendBinary(positions.toBuffer());
            }
        }

        if(this.type === EntityType.EMERALD_MACHINE && now - this.timestamps[0] >= 1000) {
            this.timestamps[0] = now;
            this.owner.score += this.desert ? 50 : this.lavaBiome ? 40 : this.winter ? 30 : 20;
        }

        if(this.type === EntityType.CHEST) {
            this.info = this.info & 0x2000 ? this.data[1] + 0x2000 : this.data[1];
            this.extra = this.data[0] ? this.data[0] + 1 : 0;
        }

        if(this.type == EntityType.FURNACE) {
            if (now - this.timestamps[0] >= 5000) {
                this.timestamps[0] = now;

                if (this.data[0] <= 0) return;

                this.data[0]--;
            }

            this.info = this.data[0];
        }

        if(this.isExtractor() || this.type == EntityType.WINDMILL) {
            if (now - this.timestamps[0] >= (this.type == EntityType.WINDMILL ? 5000 : 10000)) {
                this.timestamps[0] = now;

                if (this.data[0] <= 0 || this.data >= 255) return;

                this.data[0] -= (this.type == EntityType.WINDMILL ? 1 : 2);
                this.data[0] = Math.max(0, this.data[0]);

                this.data[1] += 1;
            }

            this.info = this.mathclamp(this.data[0], 0, 255) + (this.data[1] * 256);
        }

        if(this.type == EntityType.BREAD_OVEN) {
            if (now - this.timestamps[0] >= 10000) {
                this.timestamps[0] = now;

                this.data[0] -= 1;

                if(this.data[0] <= 0 || this.data[1] <= 0 || this.data[2] >= 31) return;
                this.data[0] = Math.max(0, this.data[0]);

                this.data[1] -= 1;
                this.data[2] += 1;
            }

            this.info = this.mathclamp(this.data[0], 0, 31) + (this.data[1] << 5) + (this.data[2] << 10);
        }
    }

    public onDamage(damager?: Entity) {
        if(!damager) return;

        const writer = new BinaryWriter(3);

        writer.writeUInt8(ClientPackets.HITTEN_OTHER);
        writer.writeUInt8(damager.angle);
        writer.writeUInt16(this.id + this.pid * this.server.config.important.max_units);

        const players = this.server.map.getPlayersInDistance(this.position, 2100);

        for (const player of players) {
            player.client.sendBinary(writer.toBuffer());
        }

        if(!(damager instanceof Player)) return;

        if(this.isDoor()) {
            const entity = this.server.map.getEntities(this.position.x, this.position.y, 2).find(entity => !(entity instanceof Building) && !(entity instanceof Animal) && entity.realPosition.distance(this.realPosition) < this.radius + entity.radius - 1);
            if(!entity || (entity && this.collide)) {
                if(this.owner.totem?.data.includes(damager?.id) || this.owner.id === damager.id) this.collide = !this.collide;
            }
        }

        if (this.isSpike()) {
            if(!this.owner.totem?.data.includes(damager?.id) && this.owner.id !== damager.id && this.collide) {
                damager.healthSystem.damage(this.server.configSystem.entityOnHitDamage[this.type], ActionType.HURT);
            }
        }

        if (this.isSeed()) {
            const isBorn = this.info !== 10;
            if(isBorn && this.info && damager.right.id !== ItemType.WATERING_CAN_FULL && this.info !== 16) {
                const harvest = damager.right.id === ItemType.GOLD_PITCHFORK ? 3 : ItemType.PITCHFORK ? 2 : 1;
                this.info -= 1;
                this.owner.score += 3 * harvest;
                damager.client.sendBinary(damager.inventory.giveItem(this.server.configSystem.seedFruits[this.type], harvest));
            }
            if(damager.right.id === ItemType.WATERING_CAN_FULL && this.info >= 16) {
                this.info -= 16;
                this.timestamps[1] = Date.now();
            }
        }
    }

    public onDead(damager?: Entity) {
        if(this.type === EntityType.TOTEM) {
            this.server.totemSystem.broadcastDestroyTeam(this);
        }
        if(damager instanceof Player) {
            const id = ItemType[EntityType[this.type] as any] as any;
            const craft = this.server.craftSystem.recipes[id];

            if(!craft || !craft.r) return;
            for (const [id, count] of craft.r) {
                if (count === 1) continue;

                damager.client.sendBinary(damager.inventory.giveItem(id, ~~(count / 1.8)));
            }

            if(this.type === EntityType.EMERALD_MACHINE) {
                this.owner.reason = DeathReason.EMERALD;
                this.owner.healthSystem.damage(200, ActionType.HURT, damager);
            }

            damager.score += 20;
        }
    }

    public isVisualHealth() {
        return [
            EntityType.WOOD_SPIKE, EntityType.STONE_SPIKE, EntityType.GOLD_SPIKE, EntityType.DIAMOND_SPIKE, EntityType.AMETHYST_SPIKE, EntityType.REIDITE_SPIKE,
            EntityType.WOOD_WALL, EntityType.STONE_WALL, EntityType.GOLD_WALL, EntityType.DIAMOND_WALL, EntityType.AMETHYST_WALL, EntityType.REIDITE_WALL,
            EntityType.WOOD_DOOR, EntityType.STONE_DOOR, EntityType.GOLD_DOOR, EntityType.DIAMOND_DOOR, EntityType.AMETHYST_DOOR, EntityType.REIDITE_DOOR,
            EntityType.WOOD_DOOR_SPIKE, EntityType.STONE_DOOR_SPIKE, EntityType.GOLD_DOOR_SPIKE, EntityType.DIAMOND_DOOR_SPIKE, EntityType.AMETHYST_DOOR_SPIKE, EntityType.REIDITE_DOOR_SPIKE,
            EntityType.BRIDGE, EntityType.ROOF, EntityType.EMERALD_MACHINE
        ].includes(this.type);
    }

    public isDoor() {
        return [
            EntityType.WOOD_DOOR, EntityType.STONE_DOOR, EntityType.GOLD_DOOR, EntityType.DIAMOND_DOOR, EntityType.AMETHYST_DOOR, EntityType.REIDITE_DOOR,
            EntityType.WOOD_DOOR_SPIKE, EntityType.STONE_DOOR_SPIKE, EntityType.GOLD_DOOR_SPIKE, EntityType.DIAMOND_DOOR_SPIKE, EntityType.AMETHYST_DOOR_SPIKE, EntityType.REIDITE_DOOR_SPIKE
        ].includes(this.type);
    }

    public isDoorSpike() {
        return [
            EntityType.WOOD_DOOR_SPIKE, EntityType.STONE_DOOR_SPIKE, EntityType.GOLD_DOOR_SPIKE, EntityType.DIAMOND_DOOR_SPIKE, EntityType.AMETHYST_DOOR_SPIKE, EntityType.REIDITE_DOOR_SPIKE
        ].includes(this.type);
    }

    public isWall() {
        return [
            EntityType.WOOD_SPIKE, EntityType.STONE_SPIKE, EntityType.GOLD_SPIKE, EntityType.DIAMOND_SPIKE, EntityType.AMETHYST_SPIKE, EntityType.REIDITE_SPIKE,
            EntityType.WOOD_WALL, EntityType.STONE_WALL, EntityType.GOLD_WALL, EntityType.DIAMOND_WALL, EntityType.AMETHYST_WALL, EntityType.REIDITE_WALL
        ].includes(this.type);
    }

    public isSpike() {
        return [
            EntityType.WOOD_SPIKE, EntityType.STONE_SPIKE, EntityType.GOLD_SPIKE, EntityType.DIAMOND_SPIKE, EntityType.AMETHYST_SPIKE, EntityType.REIDITE_SPIKE,
            EntityType.WOOD_DOOR_SPIKE, EntityType.STONE_DOOR_SPIKE, EntityType.GOLD_DOOR_SPIKE, EntityType.DIAMOND_DOOR_SPIKE, EntityType.AMETHYST_DOOR_SPIKE, EntityType.REIDITE_DOOR_SPIKE
        ].includes(this.type);
    }

    public isExtractor() {
        return [
            EntityType.STONE_EXTRACTOR, EntityType.GOLD_EXTRACTOR,
            EntityType.DIAMOND_EXTRACTOR, EntityType.AMETHYST_EXTRACTOR, EntityType.REIDITE_EXTRACTOR
        ].includes(this.type);
    }

    public isSeed() {
        return [
            EntityType.BERRY_SEED, EntityType.WHEAT_SEED, EntityType.CARROT_SEED, EntityType.TOMATO_SEED,
            EntityType.THORNBUSH_SEED, EntityType.GARLIC_SEED, EntityType.WATERMELON_SEED, EntityType.PUMPKIN_SEED
        ].includes(this.type);
    }

    public isGrid() {
        return [
            EntityType.BRIDGE, EntityType.ROOF, EntityType.WOOD_TOWER,
            EntityType.PLOT, EntityType.BED
        ].includes(this.type);
    }

    public isLight() {
        return [
            EntityType.WOOD_WALL, EntityType.WOOD_SPIKE, EntityType.WOOD_DOOR, EntityType.WOOD_DOOR_SPIKE,
            EntityType.WORKBENCH, EntityType.TOTEM, EntityType.FIRE, EntityType.BIG_FIRE, EntityType.SIGN, EntityType.PLOT
        ].includes(this.type);
    }
}