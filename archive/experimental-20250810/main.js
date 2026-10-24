'use strict';

/**
 * Custom Interfaces
 */
const RoleDescriptions = {
    harvester: 'Gathers energy from sources',
    upgrader: 'Upgrades the room controller',
    builder: 'Builds construction sites',
    energyMiner: 'Container mines sources',
    lorry: 'Moves energy from containers and fills buildings',
    repairer: 'Repairs buildings',
    claimer: 'Claims new rooms',
    kungFuFighter: 'Defends room',
    idle: 'No task allocated, needs to be allocated task and role',
};
const AllRoles = ['harvester', 'upgrader', 'builder', 'energyMiner', 'lorry', 'repairer', 'claimer', 'kungFuFighter', 'idle'];
const AllTaskStatuses = ['untasked', 'tasked', 'in_progress', 'completed', 'hand_over', 'error'];
const AllTaskTypes = ['harvest', 'upgrade', 'build', 'resource_collection', 'repair', 'fill', 'none'];
var ResourceAcquisitionMethod;
(function (ResourceAcquisitionMethod) {
    ResourceAcquisitionMethod["Harvest"] = "harvest";
    ResourceAcquisitionMethod["Withdraw"] = "withdraw";
    ResourceAcquisitionMethod["Pickup"] = "pickup";
    ResourceAcquisitionMethod["Transfer"] = "transfer";
})(ResourceAcquisitionMethod || (ResourceAcquisitionMethod = {}));
var RoomPhase;
(function (RoomPhase) {
    RoomPhase[RoomPhase["UnitiatedRoom"] = -1] = "UnitiatedRoom";
    RoomPhase[RoomPhase["DeathSpiral"] = 0] = "DeathSpiral";
    RoomPhase[RoomPhase["InitialBootstrap"] = 1] = "InitialBootstrap";
    RoomPhase[RoomPhase["StableEarlyGame"] = 2] = "StableEarlyGame";
    RoomPhase[RoomPhase["MidGame"] = 3] = "MidGame";
    RoomPhase[RoomPhase["NearMax"] = 4] = "NearMax";
    RoomPhase[RoomPhase["MaxSingleRoom"] = 5] = "MaxSingleRoom";
    RoomPhase[RoomPhase["ExpansionCandidate"] = 6] = "ExpansionCandidate";
    // Specialised = 7           // Power processing, nuker ops, pixel generation, market trader
})(RoomPhase || (RoomPhase = {}));
;
const AllPhases = [
    RoomPhase.UnitiatedRoom,
    RoomPhase.DeathSpiral,
    RoomPhase.InitialBootstrap,
    RoomPhase.StableEarlyGame,
    RoomPhase.MidGame,
    RoomPhase.NearMax,
    RoomPhase.MaxSingleRoom,
    RoomPhase.ExpansionCandidate,
    // RoomPhase.Specialised
];

/**
 * Typescript Experimental Code
 * Get small working version, merge into main code line and repeat
 *
 * Started 10th August 2025
 * Updated 10th August 2025
 *
 */
/**
 * Main Loop
 */
const loop = () => {
    if (Game.cpu.bucket < 500) {
        throw new Error('Extremely low bucket - aborting script');
    }
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        createTasks(room);
    }
};
/**
 * Check if Task Exists
 * @param type
 * @param targetId
 * @returns boolean
 */
function taskExists(type, targetId) {
    return global.allTasks.some(t => t.type === type && t.targetId === targetId);
}
/**
 * Create Task that can be overriden with required parameters
 * @param type
 * @param data
 * @returns Task
 */
function createTask(type, data) {
    var _a;
    const id = (_a = data.id) !== null && _a !== void 0 ? _a : `task-${Game.time}`;
    return {
        id,
        type,
        ...data,
    };
}
/**
 * Create Baseline Tasks Based on Phase of Room
 * These tasks can be dynamically filtered or re-prioritised
 * based on current strategy and progress
 * @param room
 * @returns Array of Tasks
 */
function createTasks(room) {
    // TODO Later stages of the game progress some rooms will need
    // Tasks but don't have controllers or sources
    // This will need to be refactored for those cases
    const tasks = ensureGlobalTasks(); // hydrate tasks first
    const roomMemory = getRoomMemory(room);
    if (!roomMemory)
        return undefined;
    if (!room.controller)
        return undefined; // For now ignore rooms without a controller
    if (!roomMemory.sources)
        return undefined; // For now ignore rooms without a source
    if (roomMemory.phase === RoomPhase.UnitiatedRoom)
        getRoomPhase(room);
    console.log(roomMemory.phase);
    let newTasks = []; // A list of tasks to start creep doing something in room
    switch (roomMemory.phase) {
        case RoomPhase.DeathSpiral:
            for (const source of Object.keys(roomMemory.sources)) {
                const resourceType = getResourceTypeFromId(source);
                if (resourceType === 'unknown') {
                    console.warn(`[WARN] Problem with ${source} expected ${RESOURCE_ENERGY} received unknown`);
                    continue;
                }
                if (isRoomStorageFull(room))
                    continue;
                if (!taskExists("harvest", source)) {
                    newTasks.push(createTask("harvest", {
                        id: `harvest-${source}-${Game.time}`,
                        maxCreeps: roomMemory.maxHarvesters / Object.keys(roomMemory.sources).length,
                        targetId: source,
                        method: ResourceAcquisitionMethod.Harvest,
                        resourceType: resourceType,
                        status: "untasked"
                    }));
                    console.log(`CREATED - New harvest task - harvest-${source}-${Game.time}`);
                }
            }
            break;
        case RoomPhase.InitialBootstrap:
            for (const source of Object.keys(roomMemory.sources)) {
                const resourceType = getResourceTypeFromId(source);
                if (resourceType === 'unknown') {
                    console.warn(`[WARN] Problem with ${source} expected ${RESOURCE_ENERGY} received unknown`);
                    continue;
                }
                if (isRoomStorageFull(room))
                    continue;
                if (!taskExists("harvest", source)) {
                    newTasks.push(createTask("harvest", {
                        id: `harvest-${source}-${Game.time}`,
                        maxCreeps: roomMemory.maxHarvesters / Object.keys(roomMemory.sources).length,
                        targetId: source,
                        method: ResourceAcquisitionMethod.Harvest,
                        resourceType: resourceType,
                        status: "untasked"
                    }));
                    console.log(`CREATED - New harvest task - harvest-${source}-${Game.time}`);
                }
            }
            if (!taskExists("upgrade", room.controller.id)) {
                newTasks.push(createTask("upgrade", {
                    id: `upgrade-${Game.time}`,
                    maxCreeps: getDesiredCountForRole(roomMemory.phase, 'upgrader'),
                    targetId: room.controller.id,
                    status: "untasked"
                }));
                console.log(`CREATED - New upgrade task - upgrade-${Game.time}`);
            }
            break;
        case RoomPhase.StableEarlyGame:
            for (const source of Object.keys(roomMemory.sources)) {
                const resourceType = getResourceTypeFromId(source);
                if (resourceType === 'unknown') {
                    console.warn(`[WARN] Problem with ${source} expected ${RESOURCE_ENERGY} received unknown`);
                    continue;
                }
                if (isRoomStorageFull(room))
                    continue;
                if (taskExists("harvest", source)) {
                    newTasks.push(createTask("harvest", {
                        id: `energyMiner-${source}-${Game.time}`,
                        maxCreeps: 1,
                        targetId: source,
                        method: ResourceAcquisitionMethod.Harvest,
                        resourceType: resourceType,
                        status: "untasked"
                    }));
                    console.log(`CREATED - New harvest task - harvest-${source}-${Game.time}`);
                }
            }
            if (taskExists("upgrade", room.controller.id)) {
                newTasks.push(createTask("upgrade", {
                    id: `upgrade-${Game.time}`,
                    maxCreeps: getDesiredCountForRole(roomMemory.phase, 'upgrader'),
                    targetId: room.controller.id,
                    status: "untasked"
                }));
                console.log(`CREATED - New upgrade task - upgrade-${Game.time}`);
            }
            break;
        // TODO add in other required creep orders as room progresses
        case RoomPhase.MidGame:
        case RoomPhase.NearMax:
        case RoomPhase.MaxSingleRoom:
        case RoomPhase.ExpansionCandidate:
        default:
            break;
    }
    console.log(`TASKS - ${newTasks}`);
    tasks.push(...newTasks);
    saveTasks();
    return newTasks;
}
/**
 * Type Safe Ensure Global Tasks
 * Safety for Resets
 * @returns
 */
function ensureGlobalTasks() {
    var _a;
    if (!global.allTasks)
        global.allTasks = ((_a = Memory.tasks) !== null && _a !== void 0 ? _a : []).map(stored => stored);
    return global.allTasks;
}
function saveTasks() {
    Memory.tasks = global.allTasks.map(task => ({ ...task }));
}
/**
 * Returns the room memory
 * Guards Against Memory Corruption & avoid accidental overwrites or undefined situations
 * @param room
 * @returns
 */
function getRoomMemory(room) {
    var _a, _b, _c, _d;
    if (!room.memory)
        room.memory = {};
    const memory = room.memory;
    if (!memory.controllerProgress)
        memory.controllerProgress = { level: 0, totalEnergyHarvested: 0 };
    if (memory.creepCounts === undefined)
        memory.creepCounts = {};
    if (memory.creeps === undefined)
        memory.creeps = {};
    if (memory.maxHarvesters === undefined)
        memory.maxHarvesters = 0;
    if (memory.owner === undefined)
        memory.owner = (_b = (_a = room.controller) === null || _a === void 0 ? void 0 : _a.owner) !== null && _b !== void 0 ? _b : 'None';
    if (memory.phase === undefined)
        memory.phase = RoomPhase.UnitiatedRoom;
    if (memory.rcl === undefined)
        memory.rcl = (_d = (_c = room.controller) === null || _c === void 0 ? void 0 : _c.level) !== null && _d !== void 0 ? _d : -1;
    if (memory.spawns === undefined)
        memory.spawns = {};
    if (memory.sources === undefined)
        memory.sources = {};
    return memory;
}
/**
 * Returns the creep memory
 * Guards Against Memory Corruption & avoid accidental overwrites or undefined situations
 * @param creep
 * @returns
 */
function getCreepMemory(creep) {
    if (!creep.memory) {
        creep.memory = {};
    }
    const memory = creep.memory;
    if (!memory.role)
        memory.role = 'harvester';
    if (typeof memory.working === 'undefined')
        memory.working = false;
    return memory;
}
function getInitialCreepMemory(role) {
    return {
        role: role,
        working: false
    };
}
/**
 * Detects Room Phase
 * @param room
 * @returns RoomPhase
 */
function getRoomPhase(room) {
    var _a, _b, _c, _d;
    const roomMemory = getRoomMemory(room);
    const rcl = (_b = (_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) !== null && _b !== void 0 ? _b : -1;
    const hasStorage = !!room.storage;
    const creepCount = Object.keys((_c = roomMemory.creeps) !== null && _c !== void 0 ? _c : {}).length;
    const isEmergency = room.energyAvailable < 100 && Object.keys((_d = roomMemory.creeps) !== null && _d !== void 0 ? _d : 0).length < 2;
    let phase;
    if (rcl < 0) {
        phase = RoomPhase.UnitiatedRoom;
    }
    else if (isEmergency) {
        phase = RoomPhase.DeathSpiral;
    }
    else if (rcl < 2) {
        phase = RoomPhase.InitialBootstrap;
    }
    else if (rcl === 2 && !hasStorage) {
        phase = RoomPhase.StableEarlyGame;
    }
    else if (rcl >= 4 && hasStorage) {
        phase = RoomPhase.MidGame;
    }
    else if (rcl >= 6 && room.terminal) {
        phase = RoomPhase.NearMax;
    }
    else if (rcl === 8) {
        phase = RoomPhase.MaxSingleRoom;
    }
    else {
        phase = RoomPhase.ExpansionCandidate;
    }
    if (roomMemory.phase !== phase) {
        console.log(`[${room.name}] Phase -> ${RoomPhase[phase]} (${phase}), RCL=${rcl}, creeps=${creepCount}, storage=${hasStorage}`);
        roomMemory.phase = phase;
    }
    return phase;
}
/**
 * Obtains Resource Type from a given Id
 * @param id
 * @returns ResourceConstant or 'unknown'
 */
function getResourceTypeFromId(id) {
    const obj = Game.getObjectById(id);
    if (!obj)
        return 'unknown';
    if (!isHarvestable(obj)) {
        console.warn(`Unhandled object type for id ${id} (${obj.constructor.name})`);
        return 'unknown';
    }
    if (isSource(obj))
        return RESOURCE_ENERGY;
    if (isMineral(obj))
        return obj.mineralType;
    if (isDeposit(obj))
        return obj.depositType;
    return 'unknown';
}
// Typeguards
/**
 * Checks if creep can harvest from target
 * @param target
 * @returns True or False
 */
function isHarvestable(target) {
    return (target instanceof Source ||
        target instanceof Mineral ||
        target instanceof Deposit);
}
/**
 * Narrow Typeguard to sources
 * @param obj
 * @returns boolean
 */
function isSource(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'energy' in obj &&
        typeof obj.energy === 'number' &&
        !('mineralType' in obj) &&
        !('depositType' in obj));
}
/**
 * Narrow type guard to mineral
 * @param obj
 * @returns boolean
 */
function isMineral(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'mineralType' in obj &&
        typeof obj.mineralType === 'string' &&
        !('energy' in obj) &&
        !('depositType' in obj));
}
/**
 * Narrow type guard to deposit
 * @param obj
 * @returns boolean
 */
function isDeposit(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'depositType' in obj &&
        typeof obj.depositType === 'string' &&
        !('energy' in obj) &&
        !('mineralType' in obj));
}
/**
 * Is Room Storage Full
 * @param room
 * @returns boolean
 */
function isRoomStorageFull(room) {
    if (!room.controller || !room.controller.my)
        return false;
    return (room.energyCapacityAvailable - room.energyAvailable) === 0;
}
const desiredCreepsByName = {
    UnitiatedRoom: {},
    DeathSpiral: { harvester: 2 },
    InitialBootstrap: { harvester: 3, upgrader: 1 },
    StableEarlyGame: { energyMiner: 2, upgrader: 2 },
    MidGame: { energyMiner: 2, upgrader: 2, builder: 1, lorry: 2 },
    NearMax: { energyMiner: 2, upgrader: 3, builder: 2, lorry: 2, repairer: 1 },
    MaxSingleRoom: { energyMiner: 2, upgrader: 1, lorry: 3, repairer: 2 },
    ExpansionCandidate: { claimer: 1 },
};
const desiredCreeps = {
    [RoomPhase.UnitiatedRoom]: {},
    [RoomPhase.DeathSpiral]: { harvester: 2 },
    [RoomPhase.InitialBootstrap]: { harvester: 3, upgrader: 1 },
    [RoomPhase.StableEarlyGame]: { energyMiner: 2, upgrader: 2 },
    [RoomPhase.MidGame]: { energyMiner: 2, upgrader: 2, builder: 1, lorry: 2 },
    [RoomPhase.NearMax]: { energyMiner: 2, upgrader: 3, builder: 2, lorry: 2, repairer: 1 },
    [RoomPhase.MaxSingleRoom]: { energyMiner: 2, upgrader: 1, lorry: 3, repairer: 2 },
    [RoomPhase.ExpansionCandidate]: { claimer: 1 },
};
/**
 * Get Desired Creeps for the Phase
 * @param phase
 * @returns
 */
function getDesiredCreepsForPhase(phase) {
    return desiredCreeps[phase];
}
/**
 * Get Desired Count For Role
 * @param phase
 * @param role
 * @returns
 */
function getDesiredCountForRole(phase, role) {
    var _a;
    const composition = getDesiredCreepsForPhase(phase);
    return (_a = composition[role]) !== null && _a !== void 0 ? _a : 0;
}

exports.desiredCreepsByName = desiredCreepsByName;
exports.getCreepMemory = getCreepMemory;
exports.getDesiredCountForRole = getDesiredCountForRole;
exports.getInitialCreepMemory = getInitialCreepMemory;
exports.getResourceTypeFromId = getResourceTypeFromId;
exports.getRoomMemory = getRoomMemory;
exports.getRoomPhase = getRoomPhase;
exports.isHarvestable = isHarvestable;
exports.isRoomStorageFull = isRoomStorageFull;
exports.loop = loop;
//# sourceMappingURL=main.js.map
