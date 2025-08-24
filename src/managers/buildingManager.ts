import { ConstructionTask } from "types";
import { getRoomMemory } from "./memoryManager";
import { ROOM_BOUNDARY_VALUES } from "consts";

const buildPlan: Record<number, ConstructionTask[]> =
    {
        2: [
            { type: STRUCTURE_EXTENSION, count: 5, priority: 1 }, // RCL 2 limit
            { type: STRUCTURE_CONTAINER, count: 2, priority: 2 }, // for container mining
            { type: STRUCTURE_ROAD, count: Infinity, priority: 3 } // roads to connect sources to spawn
        ],
        3: [
            { type: STRUCTURE_EXTENSION, count: 5, priority: 1 }, // RCL 3 limit
            { type: STRUCTURE_TOWER, count: 1, priority: 2 } // for defense
        ],
        4: [
            { type: STRUCTURE_EXTENSION, count: 10, priority: 1 }, // RCL 4 limit
            { type: STRUCTURE_STORAGE, count: 1, priority: 2 } // storage
        ],
        5: [
            { type: STRUCTURE_EXTENSION, count: 10, priority: 1}, // RCL 5 limit
            { type: STRUCTURE_TOWER, count: 1, priority: 2 }, // additional tower for defense
            { type: STRUCTURE_LINK, count: 2, priority: 3 } // links for energy transfer
        ],
        6: [
            { type: STRUCTURE_EXTENSION, count: 10, priority: 1 }, // RCL 6 limit
            { type: STRUCTURE_LINK, count: 1, priority: 2 }, // additional link for energy transfer
            { type: STRUCTURE_EXTRACTOR, count: 1, priority: 3 }, // extractor for mineral harvesting
            { type: STRUCTURE_TERMINAL, count: 1, priority: 4 }, // terminal for trading
            { type: STRUCTURE_LAB, count: 3, priority: 5 } // labs for chemical processing
        ],
        7: [
            { type: STRUCTURE_SPAWN, count: 1, priority: 1 }, // additional spawn for capacity
            { type: STRUCTURE_EXTENSION, count: 10, priority: 2 }, // RCL 7 limit
            { type: STRUCTURE_TOWER, count: 1, priority: 3 }, // additional tower for defense
            { type: STRUCTURE_LINK, count: 1, priority: 4 }, // link for energy transfer
            { type: STRUCTURE_LAB, count: 3, priority: 5 }, // additional labs for chemical processing
            { type: STRUCTURE_FACTORY, count: 1, priority: 6 } // factory for production
        ],
        8: [
            { type: STRUCTURE_SPAWN, count: 1, priority: 1 }, // additional spawn for capacity
            { type: STRUCTURE_EXTENSION, count: 10, priority: 2 }, // RCL 8 limit
            { type: STRUCTURE_TOWER, count: 3, priority: 3 }, // additional towers for defense
            { type: STRUCTURE_LINK, count: 2, priority: 4 }, // links for energy transfer
            { type: STRUCTURE_LAB, count: 4, priority: 5 }, // additional labs for chemical processing
            { type: STRUCTURE_OBSERVER, count: 1, priority: 6 }, // observer for scouting
            { type: STRUCTURE_NUKER, count: 1, priority: 7 }, // nuker for offensive operations
            { type: STRUCTURE_POWER_SPAWN, count: 1, priority: 8 } // power spawn for power processing
        ]
    };

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

/**
 * Building Manager
 * Handles building tasks in the room
 * @param room 
 * @returns void - works as side effects
 */
export function buildingManager(room: Room): void
{
    const rcl = room.controller?.level || 0;
    const plan = buildPlan[rcl];

    if (!plan) return; // No build plan for this RCL

    for (const task of plan.sort((a, b) => a.priority - b.priority))
    {
        // skip if task already satisfied
        const existing = countStructures(room, task.type);
        const underCounstruction = countConstructionSites(room, task.type);
        if (existing + underCounstruction >= task.count) continue;

        // Check if dependencies are met (eg don't place storage until extensions are built)
        if (task.dependsOn && !dependenciesMet(room, task.dependsOn)) continue;

        // ask dependency module for positions
        const positions = getPlannedPositions(room, task.type, task.count - (existing + underCounstruction));

        let placed = false; // flag to indicate if intent was created for construction sites this tick

        // place as many as possible
        for (const pos of positions)
        {
            if (canBuildAt(pos))
                {
                    placeConstructionSite(pos, task.type, room.name);
                    placed = true; // intent for construction sites placed this tick skip scanning
                } 
        }

        // update room memory with new sites only on second tick
        if (!placed) scanSites(room, positions);

        break; // only do one batch per tick to avoid clutter
    }
}

/**
 * Get Planned Room Positions
 * @param room 
 * @param structureType 
 * @param count 
 * @returns Array of RoomPositions where the structure can be built
 */
function getPlannedPositions(room: Room, type: BuildableStructureConstant, count: number): RoomPosition[]
{
    const positions: RoomPosition[] = [];

    switch (type) {
        case STRUCTURE_EXTENSION:
            planExtensionPositions(room, count).forEach(pos => positions.push(pos));
            break;
        case STRUCTURE_CONTAINER:
            planContainerPositions(room, count).forEach(pos => positions.push(pos));
            break;
        case STRUCTURE_TOWER:
        case STRUCTURE_STORAGE:
        case STRUCTURE_LINK:
        case STRUCTURE_LAB:
        case STRUCTURE_EXTRACTOR:
        case STRUCTURE_TERMINAL:
        case STRUCTURE_SPAWN:
        case STRUCTURE_FACTORY:
        case STRUCTURE_OBSERVER:
        case STRUCTURE_POWER_SPAWN:
        case STRUCTURE_NUKER:
            break;
        default:
            console.log(`No placement algorithm for ${type}`);
            return [];
    }
    return positions;
}

/**
 * Check if can build at position
 * @param pos 
 * @returns boolean - true if can build, false if can't
 */
function canBuildAt(pos: RoomPosition): boolean
{
    if (new Room.Terrain(pos.roomName).get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false; // can't build on walls
    if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length > 0) return false; // can't build on existing construction sites
    if (pos.lookFor(LOOK_STRUCTURES).length > 0) return false; // can't build on existing structures
    return true;
}

/**
 * Count structures of given type in room memory
 * @param room 
 * @param structureType 
 * @returns number of structures of given type
 */
function countStructures(room: Room, structureType: BuildableStructureConstant): number
{
    let count = 0;
    const roomMemory = getRoomMemory(room);
    if (!roomMemory.structures) return 0;

    for (const id in roomMemory.structures)
    {
        if (roomMemory.structures[id].type === structureType) count++;
    }

    return count;
}

/**
 * Count construction sites of given type in room memory
 * @param room 
 * @param structureType 
 * @returns number of construction sites of given type
 */
function countConstructionSites(room: Room, structureType: BuildableStructureConstant): number
{
    let count = 0;
    const roomMemory = getRoomMemory(room);
    if (!roomMemory.constructionSites) return 0;

    for (const id in roomMemory.constructionSites)
    {
        if (roomMemory.constructionSites[id].type === structureType) count++
    }

    return count;
}

/**
 * Check if dependencies are met
 * @param room
 * @param dependencies
 * @returns boolean - true if dependencies are met, false if not
 */
function dependenciesMet(room: Room, dependencies: BuildableStructureConstant[]): boolean
{
    for (const dep of dependencies)
    {
        const existing = countStructures(room, dep);
        if (existing === 0) return false; // dependency not met
    }

    return true; // all dependencies are met
}

/**
 * Plan Extension Positions
 * @param room 
 * @param count 
 * @returns Array of RoomPositions for extensions
 */
function planExtensionPositions(room: Room, count: number): RoomPosition[]
{
    const positions: RoomPosition[] = [];
    const roomMemory = getRoomMemory(room);
    if (!room.controller) return positions; // room has no controller

    if (!roomMemory.spawns) return positions;  // if room has no spawn then we dont need to be building

    const initalSpawn = Object.keys(roomMemory.spawns)[0]; // get first spawn created in room as anchor for bunker
    if (!initalSpawn) return positions;

    const spawnMemory = roomMemory.spawns[initalSpawn];  // get room memory details
    if (!spawnMemory) return positions;
     
    const spawnPos = new RoomPosition(spawnMemory.x, spawnMemory.y, room.name);
    const controller = room.controller;

    for (const position of positions)
    {
        const testPos = new RoomPosition(spawnPos.x + position.x, spawnPos.y + position.y, room.name);

        if (global.getDistanceTransform(room.name).get(testPos.x, testPos.y) >= 7)
        {
            // create extension anchor relative to controller & spawn position
            let extensionAnchor: RoomPosition;

            if (controller.pos.x === spawnPos.x)
            {
                extensionAnchor = new RoomPosition(spawnPos.x + 2, spawnPos.y - 1, room.name);
            }
            else if (controller.pos.x > spawnPos.x)
            {
                extensionAnchor = new RoomPosition(spawnPos.x +1, spawnPos.y - 2, room.name);
            }
            else
            {
                extensionAnchor = new RoomPosition(spawnPos.x - 1, spawnPos.y - 2, room.name);
            }
        
            // place anchor and neighbours
            for (const {x , y} of offsets)
            {
                const pos = new RoomPosition(extensionAnchor.x + x, extensionAnchor.y + y, room.name);
                positions.push(pos);
                if (positions.length >= count) return positions; // stop when we have enough positions
            }
        }
    }
    return positions;  
}

/**
 * Plan Container Positions
 * @param room 
 * @param count 
 * @returns Room Position for Containers
 */
function planContainerPositions(room: Room, count: number): RoomPosition[]
{
    const positions: RoomPosition[] = [];
    const roomMemory = getRoomMemory(room);
    if (!room.controller) return positions; // room has no controller

    if (!roomMemory.spawns) return positions;  // if room has no spawn then we dont need to be building

    const initalSpawn = Object.keys(roomMemory.spawns)[0]; // get first spawn created in room as anchor for bunker
    if (!initalSpawn) return positions;

    const spawnMemory = roomMemory.spawns[initalSpawn];  // get room memory details
    if (!spawnMemory) return positions;

    const sources = Object.keys(roomMemory.sources || {}).map(sourceId => Game.getObjectById<Source>(sourceId as Id<Source>));
    if (sources.length >= 2)
    {
        for (const source of sources)
        {
            if (!source) continue; // skip if source is undefined

            for (const {x , y} of offsets)
            {
                const pos = new RoomPosition(source.pos.x + x, source.pos.y + y, room.name);
                positions.push(pos);
                if (positions.length >= count) return positions; // stop when we have enough positions
            }
        }
    }
    return positions;
}

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

    if (roomMemory.structures)
    {
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
                        const pos1 = new RoomPosition(pos.x - 1, pos.y - 1, roomName); // top-left
                        const pos2 = new RoomPosition(pos.x + 1, pos.y + 1, roomName); // bottom-right

                        scanSites(Game.rooms[roomName], [pos1, pos2]);

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
                    const pos1 = new RoomPosition(testPos.x - 7, testPos.y - 7, roomName); // top-left
                    const pos2 = new RoomPosition(testPos.x + 7, testPos.y + 7, roomName); // bottom-right

                    scanSites(Game.rooms[roomName], [pos1, pos2]);
                } 
            }
        }
    }
    return false;
}

/**
 * Creates Construction Site, adds to room memory and logs result 
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

/**
 * Scan Given Area for Construction Sites or Structures and add to room memory
 * @param room 
 * @param area 
 * @param type 
 */
function scanSites(room: Room, positions: RoomPosition[]): void
{
    // const sites = room.lookForAtArea(type, area.y1, area.x1, area.y2, area.x2, true);
    const roomMemory = getRoomMemory(room);
    if (!roomMemory) return;
    if (!positions || positions.length === 0) return;

    // Build a bounding box around the positions to minimize area scanned
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxX = Math.max(...positions.map(p => p.x));  
    const maxY = Math.max(...positions.map(p => p.y));

    // Create lookup set for filtering out existing sites
    const allowed = new Set(positions.map(p => `${p.x},${p.y}`));

    // construction sites
    const sites = room.lookForAtArea(LOOK_CONSTRUCTION_SITES, minY, minX, maxY, maxX, true);

    for (const s of sites)
    {
        if (!allowed.has(`${s.x},${s.y}`)) continue; // skip if not in expected positions
        if (roomMemory.constructionSites === undefined) roomMemory.constructionSites = {};
        if (roomMemory.constructionQueue === undefined) roomMemory.constructionQueue = [];

        roomMemory.constructionSites[s.constructionSite.id] =
        {
            x: s.x,
            y: s.y,
            type: s.constructionSite.structureType,
        };

        if (!roomMemory.constructionQueue.includes(s.constructionSite.id))
        {
            roomMemory.constructionQueue.push(s.constructionSite.id);
            console.log(`Found site ${s.constructionSite.id} at (${s.x}, ${s.y}) for ${s.constructionSite.structureType}`);
        }
    }

    // built structures
    const structures = room.lookForAtArea(LOOK_STRUCTURES, minY, minX, maxY, maxX, true);

    for (const s of structures)
    {
        if (!allowed.has(`${s.x},${s.y}`)) continue; // skip if not in expected positions
        if (roomMemory.structures === undefined) roomMemory.structures = {};

        if (s.structure.structureType in CONSTRUCTION_COST)
        {
            const type = s.structure.structureType as BuildableStructureConstant;
            roomMemory.structures[s.structure.id] =
        {
            x: s.x,
            y: s.y,
            type
        };
        console.log(`Found structure ${s.structure.id} at (${s.x}, ${s.y}) for ${s.structure.structureType}`);
        }
    }
}