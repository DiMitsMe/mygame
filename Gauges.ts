import {Player} from "../../entities/Player";
import {ClientPackets} from "../../enums/packets/ClientPackets";
import {BinaryWriter} from "../../modules/BinaryWriter";
import {ActionType} from "../../enums/types/ActionType";
import {DeathReason} from "../../enums/DeathReason";
import {WorldTime} from "../../enums/WorldTime";
import {ItemType} from "../../enums/types/ItemType";
import {BiomeType} from "../../enums/types/BiomeType";

export class Gauges {
    private readonly config: any;
    private readonly player: Player;

    public lastUpdateStats: number = Date.now();
    public lastUpdateHealth: number = Date.now();
    public lastUpdateLava: number = Date.now();
    public lastUpdateSpike: number = Date.now();
    public lastUpdateFire: number = Date.now();

    public hunger!: number;
    public cold!: number;
    public thirst!: number;
    public oxygen!: number;
    public bandage!: number;
    public old: any;

    constructor(player: Player) {
        this.player = player;
        this.config = player.server.config;

        this.hunger = 100;
        this.cold = 100;
        this.thirst = 100;
        this.oxygen = 100;
        this.bandage = 0;

        this.old = {
            hunger: this.hunger,
            cold: this.cold,
            thirst: this.thirst,
            oxygen: this.oxygen,
            bandage: this.bandage
        };
    }

    public mathclamp(variable: number, min: number, max: number) {
        return Math.max(min, Math.min(variable, max));
    }

    public updateClientGauges() {
        const writer = new BinaryWriter(8);
        writer.writeUInt8(ClientPackets.GAUGES);
        writer.writeUInt8(this.player.healthSystem.health / 2);
        writer.writeUInt8(this.hunger);
        writer.writeUInt8(Math.min(100, this.cold));
        writer.writeUInt8(this.thirst);
        writer.writeUInt8(this.oxygen);
        writer.writeUInt8(200 - this.cold);
        writer.writeUInt8(this.bandage);

        this.player.client.sendBinary(writer.toBuffer());
    }

    public tick() {
        if (Date.now() - this.lastUpdateHealth >= this.config.delay_gauges * 2) {
            this.lastUpdateHealth = Date.now();
            this.updateHealth();
        }

        if (Date.now() - this.lastUpdateStats >= this.config.delay_gauges) {
            this.lastUpdateStats = Date.now();
            this.updateGauges();
        }

        if (Date.now() - this.lastUpdateFire >= 2000) {
            this.lastUpdateFire = Date.now();
            this.updateFire();
        }

        if (Date.now() - this.lastUpdateLava >= 750) {
            this.lastUpdateLava = Date.now();
            this.updateLava();
        }

        if (Date.now() - this.lastUpdateSpike >= 1000) {
            this.lastUpdateSpike = Date.now();
            this.updateSpike();
        }
    }

    public clamp() {
        this.cold = this.mathclamp(this.cold, 0, 100 + Number(!this.config.disable_warm_gauge) * 100);
        this.hunger = this.mathclamp(this.hunger, 0, 100);
        this.thirst = this.mathclamp(this.thirst, 0, 100);
        this.oxygen = this.mathclamp(this.oxygen, 0, 100);
        this.bandage = this.mathclamp(this.bandage, 0, this.config.bandage_stack_limit);
    }

    public updateGauges() {
        let helmet: string | false = ItemType[this.player.helmet.id].toLowerCase() ?? false;
        if (helmet === "hand") helmet = false;
        if (helmet && helmet.includes("protection")) {
            if (helmet.includes("diamond")) helmet = 'warm_protection';
            if (helmet.includes("amethyst")) helmet = 'warm_protection2';
            if (helmet.includes("reidite")) helmet = 'warm_protection3';
        }

        const cfg = (this.config as any);

        if (this.player.fire && !this.player.onFire) {
            this.cold += this.config.fire_warm;
        } else {
            const time: string = WorldTime[this.player.server.timeSystem.time].toLowerCase();
            let biome: string | boolean = BiomeType[this.player.biomeIn].toLowerCase() ?? false;
            let configSetting: number = 0, reduceSetting: number = 0, increase: boolean = false;
            if (biome === 'sea') biome = "water";
            else if (biome === 'dragon') biome = "winter";
            else if (biome === 'forest' || biome === 'beach') biome = false;
            if (biome) {
                if (helmet) {
                    configSetting = cfg[helmet + "_warm_" + biome + "_" + time] ?? 0;
                } else {
                    configSetting = cfg["warm_" + biome + "_" + time] ?? 0;
                }
                increase = biome === 'desert' || biome === 'lava';
                reduceSetting = cfg[(increase) ? "increase_" + "cold_" + biome + (biome === 'desert' ? "_" + time : "") : "reduce_" + "cold_" + biome + "_" + time] / (Number(this.player.roof) + 1) ?? 0
            } else {
                if (helmet) {
                    configSetting = cfg[helmet + "_warm_" + time] ?? 0;
                } else {
                    configSetting = cfg["warm_" + time] ?? 0;
                }
                increase = false;
                reduceSetting = cfg["reduce_cold_" + time] / (Number(this.player.roof) + 1) ?? 0;
            }
            
            if (increase) {
                this.cold += reduceSetting;
                this.cold -= configSetting; 
            } else {
                time === 'night' ? this.cold -= reduceSetting : this.cold -= reduceSetting - configSetting;
                this.cold += configSetting;
            }
        }

        if (this.player.water) {
            this.thirst += this.config.drink_water;
            this.oxygen -= this.player.bridge ? -this.config.heal_oxygen : this.config.reduce_oxygen - (cfg[helmet + "_loss_oxygen"] ?? 0);
        } else {
            this.thirst -= this.player.bed ? this.config.reduce_water_bed : this.config.reduce_water;
            this.oxygen += this.config.heal_oxygen;
        }

        this.hunger = this.mathclamp(this.hunger - (this.player.bed ? this.config.reduce_food_bed : this.config.reduce_food), 0, 100);
        this.thirst = this.mathclamp(this.thirst, 0, 100);
        this.oxygen = this.mathclamp(this.oxygen, 0, 100);
        this.cold = this.mathclamp(this.cold, 0, 100 + Number(!this.config.disable_warm_gauge) * 100);
        
        if (this.old.cold === 200 && this.cold === 200) {
            this.player.client.sendBinary(this.player.healthSystem.damage(this.config.damage_warm, ActionType.HURT));
            this.player.reason = DeathReason.WARM;
        }

        if (this.old.hunger === 0 && this.hunger === 0) {
            this.player.reason = DeathReason.STARVE;
            this.player.client.sendBinary(this.player.healthSystem.damage(this.config.damage_food, ActionType.HUNGER))
        }

        if (this.old.cold === 0 && this.cold === 0) {
            this.player.reason = DeathReason.COLD;
            this.player.client.sendBinary(this.player.healthSystem.damage(this.player.winter ? this.config.damage_cold_winter : this.config.damage_cold, ActionType.COLD))
        }

        if (this.old.thirst === 0 && this.thirst === 0) {
            this.player.reason = DeathReason.WATER;
            this.player.client.sendBinary(this.player.healthSystem.damage(this.config.damage_water, ActionType.COLD))
        }

        if (this.old.oxygen === 0 && this.oxygen === 0) {
            this.player.reason = DeathReason.OXYGEN;
            this.player.client.sendBinary(this.player.healthSystem.damage(this.config.damage_oxygen, ActionType.COLD))
        }

        if (this.queryUpdate()) {
            this.updateClientGauges();
        }
    }

    private updateFire() {
        if (this.player.onFire) {
            this.cold += 20;
            this.cold = this.mathclamp(this.cold, 0, 100 + Number(!this.config.disable_warm_gauge) * 100);
            this.player.client.sendBinary(this.player.healthSystem.damage(40, ActionType.HURT, this.player));
            this.updateGauges();
        }
        if (this.player.fire) {
            this.cold += 20;
            this.cold = this.mathclamp(this.cold, 0, 100 + Number(!this.config.disable_warm_gauge) * 100);
            this.updateGauges();
        }
    }

    private updateLava() {
        if (this.player.lava && !this.player.bridge) {
            this.cold = this.mathclamp(this.cold + 20, 0, 100 + Number(!this.config.disable_warm_gauge) * 100);
            this.player.client.sendBinary(this.player.healthSystem.damage(40, ActionType.HURT));
            this.updateGauges();
        }
    }

    private updateSpike() {
        const spike = this.player.spike;
        if (spike && spike.owner.id !== this.player.id && !spike.owner.totem?.data.includes(this.player.id)) {
            const damage = this.player.server.configSystem.entityDamage[spike.type];
            const opened = spike.info % 2 && spike.isDoor();
            
            if(opened) return;

            this.player.reason = DeathReason.SPIKE;
            this.player.client.sendBinary(this.player.healthSystem.damage(damage, ActionType.HURT));
        }
    }

    private updateHealth() {
        const canHeal =
            this.hunger > 35 &&
            this.cold > 35 &&
            this.cold < 165 &&
            this.thirst > 35 &&
            this.oxygen > 35

        if (!canHeal) return;

        if (this.bandage || this.player.bed || this.player.helmet.id === ItemType.CROWN_GREEN) {
            if(this.player.healthSystem.health == 200) return;
            this.player.client.sendBinary(this.player.healthSystem.heal(this.player.helmet.id === ItemType.CROWN_GREEN ? 40 : this.config.bandage_heal));
            if (this.bandage) {
                this.player.client.sendU8([ClientPackets.BANDAGE, this.bandage]);
                this.bandage--;
            }
        } else {
            this.player.client.sendBinary(this.player.healthSystem.heal(this.config.heal));
        }
    }

    private queryUpdate() {
        const hasUpdate =
            this.old.hunger !== this.hunger ||
            this.old.cold !== this.cold ||
            this.old.thirst !== this.thirst ||
            this.old.oxygen !== this.oxygen ||
            this.old.bandage !== this.bandage;

        if (hasUpdate) {
            this.old = {
                hunger: this.hunger,
                cold: this.cold,
                thirst: this.thirst,
                oxygen: this.oxygen,
                bandage: this.bandage
            };
        }

        return hasUpdate;
    }
}
