declare global {
    interface Memory {
        username: string;
    }
}

export default class init {
    userName: string;

    constructor(roomName:string) {
        this.userName = this.getUserName(roomName);
    }

    getUserName(roomName:string) {
        const myStructures = Game.rooms[roomName].find(FIND_MY_SPAWNS);
        return myStructures[0].owner.username;
    }
}