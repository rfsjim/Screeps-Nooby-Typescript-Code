import { getRoomMemory } from "./memoryManager";

/**
 * Build Bunker
 * @param roomName 
 * @param roomMaxlocationDistance 
 * @returns result of bunker build
 */
export function bunkerBuilder(roomName: string, roomMaxlocationDistance: number): boolean
{
    if (!Game.rooms[roomName].controller) return false;
    if (roomMaxlocationDistance < 7) return false;

    const roomMemory = getRoomMemory(Game.rooms[roomName]);
    if (!roomMemory.spawns) return false;
    if (roomMemory.rcl < 2) return false;

    const spawnPos = new RoomPosition(roomMemory.spawns[0].x, roomMemory.spawns[0].y, roomName);
    const controller = Game.rooms[roomName].controller;
    let extensionAnchor: RoomPosition;

    const positions =
    [
        { x: -2, y: 0 },
        { x: 0, y: 2 },
        { x: 2, y: 0 }
    ];

    for (let position of positions)
    {
        const testPos = new RoomPosition(spawnPos.x + position.x, spawnPos.y + position.y, roomName);
        if (global.distanceTransform[roomName].get(testPos.x, testPos.y) >= 7)
        {
            if (controller.pos.x - spawnPos.x === 0)
            {
                extensionAnchor = new RoomPosition(spawnPos.x + 2, spawnPos.y - 1, roomName);
                extensionAnchor.createConstructionSite(STRUCTURE_EXTENSION);
                return true;
            }
            else if (controller.pos.x - spawnPos.x > 0)
            {
                extensionAnchor = new RoomPosition(spawnPos.x +1, spawnPos.y - 2, roomName);
                extensionAnchor.createConstructionSite(STRUCTURE_EXTENSION);
                return true;
            }
            else if (controller.pos.x - spawnPos.x < 0)
            {
                extensionAnchor = new RoomPosition(spawnPos.x - 1, spawnPos.y - 2, roomName);
                extensionAnchor.createConstructionSite(STRUCTURE_EXTENSION);
                return true;
            }
        }
    }
    return false;
}