export default function initRoom(roomName: string) {
    Memory.rooms.roomName.exits = Game.map.describeExits(roomName);
}