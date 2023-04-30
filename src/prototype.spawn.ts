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

    if (harvesters.length < this.room.memory.harvesters) {
        let newName = 'Harvester ' + Game.time;
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

    let upgraders = filter(Game.creeps,
        (c) => c.memory.role === 'upgrader' &&
        c.room.name === this.room.name);

    if (upgraders.length < 3) {
        let newName = 'Upgrader ' + Game.time;
        this.spawnCreep([WORK, CARRY, MOVE], newName,
            {memory: {role: 'upgrader', room: this.room.name, working:false}});
    }
};