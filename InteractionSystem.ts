import {Server} from "../../Server";
import {Player} from "../../entities/Player";
import {ItemType} from "../../enums/types/ItemType";
import {Item} from "../../entities/Item";

export class InteractionSystem {
    private server: Server;
    public items: Item[];
    constructor(server: Server) {
        this.server = server;
        this.items = [];

        for (let i = 0; i < Object.values(ItemType).length / 2; i++) {
            this.items[i] = new Item(i, server.configSystem);
        }
    }

    public request(player: Player, id: number) {
        const item = this.items[id];

        const canWeapon = Date.now() - player.lastWeaponUse >= this.server.config.weapon_delay;
        const canEquip = Date.now() - player.lastHelmetUse >= this.server.config.helmet_delay;

        if(!player.inventory.containsItem(item.id, 1) && item.id != 7){
            return
        } 

        if(item.isHat()) {
            if ((item.isCooldown() || player.helmet.isCooldown()) && !canEquip) {
                return;
            } 
            if(player.helmet.id != id) {
                player.helmet = item;
                if(item.isCooldown()) player.lastHelmetUse = Date.now();
            } else {
                player.helmet = this.items[0];
            }
        } else if(item.isFood()) {
            if (item.id === ItemType.BANDAGE && player.gauges.bandage === player.server.config.bandage_stack_limit) return;

            if (item.equal(ItemType.BOTTLE_FULL)) {
                player.client.sendBinary(player.inventory.giveItem(ItemType.BOTTLE_EMPTY, 1));
            }

            player.gauges.hunger += item.food;
            player.gauges.thirst += item.water;
            player.gauges.bandage += item.heal;
            player.gauges.cold -= item.cold;
            
            player.client.sendBinary(player.inventory.removeItem(item.id, 1));
            
            player.gauges.clamp();
            player.gauges.updateClientGauges();
        } else if (item.isVehicle()) {
            if(player.isCollideFlying == true) return;
            if(player.vehicle.equal(item.id)) {
                if(player.speed > 0.06) return;
                player.speed = this.server.config.speed;
                player.vehicle = this.items[ItemType.HAND];
            } else {
                player.speed = 0.005
                player.vehicle = item;
            }
        } else if (item.isEquipment()) {
            if((item.isSlowDown() || player.right.isSlowDown()) && !canWeapon){
                return;
            } 
            player.right = item;
            if (item.isSlowDown()) {
                player.lastWeaponUse = Date.now();
            }
        } else if (item.equal(ItemType.HAND) && canWeapon) {
            player.right = this.items[ItemType.HAND];
        }

        player.updateInfo();
    }


}