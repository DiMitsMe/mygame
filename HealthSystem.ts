import {BinaryWriter} from "../../modules/BinaryWriter";
import {ClientPackets} from "../../enums/packets/ClientPackets";
import {Entity} from "../../entities/Entity";
import {ActionType} from "../../enums/types/ActionType";
import {EntityType} from "../../enums/types/EntityType";
import {Player} from "../../entities/Player";

export class HealthSystem {
    private entity: Entity;
    public health: number;
    public maxHealth: number;
    public oldHealth: number;

    constructor(entity: Entity, maxHealth: number) {
        this.entity = entity;
        this.health = maxHealth;
        this.maxHealth = maxHealth;
        this.oldHealth = maxHealth;
    }

    /**
     * Deals damage to the game object and updates its health.
     * @param {number} amount - The amount of damage to be dealt.
     * @param {number} action - The type of Damage(Need for animations)
     * @param {Entity} damager - The entity who has damaged the entity
     * @returns {Buffer} - The buffer with data about the current health to be sent to the client.
     */
    public damage(amount: number, action: number, damager?: Entity): Buffer {
        if(amount < 0) return this.getHealthBuffer();
        this.health = Math.max(0, this.health - Math.max(amount, 0));
        if(!(this.entity.action & action)) {
            this.entity.action |= action;
        }
        this.entity.onDamage(damager);
        if(this.health <= 0) {
            if(damager instanceof Player && this.entity instanceof Player) {
                damager.kills++;
                damager.server.eventSystem.onKill(damager);
            }
            this.entity.onDead(damager);
            this.entity.delete();
        }
        if(this.oldHealth === this.health) return this.getHealthBuffer();

        this.oldHealth = this.health;
        return this.getHealthBuffer();
    }

    /**
     * Heals the game object and updates its health.
     * @param {number} amount - The amount of health to be restored.
     * @returns {Buffer} - The buffer with data about the current health to be sent to the client.
     */
    public heal(amount: number): Buffer {
        if(!amount) return this.getHealthBuffer();
        this.health = Math.min(this.maxHealth, this.health + amount / 2);
        if(this.oldHealth === this.health) return this.getHealthBuffer();
        if(!(this.entity.action & ActionType.HEAL))
            this.entity.action |= ActionType.HEAL;

        this.oldHealth = this.health;
        return this.getHealthBuffer();
    }

    /**
     * Heals the game object and updates its health.
     * @param {number} amount - The amount of health to be restored.
     * @returns {Buffer} - The buffer with data about the current health to be sent to the client.
     */
    public unlimhp(amount: number): Buffer {
        this.health = Math.min(20000000);
        if(!(this.entity.action & ActionType.HEAL))
            this.entity.action |= ActionType.WEB;

        this.oldHealth = this.health;
        return this.getHealthBuffer();
    }

    /**
     * Gets the buffer with data about the current health to be sent to the client.
     * @returns {Buffer} - The buffer with data about the current health.
     */
    private getHealthBuffer(): Buffer {
        const writer = new BinaryWriter(2);

        writer.writeUInt8(ClientPackets.GAUGES_LIFE);
        writer.writeUInt8(this.health / 2);

        return writer.toBuffer();
    }
}
