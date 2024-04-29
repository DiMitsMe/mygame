import {ConfigSystem} from "../systems/server/ConfigSystem";
import {ItemType} from "../enums/types/ItemType";

export class Item {
    public id: ItemType;
    public defense: number;
    public mob_defense: number;
    public damage: number;
    public building_damage: number;
    public offset: number;
    public radius: number;
    public name: string;
    /* pickaxes, hand */
    public harvest: number;
    /* shovels */
    public dig: number;
    /* bottle, watermelon */
    public water: number;
    public food: number;
    /* bandage, aloe */
    public heal: number;
    public cold: number;
    constructor(id: ItemType, configSystem: ConfigSystem) {
        this.id = id;

        this.defense = configSystem.itemDefense[id] ?? 0;
        this.name = configSystem.name[id] ?? 0;
        this.mob_defense = configSystem.itemMobDefense[id] ?? 0;
        this.damage = configSystem.itemDamage[id] ?? 0;
        this.building_damage = configSystem.itemBuildingDamage[id] ?? this.damage / 3;
        this.harvest = configSystem.itemHarvest[id] ?? 0;
        this.dig = configSystem.itemDig[id] ?? 0;
        this.water = configSystem.itemWaterValue[id] ?? 0;
        this.food = configSystem.itemFoodValue[id] ?? 0;
        this.heal = configSystem.itemHealValue[id] ?? 0;
        this.cold = configSystem.itemColdValue[id] ?? 0;
        this.radius = configSystem.itemRadius[id] ?? 0;
        this.offset = configSystem.itemOffset[id] ?? 0;
    }

    public isVehicle() {
        return [
            ItemType.BABY_DRAGON, ItemType.BABY_LAVA, ItemType.HAWK,
            ItemType.BABY_MAMMOTH, ItemType.MOUNT_BOAR, ItemType.CRAB_BOSS
        ].includes(this.id);
    }

    public isFlying() {
        return [
            ItemType.BABY_DRAGON, ItemType.BABY_LAVA, ItemType.HAWK,
            ItemType.PLANE
        ].includes(this.id);
    }

    public isHat() {
        return [
            ItemType.WOOD_HELMET, ItemType.STONE_HELMET, ItemType.GOLD_HELMET, ItemType.DIAMOND_HELMET, ItemType.AMETHYST_HELMET,
            ItemType.REIDITE_HELMET, ItemType.DRAGON_HELMET, ItemType.LAVA_HELMET, ItemType.CRAB_HELMET,
            ItemType.CROWN_BLUE, ItemType.CROWN_GREEN, ItemType.CROWN_ORANGE,
            ItemType.EARMUFFS, ItemType.COAT, ItemType.CAP_SCARF, ItemType.FUR_HAT,
            ItemType.HOOD, ItemType.WINTER_HOOD, ItemType.PEASANT, ItemType.WINTER_PEASANT,
            ItemType.TURBAN1, ItemType.TURBAN2, ItemType.DIVING_MASK, ItemType.SUPER_DIVING_SUIT,
            ItemType.DIAMOND_PROTECTION, ItemType.AMETHYST_PROTECTION, ItemType.REIDITE_PROTECTION,
            ItemType.PILOT_HELMET, ItemType.PIRATE_HAT, ItemType.EXPLORER_HAT
        ].includes(this.id);
    }

    public isCooldown() {
        return [
            ItemType.WOOD_HELMET, ItemType.STONE_HELMET, ItemType.GOLD_HELMET, ItemType.DIAMOND_HELMET, ItemType.AMETHYST_HELMET,
            ItemType.REIDITE_HELMET, ItemType.DRAGON_HELMET, ItemType.LAVA_HELMET, ItemType.CRAB_HELMET,
            ItemType.CROWN_BLUE, ItemType.CROWN_GREEN, ItemType.CROWN_GREEN, ItemType.CROWN_ORANGE
        ].includes(this.id);
    }

    public isSlowDown() {
        return this.isSpear() || this.isSword() || this.isBow();
    }

    public isFood() {
        return [
            ItemType.BERRY, ItemType.PUMPKIN, ItemType.GARLIC,
            ItemType.CARROT, ItemType.TOMATO, ItemType.WATERMELON,
            ItemType.COOKIE, ItemType.SUGAR_CAN, ItemType.CAKE,
            ItemType.MEAT, ItemType.FOODFISH, ItemType.CACTUS,
            ItemType.COOKED_MEAT, ItemType.FOODFISH_COOKED,
            ItemType.BREAD, ItemType.SANDWICH, ItemType.ALOE_VERA,
            ItemType.ICE, ItemType.BOTTLE_FULL, ItemType.BANDAGE
        ].includes(this.id);
    }

    public isEquipment() {
        return this.isSword() || this.isBow() || this.isShield() || this.isSpear() || this.isTool() || this.isHammer();
    }

    public isTool() {
        return [
            ItemType.WOOD_PICK, ItemType.STONE_PICK, ItemType.GOLD_PICK, ItemType.DIAMOND_PICK, ItemType.AMETHYST_PICK, ItemType.REIDITE_PICK,
            ItemType.WRENCH, ItemType.WATERING_CAN_FULL, ItemType.BOOK, ItemType.MACHETE, ItemType.PITCHFORK, ItemType.GOLD_PITCHFORK,
            ItemType.STONE_SHOVEL, ItemType.GOLD_SHOVEL, ItemType.DIAMOND_SHOVEL, ItemType.SADDLE,
            ItemType.AMETHYST_SHOVEL
        ].includes(this.id);
    }

    public isSword() {
        return [
            ItemType.WOOD_SWORD, ItemType.STONE_SWORD, ItemType.GOLD_SWORD,  ItemType.DRAGON_SWORD,
            ItemType.DIAMOND_SWORD, ItemType.AMETHYST_SWORD, ItemType.REIDITE_SWORD, ItemType.LAVA_SWORD,
            ItemType.PIRATE_SWORD, ItemType.CRAB_SPEAR
        ].includes(this.id);
    }

    public isBow() {
        return [
            ItemType.WOOD_BOW, ItemType.STONE_BOW, ItemType.GOLD_BOW, ItemType.DIAMOND_BOW,
            ItemType.AMETHYST_BOW, ItemType.REIDITE_BOW, ItemType.DRAGON_BOW
        ].includes(this.id);
    }

    public isSpear() {
        return [
            ItemType.WOOD_SPEAR, ItemType.STONE_SPEAR, ItemType.GOLD_SPEAR,  ItemType.DRAGON_SPEAR,
            ItemType.DIAMOND_SPEAR, ItemType.AMETHYST_SPEAR, ItemType.REIDITE_SPEAR, ItemType.LAVA_SPEAR
        ].includes(this.id);
    }

    public isHammer() {
        return [
            ItemType.STONE_HAMMER, ItemType.GOLD_HAMMER, ItemType.DIAMOND_HAMMER,
            ItemType.AMETHYST_HAMMER, ItemType.REIDITE_HAMMER, ItemType.SUPER_HAMMER
        ].includes(this.id);
    }

    public isShield() {
        return [
            ItemType.WOOD_SHIELD, ItemType.STONE_SHIELD, ItemType.GOLD_SHIELD,
            ItemType.DIAMOND_SHIELD, ItemType.AMETHYST_SHIELD, ItemType.REIDITE_SHIELD,
        ].includes(this.id);
    }

    public equal(id: number) {
        return this.id === id;
    }

}