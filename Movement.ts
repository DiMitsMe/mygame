import {Entity} from "../../entities/Entity";
import {Vector} from "../../modules/Vector";
import {ActionType} from "../../enums/types/ActionType";
import {Player} from "../../entities/Player";
import {Server} from "../../Server";
import { ItemType } from "../../enums/types/ItemType";
export class Movement {
    public entity: Entity;
    public server: Server;
    public decayFactor: number = 0;
    constructor(entity: Entity) {
        this.entity = entity;
        this.server = entity.server;
        this.decayFactor = this.server.config.decayPlayer
    }

    public lerp(start, end, t) {
        return (1 - t) * start + t * end;
    }

    public async tick() {
        if(!this.entity.speed) return this.entity.realPosition.set(this.entity.position);
    
        let angle_ = this.entity.realPosition.get_std_angle(this.entity.position) + Math.PI;
        const delta = this.entity.speed * 1000 * (1 / this.server.settings.tps);
        const vector = this.entity.position.build(delta, angle_);
    
        if(angle_) {
            if (vector.magnitude() < this.entity.realPosition.subtract(this.entity.position).magnitude()) this.entity.realPosition = this.entity.realPosition.add(vector);
            else {
                this.entity.realPosition.x = this.entity.position.x;
                this.entity.realPosition.y = this.entity.position.y;
            }
        }
    
        if (this.entity instanceof Player) {
            if(this.entity.helmet.id == 0) this.decayFactor = this.server.config.decayPlayer
            if(this.entity.helmet.id == ItemType['PILOT_HELMET']) this.decayFactor = this.server.config.decayPlayer_pilot;

            if(this.entity.speed <= 0) {
                return this.entity.speed = 0.01;
            }

            if(this.entity.vehicle.isFlying() && this.entity.direction != null) {
                if(this.entity.speed > 0.18) {
                    this.entity.isCollideFlying = true;
                    this.entity.isCollide = true;
                }
                
                if(this.entity.speed < 0.18) {
                    this.entity.isCollideFlying = false;
                    this.entity.isCollide = false;
                }
            }
    
            if (this.entity.vehicle.isVehicle() && this.entity.direction == null) {
                if(this.entity.speed > 0.18) {
                    this.entity.isCollideFlying = true;
                    this.entity.isCollide = true;
                }
                
                if(this.entity.speed < 0.18) {
                    this.entity.isCollideFlying = false;
                    this.entity.isCollide = false;
                }

                console.log(this.entity.speed)

                let angle = Math.atan2(
                    this.entity.prevDirection & 4 ? 1 : this.entity.prevDirection & 8 ? -1 : 0,
                    this.entity.prevDirection & 2 ? 1 : this.entity.prevDirection & 1 ? -1 : 0
                );
                this.entity.velocity.x = 50 * Math.cos(angle);
                this.entity.velocity.y = 50 * Math.sin(angle);
                this.entity.position = this.entity.realPosition.add(this.entity.velocity);
                const targetSpeed = 0.01;
                this.entity.speed = this.lerp(this.entity.speed, targetSpeed, this.decayFactor);
                await this.server.collision.update(this.entity);
                this.entity.updateSpeed();            
            }

        }
    
        if (!this.entity.direction && (this.entity instanceof Player)) {
            this.entity.velocity = Vector.zero();
            if (this.entity.action & ActionType.WALK) {
                this.entity.action &= ~ActionType.WALK;
                this.entity.action |= ActionType.IDLE;
            }
            return;
        }
    
        if (this.entity.action & ActionType.IDLE) {
            this.entity.action &= ~ActionType.IDLE;
            this.entity.action |= ActionType.WALK;
        }
    
        let angle = Math.atan2(
            this.entity.direction & 4 ? 1 : this.entity.direction & 8 ? -1 : 0,
            this.entity.direction & 2 ? 1 : this.entity.direction & 1 ? -1 : 0
        );
    
        if(this.entity instanceof Player) {
            this.entity.velocity.x = 50 * Math.cos(angle);
            this.entity.velocity.y = 50 * Math.sin(angle);
        }
    
        this.entity.updateSpeed();
        if (this.entity instanceof Player && !this.entity.isStunned) {
            this.entity.position = this.entity.realPosition.add(this.entity.velocity);
    
            this.server.collision.update(this.entity);
        }
    }
    
}