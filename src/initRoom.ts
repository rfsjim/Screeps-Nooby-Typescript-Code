declare global {
    interface RoomMemory {
        exits: ExitsInformation;
        roomName: string;
        harvesters: number;
      }
}

export default function initRoom(roomName: string) {
    Memory.rooms.roomName.exits = Game.map.describeExits(roomName);
    Memory.rooms.roomName.roomName = Game.rooms[roomName].name;
    Memory.rooms.roomName.harvesters = 0;
}