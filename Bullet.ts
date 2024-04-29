import {Entity} from "./Entity";
import {EntityType} from "../enums/types/EntityType";
import {Server} from "../Server";
import {Player} from "./Player";
import {Vector} from "../modules/Vector";
import {Utils} from "../modules/Utils";
import {ActionType} from "../enums/types/ActionType";
import {Animal} from "./Animal";
import {Building} from "./Building";
import {Tile} from "../world/map/Tile";

enum ArrowData {
    SPEED,
    DISTANCE,
    DAMAGE,
    ENTITY_DAMAGE
}

export class Bullet extends Entity {
    public owner: Player;
    public pos: Vector;
    public distance: number;
    public data: number[];
    constructor(server: Server, owner: Player, type: number) {
        super(EntityType.SPELL, server);

        const {position, angle} = owner;
        this.data = this.getArrowData(type);

        this.distance = 0;
        this.speed = this.data[ArrowData.SPEED];
        this.pos = new Vector(0, 0);
        this.pos.set(owner.position);
        this.position.set(Utils.getOffsetVector(position, this.data[ArrowData.DISTANCE], owner.angle));
        this.realPosition.set(owner.position);

        this.info = position.x - (position.x & 0xf) + type;
        this.extra = position.y - (position.y & 1);

        this.id = this.server.entityPool.createId();
        this.owner = owner;
        this.angle = angle - 63.75;

        this.server.entities.push(this);
    }

    private getArrowData(type: number) {
        const {config} = this.server;
        switch (type) {
            case 2: return [config.spell_speed_wood_arrow, config.spell_dist_wood_arrow, config.spell_damage_wood_arrow, config.spell_damage_pve_wood_arrow];
            case 3: return [config.spell_speed_stone_arrow, config.spell_dist_stone_arrow, config.spell_damage_stone_arrow, config.spell_damage_pve_stone_arrow];
            case 4: return [config.spell_speed_gold_arrow, config.spell_dist_gold_arrow, config.spell_damage_gold_arrow, config.spell_damage_pve_gold_arrow];
            case 5: return [config.spell_speed_diamond_arrow, config.spell_dist_diamond_arrow, config.spell_damage_diamond_arrow, config.spell_damage_pve_diamond_arrow];
            case 6: return [config.spell_speed_amethyst_arrow, config.spell_dist_amethyst_arrow, config.spell_damage_amethyst_arrow, config.spell_damage_pve_amethyst_arrow];
            case 7: return [config.spell_speed_reidite_arrow, config.spell_dist_reidite_arrow, config.spell_damage_reidite_arrow, config.spell_damage_pve_reidite_arrow];
            case 8: return [config.spell_speed_dragon_arrow, config.spell_dist_dragon_arrow, config.spell_damage_dragon_arrow, config.spell_damage_pve_dragon_arrow];
        }
        return [0, 0, 0, 0];
    }

    public onTick() {
        if(this.distance >= this.data[ArrowData.DISTANCE]) {
            return this.delete();
        }

        this.distance += this.data[ArrowData.SPEED] * 1000 / this.server.settings.tps;
        this.realPosition.set(Utils.getOffsetVector(this.pos, this.distance, this.angle + 63.75));

        const colliders = this.server.collision.getColliders(this, 1, 1);

        if(colliders.length > 0) {
            for (const collider of colliders) {
                if(collider === this.owner) continue;
                if(collider instanceof Tile) {
                    return this.delete();
                } else if(collider instanceof Player) {
                    collider.client.sendBinary(collider.healthSystem.damage(this.data[ArrowData.DAMAGE], ActionType.HURT, this));
                    return this.delete();
                } else if(collider instanceof Building) {
                    collider.healthSystem.damage(this.data[ArrowData.DAMAGE], ActionType.HURT, this);
                    return this.delete();
                } else if(collider instanceof Animal) {
                    collider.healthSystem.damage(this.data[ArrowData.ENTITY_DAMAGE], ActionType.HURT, this);
                    return this.delete();
                }
            }
        }
    }
}