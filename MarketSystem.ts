import {Player} from "../../entities/Player";
import {MarketIds} from "../../enums/MarketIds";
import {ItemType} from "../../enums/types/ItemType";

export class MarketSystem {
    public buy(player: Player, data: number[]) {

        const id = ~~(data[1]);
        const count = ~~(data[0]);

        if(!Number.isInteger(id) && !Number.isInteger(count)) return;

        const items:any = this.getMarket(id, count);

        if (items === -1 || !player.inventory.containsItem(items[0][1], count)) return;

        player.client.sendBinary(player.inventory.giveItem(items[0][0], items[1]));
        player.client.sendBinary(player.inventory.removeItem(items[0][1], count));
    }

    private getMarket(id: number, count: number) {
        switch (id) {
            case MarketIds.WOOD: return [[ItemType.WOOD, ItemType.BERRY], Math.min(249, Math.max(0, ~~(count * 3)))]
            case MarketIds.STONE: return [[ItemType.STONE, ItemType.PUMPKIN], Math.min(248, Math.max(0, ~~(count * 4)))];
            case MarketIds.GOLD: return [[ItemType.GOLD, ItemType.BREAD], Math.min(246, Math.max(0, ~~(count * 6)))];
            case MarketIds.DIAMOND: return [[ItemType.DIAMOND, ItemType.CARROT], Math.min(63, Math.max(0, ~~(count / 4)))];
            case MarketIds.AMETHYST: return [[ItemType.AMETHYST, ItemType.TOMATO], Math.min(31, Math.max(0, ~~(count / 8)))];
            case MarketIds.REIDITE: return [[ItemType.REIDITE, ItemType.THORNBUSH], Math.min(15, Math.max(0, ~~(count / 16)))];
            case MarketIds.PUMPKIN: return [[ItemType.PUMPKIN_SEED, ItemType.BREAD], Math.min(25, Math.max(0, ~~(count / 10)))];
            case MarketIds.CARROT: return [[ItemType.CARROT_SEED, ItemType.PUMPKIN], Math.min(15, Math.max(0, ~~(count / 16)))];
            case MarketIds.TOMATO: return [[ItemType.TOMATO_SEED, ItemType.CARROT], Math.min(12, Math.max(0, ~~(count / 20)))];
            case MarketIds.THORNBUSH: return [[ItemType.THORNBUSH_SEED, ItemType.TOMATO], Math.min(8, Math.max(0, ~~(count / 30)))];
            case MarketIds.GARLIC: return [[ItemType.GARLIC_SEED, ItemType.THORNBUSH], Math.min(6, Math.max(0, ~~(count / 40)))];
            case MarketIds.WATERMELON: return [[ItemType.WATERMELON_SEED, ItemType.GARLIC], Math.min(4, Math.max(0, ~~(count / 60)))];
            default: return -1;
        }
    }
}