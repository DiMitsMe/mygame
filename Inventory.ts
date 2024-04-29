import {Entity} from "../../entities/Entity";
import {BinaryWriter} from "../../modules/BinaryWriter";
import {ClientPackets} from "../../enums/packets/ClientPackets";
import {Player} from "../../entities/Player";
import {ItemType} from "../../enums/types/ItemType";

export class Inventory {
    public items: Map<number, number>;
    public entity: Entity;
    public size: number;
    constructor(entity: Entity, size: number) {
        this.entity = entity;
        this.items = new Map();
        this.size = size;
    }

    public addInventory(inventory: Inventory, bound: number = Infinity, double: boolean = false) {
        const writer = new BinaryWriter();

        let isFill = false;

        writer.writeUInt16(ClientPackets.GATHER);

        for (const item of inventory.items) {
            const buffer = this.giveItem(item[0], Math.min(double ? item[1] * 2 : item[1], bound))?.slice(2) as Buffer;
            if(!buffer.length) isFill = true;

            writer.writeUInt8(...buffer);
        }

        if(isFill && this.entity instanceof Player) {
            this.entity.client.sendU8([ClientPackets.INV_FULL]);
        }

        return writer.toBuffer();
    }

    public containsItem(itemID: number, count: number = 1) {
        const item = this.items.get(itemID);

        if (!item) return false;

        return item >= count;
    }

    public giveItem(id: number, count: number): Uint8Array | Buffer | undefined {
        if(id === ItemType.BAG && this.entity instanceof Player) {
            this.size = 16;
            this.entity.updateInfo();
            return new Uint8Array([ClientPackets.GET_BAG]);
        } else if (this.items.has(id)) {
            const itemQty = this.items.get(id) as number;
            this.items.set(id, itemQty + count);
        } else if (this.items.size + 1 <= this.size) {
            this.items.set(id, count);
        } else {
            return new Uint8Array([ClientPackets.INV_FULL]);
        }

        this.entity.onReceiveItem(id, count);

        const writer = new BinaryWriter(3);

        writer.writeUInt16(ClientPackets.GATHER);
        writer.writeUInt16(id);
        writer.writeUInt16(count);

        return writer.toBuffer();
    }

    public removeItem(id: number, count: number) {
        if (this.items.has(id)) {
            const itemQty = this.items.get(id) as number;
            const newQty = itemQty - count;
            if (newQty <= 0) {
                this.items.delete(id);
                this.unEquipItem(id);
            } else {
                this.items.set(id, newQty);
            }
            const writer = new BinaryWriter();

            if(count <= 255) {
                writer.writeUInt8(ClientPackets.DECREASE_ITEM);
                writer.writeUInt8(id);
                writer.writeUInt8(count);
            } else {
                writer.writeUInt8(ClientPackets.DECREASE_ITEM_2);
                writer.writeUInt8(id);
                writer.writeUInt8(count >> 8)
                writer.writeUInt8(count % 256);
            }
            return writer.toBuffer();
        }
    }

    public itemCount(id: number) {
        return this.items.get(id) ?? 0;
    }

    public deleteItem(id: number) {
        //if (this.items.has(id)) {
            this.items.delete(id);

            if(this.entity instanceof Player) this.unEquipItem(id);

            const writer = new BinaryWriter(2);

            writer.writeUInt8(ClientPackets.DELETE_INV_OK);
            writer.writeUInt8(id);

            return writer.toBuffer();
       // }
    }

    public cleanInventory() {
        this.items = new Map();

        this.unEquipInventory();

        const writer = new BinaryWriter(1);
        writer.writeUInt8(ClientPackets.CLEAN_INVENTORY);

        return writer.toBuffer();
    }

    private unEquipItem(id: number) {
        if(!(this.entity instanceof Player)) return;
        if (this.entity.helmet.id === id) {
            this.entity.helmet = this.entity.server.interactionSystem.items[ItemType.HAND];
        }
        if (this.entity.right.id === id) {
            this.entity.right = this.entity.server.interactionSystem.items[ItemType.HAND];
        }
        if (this.entity.vehicle.id === id) {
            this.entity.vehicle = this.entity.server.interactionSystem.items[ItemType.HAND];
        }

        this.entity.updateInfo();
    }

    private unEquipInventory() {
        if(!(this.entity instanceof Player)) return;
        this.entity.helmet = this.entity.server.interactionSystem.items[ItemType.HAND];
        this.entity.right = this.entity.server.interactionSystem.items[ItemType.HAND];
        this.entity.vehicle = this.entity.server.interactionSystem.items[ItemType.HAND];

        this.entity.updateInfo();
    }

    public serialize() {
        let array: any[] = [];
        Array.from(this.items.entries()).forEach(([ item, count ]) => {
            array[item] = count;
        });
        return array;
    }

    public toArray() {
        return Array.from(this.items);
    }
}