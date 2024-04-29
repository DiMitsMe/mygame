import {Entity} from "./Entity";
import {Server} from "../Server";
import {Inventory} from "../systems/individual/Inventory";
import {Player} from "./Player";
import {EntityType} from "../enums/types/EntityType";
import { ItemType } from "../enums/types/ItemType";
import { Animal } from "./Animal";

export class Crate extends Entity {
    public inventory: Inventory;
    public isDead: boolean;
    public owner: Entity;
    constructor(server: Server, data: any) {
        super(EntityType.CRATE, server);

        this.id = this.server.entityPool.createId();
        this.owner = data.owner ?? null;
        this.position = data.owner.realPosition;
        this.angle = data.owner.angle;
        this.info = this.owner instanceof Player ? data.isDead ? this.owner.cosmetics.dead : this.owner.cosmetics.crate : 0;
        this.inventory = new Inventory(this, 20);
        this.isDead = data.isDead ?? false;

        this.realPosition.set(this.position);
        data.item && data.count && this.inventory.giveItem(data.item, data.count);
        if("inventory" in this.owner && data.isDead) {
            this.healthSystem.health = 300;
            this.inventory.addInventory(this.owner.inventory as Inventory, 255);
        }

        this.radius = 25;
        this.server.entities.push(this);
    }

    public onTick() {
        const now = Date.now();

        if(now - this.createdAt >= (this.isDead ? 480e3 : this.owner instanceof Animal ? 30000 : 16000)) {
            this.delete();
        }
    }

    public onDead(damager: Entity) {
        if(damager instanceof Player) {
            if(damager.id !== this.owner.id && this.owner instanceof Player) {
                damager.ruinQuests();
            }

            damager.client.sendBinary(damager.inventory.addInventory(this.inventory, Infinity, this.owner instanceof Animal && damager.right.id === ItemType.MACHETE));
        }
    }
}