// Lodash is a JavaScript library which provides utility functions for common programming tasks
import filter from "lodash/filter";

declare global {
    interface CreepMemory {
        role: string;
    }
}

interface SpawnManager {
    getCreepsInRoom(roomName:string):Creep[];
    getCountOfRoles(roomName:string, role:string):number;
    getMaximumRoomEnergy(roomName:string):number;
    spawnRequiredCreeps(roomName:string):void;
}

const listOfRoles = ['harvester', 'lorry', 'claimer', 'upgrader', 'repairer', 'builder', 'wallRepairer'];

const spawnManager:SpawnManager = {
    getCreepsInRoom: (roomName) => {
        return filter(Game.creeps,
            (c) => c.room.name === Game.rooms[roomName].name);
    },
    getCountOfRoles: (roomName, role) => {
        return filter(Game.creeps,
            (c) => c.room.name === Game.rooms[roomName].name &&
            c.memory.role === role).length;
    },
    getMaximumRoomEnergy: (roomName) => {
        return Game.rooms[roomName].energyCapacityAvailable;
    },
    spawnRequiredCreeps: (roomName) => {
        for (let role in listOfRoles) {
            let memory = Memory.rooms[roomName];
            if (spawnManager.getCountOfRoles(roomName, role) <= memory[role]) {
                
            }
        }
    },
};

export default (spawnManager);

// export default StructureSpawn.prototype.spawnHarvesterIfRequired = function() {
//     const harvesters = filter(Game.creeps, 
//         (c) => c.memory.role === 'harvester' &&  
//         c.room.name === this.room.name);

//     if (harvesters.length < this.room.memory.harvesters) {
//         let newName = 'Harvester ' + Game.time;
//         this.spawnCreep([WORK, CARRY, MOVE],newName,
//             { memory: {role: 'harvester', room: this.room.name, working: false}});
//     }

//     if (this.spawning) {
//         let spawningCreep = Game.creeps[this.spawning.name];
//         this.room.visual.text(
//             '🛠️' + spawningCreep.memory.role,
//             this.pos.x + 1,
//             this.pos.y,
//             {align: 'left', opacity: 0.8});
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