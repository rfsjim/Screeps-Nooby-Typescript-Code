import { getRoomMemory } from "./memoryManager";

/**
 * Build Bunker
 * @param roomName 
 * @param roomMaxlocationDistance 
 * @returns result of bunker build
 */
export function bunkerBuilder(roomName: string, roomMaxlocationDistance: number): boolean
{
    if (!Game.rooms[roomName].controller) return false;  // room has no controller
    if (roomMaxlocationDistance < 7) return false;  // room not big enough for bunkers

    const roomMemory = getRoomMemory(Game.rooms[roomName]);
    if (roomMemory.constructionSites && Object.keys(roomMemory.constructionSites).length > 0) return false; // Have unbuilt construction sites don't queue up more

    if (!roomMemory.spawns) return false;  // if room has no spawn then we dont need to be building
    if (roomMemory.rcl < 2) return false;  // earliest time we can have extensions

    const initalSpawn = Object.keys(roomMemory.spawns)[0]; // get first spawn created in room as anchor for bunker
    if (!initalSpawn) return false;

    const spawnMemory = roomMemory.spawns[initalSpawn];  // get room memory details
    if (!spawnMemory) return false;
     
    const spawnPos = new RoomPosition(spawnMemory.x, spawnMemory.y, roomName);
    const controller = Game.rooms[roomName].controller;
    
    // bunker centre position relative to spawn
    const positions =
    [
        { x: -2, y: 0 }, // left of spawn
        { x: 0, y: 2 }, // right of spawn
        { x: 2, y: 0 } // below the spawn
    ];

    // extension offsets relative to extension anchor
    const offsets =
    [
        { x: 0, y: 0 }, // anchor
        { x: 0, y: -1 }, // above
        { x: 0, y: 1 }, // below
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 }, // right

    ];

    for (const position of positions)
    {
        const testPos = new RoomPosition(spawnPos.x + position.x, spawnPos.y + position.y, roomName);

        if (global.getDistanceTransform(roomName).get(testPos.x, testPos.y) >= 7)
        {
            // create extension anchor relative to controller & spawn position
            let extensionAnchor: RoomPosition;

            if (controller.pos.x === spawnPos.x)
            {
                extensionAnchor = new RoomPosition(spawnPos.x + 2, spawnPos.y - 1, roomName);
            }
            else if (controller.pos.x > spawnPos.x)
            {
                extensionAnchor = new RoomPosition(spawnPos.x +1, spawnPos.y - 2, roomName);
            }
            else
            {
                extensionAnchor = new RoomPosition(spawnPos.x - 1, spawnPos.y - 2, roomName);
            }
        
            // place anchor and neighbours
            for (const {x , y} of offsets)
            {
                const pos = new RoomPosition(extensionAnchor.x + x, extensionAnchor.y + y, roomName);
                if (placeConstructionSite(pos, STRUCTURE_EXTENSION, pos.roomName) !== OK)
                {
                    scanConstructionsSites(
                        Game.rooms[roomName],
                        {
                            x1: testPos.x -7,
                            y1: testPos.y - 7,
                            x2: testPos.x + 7,
                            y2: testPos.y + 7
                        });
                } 
            }
        }
    }
    return false;
}

/**
 * Creates Construction Site, Increments Construction Site Counter and tracks extensions 
 * @param roomPosition 
 * @param structureType 
 * @param roomName 
 * @returns ScreepReturnConstant
 */
function placeConstructionSite(roomPosition: RoomPosition, structureType: BuildableStructureConstant, roomName: string):ScreepsReturnCode
{
    const roomMemory = getRoomMemory(Game.rooms[roomName]);
    if (!roomMemory) return ERR_INVALID_ARGS;

    const result = roomPosition.createConstructionSite(structureType);

    if (result !== OK)
    {
        console.log(`Failed to place ${structureType} at ${roomPosition}: ${result}`);
        return result;
    }

    return OK;
}

function scanConstructionsSites(room: Room, area: {x1: number, y1: number, x2: number, y2: number})
{
    const sites = room.lookForAtArea(LOOK_CONSTRUCTION_SITES, area.y1, area.x1, area.y2, area.x2, true);
    const roomMemory = getRoomMemory(room);

    for (const site of sites)
    {
        if (roomMemory.constructionSites === undefined) roomMemory.constructionSites = {};

        roomMemory.constructionSites[site.constructionSite.id] =
        {
            x: site.x,
            y: site.y,
            type: site.constructionSite.structureType,
        };
        if (roomMemory.constructionQueue === undefined) roomMemory.constructionQueue = [];
        roomMemory.constructionQueue.push(site.constructionSite.id);
        console.log(`Found site ${site.constructionSite.id} at (${site.x}, ${site.y}) for ${site.constructionSite.structureType}`);
    }
}