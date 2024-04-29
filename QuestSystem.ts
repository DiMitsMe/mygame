import {Player} from "../../entities/Player";
import {QuestReward, QuestScore, QuestState, QuestType} from "../../enums/QuestType";
import {ClientPackets} from "../../enums/packets/ClientPackets";

export class QuestSystem {

    public gainQuest(player: Player, type: QuestType) {
        console.log(player.quests[type]);
        if(!Number.isInteger(type) || player.quests[type] !== QuestState.SUCCEED) return;
        if(player.inventory.items.size === player.inventory.size) return player.client.sendU8([ClientPackets.INV_FULL]);

        if(QuestReward[type] === -1)
            player.inventory.size += 1;
        else player.client.sendBinary(player.inventory.giveItem(QuestReward[type], 1));

        player.quests[type] = QuestState.CLAIMED;
        player.score += QuestScore[type];
        player.client.sendU8([ClientPackets.CLAIMED, type]);
    }

}