import {Entity} from "./Entity";
import {Client} from "../network/Client";
import {
    getDefaultCamera,
    getDefaultPlayerCosmetics,
    getDefaultPlayerData,
    getDefaultPlayerStats
} from "../default/defaultValues";
import {EntityType} from "../enums/types/EntityType";
import {Gauges} from "../systems/individual/Gauges";
import {BinaryWriter} from "../modules/BinaryWriter";
import {ClientPackets} from "../enums/packets/ClientPackets";
import {DeathReason} from "../enums/DeathReason";
import {Inventory} from "../systems/individual/Inventory";
import {Permissions} from "../enums/Permissions";
import {Building} from "./Building";
import {ItemType} from "../enums/types/ItemType";
import {QuestState, QuestType} from "../enums/QuestType";
import {TokenScore} from "../systems/server/TokenSystem";
import {Crate} from "./Crate";
import {ActionType} from "../enums/types/ActionType";
import NanoTimer from "nanotimer";
import {Account} from "../modules/Account";
import {Movement} from "../systems/individual/Movement";
import {Timestamp} from "../modules/Timestamp";
import {Logger} from "../modules/Logger";
import { CollisionSystem } from "../systems/server/CollisionSystem";


export class Player extends Entity {
    public client: Client;
    public lastRequestTime: number = 0;


    public cosmetics: any;
    public data: any;

    public camera: any;

    public collision: CollisionSystem;

    public gauges: Gauges;
    public movement: Movement;
    public inventory: Inventory;

    public permission: number;

    public account!: Account;
    public tokenScore!: TokenScore;

    public kills: number = 0;
    public time: number = 0;
    private _score: number = 0;
    public scoreAchievements: number[] = [];

    public lastBuildingStamp: number = 0;
    public lastWeaponUse: number = 0;
    public lastHelmetUse: number = 0;
    public lastTotemLeave: number = 0;
    public lastHood: number = 0;
    public lastStunned: number = -1;
    public lastDamage: number[] = new Array(100).fill(-1);

    public totem: Building | null = null;
    public machine: Building | null = null;
    public spike: Building | null = null;

    public workbench: boolean = false;
    public river: boolean = false;
    public well: boolean = false;
    public fire: boolean = false;
    public onFire: boolean = false;
    public isStunned: boolean = false;
    public prevDirection: any;
    public isFlying: boolean = false;
    public isCollideFlying: boolean = false;

    public timestamps: Timestamp[];
    public timestamp: number = Date.now();

    public quests: number[] = new Array(13).fill(QuestState.PROCCESS);

    public buildings: Building[] = [];
    public updatePool: any[] = [];

    public isCrafting: boolean = false;
    public reason: number = DeathReason.UNKNOWN;
    public helmet: any = this.server.interactionSystem.items[0];
    public right: any = this.server.interactionSystem.items[7];
    public vehicle: any = this.server.interactionSystem.items[0];
    public accelerationFactor: number = this.server.config.decayPlayer;

    constructor(client: Client, tokenScore: TokenScore) {
        super(EntityType.PLAYER, client.server);
        this.client = client;   
        this.tokenScore = tokenScore;

        this.collision = new CollisionSystem(this.server)

        this.cosmetics = getDefaultPlayerCosmetics();
        this.data = getDefaultPlayerData();
        this.camera = getDefaultCamera();

        this.position.set(this.server.spawnSystem.getSpawnPoint("FOREST"));
        this.realPosition.set(this.position);

        this.permission = this.server.settings.production ? Permissions.PLAYER : Permissions.OWNER;

        this.timestamps = [];

        this.movement = new Movement(this);
        this.gauges = new Gauges(this);
        this.inventory = new Inventory(this, 10);
    }

    public set score(value: number) {
        this._score = value;
        this.server.eventSystem.onReceiveScore(this);
    }

    public get score() {
        return this._score;
    }

    public get defense() {
        return (this.helmet.defense ? this.helmet.defense : 0) + (this.right.defense ? this.right.defense : 0);
    }

    public get mobDefense() {
        return (this.helmet.mob_defense ? this.helmet.mob_defense : 0) + (this.right.mob_defense ? this.right.mob_defense : 0);
    }
    
    public checkStun() {
        if (this.isStunned && Date.now() - this.lastStunned > 2000) {
            this.isStunned = false;
            this.lastStunned = Date.now();
        }
    }

    public onTick() {
        const lifeTime = Date.now() - this.createdAt;

        this.gauges.tick();

        if(this.river && !this.direction)
            this.direction = 12;
        else if(this.direction === 12) this.direction = 0;

        if(Date.now() - this.timestamp >= 480e3) {
            this.time++;
            this.timestamp = Date.now();
            this.score += 500;
            this.client.sendU8([ClientPackets.SURVIVE]);
        }

        if(this.inventory.containsItem(ItemType.BREAD, 100)) {
            this.winter && this.successQuest(QuestType.WINTER_PEASANT_FUR);
            this.desert && this.successQuest(QuestType.GOLDEN_PITCHFORK);
        }

        if(lifeTime > 3 * 480e3) {
            this.failQuests(QuestType.ORANGE_GEM, QuestType.DRAGON_CUBE);
        }

        if(this.createdAt - Date.now() > 480e3 && !this.winter) {
            this.failQuests(QuestType.WINTER_HOOD_FUR);
        }

        if(lifeTime > 4 * 480e3) {
            this.failQuests(QuestType.WINTER_PEASANT_FUR);
        }

        if(lifeTime > 5 * 480e3) {
            this.failQuests(QuestType.GREEN_GEM);
        }

        if(lifeTime > 6 * 480e3) {
            this.successQuest(QuestType.BLUE_GEM);
            this.failQuests(QuestType.DRAGON_ORB, QuestType.LAVA_CUBE, QuestType.PILOT_HAT);
        }

        if(lifeTime > 7 * 480e3) {
            this.failQuests(QuestType.SLOT_2, QuestType.GOLDEN_PITCHFORK);
        }

        if(lifeTime > 8 * 480e3) {
            this.failQuests(QuestType.SLOT_1);
        }

        this.checkStun();
    }

    public failQuests(...types: QuestType[]) {
        for (const type of types) {
            if(this.quests[type] !== QuestState.PROCCESS) continue;

            this.quests[type] = QuestState.FAILED;
            this.client.sendU8([ClientPackets.FAIL_QUEST, type]);
        }
    }

    public successQuest(...types: QuestType[]) {
        for (const type of types) {
            if(this.quests[type] !== QuestState.PROCCESS) continue;

            this.quests[type] = QuestState.SUCCEED;
            this.client.sendU8([ClientPackets.SUCCEED_QUEST, type]);
        }
    }

    public ruinQuests() {
        for (let i = QuestType.DRAGON_ORB; i < QuestType.GREEN_GEM + 1; i++) {
            if(this.quests[i] !== QuestState.PROCCESS) continue;

            this.failQuests(i);
        }

        for (let i = QuestType.WINTER_PEASANT_FUR; i < QuestType.SLOT_2 + 1; i++) {
            if(this.quests[i] !== QuestState.PROCCESS) continue;

            this.failQuests(i);
        }
    }

    public updateInfo() {
        this.info = this.right.id + this.helmet.id * 128 + (this.inventory.size >= 16 ? 0x4000 : 0);
        this.extra = this.vehicle.id;
    }

    public lerp(a, b, t) {
        return a + (b - a) * t;
    }

    public updateSpeed() {
        if(this.helmet.id == 0) this.accelerationFactor = this.server.config.decayPlayer
        if(this.helmet.id == ItemType['PILOT_HELMET']) this.accelerationFactor = this.server.config.decayPlayer_pilot;
        
        if(this.direction == null) return;

        const isWeapon = this.right.isSlowDown();
        const diving_mask = this.helmet.id === ItemType.DIVING_MASK;
        const super_diving_suit = this.helmet.id === ItemType.SUPER_DIVING_SUIT;

        if(this.vehicle.isVehicle()) {
            if (this.vehicle.id === ItemType['BABY_LAVA']) {
                const targetSpeed = this.server.config.speed_mount_baby_lava / 1000;
                const accelerationFactor = this.accelerationFactor;
                
                // Применяем линейную интерполяцию (lerp) для плавного увеличения скорости
                this.speed = this.lerp(this.speed, targetSpeed, accelerationFactor);
            }
            if(this.vehicle.id == ItemType['BABY_DRAGON']) {
                const targetSpeed = this.server.config.speed_mount_baby_dragon / 1000;
                const accelerationFactor = this.accelerationFactor;
                
                // Применяем линейную интерполяцию (lerp) для плавного увеличения скорости
                this.speed = this.lerp(this.speed, targetSpeed, accelerationFactor);
            }
            if(this.vehicle.id == ItemType['MOUNT_BOAR']) {
                const targetSpeed = this.server.config.speed_mount_boar / 1000;
                const accelerationFactor = this.accelerationFactor;
                
                // Применяем линейную интерполяцию (lerp) для плавного увеличения скорости
                this.speed = this.lerp(this.speed, targetSpeed, accelerationFactor);
            }
        } else {
            this.speed = this.server.configSystem.speed[this.type];
        }

        if(isWeapon) {
            this.speed = this.server.config.speed_weapon;
        }
        
        if(this.desert && !this.vehicle.isVehicle()) {
            this.speed = isWeapon ? this.server.config.speed_desert_weapon : this.server.config.speed_desert;
        }

        if(this.winter && !this.vehicle.isVehicle() ) {
            this.speed = this.server.config.speed_winter;
            if(isWeapon) this.speed = this.server.config.speed_winter_weapon;
        }

        if(this.water && !this.bridge && !this.vehicle.isVehicle()) {
            this.speed = this.server.config.speed_water;
            if(diving_mask || super_diving_suit) this.speed = 0.18;
            if(isWeapon) this.speed = this.server.config.speed_water_weapon;
        }
    
        if(this.lavaBiome && !this.vehicle.isVehicle()) {
            this.speed = isWeapon ? this.server.config.speed_lava_weapon : this.server.config.speed_lava;
        }
    }
    public onReceiveItem(id: number, count: number) {
        if(id === ItemType.AMETHYST) {
            this.successQuest(QuestType.DRAGON_CUBE);
        }

        if(id === ItemType.REIDITE) {
            this.successQuest(QuestType.LAVA_CUBE);
        }

        if(id === ItemType.DRAGON_HEART) {
            this.successQuest(QuestType.DRAGON_ORB);
        }

        if(id === ItemType.LAVA_HEART) {
            this.successQuest(QuestType.LAVA_ORB);
        }

        if(id === ItemType.EMERALD) {
            this.successQuest(QuestType.PILOT_HAT);
        }

        if(id === ItemType.SANDWORM_JUICE) {
            this.successQuest(QuestType.SLOT_1);
        }
    }
    
    public onDamage(damager?: Entity): void {
        this.lastHood = Date.now();

        this.quests[QuestType.GREEN_GEM] = QuestState.FAILED;
        this.client.sendU8([ClientPackets.FAIL_QUEST, QuestType.GREEN_GEM]);
        
        if(damager instanceof Player) {
            if(damager.quests[QuestType.BLUE_GEM] !== QuestState.SUCCEED) {
                damager.quests[QuestType.BLUE_GEM] = QuestState.FAILED;
                damager.client.sendU8([ClientPackets.FAIL_QUEST, QuestType.BLUE_GEM]);
            }
        }
    }

    public onDead(damager: Entity) {

        if(this.account) {
            this.server.updateAccountData(this);
        }

        if(this.totem) {
            if (this.totem.owner === this) {
                this.server.totemSystem.broadcastDestroyTeam(this.totem);
            } else {
                this.totem.data = this.totem.data.filter((id: any) => id !== this.id);
                this.server.totemSystem.broadcastExcludeMemberId(this.totem, this.id);
            }   
        }

        const writer = new BinaryWriter();
        if (this.tokenScore.session_id === this.data.token_id) {
            this.tokenScore.score += this.score;
            this.tokenScore.session_id = 0;
            this.server.tokenSystem.leaveToken(this.tokenScore);
        }

        writer.writeUInt8(ClientPackets.KILLED);

        writer.writeUInt8(this.reason);
        writer.writeUInt16(this.kills);
        writer.writeUInt32(this.score + this.tokenScore.score);

        this.server.broadcast(new Uint8Array([ClientPackets.KILL_PLAYER, this.id]), true, this.client.socket);

        if(damager instanceof Player) {
            damager.score += this.score * this.server.config.score_per_kill;
        }

        new Crate(this.server, {
            owner: this,
            isDead: true
        });

        this.server.playerPool.deleteId(this.id);
        for (const building of this.buildings) building.delete();

        this.action = ActionType.DELETE;

        new NanoTimer().setTimeout(() => {
            this.server.entities = this.server.entities.filter((entity) => entity != this);
        }, [], 1 / this.server.settings.tps + "s");

        this.buildings = [];
        this.server.players = this.server.players.filter(player => player.id !== this.id);
        this.client.sendBinary(writer.toBuffer());
        
        new NanoTimer().setTimeout(() => {
            this.client.isActive && this.client.socket.close();
        }, [], "0.01s");
    }
}
