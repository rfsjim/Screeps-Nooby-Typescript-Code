/*
 * One commander to control them all.
 */

import { Task, Role, ResourceAcquisitionMethod, AnyTask, RoomPhase, TaskType, TaskToTypeMap, StoredTask, HarvestTask, UpgradeTask, BuildTask, RepairTask, ResourceCollectionTask, FillTask } from "types"
import { getRoomMemory, getCreepMemory, getRoomPhase } from "./memoryManager";
import { isPickupable, isWithdrawable, hasCarry, isResourceCollectionTask, isFillTask, getResourceTypeFromId, isHarvestTask, hasWork, isBuildTask, isRepairTask, isUpgradeTask, isRoomStorageFull } from "helper/helper";
import { HANDOVER_TTL_THRESHOLD } from "consts";
import { getDesiredCountForRole } from "./spawnManager";
import { runHarvester } from "roles/role.harvester";
import { runUpgrader } from "roles/role.upgrader";

/**
 * Type Safe Ensure Global Tasks
 * Safety for Resets
 * @returns 
 */
function ensureGlobalTasks(): AnyTask[]
{
  if (!global.allTasks) global.allTasks = (Memory.tasks ?? []).map(stored => stored) as AnyTask[];
  
  return global.allTasks;
}

function saveTasks(tasks: AnyTask[]): void
{
    global.allTasks = tasks;
    Memory.tasks = global.allTasks.map(task =>
    ({...task })) as StoredTask[];
}

/**
 * Central creep behavior router.
 */

/**
 * Map Task type to role
 */
const taskToRoleMap: Record<TaskType, Role> =
{
    harvest: "harvester",
    upgrade: "upgrader",
    build: "builder",
    repair: "repairer",
    resource_collection: "lorry",
    fill: "lorry",
    none: "idle"
};

export const roleRunners: Record<Role, (creep: Creep) => void> = {
  harvester: runHarvester,
  upgrader: runUpgrader,
  builder: () => {},
  energyMiner: () => {},
  lorry: () => {},
  repairer: () => {},
  claimer: () => {},
  kungFuFighter: () => {},
  idle: () => {}
};

/**
 * Run Creep - Perform creep actions based on roles
 * @param creep 
 * @param role 
 */
function runCreep(creep: Creep, role: Role):void {
    if (!creep) return;
    const mem = getCreepMemory(creep);

    // Reassignment logic (e.g., upgrade harvester to upgrader if storage is full) and cooldown has passed
    const cooldownTicks = 25;
    const canSwitch = !mem.lastRoleChange || Game.time - mem.lastRoleChange > cooldownTicks;

    if ((role === 'harvester' || role === 'upgrader') && canSwitch)
    {
        const room = creep.room;
        const roomMemory = getRoomMemory(room);
        if (!roomMemory) return;
        const roomCreepCount = roomMemory.creepCounts || {};

        const maxUpgraders = room.controller ? room.controller.level : 1;

        if (role === 'harvester' satisfies Role &&
            room.energyAvailable === room.energyCapacityAvailable &&
        (roomCreepCount['upgrader'] || 0) < maxUpgraders)
        {
            // Don't let harvesters stand around doing nothing, start to upgrade instead.
            // retaskHarvesterToUpgrader(creep);
        }

        if (role === 'upgrader' satisfies Role &&
            creep.room.energyAvailable < creep.room.energyCapacityAvailable * 0.5 &&
            (roomCreepCount["harvester"] || 0) < 3)
        {
            // Energy getting low in room? Convert back to harvester
            // retaskUpgraderToHarvester(creep);
            // console.log(`retasked - ${creep}`);
        }
    }

    const runner = roleRunners[role];

    if (!runner)
    {
        console.warn(`No runner defined for role: ${role}`);
    }

    // Call appropriate behavior
    roleRunners[role]?.(creep);
} 

/**
 * Swap role of harvester to upgrader
 * @param creep 
 */
function retaskHarvesterToUpgrader(creep: Creep): void
{
    const memory = getCreepMemory(creep);

    memory.role = 'upgrader' satisfies Role;
    memory.lastRoleChange = Game.time;
}

/**
 * Swap role of upgrader to harvester
 * @param creep 
 */
function retaskUpgraderToHarvester(creep: Creep): void
{
    const memory = getCreepMemory(creep);

    memory.role = 'harvester' satisfies Role;
    memory.lastRoleChange = Game.time;
}

/**
 * Decide if room controller should be upgraded
 * @param currentLevel 
 * @returns 
 */
export function shouldUpgradeController(room: Room, currentLevel: number): boolean
{
    const progress = getRoomMemory(room);
    if (!progress) return false;
    if (!progress.controllerProgress) return false;

    if (currentLevel === 0 && progress.controllerProgress.totalEnergyHarvested >= 200) return true;
    else if (currentLevel === 1 && progress.controllerProgress.totalEnergyHarvested >= 45000) return true;
    return false;
}

/**
 * Return maximum energy for a room
 * @param room 
 * @returns number
 */
export function getMaximumRoomEnergy(room: Room): number
{
    return room.energyCapacityAvailable;
}

/**
 * Cleanup dead creeps and rebuild Memory.room memory.
 * This doesn’t need to run every tick to conserve CPU.
 */

function cleanupMemory()
{
    for (const name in Memory.creeps)
    {
        if (!(name in Game.creeps))
        {
            delete Memory.creeps[name];
        }
    }
    
    for (const roomName in Game.rooms)
    {
        const room = Game.rooms[roomName];
        const mem = getRoomMemory(room);
        if (!mem) return;

        mem.creeps = {};
        mem.creepCounts = {};

        const creeps = room.find(FIND_MY_CREEPS);

        for (const creep of creeps)
        {
            const creepMem = getCreepMemory(creep);
            const role = creepMem.role;
            
            if (!mem.creeps) mem.creeps = {};
            if (!mem.creepCounts) mem.creepCounts = {};
            
            mem.creeps[creep.name] = {
                id: creep.id,
                role,
            };
            
            mem.creepCounts[role] = (mem.creepCounts[role] || 0) + 1;
        }

        mem.lastCleanupTick = Game.time;
    }
}

function taskFactory(stored: StoredTask): AnyTask
{
    switch (stored.type)
    {
        case 'harvest':
            return {...stored} as HarvestTask;
        case 'upgrade':
            return {...stored} as UpgradeTask;
        case 'build':
            return {...stored} as BuildTask;
        case 'repair':
            return {...stored} as RepairTask;
        case 'resource_collection':
            return {...stored} as ResourceCollectionTask;
        case 'fill':
            return {...stored} as FillTask;
        default:
            throw new Error(`Unknown task type: ${stored.type}`);   
    }
}

function taskExists(type: TaskType, targetId: Id<_HasId>): boolean
{
    return global.allTasks.some(t => t.type === type && t.targetId === targetId);
}

/**
 * Create Task that can be overriden with required parameters
 * @param type 
 * @param data 
 * @returns 
 */
function createTask<K extends keyof TaskToTypeMap>
(
    type: K,
    data: Omit<TaskToTypeMap[K], "type" | "id"> & { id?: string }
): TaskToTypeMap[K]
{
    const id = data.id ?? `task-${Game.time}`;
    return {
        id,
        type,
        ...(data as Omit<TaskToTypeMap[K], "type" | "id">),
    } as TaskToTypeMap[K];
}

/**
 * Create Baseline Tasks Based on Phase of Room
 * These tasks can be dynamically filtered or re-prioritised
 * based on current strategy and progress
 * @param room 
 * @returns 
 */
function createTasks(room: Room, tasks: AnyTask[]): AnyTask[] | undefined
{
    // TODO Later stages of the game progress some rooms will need
    // Tasks but don't have controllers or sources
    // This will need to be refactored for those cases
    const roomMemory = getRoomMemory(room);
    if (!roomMemory) return undefined;
    if (!room.controller) return undefined;     // For now ignore rooms without a controller
    if (!roomMemory.sources) return undefined;  // For now ignore rooms without a source

    if (roomMemory.phase === RoomPhase.UnitiatedRoom) getRoomPhase(room);

    let newTasks: AnyTask[] = [];     // A list of tasks to start creep doing something in room

    switch (roomMemory.phase) {
        case RoomPhase.DeathSpiral:
            for (const source of Object.keys(roomMemory.sources))
            {
                const resourceType = getResourceTypeFromId(source as Id<Source>);
                if ( resourceType === 'unknown')
                {
                    console.warn(`[WARN] Problem with ${source} expected ${RESOURCE_ENERGY} received unknown`);
                    continue;
                }
                if (isRoomStorageFull(room)) continue;
                if (!taskExists("harvest", source as Id<Source>))
                {
                    newTasks.push(createTask(
                    "harvest",
                    {
                        id: `harvest-${source}-${Game.time}`,
                        maxCreeps: roomMemory.maxHarvesters / Object.keys(roomMemory.sources).length,
                        targetId: source as Id<Source>,
                        method: ResourceAcquisitionMethod.Harvest,
                        resourceType: resourceType,
                        status: "untasked"
                    }));
                }   
            }
            break;
        case RoomPhase.InitialBootstrap:
            for (const source of Object.keys(roomMemory.sources))
            {
                const resourceType = getResourceTypeFromId(source as Id<Source>);

                if ( resourceType === 'unknown')
                {
                    console.warn(`[WARN] Problem with ${source} expected ${RESOURCE_ENERGY} received unknown`);
                    continue;
                }
                if (isRoomStorageFull(room)) continue;
                if (!taskExists("harvest", source as Id<Source>))
                {
                    newTasks.push(createTask(
                    "harvest",
                    {
                        id: `harvest-${source}-${Game.time}`,
                        maxCreeps: roomMemory.maxHarvesters / Object.keys(roomMemory.sources).length,
                        targetId: source as Id<Source>,
                        method: ResourceAcquisitionMethod.Harvest,
                        resourceType: resourceType,
                        status: "untasked"
                    })); 
                }

                if (!taskExists("upgrade", room.controller.id))
                {
                    newTasks.push(createTask(
                    "upgrade",
                    {
                        id: `upgrade-${Game.time}`,
                        maxCreeps: getDesiredCountForRole(roomMemory.phase, 'upgrader'),
                        targetId: room.controller.id,
                        status: "untasked",
                        sourceId: source as Id<Source>
                    }));
                }
            }
            break;
        case RoomPhase.StableEarlyGame:
            for (const source of Object.keys(roomMemory.sources))
            {
                const resourceType = getResourceTypeFromId(source as Id<Source>);
                if ( resourceType === 'unknown')
                {
                    console.warn(`[WARN] Problem with ${source} expected ${RESOURCE_ENERGY} received unknown`);
                    continue;
                }
                if (isRoomStorageFull(room)) continue;
                if (taskExists("harvest", source as Id<Source>))
                {
                    newTasks.push(createTask(
                    "harvest",
                    {
                    id: `energyMiner-${source}-${Game.time}`,
                    maxCreeps: 1,
                    targetId: source as Id<Source>,
                    method: ResourceAcquisitionMethod.Harvest,
                    resourceType: resourceType,
                    status: "untasked"
                    }));
                }
                if (!taskExists("upgrade", room.controller.id))
                {
                    newTasks.push(createTask(
                    "upgrade",
                    {
                        id: `upgrade-${Game.time}`,
                        maxCreeps: getDesiredCountForRole(roomMemory.phase, 'upgrader'),
                        targetId: room.controller.id,
                        status: "untasked",
                        sourceId: source as Id<Source>
                    }));
                }
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

    tasks.push(...newTasks);
    saveTasks(tasks);

    return newTasks;
}

/**
 * TASK LOGIC - Assign tasks, execute tasks, and manage centralized coordination logic.
 */

/**
 * Assign Task to Creep
 * @param creep 
 * @param task 
 */
function assignTask(creep: Creep, task: Task): void
{
    const memory = getCreepMemory(creep);
    memory.task = task;

    const role = taskToRoleMap[task.type];
    if (memory.role !== role) memory.role = role;
    memory.task.status = 'tasked';
}

/**
 * Execute Task based on Task Type
 * @param creep 
 * @param task 
 * @returns 
 */
export function executeTask(creep: Creep, task: AnyTask): void
{
    const role = taskToRoleMap[task.type as TaskType];
    if (!role)
    {
        console.log(`[WARN] [${creep.name}] Unknown task type: ${task.type}`);
        return;
    }

    if (isResourceCollectionTask(task))
    {
        const target = Game.getObjectById(task.targetId);
        if (!target) return;

        if (hasCarry(creep))
        {
            if (task.method === ResourceAcquisitionMethod.Pickup && isPickupable(target))
            {
                creep.pickup(target);
                return;
            }
            
            if (task.method === ResourceAcquisitionMethod.Withdraw && isWithdrawable(target))
            {
                creep.withdraw(target, task.resourceType);
                return;
            }
        }
    }

    if (isFillTask(task))
    {
        const origin = Game.getObjectById(task.originId);
        const destination = Game.getObjectById(task.destinationId);

        if (!origin || !destination) return;

        if (hasCarry(creep) && creep.store.getFreeCapacity() > 0)
        {
            // TODO: Add pathing / smart withdraw logic
            // creep.withdraw(origin, task.resourceType);
            // creep.transfer(destination, task.resourceType);
        }

        return;
    }

    runCreep(creep, role);
}

/**
 * Test if the Creep ticks to live getting low
 * @param creep 
 * @returns 
 */
function shouldHandOverTask(creep: Creep): boolean
{
    return creep.ticksToLive !== undefined && creep.ticksToLive <= HANDOVER_TTL_THRESHOLD; 
}

/**
 * Model Creep Activity Upkeep
 * TODO 
 * room.energyIncomePerTick
 * room.energyExpenditurePerTick
 * room.netEnergyFlowPerTick
 * 
 * maintain a sustainability score—if your net energy flow is negative, you're in a slow death spiral.
 */
class SustainabilityPlanner
{
    constructor()
    {
        //
    }
    
    /**
     * How much energy is being collected by harvesting WORK parts each tick?
     * WORK part Harvests 2 energy units from a source per tick
     * @param room 
     * @returns energy units harvested from a source per tick
     */
    calculateEnergyInflow(room: Room): number
    {
        const roomMemory = getRoomMemory(room);
        if (!roomMemory) return 0;
        if (!roomMemory.creeps) return 0;
        let harvestingWorkParts = 0;

        for (const creepName of Object.keys(roomMemory.creeps))
        {
            if (!Game.creeps[creepName]) continue;
            const CreepMemory = getCreepMemory(Game.creeps[creepName]);
            if (!CreepMemory.task) continue;
            if (CreepMemory.task?.type === 'harvest') harvestingWorkParts += Game.creeps[creepName].getActiveBodyparts(WORK);
        }

        return harvestingWorkParts * 2;
    }
    
    /**
     * How much energy is being used by WORK parts each tick?
     * build is 5 energy per tick, repair and upgrade are 1 energy per tick
     * @param room 
     * @returns energy units being spent each tick
     */
    calculateEnergyOutflow(room: Room): number
    {
        const roomMemory = getRoomMemory(room);
        if (!roomMemory) return 0;
        if (!roomMemory.creeps) return 0;
        let outflow = 0;

        for (const creepName of Object.keys(roomMemory.creeps))
        {
            if (!Game.creeps[creepName]) continue;
            const CreepMemory = getCreepMemory(Game.creeps[creepName]);
            if (!CreepMemory.task) continue;
            const spendingWorkParts = Game.creeps[creepName].getActiveBodyparts(WORK);
            
            switch (CreepMemory.task.type)
            {
                case 'build':
                    outflow += spendingWorkParts * 5;
                    break;
                case 'repair':
                case 'upgrade':
                    outflow += spendingWorkParts;
                    break;
            }
        }
        return outflow;
    }
    
    /**
     * Difference between energyInflow and energyOutflow
     * @param room 
     * @returns Difference between energyInflow and energyOutflow 
     */
    getNetFlow(room: Room): number
    {
        return this.calculateEnergyInflow(room) - this.calculateEnergyOutflow(room); 
    }
    
    /**
     * If energy net flow is negative prune luxury tasks (build, upgrade, repair) from task list
     * @param room 
     * @returns filtered core tasks
     */
    recommendDeprioritisedTasks(room: Room, tasks: AnyTask[]): Task[]
    {
        let roomPhase;
        const netFlow = this.getNetFlow(room);
        const mem = getRoomMemory(room);
        if (mem === null)
        {
            roomPhase = RoomPhase.UnitiatedRoom;
        }
        else
        {
            roomPhase = mem.phase;   
        }

        if (netFlow < 0)
        {
            // keep core tasks harvest, fill, hand_over, defend, renew
            return tasks.filter(task => ['harvest', 'fill', 'hand_over', 'defend', 'renew'].includes(task.type));
        }

        if (roomPhase <= RoomPhase.StableEarlyGame)
        {
            // In StableEarlyGame or below remove upgrade tasks until energy flow becomes positive
            return tasks.filter(task => task.type !== 'upgrade');
        }

        return tasks;
    }
}

/**
 * Public manager lifecycle function to call each tick
 */

export const taskManager =
{
    run(): void {
        // Cleanup
        if (Game.time % 10 === 0) cleanupMemory();
        
        // Ensure Global Task Store
        const storedTasks = Memory.tasks ?? [];
        global.allTasks = storedTasks.map(taskFactory);
        let tasks = ensureGlobalTasks(); 
        
        // task cleanup
        tasks = tasks.filter(task =>
        {
            // remove if target no longer exists
            if (task.targetId && !Game.getObjectById(task.targetId)) return false;
            // remove if creep assigned is gone
            for (const id in task.assignedCreepIds)
            {
                if (task.assignedCreepIds && !Game.getObjectById(id as Id<Creep>)) return false;
            }
            return true;
        });

        // Create Tasks for Each Room
        for (const roomName in Game.rooms)
        {
            const room = Game.rooms[roomName];
            if (!room) continue;
            const mem = getRoomMemory(room);
            if (!mem) continue;
            
            createTasks(room, tasks);

            const roomSustainability = new SustainabilityPlanner();
            const roomEnergyNetFlow = roomSustainability.getNetFlow(room);

            if (roomEnergyNetFlow < 0) mem.phase = RoomPhase.DeathSpiral;
        }

        // Assign Tasks to Idle or Completed Creeps
        for (const creepName in Game.creeps)
        {
            const creep = Game.creeps[creepName];
            if (!creep) continue;
            const mem = getCreepMemory(creep);

            if (shouldHandOverTask(creep))
            {
                const task = global.allTasks.find(
                    t => t.id === mem.task?.id);
                if (task) task.status = 'hand_over';
            } 

            if (mem.task === undefined || mem.task.status === 'completed' || mem.task.status === 'error')
            {
                const role = mem.role;
                const nextTask = this.getNextAvailableTask(creep, role, tasks);
                if (nextTask) assignTask(creep, nextTask);
            }
        }

        // Execute Tasks for All Creeps
        for (const creepName in Game.creeps)
        {
            const creep = Game.creeps[creepName];
            const task = getCreepMemory(creep).task as AnyTask;
            if (task) executeTask(creep, task);
        }

        // Save Tasks
        saveTasks(tasks);
    },

    getNextAvailableTask(creep : Creep, role: Role, tasks: AnyTask[]): AnyTask | undefined
    {
        // TODO Add further logic - currently picks the first untasked task
        const task = tasks.find(t =>
        {
            const notFull = (t.assignedCreepIds?.length ?? 0) < (t.maxCreeps ?? 1);
            const availableStatus = (t.status === 'hand_over') || (t.status === 'untasked');
            
            if (!(notFull && availableStatus)) return false;

            // Match task type to body parts
            if (isHarvestTask(t) && role === 'harvester') return hasWork(creep);
            if (isBuildTask(t) && role === 'builder') return hasWork(creep) && hasCarry(creep);
            if (isRepairTask(t) && role === 'repairer') return hasWork(creep) && hasCarry(creep);
            if (isUpgradeTask(t) && role === 'upgrader') return hasWork(creep) && hasCarry(creep);
            if (isFillTask(t) && role === 'lorry') return hasCarry(creep);

            // Allow any creep if type guard didn't match
            return true;
        });

        if (task)
        {
            console.log(`Found Task Matching Criteria - ${JSON.stringify(task)}`);
            
            task.assignedCreepIds = task.assignedCreepIds || [];
            task.assignedCreepIds.push(creep.id);
        }

        return task;
    },
};