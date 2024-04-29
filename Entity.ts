import {Vector} from "../modules/Vector";
import {Server} from "../Server";
import {HealthSystem} from "../systems/individual/HealthSystem";
import {ActionType} from "../enums/types/ActionType";
import {BiomeType} from "../enums/types/BiomeType";
import {EntityPacket} from "../packets/EntityPacket";

export class Entity {
    public realPosition: Vector;
    public position: Vector;
    public velocity: Vector;
    public server: Server;

    public lastAttack: number = 0;
    public collide: boolean;
    public isCollide: boolean = false;
    public createdAt: number = Date.now();
    public obstacle: any = 0;
    public lavaBiome: boolean = false;
    public island: boolean = false;
    public bridge: boolean = false;
    public roof: boolean = false;
    public lava: boolean = false;
    public water: boolean = false;
    public attack: boolean = false;
    public winter: boolean = false;
    public desert: boolean = false;
    public beach: boolean = false;
    public lake: boolean = false;
    public biomeIn: BiomeType = BiomeType.FOREST;
    public forest: boolean = false;
    public bed: boolean = false;
    public tower: boolean = false;
    public infire: boolean = false;
    public plot: boolean = false;
    public seed: boolean = false;

    public healthSystem: HealthSystem;

    public damage: number;
    public target: any = 0;
    public direction: any;
    public radius: number;
    public type: number;
    public id: number;
    public pid: number;
    public speed: number;
    public action: number;
    public angle: number;
    public extra: number;
    public info: number;

    constructor(type: number, server: Server) {
        this.server = server;
        this.type = type;
        this.id = 0;
        this.obstacle = 0;
        this.target = 0;

        this.healthSystem = new HealthSystem(this, this.server.configSystem?.health[type]);
        this.speed = this.server.configSystem.speed[type] ?? 0;
        this.damage = this.server.configSystem.entityDamage[type] ?? 0;
        this.radius = this.server.configSystem.entityRadius[type] ?? 0;
        this.collide = this.server.configSystem.entityCollide[type] ?? 0;

        this.pid = 0;
        this.angle = 0;
        this.action = 0;
        this.info = 0;
        this.extra = 0;

        this.direction = 0;

        this.realPosition = new Vector(0, 0);
        this.position = new Vector(0, 0);
        this.velocity = new Vector(0, 0);
    }

    public onDead(damager?: Entity) {}
    public onDamage(damager?: Entity) {}
    public onTick() {}
    public onReceiveItem(id: number, count: number) {}

    public lastTick() {
        this.position = this.position.clamp(0, 0, this.server.map.width - 1, this.server.map.height - 1);

        if (this.action & ActionType.WEB) this.action &= ~ActionType.WEB;
        if (this.action & ActionType.HEAL) this.action &= ~ActionType.HEAL;
        if (this.action & ActionType.ATTACK) this.action &= ~ActionType.ATTACK;
        if (this.action & ActionType.HUNGER) this.action &= ~ActionType.HUNGER;
        if (this.action & ActionType.COLD) this.action &= ~ActionType.COLD;
        if (this.action & ActionType.HURT) this.action &= ~ActionType.HURT;
    }

    public updateSpeed() {
        this.speed = this.server.configSystem.speed[this.type];
    }

    public delete() {
        this.server.entityPool.deleteId(this.id);
        this.action = ActionType.DELETE;

        const players = this.server.map.getPlayersInDistance(this.realPosition, 2200);

        for (const player of players) {
            new EntityPacket(player);
        }

        this.server.entities = this.server.entities.filter((entity) => entity != this);
    }

}
