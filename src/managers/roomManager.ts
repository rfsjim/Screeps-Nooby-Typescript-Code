/*
 * Managning Room Requirements
 * Create building tasks based on room phase
 *
 */

import { getRoomMemory } from "./memoryManager";
import { RoomPhase } from "types";
import { shouldUpgradeController, getMaximumRoomEnergy } from "./taskManager";
import { buildCreep } from "./spawnManager";

export function setRoomTasks(room: Room)
{
    if (!room.controller) return;
    const roomMemory = getRoomMemory(room);
    if (!roomMemory.spawns) return;
    const spawn = Game.getObjectById(Object.keys(roomMemory.spawns)[0] as Id<StructureSpawn>);
    if (!spawn) return;

    if (shouldUpgradeController(room, room.controller?.level))
    {
        return buildCreep(
            'upgrader',
            spawn,
            getMaximumRoomEnergy(room),
            ); 
    }

    return;
}

function setRoadRequirements(room: Room)
{
    const roomMemory = getRoomMemory(room);
    switch (roomMemory.phase)
    {
        case 1:
            // No roads
            break;
        case 2:
            // Basic roads to sources
            break;
        case 3:
            // Roads to controller and spawn
            break;
        case 4:
            // High-traffic roads are reinforced
            break;
        case 5:
            // Highways and wide arteries
            break;
    }
}

const wallRepairThreshold: Record<RoomPhase, number> = {
    0: 100,
    1: 500,
    2: 1000,
    3: 5000,
    4: 10000,
    5: 50000,
    6: 100000,
};

const storageTarget: Record<RoomPhase, number> = {
    0: 0,
    1: 300,
    2: 1000,
    3: 3000,
    4: 6000,
    5: 10000,
    6: 10000,
};