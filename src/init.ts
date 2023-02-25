export default function initRoom(roomName: string) {
    Memory.rooms.roomName.exits = Game.map.describeExits(roomName);
    Memory.rooms.roomName.name = Game.rooms[roomName].name;
}