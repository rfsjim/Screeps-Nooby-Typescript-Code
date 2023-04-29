// Lodash is a JavaScript library which provides utility functions for common programming tasks
import filter from "lodash/filter";;

declare global {
    interface StructureSpawn {
        spawnHarvesterIfRequired(): void;
    }

    interface CreepMemory {
        role: string;
    }
}

export default StructureSpawn.prototype.spawnHarvesterIfRequired = function() {
    let harvesters = filter(Game.creeps, 
        (c) => c.memory.role === 'harvester' &&  
        c.room.name === this.room.name);
    console.log(`Harvesters in room ${this.room.name} : ${harvesters}`);

    if (harvesters.length < 2) {
        let newName = 'Harvester ' + Game.time;
        console.log('Spawning new harvester: ' + newName);
        this.spawnCreep([WORK, CARRY, MOVE],newName,
            { memory: {role: 'harvester', room: this.room.name, working: false}});
    }

    if (this.spawning) {
        let spawningCreep = Game.creeps[this.spawning.name];
        this.room.visual.text(
            '🛠️' + spawningCreep.memory.role,
            this.pos.x + 1,
            this.pos.y,
            {align: 'left', opacity: 0.8});
    }
};