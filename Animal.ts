import {Server} from "../Server";
import {Entity} from "./Entity";
import {Player} from "./Player";
import {Inventory} from "../systems/individual/Inventory";
import {EntityType} from "../enums/types/EntityType";
import {ItemType} from "../enums/types/ItemType";
import {AnimalBoxes} from "../enums/AnimalBoxes";
import {BehaviourType} from "../enums/types/BehaviourType";
import {Utils} from "../modules/Utils";
import { BiomeType } from "../enums/types/BiomeType";
import { Crate } from "./Crate";
import { QuestState, QuestType } from "../enums/QuestType";
import { ActionType } from "../enums/types/ActionType";
import { BinaryWriter } from "../modules/BinaryWriter";
import { ClientPackets } from "../enums/packets/ClientPackets";
import { DeathReason } from "../enums/DeathReason";
import {Movement} from "../systems/individual/Movement";

export class Animal extends Entity {
    public score: number;
    public spawnBiome: string;
    public movement: Movement;
    public inventory: Inventory;
    public behaviour: BehaviourType;

    public lastAngry: number = -1;
    public lastMove: number = -1;
    public lastSpiderStun: number = -1;
    public lastCollision: number = -1;
    public nextMove: number = -1;
    public lastUpdate: number = -1;

    public target: Player | null;

    constructor(type: number, server: Server) {
        super(type, server);

        this.inventory = new Inventory(this, 16);
        this.id = this.server.entityPool.createId();

        this.score = 0;
        this.collide = false;
        this.target = null;
        this.spawnBiome = BiomeType.FOREST;
        this.behaviour = BehaviourType.NONE;
        this.server.mobSystem.animalCounter[this.type]++;

        this.movement = new Movement(this);

        this.setupLoot();
    }

    public onDamage(damager?: Entity | undefined): void {
        if (damager instanceof Player) {
            if (damager.quests[QuestType.BLUE_GEM] === QuestState.PROCCESS && this.behaviour === BehaviourType.PEACEFUL) {
                damager.failQuests(QuestType.BLUE_GEM);
            }
        }
    }

    public onTick() {
        if(this.behaviour === BehaviourType.NONE) return;
        const now = Date.now();
        switch (this.type) {
            case EntityType.SAND_WORM:
            case EntityType.LAVA_DRAGON:
            case EntityType.MAMMOTH:
            case EntityType.DRAGON:
            case EntityType.KRAKEN: {
                if (now - this.lastUpdate > 1000) {
                    this.lastUpdate = now;

                    const buildings = Utils.getBuildings(this.server.map.getEntities(this.position.x, this.position.y, 3))
                    
                    const shakeBuildings = new BinaryWriter();
                    shakeBuildings.writeUInt16(ClientPackets.HITTEN_OTHER);

                    for (const building of buildings) {

                        if (building.position.distance(this.realPosition) > this.server.configSystem.entityRadius[this.type] + 50) continue;

                        building.healthSystem.damage(this.server.configSystem.entityDamage[this.type], 0);

                        shakeBuildings.writeUInt16(building.id + building.pid * 1000);
                        shakeBuildings.writeUInt16(this.angle);
                    }
                    
                    if(shakeBuildings.toBuffer().length > 2) {
                        this.server.broadcast(shakeBuildings.toBuffer(), true);
                    }
                }
            }
        }
        this.updateSpeed();

        this.target = Utils.getTarget(this, this.server.players, this.speed * 1000) as any;

        if ((this.behaviour === BehaviourType.AGGRESSIVE || this.info === 1) && this.target) {
            const inTarget = Utils.distanceSqrt(this.realPosition, this.target.realPosition) < this.radius + this.target.radius;
            if (this.target.isStunned) this.lastSpiderStun = now;
            if (Utils.distanceSqrt(this.realPosition, this.target.realPosition) < (this.radius + 44) + this.target.radius) {
                (this.type === EntityType.SPIDER && !this.target.isStunned && now - this.lastSpiderStun > 2800 && Math.random() > .02) && this.spiderStun();
            } else {
                this.lastSpiderStun = now;
            }
            if (inTarget) {
                if (this.type === EntityType.SAND_WORM) this.info = 1;
                if (this.target.lastDamage[this.type] === -1) this.target.lastDamage[this.type] = +new Date();
                now - this.target.lastDamage[this.type] > 1000 && this.onAttack();
            } else {
                if (this.type === EntityType.SAND_WORM) this.info = 0;
                this.target.lastDamage[this.type] = Date.now();
            }
        }

        this.server.collision.updateState(this);
        this.updateMovement();
    }

    public updateSpeed() {
        this.speed = this.water && this.spawnBiome !== BiomeType.SEA ? this.server.config.speed_water : this.server.config.speed;
    }

    public spiderStun() {
        if (this.target) {
            this.target.action |= ActionType.WEB
            this.target.isStunned = true;
            this.target.lastStunned = Date.now();
            this.lastSpiderStun = Date.now();
        }
    }

    public onAttack() {
        if (this.type === EntityType.SAND_WORM && this.info === 0) return;
        if (this.target) {
            let damage = this.server.configSystem.entityDamage[this.type] + this.target.mobDefense;

            this.target.reason = (DeathReason as any)[(EntityType as any)[this.type]];
            this.target.client.sendBinary(this.target.healthSystem.damage(damage, ActionType.HURT));
            this.target.lastDamage[this.type] = Date.now();
        }
    }

    public updateMovement() {
        const now = Date.now();
                
        if ((this.behaviour === BehaviourType.NEUTRAL && this.info === 1) && now - this.lastAngry > 20000) this.info = 0;
        
        if (now - this.lastMove < this.nextMove) return;
        
        if (this.target instanceof Player) {
            if (this.behaviour === BehaviourType.PEACEFUL) {
                const offset = this.target.realPosition.subtract(this.realPosition);
                const moveDirection = offset.normalize().multiply(this.speed * 1000 / 2);
                
                this.lastMove = now;
                this.nextMove = Math.clamp(this.realPosition.distance(this.target.realPosition) * 7, 500, 1000);
                
                const position = this.realPosition.subtract(moveDirection);
                const angle = this.realPosition.angle(position);

                let collisionPosition = this.server.collision.updateAnimal(this, position)
                
                if (collisionPosition === position) this.position.set(collisionPosition);
                
                this.angle = ((angle) * 255) / Math.PI2 + 63.75;
            } else if (this.behaviour === BehaviourType.AGGRESSIVE || this.info == 1) {
                const offset = this.realPosition.subtract(this.target.realPosition);
                const moveDirection = offset.normalize().multiply(this.realPosition.distance(this.target.realPosition));
                
                this.lastMove = now;
                this.nextMove = Math.clamp(this.realPosition.distance(this.target.realPosition) * (1.4 / this.speed), 500, 1200);
                
                let position = this.realPosition.subtract(moveDirection);
                const angle = this.realPosition.angle(position);
                
                //this.position.set(position);
                let collisionPosition = this.server.collision.updateAnimal(this, position)
                if (collisionPosition !== position) {
                    let attempt = 10;
                    let finded = false;
                    while (attempt) {
                        attempt -= 1;
                            const offset = this.target.realPosition.subtract(this.realPosition);
                            const moveDirection = offset.normalize().multiply(this.speed * 1000 / 2);

                            this.lastMove = now;
                            this.nextMove = Math.clamp(this.realPosition.distance(this.target.realPosition) * 7, 500, 1000);

                            const position = this.realPosition.subtract(moveDirection);
                            const angle = this.realPosition.angle(position);

                            this.position.set(position);

                            this.angle = ((angle) * 255) / Math.PI2 + 63.75;
                            const offset_ = position.subtract(this.target.realPosition);
                            const moveDirection_ = offset_.normalize().multiply(position.distance(this.target.realPosition));
    
                            const position_ = position.subtract(moveDirection_);
                            const angle_ = Math.random_clamp(0, 255);

                            this.lastMove = now;
                            this.nextMove = 680;
                            collisionPosition = this.server.collision.updateAnimal(this, position_);
                            if (collisionPosition === position_) {
                                attempt = 0;
                                finded = true;
                            }

                        this.lastCollision = now;
                    }
                    
                    if (attempt <= 0 && finded) this.position.set(collisionPosition);
                } else {
                    this.position.set(collisionPosition);
                    this.angle = ((angle) * 255) / Math.PI2 + 63.75;
                }
                
            } else if (this.behaviour === BehaviourType.NEUTRAL && this.info == 0) {
                let angle = Math.random() * Math.PI2;
                angle = ((angle) * 255) / Math.PI2;
                
                const distanceToMove = Math.random_clamp(50, this.speed * 600);
                const position = Utils.getOffsetVector(this.realPosition, distanceToMove, angle);
                
                this.lastMove = now;
                this.nextMove = distanceToMove * 10;
                
                let collisionPosition = this.server.collision.updateAnimal(this, position)
                
                if (collisionPosition) this.position.set(collisionPosition);
                
                this.angle = angle - 63.75;
            }
        } else {
            let angle = Math.random() * Math.PI2;
            angle = ((angle) * 255) / Math.PI2;
            
            const distanceToMove = Math.random_clamp(50, this.speed * 600);
            const position = Utils.getOffsetVector(this.realPosition, distanceToMove, angle);
            
            this.lastMove = now;
            this.nextMove = distanceToMove * 10;

            let collisionPosition = this.server.collision.updateAnimal(this, position)
                
            if (collisionPosition === position) this.position.set(collisionPosition);
            
            this.angle = angle - 63.75;
            if (this.info == 1) this.lastAngry = now;
        }

        this.position.set(this.position.clamp(0, 0, this.server.map.width - 1, this.server.map.height - 1));

        if (this.spawnBiome !== this.biomeIn) {
            const biomes = this.server.map.biomes.filter(biome => biome.type === this.spawnBiome)
            for (const biome of biomes) {
                if ((this.type === EntityType.DRAGON || this.type === EntityType.LAVA_DRAGON) && this.target) continue;
                if (this.spawnBiome === BiomeType.WINTER && this.biomeIn === BiomeType.DRAGON) continue;
                if (this.water && this.lake) continue;
                const position = this.position.clamp(biome.position.x, biome.position.y, biome.endPosition.x - 1, biome.endPosition.y - 1);
                const angle = this.position.angle(position);
                if (this.type === EntityType.DRAGON || this.type === EntityType.LAVA_DRAGON) {
                    this.lastMove = now;
                    this.nextMove = this.position.distance(position) * 5;
                }

                let collisionPosition = this.server.collision.updateAnimal(this, position)
                
                collisionPosition && this.position.set(collisionPosition)
                    
                this.angle = ((angle) * 255) / Math.PI2 + 63.75;
            }
            this.target = null;
        }
    }

    private setupLoot() {
        switch (this.type) {
            case EntityType.WOLF:
                this.inventory.giveItem(ItemType.MEAT, 2);
                this.inventory.giveItem(ItemType.FUR_WOLF, 1);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.score = 250;
                break;
            case EntityType.SPIDER:
                this.inventory.giveItem(ItemType.CORD, 2);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.score = 150;
                break;
            case EntityType.RABBIT:
                this.inventory.giveItem(ItemType.MEAT, 2);
                this.inventory.giveItem(ItemType.FUR, 1);
                this.behaviour = BehaviourType.PEACEFUL;
                this.score = 60;
                break;
            case EntityType.BOAR:
                this.inventory.giveItem(ItemType.MEAT, 4);
                this.inventory.giveItem(ItemType.FUR_BOAR, 1);
                this.behaviour = BehaviourType.NEUTRAL;
                this.score = 400;
                break;
            case EntityType.HAWK:
                this.inventory.giveItem(ItemType.HAWK_FEATHER, 4);
                this.inventory.giveItem(ItemType.MEAT, 1);
                this.behaviour = BehaviourType.NEUTRAL;
                this.score = 300;
                break;
            case EntityType.CRAB:
                this.inventory.giveItem(ItemType.CRAB_STICK, 1);
                this.inventory.giveItem(ItemType.CRAB_LOOT, 1);
                this.behaviour = BehaviourType.NEUTRAL;
                this.score = 200;
                break;
            case EntityType.CRAB_BOSS:
                this.inventory.giveItem(ItemType.CRAB_STICK, 4);
                this.inventory.giveItem(ItemType.CRAB_LOOT, 4);
                this.behaviour = BehaviourType.NEUTRAL;
                this.score = 1200;
                break;
            case EntityType.FOX:
                this.inventory.giveItem(ItemType.MEAT, 2);
                this.inventory.giveItem(ItemType.FUR_WINTER, 1);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.WINTER;
                this.score = 250;
                break;
            case EntityType.BEAR:
                this.inventory.giveItem(ItemType.MEAT, 3);
                this.inventory.giveItem(ItemType.FUR_WINTER, 2);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.WINTER;
                this.score = 500;
                break;
            case EntityType.PENGUIN:
                this.inventory.giveItem(ItemType.PENGUIN_FEATHER, 4);
                this.inventory.giveItem(ItemType.MEAT, 1);
                this.behaviour = BehaviourType.PEACEFUL;
                this.spawnBiome = BiomeType.WINTER;
                this.score = 200;
                break;
            case EntityType.DRAGON:
                this.inventory.giveItem(ItemType.DRAGON_HEART, 1);
                this.inventory.giveItem(ItemType.MEAT, 5);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.DRAGON;
                this.score = 1500;
                break;
            case EntityType.BABY_DRAGON:
                this.inventory.giveItem(ItemType.MEAT, 4);
                this.behaviour = BehaviourType.NEUTRAL;
                this.spawnBiome = BiomeType.DRAGON;
                this.score = 600;
                break;
            case EntityType.MAMMOTH:
                this.inventory.giveItem(ItemType.FUR_MAMMOTH, 10);
                this.inventory.giveItem(ItemType.MEAT, 7);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.WINTER;
                this.score = 1500;
                break;
            case EntityType.BABY_MAMMOTH:
                this.inventory.giveItem(ItemType.FUR_MAMMOTH, 1);
                this.inventory.giveItem(ItemType.MEAT, 3);
                this.behaviour = BehaviourType.NEUTRAL;
                this.spawnBiome = BiomeType.WINTER;
                this.score = 600;
                break;
            case EntityType.FLAME:
                this.inventory.giveItem(ItemType.FLAME, 1);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.LAVA;
                this.score = 2000;
                break;
            case EntityType.LAVA_DRAGON:
                this.inventory.giveItem(ItemType.LAVA_HEART, 1);
                this.inventory.giveItem(ItemType.MEAT, 10);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.LAVA;
                this.score = 2000;
                break;
            case EntityType.BABY_LAVA:
                this.inventory.giveItem(ItemType.MEAT, 5);
                this.behaviour = BehaviourType.NEUTRAL;
                this.spawnBiome = BiomeType.LAVA;
                this.score = 1000;
                break;
            case EntityType.VULTURE:
                this.inventory.giveItem(ItemType.VULTURE_FEATHER, 1);
                this.inventory.giveItem(ItemType.MEAT, 3);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.DESERT;
                this.score = 600;
                break;
            case EntityType.SAND_WORM:
                this.inventory.giveItem(ItemType.SANDWORM_JUICE, 1);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.DESERT;
                this.score = 1000;
                break;
            case EntityType.KRAKEN:
                this.inventory.giveItem(ItemType.KRAKEN_SKIN, 1);
                this.inventory.giveItem(ItemType.FOODFISH, 5);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.SEA;
                this.score = 2000;
                break;
            case EntityType.PIRANHA:
                this.inventory.giveItem(ItemType.FOODFISH, 2);
                this.inventory.giveItem(ItemType.SCALES, 1);
                this.behaviour = BehaviourType.AGGRESSIVE;
                this.spawnBiome = BiomeType.SEA;
                this.score = 600;
                break;
            case EntityType.ALOE_VERA_MOB:
                this.inventory.giveItem(ItemType.ALOE_VERA, 1);
                this.collide = true;
                this.spawnBiome = BiomeType.DESERT;
                this.score = 100;
                break;
            case EntityType.TREASURE_CHEST:
                this.score = 150;
                this.inventory.giveItem(Utils.getTreasure(this.server.configSystem.treasureDropChance), 1);
                break;
            case EntityType.WHEAT_MOB:
                this.score = 52;
                this.inventory.giveItem(ItemType.WHEAT_SEED, 1);
                break;
        }

        this.position.set(this.server.spawnSystem.getSpawnPoint(this.spawnBiome));
        this.realPosition.set(this.position);
        
        const neutral = this.behaviour == BehaviourType.NEUTRAL || this.behaviour == BehaviourType.PEACEFUL
        this.info = neutral ? 0 : 1
        if (this.type == EntityType.SAND_WORM) this.info = 0;
    }

    public onDead(damager?: Entity) {
        this.server.mobSystem.animalCounter[this.type]--;
        if(damager instanceof Player) {
            damager.score += this.score;

            if(this.type === EntityType.TREASURE_CHEST) {
                damager.client.sendBinary(damager.inventory.addInventory(this.inventory));

                damager.ruinQuests();
            } else if([EntityType.WHEAT_MOB, EntityType.ALOE_VERA_MOB].includes(this.type)) {
                damager.client.sendBinary(damager.inventory.addInventory(this.inventory));
            } else {
                const box = new Crate(this.server, {
                    owner: this,
                    isDead: true
                });
                
                box.info = AnimalBoxes[this.type];
                box.healthSystem.health = 30;
            }

        }
    }
}