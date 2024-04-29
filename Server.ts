import {Player} from "./entities/Player";
import {Entity} from "./entities/Entity";
import {IdPool} from "./modules/IdPool";
import {WebSocketServer} from "./network/WebSocketServer";
import {Ticker} from "./world/Ticker";
import {Map} from "./world/Map";
import {Leaderboard} from "./leaderboard/Leaderboard";
import {CollisionSystem} from "./systems/server/CollisionSystem";
import {CraftSystem} from "./systems/server/CraftSystem";
import {SpawnSystem} from "./systems/server/SpawnSystem";
import {TimeSystem} from "./systems/server/TimeSystem";
import {KitSystem} from "./systems/server/KitSystem";
import {EventSystem} from "./systems/server/EventSystem";
import {CommandSystem} from "./systems/server/CommandSystem";
import {BuildingSystem} from "./systems/server/BuildingSystem";
import {CombatSystem} from "./systems/server/CombatSystem";
import {ConfigSystem} from "./systems/server/ConfigSystem";
import {InteractionSystem} from "./systems/individual/InteractionSystem";
import {MobSystem} from "./systems/server/MobSystem";
import Cfg from "./JSON/Cfg.json";
import ServerConfig from "./JSON/ServerConfig.json";
import {GameMode} from "./enums/GameMode";
import {StorageSystem} from "./systems/server/StorageSystem";
import {QuestSystem} from "./systems/server/QuestSystem";
import {MarketSystem} from "./systems/server/MarketSystem";
import {TokenSystem} from "./systems/server/TokenSystem";
import {TotemSystem} from "./systems/server/TotemSystem";
import {Logger} from "./modules/Logger";


Math.clamp = (variable: number, min: number, max: number) => {
    return Math.max(min, Math.min(variable, max));
}

Math.random_clamp = (min: number, max: number) => {
    return Math.floor(min + Math.random() * (max + 1 - min));
}

Math.PI2 = Math.PI * 2;

export class Server {
    public players: Player[];
    public entities: Entity[];
    public playerPool: IdPool;
    public entityPool: IdPool;
    public wss: WebSocketServer;
    public config: any;
    public settings: any;

    public url: string;
    public mode: number;
    public port: number;

    public map: Map;
    public logger: Logger;
    public leaderboard: Leaderboard;

    public collision: CollisionSystem;
    public craftSystem: CraftSystem;
    public spawnSystem: SpawnSystem;
    public timeSystem: TimeSystem;
    public kitSystem: KitSystem;
    public eventSystem: EventSystem;
    public storageSystem: StorageSystem;
    public commandSystem: CommandSystem;
    public combatSystem: CombatSystem;
    public configSystem: ConfigSystem;
    public mobSystem: MobSystem;
    public questSystem: QuestSystem;
    public marketSystem: MarketSystem;
    public tokenSystem: TokenSystem;
    public totemSystem: TotemSystem;
    public buildingSystem: BuildingSystem;
    public interactionSystem: InteractionSystem;

    private ticker: Ticker;

    constructor(mode: number) {
        this.playerPool = new IdPool(1, 100);
        this.entityPool = new IdPool(101, 65500);
        this.config = Cfg as any;
        this.settings = ServerConfig as any;
        this.configSystem = new ConfigSystem(this.config);

        this.entities = [];
        this.players = [];

        this.url = `http${this.settings.production ? "s" : ""}://${this.settings.url}/`;
        this.mode = mode;
        this.port = this.settings.production ? 3000 : 3000;

        this.wss = new WebSocketServer(this);
        this.map = new Map(this);
        this.logger = new Logger("../logs", {
            console: true,
            file: true
        });

        this.leaderboard = new Leaderboard(this);
        this.collision = new CollisionSystem(this);
        this.timeSystem = new TimeSystem(this);
        this.craftSystem = new CraftSystem(this.config);
        this.kitSystem = new KitSystem(this.config);
        this.eventSystem = new EventSystem(this);
        this.combatSystem = new CombatSystem(this);
        this.interactionSystem = new InteractionSystem(this);
        this.mobSystem = new MobSystem(this);
        this.storageSystem = new StorageSystem(this);
        this.commandSystem = new CommandSystem(this);
        this.questSystem = new QuestSystem();
        this.marketSystem = new MarketSystem();
        this.tokenSystem = new TokenSystem(this);
        this.totemSystem = new TotemSystem(this);
        this.spawnSystem = new SpawnSystem(this.map);
        this.buildingSystem = new BuildingSystem(this);

        this.ticker = new Ticker(this);
    }

    public broadcast(message: any, isBinary: boolean = false, selfSocket:UnderlyingSinkWriteCallback.WebSocket<any> | undefined = undefined) {
        if (!message) return;
        const clients = Array.from(this.wss.clients.values());
        for (const client of clients) {
            if (selfSocket && client.socket === selfSocket) continue;
            client.socket.send(message, isBinary);
        }
    }

    public findPlayerByToken(token: string) {
        return this.players.find(player => player.data.token === token);
    }s

    public findPlayerById(id: number) {
        return this.players.find(player => player.id === id);
    }

    public findEntityById(id: number) {
        return this.entities.find(entity => entity.id === id);
    }

    public async updatePlayerCount() {
        const response = await fetch(this.url + "updatePlayerCount");
    }

    public async updateAccountData(player: Player) {
        await fetch(this.url + "updateAccountData", {
            method: "PUT",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({
                l: player.account.name,
                p: this.settings.master_password,
                s: player.score,
                k: player.kills,
                t: player.time
            })
        });
    }
}

new Server(GameMode.normal);