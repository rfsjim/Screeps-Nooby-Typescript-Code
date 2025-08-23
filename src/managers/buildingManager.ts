import { off } from "process";
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

    if (roomMemory.structures)
    {
        /**
         * Build order for bunkers
         * At RCL 2 we want to build:
         * - 5 extensions (RCL 2 limit)
         * - 2 containers next to sources for container mining
         * - roads to connect sources to spawn
         * At RCL 3 we want to build:
         * - 5 more extensions (RCL 3 limit)
         * - 1 tower for defense
         * At RCL 4 we want to build:
         * - 10 more extensions (RCL 4 limit)
         * - 1 storage
         */

        if (Object.keys(roomMemory.structures).length === 6 && roomMemory.rcl === 2)
        {
            // We have 5 extensions, and a spawn now we need to build 2 containers next to sources

            const sources = Object.keys(roomMemory.sources || {}).map(sourceId => Game.getObjectById<Source>(sourceId as Id<Source>));
            if (sources.length >= 2)
            {
                for (const source of sources)
                {
                    if (!source) continue; // skip if source is undefined

                    for (const {x , y} of offsets)
                    {
                        const terrain = new Room.Terrain(roomName);
                        if (terrain.get(source.pos.x + x, source.pos.y + y) === TERRAIN_MASK_WALL) continue; // skip if terrain is wall
                        const pos = new RoomPosition(source.pos.x + x, source.pos.y + y, roomName);
                        if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length > 0) continue; // skip if there is already a construction site
                        if (pos.lookFor(LOOK_STRUCTURES).length > 0) continue; // skip if there is already a structure
                        if (pos.lookFor(LOOK_TERRAIN)[0] === 'wall') continue; // skip if terrain is wall
                        placeConstructionSite(pos, STRUCTURE_CONTAINER, roomName);
                        scanSites(
                            Game.rooms[roomName],
                            {
                                x1: pos.x - 1,
                                y1: pos.y - 1,
                                x2: pos.x + 1,
                                y2: pos.y + 1
                            },
                            LOOK_CONSTRUCTION_SITES
                        );
                        break; // only build one container per source
                    }
                }
            }
        }
        return true; // we have structures so we don't need to build extensions
    }

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
                const result = placeConstructionSite(pos, STRUCTURE_EXTENSION, pos.roomName);
                if (result !== OK)
                {
                    scanSites(
                        Game.rooms[roomName],
                        {
                            x1: testPos.x -7,
                            y1: testPos.y - 7,
                            x2: testPos.x + 7,
                            y2: testPos.y + 7
                        },
                    LOOK_CONSTRUCTION_SITES
                );

                    scanSites(
                        Game.rooms[roomName],
                        {
                            x1: testPos.x -7,
                            y1: testPos.y - 7,
                            x2: testPos.x + 7,
                            y2: testPos.y + 7
                        },
                        LOOK_STRUCTURES
                    );
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

function scanSites(room: Room, area: {x1: number, y1: number, x2: number, y2: number}, type: keyof AllLookAtTypes)
{
    const sites = room.lookForAtArea(type, area.y1, area.x1, area.y2, area.x2, true);
    const roomMemory = getRoomMemory(room);

    for (const site of sites)
    {
        if (type === LOOK_CONSTRUCTION_SITES)
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
        else if (type === LOOK_STRUCTURES)
        {
            if (roomMemory.structures === undefined) roomMemory.structures = {};
            roomMemory.structures[site.structure.id] =
            {
                x: site.x,
                y: site.y,
                type: site.structure.structureType,
            };
            console.log(`Found structure ${site.structure.id} at (${site.x}, ${site.y}) for ${site.structure.structureType}`);
        } 
    }
}