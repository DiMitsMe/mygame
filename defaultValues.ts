export class Camera {
    public width: any;
    public height: any;
        constructor(width: any, height: any) {
            this.width = 1920;
            this.height = 1080;
        }
}
class PlayerCosmetics{};
class PlayerStats{};
class PlayerData{}

export function getDefaultCamera(): Camera {
    return {
        width: 1920,
        height: 1080
    };
}

export function getDefaultPlayerStats(): PlayerStats {
    return {
        kills: 0,
        score: 0,
        time: 0
    };
}

export function getDefaultPlayerCosmetics(): PlayerCosmetics {
    return {
        skin: 0,
        accessory: 0,
        book: 0,
        bag: 0,
        crate: 1,
        dead: 0
    };
}

export function getDefaultPlayerData(): PlayerData {
    return {
        nickname: "unnamed",
        token: "",
        token_id: "",
        level: 0
    };
}
