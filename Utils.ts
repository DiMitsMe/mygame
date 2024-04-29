import {EntityType} from "../enums/types/EntityType";
import {Vector} from "./Vector";
import {ItemType} from "../enums/types/ItemType";
import {Entity} from "../entities/Entity";
import {Building} from "../entities/Building";
import {BinaryWriter} from "./BinaryWriter";
import {ClientPackets} from "../enums/packets/ClientPackets";
import {Player} from "../entities/Player";
import {ClientStringPackets} from "../enums/packets/ClientStringPackets";

export class Utils {
    static arrows: number[] = [
        ItemType.DRAGON_ARROW, ItemType.REIDITE_ARROW, ItemType.AMETHYST_ARROW, ItemType.DIAMOND_ARROW,
        ItemType.GOLD_ARROW, ItemType.STONE_ARROW, ItemType.WOOD_ARROW
    ];
    static bows: number[] = [
        ItemType.DRAGON_BOW, ItemType.REIDITE_BOW, ItemType.AMETHYST_BOW, ItemType.DIAMOND_BOW,
        ItemType.GOLD_BOW, ItemType.STONE_BOW, ItemType.WOOD_BOW
    ];
    static generateRandomString(length: number) {
        let response = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_+-";
        for (let i = 0; i < length; i++) {
            response += characters[~~(Math.random() * characters.length)];
        }

        return response;
    }

    static secondChangeDifferences(itemIshod : string) {
        let itemName = itemIshod.toString().toUpperCase();
            if(itemName.includes('_')) {
                itemName = itemName.split("_")[1] + "_" + itemName.split("_")[0];
            }
            if(itemName.toLowerCase() == 'stone_extractor') {
                itemName = 'EXTRACTOR_MACHINE_STONE'
            }
            if(itemName.toLowerCase() == 'gold_extractor') {
                itemName = 'EXTRACTOR_MACHINE_GOLD'
            }
            if(itemName.toLowerCase() == 'diamond_extractor') {
                itemName = 'EXTRACTOR_MACHINE_DIAMOND'
            }
            if(itemName.toLowerCase() == 'amethyst_extractor') {
                itemName = 'EXTRACTOR_MACHINE_AMETHYST'
            }
            if(itemName.toLowerCase() == 'reidite_extractor') {
                itemName = 'EXTRACTOR_MACHINE_REIDITE'
            }
        return itemName;
    }

    static firstChangeDifferences(itemIshod: string) {
        let itemName = itemIshod.toString().toUpperCase();
        if(itemName.toLowerCase() == 'seed') {
            itemName = 'BERRY_SEED'
        }
        if(itemName.toLowerCase() == 'scarf') {
            itemName = 'CAP_SCARF'
        }
        if(itemName.toLowerCase() == 'sword') {
            itemName = 'STONE_SWORD';
        }
        if(itemName.toLowerCase() == 'pick') {
            itemName = 'STONE_PICK'
        }
        if(itemName.toLowerCase() == 'hammer') {
            itemName = 'STONE_HAMMER'
        }
        if(itemName.toLowerCase() == 'spear') {
            itemName = 'STONE_SPEAR'
        }
        if(itemName.toLowerCase() == 'tower') {
            itemName = 'WOOD_TOWER'
        }
        if(itemName.toLowerCase() == 'spike') {
            itemName = 'WOOD_SPIKE'
        }
        if(itemName.toLowerCase() == 'shovel') {
            itemName = 'STONE_SHOVEL'
        }
        if(itemName.toLowerCase() == 'wall') {
            itemName = 'WOOD_WALL'
        }
        if(itemName.toLowerCase() == 'spanner') {
            itemName = 'WRENCH'
        }
        return itemName;
    }

    static thirdChangeDifferences(itemIshod: string) {
        let itemName = itemIshod.toString().toUpperCase();
        if(itemName.toLowerCase() == 'wood_spike_door') {
            itemName = 'WOOD_DOOR_SPIKE'
        }
        if(itemName.toLowerCase() == 'stone_spike_door') {
            itemName = 'STONE_DOOR_SPIKE'
        }
        if(itemName.toLowerCase() == 'gold_spike_door') {
            itemName = 'GOLD_DOOR_SPIKE'
        }
        if(itemName.toLowerCase() == 'diamond_spike_door') {
            itemName = 'DIAMOND_DOOR_SPIKE'
        }
        if(itemName.toLowerCase() == 'amethyst_spike_door') {
            itemName = 'AMETHYST_DOOR_SPIKE'
        }
        if(itemName.toLowerCase() == 'warm_protection') {
            itemName = 'REIDITE_PROTECTION'
        }
        return itemName;
    }

    static convertRecipe(r: any) {
        let itemName = r.item.toString().toUpperCase();
        r.id = ItemType[itemName];
        if(r.id == undefined) {
            const zamena = Utils.firstChangeDifferences(r.item)
            r.id = ItemType[zamena];
        }
        if(r.id == undefined) {
            const zamena = Utils.secondChangeDifferences(r.item)
            r.id = ItemType(zamena);
        }
        if(r.id == undefined) {
            const zamena = Utils.thirdChangeDifferences(r.item)
            r.id = ItemType(zamena);
        }
        if(r.id == undefined) {
            console.log(r)
        }

        const rr = r.recipe.map(function(rec){ 
            let rid = ItemType[rec[0].toUpperCase()];
            if(rid == undefined) {
                const zamena = Utils.firstChangeDifferences(rec[0])
                rid = ItemType[zamena];
            }
            if(rid == undefined) {
                const zamena = Utils.secondChangeDifferences(rec[0])
                rid = ItemType[zamena];
            }
            if(rid == undefined) {
                const zamena = Utils.thirdChangeDifferences(rec[0])
                rid = ItemType[zamena];
            }
            // console.log([ItemType[rec[0].toUpperCase()], rec[1] ])
            if(rid == undefined) {
                console.log(rec[0])
            }
           return [rid, rec[1] ]
        })
        r.r = rr
        delete r.item;
        delete r.recipe;
        return r;
    }


    static getAngleDifference(angle1: number, angle2: number) {
        let max = Math.PI * 2;
        let diff = (angle2 - angle1) % max;
        return Math.abs(2 * diff % max - diff);
    }

    static getTarget(self: Entity, entities: Entity[], distance: number = Infinity) {
        let minDist = Infinity;
        let target : any;
        
        for (const entity of entities) {
            if(entity === self) continue;

            const dist = self.realPosition.distance(entity.realPosition);
            if(dist < minDist && dist < distance) target = entity;
        }

        return target;
    }

    static getBuildings(entities: Entity[]) {
        let arr = [];
        let ent: any;
        for (const entity of entities) {
            if (entity && !(entity instanceof Building)) continue;
            ent = entity
            arr.push(ent);
        }

        return arr;
    }

    static getArrowType(player: Player) {
        for (let i = 0; i < Utils.bows.length; i++) {
            const bow = Utils.bows[i];
            if(player.right.id === bow) {
                for (let j = i; j < Utils.arrows.length; j++) {
                    if(player.inventory.containsItem(Utils.arrows[j])) {
                        return [Utils.getSpell(Utils.arrows[j]), Utils.arrows[j]];
                    }
                }
            }
        }
        return -1;
    }

    static getSpell(bulletId: number) {
        switch (bulletId) {
            case ItemType.WOOD_ARROW: return 2;
            case ItemType.STONE_ARROW: return 3;
            case ItemType.GOLD_ARROW: return 4;
            case ItemType.DIAMOND_ARROW: return 5;
            case ItemType.AMETHYST_ARROW: return 6;
            case ItemType.REIDITE_ARROW: return 7;
            case ItemType.DRAGON_ARROW: return 8;
            default:
                return -1;
        }
    }

  
    static convertUintToAngle(angle: number) {
        return (((angle / 255) * Math.PI) * 2) + Math.PI / 2;
    }

    static distanceSqrt(v1: Vector, v2: Vector): number {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx ** 2 + dy ** 2);
    }

    static getRandomFromArray(array: any[]) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static isCirclesCollides(center1: Vector, radius1: number, center2: Vector, radius2: number): boolean {
        const distance = center1.distance(center2);
        return distance <= radius1 + radius2;
    }
    

    // @ts-ignore
    static getTreasure(chances: any, iteration = 0) {
        const randomValue = Math.random_clamp(0, 100);

        let current = 0;
        for (let i = 0; i < chances.length; i++) {
            const chance = chances[i];
            if(chance === 0) continue;

            if(current < randomValue && randomValue < current + chance) {
                return i;
            }

            current += chance;
        }

        if(iteration > 10) return ItemType.WOOD;
        return Utils.getTreasure(chances, iteration++);
    }
    
    static getShovelTreasure(chances: any) {
        const randomValue = Math.random_clamp(0, 100);

        let current = 0;
        for (let i = 0; i < chances.length; i++) {
            const chance = chances[i];

            if(current < randomValue && randomValue < current + chance) {
                return i;
            }

            current += chance;
        }

        return -1;
    }

    static getOffsetVector(v: Vector, distanceToMove: number, angle: number) {
        return v.add(
            new Vector(
                distanceToMove * Math.cos((angle / 255) * (Math.PI * 2)),
                distanceToMove * Math.sin((angle / 255) * (Math.PI * 2))
            )
        );
    }

    static getItemInStorage(type: EntityType) {
        switch(type) {
            case EntityType.STONE_EXTRACTOR: return ItemType.STONE;
            case EntityType.GOLD_EXTRACTOR: return ItemType.GOLD;
            case EntityType.DIAMOND_EXTRACTOR: return ItemType.DIAMOND;
            case EntityType.AMETHYST_EXTRACTOR: return ItemType.AMETHYST;
            case EntityType.REIDITE_EXTRACTOR: return ItemType.REIDITE;
            default: return -1;
        }
    }

    /* Packets */

    public static serializeAccountToBuffer(p: Player) {
        const writer = new BinaryWriter(7);

        writer.writeUInt8(ClientPackets.VERIFIED_ACCOUNT);
        writer.writeUInt8(p.id);
        writer.writeUInt8(p.cosmetics.skin);
        writer.writeUInt8(p.cosmetics.accessory);
        writer.writeUInt8(p.cosmetics.bag);
        writer.writeUInt8(p.cosmetics.book);
        writer.writeUInt8(p.data.level);

        return writer.toBuffer();
    }

    public static serializeCosmeticsToJSON(p: Player) {
        return JSON.stringify([
            ClientStringPackets.NEW_PLAYER,
            p.id,
            p.data.nickname,
            p.data.level,
            p.cosmetics.skin,
            p.cosmetics.accessory,
            p.cosmetics.bag,
            p.cosmetics.book
        ]);
    }

    public static levenshteinDistance(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;

        const dp: number[][] = [];

        for (let i = 0; i <= len1; i++) {
            dp[i] = [];
            for (let j = 0; j <= len2; j++) {
                if (i === 0) {
                    dp[i][j] = j;
                } else if (j === 0) {
                    dp[i][j] = i;
                } else {
                    const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1] + substitutionCost,
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1
                    );
                }
            }
        }

        return dp[len1][len2];
    }
}