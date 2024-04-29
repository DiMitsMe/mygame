import {WebSocket} from "uWebSockets.js";
import msgpack from "msgpack-lite";
import {Player} from "../entities/Player";
import {Server} from "../Server";
import {Handshake} from "../packets/Handshake";
import NanoTimer from "nanotimer";
import {Crate} from "../entities/Crate";
import {ServerPackets} from "../enums/packets/ServerPackets";
import {ClientPackets} from "../enums/packets/ClientPackets";
import {ClientStringPackets} from "../enums/packets/ClientStringPackets";
import {Logger} from "../modules/Logger";
import * as CryptoJS from 'crypto-js';
import { createClient } from 'redis';

const client = createClient();
client.on('error', (err: any) => console.log('Redis Client Error', err));
client.connect()
const logger = new Logger("./logs", {
    console: true,
    file: false
})
export class Client {
    public socket: WebSocket<any>;
    public packetsQty: number[] = new Array(36).fill(0);

    public isActive: boolean = true;
    public server: Server;
    public player!: Player;

    constructor(socket: WebSocket<any>, server: Server) {
        this.server = server;
        this.socket = socket;

        new NanoTimer().setInterval(() => {
            this.packetsQty.fill(0);
        },[], "1s");
    }

    public async onMessage(buffer: any, isBinary: boolean) {
        // if (!isBinary) {
        //     this.socket.close();
        //     return;
        // }

        try {
            const buf = Buffer.from(buffer).toString();
            const ready = JSON.parse(buf);
            const token = ready[0];
            const message = ready[1];
            const key = await client.get(token);
            const decryptedData = await CryptoJS.AES.decrypt(message.toString(), key.toString());
            const decryptedText = await CryptoJS.enc.Utf8.stringify(decryptedData);
            const PACKET_DATA = JSON.parse(decryptedText);
            // const PACKET_TYPE = PACKET_DATA[0];
            // const PACKET = PACKET_DATA[0];
            // client.del(token);

            // console.log(key)

            const [ PACKET_TYPE, ...PACKET ] = PACKET_DATA;

            if (!this.player && typeof PACKET_TYPE !== "string") {
                this.socket.close();
                return;
            } else if (typeof PACKET_TYPE === "string") {
                // if (PACKET_DATA.length !== 14) {
                //     this.socket.close();
                //     return;
                // }

                logger.info([PACKET_TYPE, ...PACKET_DATA]);
                if(this.server.players.length >= 99) {
                    return this.sendBinary(new Uint8Array([ClientPackets.FULL]))
                }
                const handshake = new Handshake([PACKET_TYPE, ...PACKET_DATA], this);
                const player = this.server.findPlayerByToken(handshake.token as any);
                if (player) {
                    player.client.sendU8([ClientPackets.STEAL_TOKEN]);
                    if(player.client.isActive) player.client.socket.close();

                    player.client = this;
                    player.updatePool = new Array(1000).fill(0);
                    this.player = player;

                

                    handshake.restoreResponse(player);
                } else {
                    const tokenScore = this.server.tokenSystem.getToken(handshake.token as any) || this.server.tokenSystem.createToken(handshake.token as any);
                    if (tokenScore) this.server.tokenSystem.joinToken(tokenScore, handshake.token_id as any);

                    this.player = new Player(this, tokenScore);
                

                    handshake.setupPlayer(this.player);
                    // client.del(token);

                    this.server.players.push(this.player);
                    this.server.entities.push(this.player);

                    handshake.response(this.player);
                }

                handshake.broadcastCosmetics(this.player);

            }

            this.receivePacket(PACKET_TYPE, PACKET, PACKET_DATA);
        } catch (error) {
            console.error('Ошибка расшифровки:', error.message);
            return 'Decryption failed: ' + error.message;
        }
    }

    public async receivePacket(PACKET_TYPE: number, PACKET: any, PACKET_DATA: any) {
        this.packetsQty[PACKET_TYPE]++;

        // if (!Number.isInteger(PACKET_TYPE) && PACKET_TYPE > 40 || PACKET_TYPE < 0) return;
        // if (this.packetsQty[0] > 5) return this.socket.close();
        // if (this.packetsQty[3] > 10) return this.socket.close();
        // if (this.packetsQty[PACKET_TYPE] > 30) return this.socket.close();

        if(this.player.isCrafting && [
                ServerPackets.ATTACK, ServerPackets.INTERACTION,
                ServerPackets.CRAFT, ServerPackets.RECYCLE_START,
                ServerPackets.DROP_ONE_ITEM, ServerPackets.DROP_ITEM,
                ServerPackets.GIVE_ITEM, ServerPackets.TAKE_ITEM,
                ServerPackets.LOCK_CHEST, ServerPackets.BUILD
        ].includes(PACKET_TYPE)) return;
        switch (PACKET_TYPE) {
            case ServerPackets.CHAT:
                this.server.broadcast(JSON.stringify([ClientStringPackets.CHAT, this.player.id, PACKET]), false, this.socket);
                break;
            case ServerPackets.MOVEMENT:
                if(PACKET[0] == 0) {
                    this.player.direction = null;
                } else {
                    this.player.prevDirection = PACKET;
                    this.player.direction = PACKET;
                }
                break;
            case ServerPackets.ANGLE:
                this.player.angle = Number(PACKET) % 255;
                break;
            case ServerPackets.ATTACK:
                this.player.attack = true;
                this.player.angle = Number(PACKET) % 255;
                this.server.combatSystem.handleAttack(this.player);
                break;
            case ServerPackets.INTERACTION: // 5
                this.server.interactionSystem.request(this.player, PACKET);
                break;
            case ServerPackets.DROP_ONE_ITEM: // 6
            const droptime = Date.now();
            if (droptime - this.player.lastRequestTime < 300) {
                return;
            }
            this.player.lastRequestTime = droptime;
            if(this.player.isCollideFlying) {
                if(PACKET[0] == 221 || PACKET[0] == 222 || PACKET[0] == 223 || PACKET[0] == 224) return
            }
                if (this.player.inventory.items.has(PACKET[0]))
                    new Crate(this.server, {
                        owner: this.player,
                        item: PACKET[0],
                        count: this.player.inventory.items.get(PACKET[0])
                    });
                this.sendBinary(this.player.inventory.deleteItem(PACKET[0]));
                break;
            case ServerPackets.CRAFT: // 7
                const br = this.server.craftSystem.handleCraft(this.player, PACKET, PACKET[1]);
                break;
            case ServerPackets.GIVE_ITEM: // 8
                const currentTime = Date.now();
                if (currentTime - this.player.lastRequestTime < 300) {
                    return;
                }
                this.player.lastRequestTime = currentTime;
                this.server.storageSystem.giveChestItem(this.player, PACKET_DATA);
                break;
            case ServerPackets.LOCK_CHEST: // 9
                this.server.storageSystem.lockChest(this.player);
                break;
            case ServerPackets.UNLOCK_CHEST: // 10
                this.server.storageSystem.unlockChest(this.player);
                break;
            case ServerPackets.TAKE_ITEM: // 11
                this.server.storageSystem.takeChestItem(this.player);
                break;
            case ServerPackets.RECYCLE_START:// 12
                this.server.craftSystem.handleRecycle(this.player, PACKET);
                break;
            case ServerPackets.BUILD:// 13
                this.server.buildingSystem.request(this.player, PACKET_DATA);
                break;
            case ServerPackets.STOP_ATTACK: // 14
                this.player.attack = false;
                break;
            case ServerPackets.CHOOSE_KIT: // 15
                this.server.kitSystem.buy(this.player, PACKET);
                break;
            case ServerPackets.CLAIM_QUEST_REWARD: // 16
                this.server.questSystem.gainQuest(this.player, PACKET);
                break;
            case ServerPackets.GIVE_WOOD_OVEN: // 17
                this.server.storageSystem.giveWoodOven(this.player, PACKET);
                break;
            case ServerPackets.CANCEL_CRAFT: // 18
                this.server.craftSystem.stopCraft(this.player);
                break;
            case ServerPackets.JOIN_TEAM: // 19
                this.server.totemSystem.joinTeam(this.player);
                break;
            case ServerPackets.LEAVE_TEAM: // 20
                this.server.totemSystem.leaveTeam(this.player);
                break;
            case ServerPackets.KICK_TEAM: // 21
                this.server.totemSystem.kickTeam(this.player, PACKET);
                break;
            case ServerPackets.LOCK_TEAM: // 22
                this.server.totemSystem.lockTeam(this.player);
                break;
            case ServerPackets.MARKET: // 23
                this.server.marketSystem.buy(this.player, PACKET_DATA);
                break;
            case ServerPackets.CONSOLE: // 36
                this.server.commandSystem.handleCommand(this.player, PACKET[0]);
                break;
            case ServerPackets.GIVE_WELL: // 25
                this.server.storageSystem.giveWell(this.player);
                break;
            case ServerPackets.TAKE_BREAD_OVEN: // 26
                this.server.storageSystem.takeBread(this.player);
                break;
            case ServerPackets.GIVE_FLOUR_OVEN: // 27
                this.server.storageSystem.giveFlourOven(this.player, PACKET);
                break;
            case ServerPackets.DROP_ITEM: // 28
                const droptime2 = Date.now();
                if (droptime2 - this.player.lastRequestTime < 300) {
                    return;
                }
                this.player.lastRequestTime = droptime2;
                if(this.player.isCollideFlying) {
                    if(PACKET[0] == 221 || PACKET[0] == 222 || PACKET[0] == 223 || PACKET[0] == 224) return
                }
                if (this.player.inventory.items.has(PACKET[0]))
                    new Crate(this.server, {
                        owner: this.player,
                        item: PACKET,
                        count: 1
                    });
                this.sendBinary(this.player.inventory.removeItem(PACKET[0], 1));
                break;
            case ServerPackets.GIVE_FURNACE: // 29
                this.server.storageSystem.giveFurnace(this.player, PACKET);
                break;
            case ServerPackets.TAKE_FLOUR: // 30
                this.server.storageSystem.takeFlour(this.player);
                break;
            case ServerPackets.GIVE_WHEAT: // 31
                this.server.storageSystem.giveWheat(this.player, PACKET);
                break;
            case ServerPackets.TAKE_EXTRACTOR: // 32
                this.server.storageSystem.takeResourceExtractor(this.player);
                break;
            case ServerPackets.GIVE_WOOD_EXTRACTOR: // 33
                this.server.storageSystem.giveWoodExtractor(this.player, PACKET);
                break;
        }
    }

    public onClose() {
        this.isActive = false;
    }

    public sendJSON(message: any) {
        if (this.isActive && message) this.socket.send(JSON.stringify(message));
    }

    public sendU8(message: any){
        if (this.isActive && message) this.socket.send(new Uint8Array(message), true);
    }

    public sendU16(message: any){
        if (this.isActive && message) this.socket.send(new Uint16Array(message), true);
    }

    public sendU32(message: any){
        if (this.isActive && message) this.socket.send(new Uint32Array(message), true);
    }

    public sendBinary(message: Uint8Array | Uint16Array | Uint32Array | undefined) {
        if (this.isActive && message) this.socket.send(message, true);
    }
}
