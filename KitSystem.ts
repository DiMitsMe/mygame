import {getDefaultKit} from "../../default/defaultKit";
import {Player} from "../../entities/Player";
import {ItemType} from "../../enums/types/ItemType";
import {ClientPackets} from "../../enums/packets/ClientPackets";

export class KitSystem {
    private readonly kit: any[];
    constructor(config: any) {
        this.kit = getDefaultKit();

        if(config.important.starter_kit.length > 0) {
            this.kit = config.important.starter_kit;
        }
    }

    public gainKit(player: Player) {
        for (const item of this.kit) {
            const name = item[0];
            const count = item[1];
            const id = this.findInventoryId(name);

            player.client.sendBinary(player.inventory.giveItem(id, count));
        }
    }

    public buy(player: Player, id: number) {
        if (!Number.isInteger(id) || !player.tokenScore || !player.tokenScore.score || player.tokenScore.session_info || Date.now() - player.tokenScore.join_timestamp > 60 * 1000) return;
        const kit = this.getKit(id) as any;
        if(!kit) return;

        let price = kit.shift();
        if ( player.tokenScore.score < price ) return;

        player.tokenScore.score -= price;
        player.tokenScore.session_info = 1;
        
        for (let i = 0; i < kit.length; i++ ) {
            let object = kit[i];
            player.inventory.giveItem(object[0], object[1]);
        }

        player.ruinQuests();

        player.client.sendU8([ClientPackets.KIT_OK, id]);

    }

    private findInventoryId(itemName: string) {
        return ItemType[itemName.toUpperCase() as "BAG"] as number;
    }

    private getKit(id: number) {
        switch(id) {
            case 1: return [1000, [ItemType.FIRE, 2], [ItemType.COOKED_MEAT, 1], [ItemType.BERRY, 8], [ItemType.BREAD, 1]];
            case 2: return [2000, [ItemType.BIG_FIRE, 2], [ItemType.WOOD_PICK, 1], [ItemType.COOKED_MEAT, 2], [ItemType.BERRY, 16], [ItemType.BREAD, 2]];
            case 3: return [4000, [ItemType.BIG_FIRE, 3], [ItemType.STONE_PICK, 1], [ItemType.COOKED_MEAT, 4], [ItemType.BERRY, 20], [ItemType.BREAD, 4], [ItemType.WORKBENCH, 1], [ItemType.STONE, 80], [ItemType.WOOD, 140]];
            case 4: return [8000, [ItemType.BAG, 1], [ItemType.BIG_FIRE, 4], [ItemType.GOLD_PICK, 1], [ItemType.COOKED_MEAT, 6], [ItemType.BERRY, 30], [ItemType.BREAD, 6], [ItemType.WORKBENCH, 1], [ItemType.STONE, 150], [ItemType.WOOD, 200], [ItemType.GOLD, 80], [ItemType.BOTTLE_FULL, 2]];
            case 5: return [16000, [ItemType.BAG, 1], [ItemType.DIAMOND_PICK, 1], [ItemType.BED, 1], [ItemType.CAKE, 7], [ItemType.BOTTLE_FULL, 2], [ItemType.BIG_FIRE, 2], [ItemType.FURNACE, 1], [ItemType.STONE_WALL, 15], [ItemType.STONE_DOOR, 2], [ItemType.TOTEM, 1], [ItemType.WRENCH, 1], [ItemType.STONE, 200], [ItemType.WOOD, 300]];
            case 6: return [16000, [ItemType.BAG, 1], [ItemType.FUR_HAT, 1], [ItemType.GOLD_SHOVEL, 1], [ItemType.GOLD_PICK, 1], [ItemType.CAKE, 10], [ItemType.BOTTLE_FULL, 4], [ItemType.BIG_FIRE, 6], [ItemType.BANDAGE, 3], [ItemType.BOOK, 1], [ItemType.STONE, 200 ] , [ItemType.WOOD, 300]];
            case 7: return [16000, [ItemType.BAG, 1], [ItemType.HOOD, 1], [ItemType.GOLD_HAMMER, 1], [ItemType.BANDAGE, 3], [ItemType.STONE, 1], [ItemType.GOLD_PICK, 1], [ItemType.CAKE, 7], [ItemType.BOTTLE_FULL, 2], [ItemType.BIG_FIRE, 4], [ItemType.STONE, 150 ] , [ItemType.WOOD, 200], [ItemType.LOCKPICK, 1]];
            case 8: return [16000, [ItemType.BAG, 1], [ItemType.PEASANT, 1], [ItemType.GOLD_PICK, 1], [ItemType.CAKE, 7], [ItemType.BOTTLE_FULL, 2], [ItemType.BIG_FIRE, 4], [ItemType.WINDMILL, 2], [ItemType.BREAD_OVEN, 4], [ItemType.PLOT, 10], [ItemType.WHEAT_SEED, 6], [ItemType.BERRY_SEED, 4], [ItemType.WATERING_CAN_FULL, 1] , [ItemType.WOOD, 500]];
            case 9: return [16000, [ItemType.BAG, 1], [ItemType.GOLD_PICK, 1], [ItemType.FOODFISH_COOKED, 16], [ItemType.BOTTLE_FULL, 1], [ItemType.BIG_FIRE, 6], [ItemType.BANDAGE, 3], [ItemType.DIVING_MASK, 1], [ItemType.STONE_SWORD, 1], [ItemType.BRIDGE, 16], [ItemType.STONE, 150 ] , [ItemType.WOOD, 200]];
            case 10: return [20000, [ItemType.BAG, 1], [ItemType.GOLD_PICK, 1], [ItemType.CAKE, 1], [ItemType.BOTTLE_FULL, 1], [ItemType.BIG_FIRE, 3], [ItemType.BANDAGE, 3], [ItemType.GOLD_HELMET, 1], [ItemType.GOLD_SWORD, 1], [ItemType.DIAMOND_SPEAR, 1], [ItemType.GOLD_SPIKE, 2], [ItemType.STONE, 50 ] , [ItemType.WOOD, 100]];
            default: return false;
        }
    }
}