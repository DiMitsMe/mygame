import * as uWS from "../uWebSockets.js";
import {Client} from "./Client";
import {Server} from "../Server";
import {Logger} from "../modules/Logger";
import {WebSocket} from "../uWebSockets.js";

export class WebSocketServer {
    private readonly server: Server;
    private logger: Logger = new Logger("./logs", {console: true, file: true});
    public clients: Map<WebSocket<any>, Client> = new Map();
    public app: uWS.TemplatedApp = uWS.SSLApp({

        /* There are more SSL options, cut for brevity */
        key_file_name: '/etc/letsencrypt/live/restarver.io/privkey.pem',
        cert_file_name: '/etc/letsencrypt/live/restarver.io/fullchain.pem',
        
      })
    // public app: uWS.TemplatedApp = uWS.App();

    constructor(server: Server) {
        this.server = server;

        this.setupWebSocket();
        this.startListening();
    }

    private setupWebSocket() {
        this.app.ws("/", {
            idleTimeout: 0,
            maxBackpressure: 1024,
            maxPayloadLength: 5000,
            compression: uWS.DEDICATED_COMPRESSOR_3KB,
            open: this.handleWebSocketOpen.bind(this),
            message: this.handleWebSocketMessage.bind(this),
            close: this.handleWebSocketClose.bind(this)
        });
    }

    private handleWebSocketOpen(ws: uWS.WebSocket<any>) {
        const client = new Client(ws, this.server);
        this.logger.info("Opened");
        this.clients.set(ws, client);
    }

    private handleWebSocketMessage(ws: uWS.WebSocket<any>, message: ArrayBuffer, isBinary: boolean) {
        const client = this.clients.get(ws);
        if (client) client.onMessage(message, false);
    }

    private handleWebSocketClose(ws: uWS.WebSocket<any>) {
        this.logger.info("close");
        const client = this.clients.get(ws) as Client;
        client.onClose();
        this.clients.delete(ws);
    }

    private startListening() {
        this.app.listen(3000, () => {
            this.logger.info("WebSocket server is listening on port " + 3000);
        });
    }
}
