import NanoTimer from "nanotimer";
import { Server } from "../../Server";
import {Player} from "../../entities/Player";
import {Permissions} from "../../enums/Permissions";
import {ItemType} from "../../enums/types/ItemType";
import e from "express";
import {Vector} from "../../modules/Vector";
import {EntityType} from "../../enums/types/EntityType";

interface GameEvent {
    type: string;
    repeat: number;
    commands: string[];
}

interface InventoryEvent extends GameEvent {
    item: number;
    amount: number;
}

interface LocationEvent extends GameEvent {
    x: number;
    y: number;
}
interface LocationInventoryEvent extends GameEvent, InventoryEvent, LocationEvent {}
interface TimeEvent extends GameEvent {}
interface KillEvent extends GameEvent {kill: number}
interface ScoreEvent extends GameEvent {score: number}

export class EventSystem {
    private server: Server;
    private timestamp: number = 0;
    private seconds: number = 0;
    private locationInventoryEvents: LocationInventoryEvent[] = [];
    private inventoryEvents: InventoryEvent[] = [];
    private locationEvents: LocationEvent[] = [];
    private killEvents: KillEvent[] = [];
    private timeEvents: TimeEvent[] = [];
    private scoreEvents: ScoreEvent[] = [];
    private events: any;
    constructor(server: Server) {
        this.server = server;
        this.events = server.config.important.events;
        this.initEvents();
    }

    private initEvents(){
        if(this.events.length > 0)
        for (let event of this.events) {
            if(event.x && event.y) {
                event.x = event.x * 100 + 50;
                event.y = event.y * 100 + 50;
            }
            if(event.item) {
                event.item = ItemType[event.item.toUpperCase()];
            }
            switch(event.type) {
                case "inventory":
                    this.inventoryEvents.push(event);
                    break;
                case "location":
                    this.locationEvents.push(event);
                    break;
                case "score":
                    this.scoreEvents.push(event);
                    break;
                case "kill":
                    this.killEvents.push(event);
                    break;
                case "locationInventory":
                    this.locationInventoryEvents.push(event);
                    break;
                case "time":
                    this.timeEvents.push(event);
                    break;
                default:
                    break;
            }
        }
    }

    public onKill(player: Player) {
        if(!this.killEvents.length) return;
        for (const event of this.killEvents) {
            if(event.kill === player.kills) {
                this.commandsArray(player, event.commands);
            }
        }
    }

    public tick() {
        if(Date.now() - this.timestamp >= 1000) {
            this.seconds++;

            if(this.locationInventoryEvents.length) {
                for (const event of this.locationInventoryEvents) {
                    if(!event.commands.length || this.seconds % event.repeat) continue;
                    const vectorxy = new Vector(event.x, event.y);
                    const players = this.server.map.getPlayersInDistance(vectorxy, 100) as Player[];
                    for (const player of players) {
                        console.log(event)
                        if(!player.inventory.containsItem(event.item, event.amount)) continue;
                        this.commandsArray(player, event.commands);
                    }
                }
            }

            if(this.locationEvents.length) {
                for (const event of this.locationEvents) {
                    if(!event.commands.length || this.seconds % event.repeat) continue;
                    const vectorxy = new Vector(event.x, event.y);
                    const players = this.server.map.getPlayersInDistance(vectorxy, 100) as Player[];
                    for (const player of players) {
                        // console.log(event)
                        this.commandsArray(player, event.commands);
                    }
                }
            }

            if(this.timeEvents) {
                for (const event of this.timeEvents) {
                    if(!event.commands.length || this.seconds % event.repeat) continue;
                }
            }

            if(this.inventoryEvents.length) {
                for (const event of this.inventoryEvents) {
                    if(!event.commands.length || this.seconds % event.repeat) continue;
                    for (const player of this.server.players) {
                        if(!player.inventory.containsItem(event.item, event.amount)) continue;
                        this.commandsArray(player, event.commands);
                    }
                }
            }

            this.timestamp = Date.now();
        }
    }

    private commandsArray(player: Player, commands: string[]) {
        for (const command of commands) {
            this.server.commandSystem.handleCommand(player, command, true);
        }
    }

    public onReceiveScore(player: Player) {
        if(!this.scoreEvents.length) return;
        for (const event of this.scoreEvents) {
            if(!player.scoreAchievements.includes(event.score) && player.score >= event.score && event.commands) {
                this.commandsArray(player, event.commands);
                player.scoreAchievements.push(event.score);
            }
        }
    }
}