import {getDefaultCamera} from "../default/defaultValues";
import {Client} from "../network/Client";
import {ClientStringPackets} from "../enums/packets/ClientStringPackets";
import {Player} from "../entities/Player";
import {Server} from "../Server";
import {ClientPackets} from "../enums/packets/ClientPackets";
import {Utils} from "../modules/Utils";
import {ItemType} from "../enums/types/ItemType";
import {GameMode} from "../enums/GameMode";
import { Camera } from "../default/defaultValues";
const MAX_VALUES = {
    SKIN: 175,
    ACCESSORY: 95,
    CRATE: 72,
    BAG: 70,
    BOOK: 45
};

export class Handshake {
    private readonly request: any;
    private readonly client: Client;
    private readonly config: any;

    private nickname: any;
    private camera: Camera = getDefaultCamera();
    private version: number;
    public token: string | number;
    public token_id: string | number;
    private reconnect: 0 | 1;
    private readonly skin: number;
    private readonly accessory: number;
    private readonly bag: number;
    private readonly server: Server;
    private readonly book: number;
    private readonly crate: number;
    private readonly dead: number;
    private readonly login: string | 0;
    private readonly password: string | 0;
    constructor(request: any, client: Client) {
        this.server = client.server;
        this.config = client.server.config;
        this.request = request;
        this.client = client;

        this.nickname = request[0];
        this.camera.width = request[2];
        this.camera.height = request[3];
        this.version = request[4];
        this.token = request[5];
        this.token_id = request[6];
        this.reconnect = request[7];
        this.skin = request[8];
        this.accessory = request[9];
        this.bag = request[10];
        this.book = request[11];
        this.crate = request[12];
        this.dead = request[13];
        this.login = request[14];
        this.password = request[15];
    }

    public testValid(): boolean {
        const typesToCheck = [
            {type: "string", indices: [0, 4, 5]},
            {type: "number", indices: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12]}
        ];

        for (const {type, indices} of typesToCheck) {
            for (const index of indices) {
                const requestValue = this.request[index];
                const requestType = typeof requestValue;

                if (requestType !== type) return false;
            }
        }

        return true;
    }

    public async getAccount(login: string, password: string) {
        const response = await fetch(this.server.url + "login", {
            body: JSON.stringify({login, password}),
            headers: {
                "Content-type": "application/json"
            },
            method: "POST"
        });

        try {
            return await response.json();
        } catch {}

        return false;
    }

    public setupPlayer(player: Player) {
        // if (!this.testValid()) return;

        player.id = this.server.playerPool.createId();
        player.data.nickname = this.nickname.slice(0, 16) || `unnamed#${Math.floor(Math.random() * 1000)}`;
        player.data.token = this.token as string;
        player.data.token_id = this.token_id as string;
        player.camera.width = Math.max(getDefaultCamera().width, Math.max(3840, this.camera.width));
        player.camera.height = Math.max(getDefaultCamera().height, Math.max(2160, this.camera.height));
        player.cosmetics.skin = Math.max(0, Math.min(MAX_VALUES.SKIN, this.skin));
        player.cosmetics.accessory = Math.max(0, Math.min(MAX_VALUES.ACCESSORY, this.accessory));
        player.cosmetics.bag = Math.max(0, Math.min(MAX_VALUES.BAG, this.bag));
        player.cosmetics.book = Math.max(0, Math.min(MAX_VALUES.BOOK, this.book));
        player.cosmetics.crate = Math.max(0, Math.min(MAX_VALUES.CRATE, this.crate));
        player.cosmetics.dead = Math.max(0, Math.min(MAX_VALUES.CRATE, this.dead));

    }

    public restoreResponse(player: Player) {
        const players = this.server.players.map(({id, data, cosmetics, score}) => {
            return {
                i: id,
                n: data.nickname, 
                s: cosmetics.skin, 
                a: cosmetics.accessory, 
                c: cosmetics.crate, 
                b: cosmetics.book, 
                d: cosmetics.dead, 
                g: cosmetics.bag,
                l: id
            }
        });
        
        //bilo
        this.client.sendJSON([
            ClientStringPackets.HANDSHAKE,
            this.server.mode,
            player.time,
            player.position.x,
            players,
            this.server.timeSystem.time,
            0, // TODO: GHOST
            this.config.important.max_units,
            player.totem?.data ? player.totem.data : [], // TODO: TEAM
            player.id,
            player.position.y,
            100, // TODO: max players
            0,
            player.tokenScore.score, // TODO: Player score for kits
            player.inventory.serialize(),
            this.server.timeSystem.getGameTime(),
            Date.now() - player.createdAt, // TODO: Quests born
            player.quests, // TODO: Quests
            0,
            0,
            this.config.important.map_width,
            this.config.important.map_height,
            this.config.important.islands,
            this.config.important.custom_map.length ? this.config.important.custom_map : 0,
            "#2AF598 Zombie Mini Arena 3.1: \n#2AF598 remastered by lemonqee \n#000000- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \n#ffbd00 Bounty: $best-kill-name, they have $best-kill-kill kills \n#ffbd00 Longest surviving player: $best-day-name, \n#ffbd00 they survived $best-day-day days \n#000000- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \n#FF2D00 There have been frequent DDoS attacks recently. \n#FF2D00 Take a screenshot of your entire screen. \n#75FF00 Join our community for access to \n#75FF00 many helpful features that explain ZMA. \n#001EFF Gearlog | Changelog | FAQ | Feedback \n#001EFF We welcome you to join us for even more fun! \n#000000- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \n#FC03E8 DISCORD LINK: restarver.io/discord \n#FC03E8 My discord: lemonqee ",    
            this.server.craftSystem.newRecipes,
            0,  // TODO: Sandstorm
            0   // TODO: Blizzard
        ]);

        if(player.inventory.size > 12) {
            player.client.sendU8([ClientPackets.GET_BAG]);
        }

        if(this.config.disable_clock)
            this.client.sendU8([ClientPackets.HIDE_CLOCK]);
        if(this.config.disable_kit)
            this.client.sendU8([ClientPackets.HIDE_SHOP_KIT]);
        if(this.config.disable_quest)
            this.client.sendU8([ClientPackets.HIDE_QUEST]);
        if(this.config.disable_shop)
            this.client.sendU8([ClientPackets.HIDE_MARKET]);
    }

    public response(player: Player) {
        const players = this.server.players.map(({id, data, cosmetics, score}) => {
            return {
                i: id,
                n: data.nickname, 
                s: cosmetics.skin, 
                a: cosmetics.accessory, 
                c: cosmetics.crate, 
                b: cosmetics.book, 
                d: cosmetics.dead, 
                g: cosmetics.bag,
                l: id
            }
        });

        const token_id = this.token_id ? this.token_id : Utils.generateRandomString(12);
        const tokenData = this.server.tokenSystem.getToken(player.data.token_id);

        this.client.sendJSON([
            ClientStringPackets.HANDSHAKE,
            this.server.mode,
            player.time,
            player.position.x,
            players,
            this.server.timeSystem.time,
            0, // TODO: GHOST
            this.config.important.max_units,
            player.totem ? player.totem.data : [], // TODO: TEAM
            player.id,
            player.position.y,
            100, // TODO: max players
            token_id,
            tokenData ? tokenData.score : 0, // TODO: Player score for kits
            [],
            this.server.timeSystem.getGameTime(),
            0, // TODO: Quests born
            [], // TODO: Quests
            0,
            0,//this.server.mapGenerator.seed,
            this.config.important.map_width,
            this.config.important.map_height,
            this.config.important.islands,
            this.config.important.custom_map.length ? this.config.important.custom_map : 0,
            "#2AF598 Zombie Mini Arena 3.1: \n#2AF598 remastered by lemonqee \n#000000- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \n#ffbd00 Bounty: $best-kill-name, they have $best-kill-kill kills \n#ffbd00 Longest surviving player: $best-day-name, \n#ffbd00 they survived $best-day-day days \n#000000- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \n#FF2D00 There have been frequent DDoS attacks recently. \n#FF2D00 Take a screenshot of your entire screen. \n#75FF00 Join our community for access to \n#75FF00 many helpful features that explain ZMA. \n#001EFF Gearlog | Changelog | FAQ | Feedback \n#001EFF We welcome you to join us for even more fun! \n#000000- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \n#FC03E8 DISCORD LINK: restarver.io/discord \n#FC03E8 My discord: lemonqee ",    
            this.server.craftSystem.newRecipes,
            0,  // TODO: Sandstorm
            0   // TODO: Blizzard
        ]);

        if(player.inventory.size > 10) {
            player.client.sendU8([ClientPackets.GET_BAG]);
        }

        if(this.config.disable_clock)
            this.client.sendU8([ClientPackets.HIDE_CLOCK]);
        if(this.config.disable_kit)
            this.client.sendU8([ClientPackets.HIDE_SHOP_KIT]);
        if(this.config.disable_quest)
            this.client.sendU8([ClientPackets.HIDE_QUEST]);
        if(this.config.disable_shop)
            this.client.sendU8([ClientPackets.HIDE_MARKET]);
            this.server.kitSystem.gainKit(player);

    }

    public async broadcastCosmetics(player: Player) {
        if(this.login && this.password) {
            const account = await this.getAccount(this.login, this.password);

            if(account) {
                player.account = account;
                player.data.level = 1 + Math.floor(Math.sqrt(account.seasons[0].score / 20000));

                if(account.kit) {
                    player.client.sendBinary(player.inventory.giveItem(ItemType.BOOK, 1));
                    player.client.sendBinary(player.inventory.giveItem(ItemType.BAG, 1));
                }

                this.server.broadcast(Utils.serializeAccountToBuffer(player), true, player.client.socket);
            }
        } else {
            this.server.broadcast(Utils.serializeCosmeticsToJSON(player), false, player.client.socket);

        }

        player.updateInfo();
    }
}
