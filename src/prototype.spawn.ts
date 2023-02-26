var _ = require('lodash'); // Lodash is a JavaScript library which provides utility functions for common programming tasks

interface StructureSpawn {
    spawnHarvesterIfRequired(): void;
}

StructureSpawn.prototype.spawnHarvesterIfRequired = function() {
    var harvesters = _.filter(Game.creeps, (creep:Creep) => 
    {creep.memory.role == 'harvester', creep.room.name == this.room.name});
    console.log('Harvesters in room "'+this.room.name+'": ' + harvesters);

    if (harvesters < 2) {
        var newName = 'Harvester ' + Game.time;
        console.log('Spawning new harvester: ' + newName);
        this.spawnCreep([WORK, CARRY, MOVE],newName, {memory: {role: 'harvester'}});
    }

    if (this.spawning) {
        var spawningCreep = Game.creeps[this.spawning.name];
        this.room.visual.text(
            '🛠️' + spawningCreep.memory.role,
            this.pos.x + 1,
            this.pos.y,
            {align: 'left', opacity: 0.8});
    }
}