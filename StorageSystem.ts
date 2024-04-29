import {Server} from "../../Server";
import {Player} from "../../entities/Player";
import {Building} from "../../entities/Building";
import {ItemType} from "../../enums/types/ItemType";
import {EntityType} from "../../enums/types/EntityType";
import {Utils} from "../../modules/Utils";

export class StorageSystem {
    public server: Server;
    constructor(server: Server) {
        this.server = server;
    }

    public giveChestItem(player: Player, [packet, id, val]: [number, number, number]) {
        if(player.isCollideFlying) return;
        if(
            !Number.isInteger(id) ||
            !Number.isInteger(val)
        ) return;
        let isShift;
        if(val == 1) isShift = 1; 
        if(val == 10) isShift = 10;
        const chest = this.server.map.getNearest(player, [EntityType.CHEST], 100) as Building;
        if(chest == null) return;
        const count = Math.min(255, isShift, player.inventory.itemCount(id), 255 - chest.data[0]);
        if(!chest) return;
        if(!player.inventory.containsItem(id, count)) return;

        if((chest.info & 0x2000 && chest.pid !== player.id) && !chest.owner.totem?.data.includes(player.id)) return;
        chest.data[1] = id;
        // chest.action = id.toString(16);;
        chest.data[0] += count;

        player.client.sendBinary(player.inventory.removeItem(id, Math.min(count, player.inventory.items.get(id) as number)));
    }

    public takeChestItem(player: Player) {
        if(player.isCollideFlying) return;
        const chest = this.server.map.getNearest(player, [EntityType.CHEST], 100) as Building;

        if(!chest) return;
        if(chest.pid !== player.id && chest.info & 0x2000 && !chest.owner.totem?.data.includes(player.id)) return;
        if(player.inventory.items.size >= player.inventory.size) return;
        if(chest.owner.id !== player.id) player.ruinQuests();

        let count = Math.min(255, chest.data[0] + 1);

        player.client.sendBinary(player.inventory.giveItem(chest.data[1], count));

        chest.data[0] = -1;
        chest.data[1] = 0;
        // chest.action = chest.data[0] * 4;
    }

    public lockChest(player: Player) {
        if(player.isCollideFlying) return;
        const chest = this.server.map.getNearest(player, [EntityType.CHEST], 100) as Building;

        if(!chest || chest.info & 0x2000) return;
        if(chest.position.distance(player.realPosition) > 100) return;
        if(player.inventory.items.get(ItemType.LOCK)) {
            player.client.sendBinary(player.inventory.removeItem(ItemType.LOCK, 1));
            chest.info |= 0x2000;
        }
    }

    public unlockChest(player: Player) {
        if(player.isCollideFlying) return;
        const chest = this.server.map.getNearest(player, [EntityType.CHEST], 100) as Building;

        if(!chest || !(chest.info & 0x2000)) return;
        if(player.inventory.items.get(ItemType.LOCKPICK)) {
            player.client.sendBinary(player.inventory.removeItem(ItemType.LOCKPICK, 1));
            chest.info -= 0x2000;
        }
    }

    public giveWoodExtractor(player: Player, isShift: number) {
        if(player.isCollideFlying) return;
        const extractor = this.server.map.getNearest(player, [
            EntityType.STONE_EXTRACTOR, EntityType.GOLD_EXTRACTOR, EntityType.DIAMOND_EXTRACTOR,
            EntityType.AMETHYST_EXTRACTOR, EntityType.REIDITE_EXTRACTOR
        ], 100) as Building;

        if(extractor) {
            if(extractor.data[0] === -1) extractor.data[0] = 0;

            let count = Math.min(isShift ? 10 : 1, player.inventory.itemCount(ItemType.WOOD), 255 - extractor.data[0]);

            extractor.data[0] += count;

            player.client.sendBinary(player.inventory.removeItem(ItemType.WOOD, count));
        }
    }

    public takeResourceExtractor(player: Player) {
        if(player.isCollideFlying) return;
        const extractor = this.server.map.getNearest(player, [
            EntityType.REIDITE_EXTRACTOR, EntityType.AMETHYST_EXTRACTOR, EntityType.DIAMOND_EXTRACTOR,
            EntityType.GOLD_EXTRACTOR, EntityType.STONE_EXTRACTOR
        ], 100) as Building;

        if (extractor) {
            if(extractor.owner.id !== player.id) player.ruinQuests();

            let item = Utils.getItemInStorage(extractor.type);

            player.client.sendBinary(player.inventory.giveItem(item, extractor.data[1]));
            extractor.data[1] = 0;
        }
    }

    public giveWheat(player: Player, isShift: number) {
        if(player.isCollideFlying) return;
        const windmill = this.server.map.getNearest(player, [EntityType.WINDMILL], 100) as Building;

        if (windmill) {
            const count = Math.min(255, isShift ? 10 : 1, player.inventory.itemCount(ItemType.WILD_WHEAT), 255 - windmill.data[0]);

            windmill.data[0] += count;

            player.client.sendBinary(player.inventory.removeItem(ItemType.WILD_WHEAT, count));
        }
    }

    public takeFlour(player: Player) {
        if(player.isCollideFlying) return;
        const windmill = this.server.map.getNearest(player, [EntityType.WINDMILL], 100) as Building;

        if (windmill) {
            if(windmill.owner.id !== player.id) player.ruinQuests();

            player.client.sendBinary(player.inventory.giveItem(ItemType.FLOUR, windmill.data[1]));
            windmill.data[1] = 0;
        }
    }

    public giveFurnace(player: Player, isShift: number) {
        if(player.isCollideFlying) return;
        const furnace = this.server.map.getNearest(player, [EntityType.FURNACE], 100) as Building;

        if (furnace) {
            const count = Math.min(1000, isShift ? 10 : 1, player.inventory.itemCount(ItemType.WOOD), 1000 - furnace.data[0]);

            furnace.data[0] += count;

            player.client.sendBinary(player.inventory.removeItem(ItemType.WOOD, count));
        }
    }

    public giveWell(player: Player) {
        if(player.isCollideFlying) return;
        const well = this.server.map.getNearest(player, [EntityType.WELL], 100) as Building;

        if (well.type === EntityType.WELL) {
            if(well.position.distance(player.realPosition) > 100 || !player.inventory.containsItem(ItemType.BUCKET_FULL)) return;

            well.data[0] += 8;
            well.info = 1;

            player.client.sendBinary(player.inventory.removeItem(ItemType.BUCKET_FULL, 1));
        }
    }

    public giveWoodOven(player: Player, isShift: number) {
        if(player.isCollideFlying) return;
        const oven = this.server.map.getNearest(player, [EntityType.BREAD_OVEN], 100) as Building;

        if(oven) {
            const count = Math.min(31, isShift ? 10 : 1, player.inventory.itemCount(ItemType.WOOD), 31 - oven.data[0]);

            oven.data[0] += count;

            player.client.sendBinary(player.inventory.removeItem(ItemType.WOOD, count));
        }
    }

    public giveFlourOven(player: Player, isShift: number) {
        if(player.isCollideFlying) return;
        const oven = this.server.map.getNearest(player, [EntityType.BREAD_OVEN], 100) as Building;

        if (oven) {
            const count = Math.min(31, isShift ? 10 : 1, player.inventory.itemCount(ItemType.FLOUR), 31 - oven.data[1]);

            oven.data[1] += count;

            player.client.sendBinary(player.inventory.removeItem(ItemType.FLOUR, count));
        }
    }

    public takeBread(player: Player) {
        if(player.isCollideFlying) return;
        const oven = this.server.map.getNearest(player, [EntityType.BREAD_OVEN], 100) as Building;

        if (oven) {
            if(oven.owner.id !== player.id) player.ruinQuests();

            player.client.sendBinary(player.inventory.giveItem(ItemType.BREAD, oven.data[2]));

            oven.data[2] = 0;
        }
    }

}