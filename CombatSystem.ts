import {Server} from "../../Server";
import {Player} from "../../entities/Player";
import {BinaryWriter} from "../../modules/BinaryWriter";
import {ClientPackets} from "../../enums/packets/ClientPackets";
import {ItemType} from "../../enums/types/ItemType";
import {ActionType} from "../../enums/types/ActionType";
import {DeathReason} from "../../enums/DeathReason";
import {Building} from "../../entities/Building";
import {Utils} from "../../modules/Utils";
import {Animal} from "../../entities/Animal";
import {BehaviourType} from "../../enums/types/BehaviourType";
import {WorldTime} from "../../enums/WorldTime";
import {TileType} from "../../enums/types/TileType";
import {Tile} from "../../world/map/Tile";
import {Entity} from "../../entities/Entity";
import {Bullet} from "../../entities/Bullet";

export class CombatSystem {
    private server: Server;
    constructor(server: Server) {
        this.server = server;
    }

    public tick() {
        for (const player of this.server.players) {
            this.handleAttack(player);
        }
    }

    public handleAttack(player: Player) {
        const now = Date.now();
        if(now - player.lastAttack < 500 || !player.attack) return;

        player.lastAttack = now;
        player.action |= ActionType.ATTACK;

        if(player.right.isBow()) {
            const type = Utils.getArrowType(player);
            if(type !== -1) {
                player.client.sendBinary(player.inventory.removeItem(type[1], 1));
                new Bullet(this.server, player, type[0]);
            }
            return;
        }

        const hitPosition = Utils.getOffsetVector(player.realPosition, player.right.offset, player.angle);
        const damaged = this.server.map.queryCircle(hitPosition, player.right.radius);

        const writer = new BinaryWriter();

        writer.writeUInt16(ClientPackets.HITTEN);

        let empty = false;
        let dontHarvest = false;

        if (player.right.dig && !player.water) {
            const item: number = (player.beach || player.island || player.desert) ? ItemType.SAND : (player.lavaBiome || player.forest) ? ItemType.GROUND : player.winter ? ItemType.ICE : 0;
            const reward = Utils.getShovelTreasure(this.server.configSystem.dropChance);
            item && player.client.sendBinary(player.inventory.giveItem(item, player.right.dig));
            reward !== -1 && player.client.sendBinary(player.inventory.giveItem(reward, player.right.dig));
        }

        for (const unit of damaged) {
            if (unit === player) continue;
            if (unit instanceof Tile && unit.collide) {
                if(player.isCollideFlying) return;
                empty = damaged.length > 1;
                dontHarvest = damaged.length > 1;
                let harvest = Math.max(0, player.right.harvest + 1 - unit.hard) * this.server.config.harvest;

                unit.type === TileType.CACTUS && player.client.sendBinary(player.healthSystem.damage(20, ActionType.HURT))

                if (unit.hard === -1) harvest = 1;

                unit.angle = player.angle;
                writer.writeUInt16(...unit.shake());

                if (harvest) dontHarvest = false;
                if (unit.count > 0) empty = false;

                unit.dig(player, harvest);
            } else if (unit instanceof Entity) {
                if (unit instanceof Building) {
                    if(player.isCollideFlying) return;
                    console.log(player.isCollideFlying)
                    player.right.id === ItemType.WRENCH ? unit.healthSystem.heal(player.right.building_damage) : unit.healthSystem.damage(player.right.building_damage, 0, player);
                } else {
                    if (unit instanceof Player) {
                        if(player.isCollideFlying && unit.isCollideFlying == false) return;
                        if(unit.isCollideFlying && player.isCollideFlying == false) return;
                        const isHood = [ItemType.HOOD, ItemType.WINTER_HOOD].includes(player.helmet.id);
                        
                        const peasant = unit.helmet.id === ItemType.WINTER_PEASANT || (player.helmet.id === ItemType.HOOD && unit.helmet.id === ItemType.PEASANT);
                        if (
                            player.right.id === ItemType.HAND && isHood && !peasant && !player.fire && !unit.fire &&
                            this.server.timeSystem.time === WorldTime.NIGHT &&
                            now - player.lastHood > (player.helmet.id === ItemType.WINTER_HOOD ? 4000 : 8000)
                        ) {
                            const items = unit.inventory.toArray().filter(([id, count]) => ![unit.right.id, unit.helmet.id].includes(id));
                            if (items.length > 0) {
                                const [id, c] = Utils.getRandomFromArray(items);
                                
                                const count = Math.min(255, c);
                                
                                player.client.sendBinary(player.inventory.giveItem(id, count));
                                unit.client.sendBinary(unit.inventory.removeItem(id, count));
                                player.ruinQuests();
                                player.lastHood = now;
                            }   
                        }
                        unit.reason = DeathReason.PLAYER;
                        let multiplier = 1;
                        if(player.totem) {
                            if(player.totem.data.includes(unit.id)) {
                                multiplier = 0.1
                            }
                        }
                        unit.client.sendBinary(unit.healthSystem.damage((player.right.damage + unit.defense) * multiplier, ActionType.HURT, player));
                        
                        continue;
                    }

                    unit.healthSystem.damage(player.right.damage, ActionType.HURT, player);
                    if (unit instanceof Animal) {
                        if (unit.behaviour === BehaviourType.NEUTRAL) {
                            unit.info = 1;
                            unit.lastAngry = now;
                        }
                    }
                }
            }
        }

        empty && player.client.sendU8([ClientPackets.EMPTY_RES]);
        dontHarvest && player.client.sendU8([ClientPackets.DONT_HARVEST]);
        
        if(writer.toBuffer().length > 2)
            this.server.broadcast(writer.toBuffer(), true);
    }
}