import { CreepMemory } from "types";

export function manageSpawning()
{
    const harvesters = Object.values(Game.creeps).filter((c) => (c.memory as CreepMemory).role === 'harvester');
    const upgraders = Object.values(Game.creeps).filter((c) => (c.memory as CreepMemory).role === 'upgrader');

    const spawn = Game.spawns['Spawn1'];

    if (!spawn.spawning)
    {
        if (harvesters.length < 2)
            {
                spawn.spawnCreep([WORK, CARRY, MOVE], `harvester-${Game.time}`, {
                    memory: { role: "harvester", working: false}
                });
            } else if (upgraders.length < 1)
            {
                spawn.spawnCreep([WORK, CARRY, MOVE], `upgrader - ${Game.time}`, {
                    memory: {role: "upgrader", working: false}
                });
            }
    } else
    {
        const spawningCreep = Game.creeps[spawn.spawning.name];
        spawn.room.visual.text(
            '🛠️' + (spawningCreep.memory as CreepMemory).role,
            spawn.pos.x + 1,
            spawn.pos.y,
            {align: 'left', opacity: 0.8});
    }
}

// interface SpawnManager {
//     getCreepsInRoom(roomName:string):Creep[];
//     getCountOfRoles(roomName:string, role:string):number;
//     getMaximumRoomEnergy(roomName:string):number;
//     spawnRequiredCreeps(roomName:string):void;
// }

// const listOfRoles = ['harvester', 'lorry', 'claimer', 'upgrader', 'repairer', 'builder', 'wallRepairer'];

// const spawnManager:SpawnManager = {
//     getCreepsInRoom: (roomName) => {
//         return filter(Game.creeps,
//             (c) => c.room.name === Game.rooms[roomName].name);
//     },
//     getCountOfRoles: (roomName, role) => {
//         return filter(Game.creeps,
//             (c) => c.room.name === Game.rooms[roomName].name &&
//             c.memory.role === role).length;
//     },
//     getMaximumRoomEnergy: (roomName) => {
//         return Game.rooms[roomName].energyCapacityAvailable;
//     },
//     spawnRequiredCreeps: (roomName) => {
//         for (let role in listOfRoles) {
//             let memory = Memory.rooms[roomName];
//             if (spawnManager.getCountOfRoles(roomName, role) <= memory[role]) {
                
//             }
//         }
//     },
// };

// export default (spawnManager);

// export default StructureSpawn.prototype.spawnHarvesterIfRequired = function() {
//     const harvesters = filter(Game.creeps, 
//         (c) => c.memory.role === 'harvester' &&  
//         c.room.name === this.room.name);

//     if (harvesters.length < this.room.memory.harvesters) {
//         let newName = 'Harvester ' + Game.time;
//         this.spawnCreep([WORK, CARRY, MOVE],newName,
//             { memory: {role: 'harvester', room: this.room.name, working: false}});
//     }

//     const upgraders = filter(Game.creeps,
//         (c) => c.memory.role === 'upgrader' &&
//         c.room.name === this.room.name);

//     if (upgraders.length < 3) {
//         const newName = 'Upgrader ' + Game.time;
//         this.spawnCreep([WORK, CARRY, MOVE], newName,
//             {memory: {role: 'upgrader', room: this.room.name, working:false}});
//     }
// };