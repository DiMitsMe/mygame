import {Player} from "../entities/Player";
import {Server} from "../Server";
import {BinaryWriter} from "../modules/BinaryWriter";
import {Vector} from "../modules/Vector";
import {ActionType} from "../enums/types/ActionType";
import {Entity} from "../entities/Entity";
import {EntityType} from "../enums/types/EntityType";
import {ClientPackets} from "../enums/packets/ClientPackets";

export class EntityPacket {
    private readonly player: Player;
    private readonly server: Server;
    constructor(player: Player) {
        this.player = player;
        this.server = player.client.server;

        this.send();
    }

    public send() {
        const {realPosition, camera, client} = this.player;
        const {entities} = this.server;
        const writer = new BinaryWriter();

        writer.writeUInt16(ClientPackets.UNITS);

        for (const entity of entities) {
            this.writeEntityData(writer, entity, realPosition, camera);
        }

        const buffer = writer.toBuffer();
        if (buffer.length > 5) {
            client.sendBinary(buffer);
        }
    }

    private writeEntityData(writer: BinaryWriter, entity: Entity, playerPosition: Vector, camera: any) {
        let {realPosition, position , pid, id, angle, action, type, speed} = entity;

        let extra = entity.extra;
        let info = entity.info;

        const isInsideCamera = playerPosition.isVectorInsideRectangle(
            realPosition.subtract(new Vector(-camera.width / 2, -camera.height / 2)),
            camera.width,
            camera.height
        );

        const isInsideCameraExtended = playerPosition.isVectorInsideRectangle(
            realPosition.subtract(new Vector(-camera.width / 2 - 50, -camera.height / 2 - 50)),
            camera.width + 100,
            camera.height + 100
        );

        const ENTITY = this.player.updatePool[id];

        if(entity.type === EntityType.SPELL || (isInsideCameraExtended && (!ENTITY || (ENTITY &&
            ENTITY.position.x !== entity.position.x ||
            ENTITY.position.y !== entity.position.y ||
            ENTITY.info !== entity.info ||
            ENTITY.action !== entity.action ||
            ENTITY.angle !== entity.angle ||
            ENTITY.extra !== entity.extra
        )))) {
            writer.writeUInt8(type ? pid : id);
            writer.writeUInt8(angle);
            writer.writeUInt16((isInsideCameraExtended && !isInsideCamera) ? ActionType.DELETE : action);
            writer.writeUInt16(type);
            writer.writeUInt16(position.x);
            writer.writeUInt16(position.y);
            writer.writeUInt16(!type ? 0 : id);
            writer.writeUInt16(info);
            writer.writeUInt16(speed * 1000);
            writer.writeUInt16(extra);

            this.player.updatePool[id] = {};
            this.player.updatePool[id].position = Object.assign({}, entity.position);
            this.player.updatePool[id].angle = entity.angle;
            this.player.updatePool[id].extra = entity.extra;
            this.player.updatePool[id].action = entity.action;
            this.player.updatePool[id].info = entity.info;
        }

        if((isInsideCameraExtended && !isInsideCamera)) {
            this.player.updatePool[id] = false;
        }
    }
}
