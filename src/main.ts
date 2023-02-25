// import modules
import clearMemory from "./helper";
import initRoom from "./init";

// import role modules
import roleHarvester from "./role.harvester";
import roleUpgrader from "./role.upgrader";
import roleBuilder from "./role.builder";

module.exports.loop = function() {

    // make sure memory is initiated
    if (!Memory.rooms[Game.spawns["Spawn1"].room.name]) {
        initRoom(Game.spawns.room.name);
    }

    // get current progress
    for (var name in Game.rooms) {
        console.log('Room "'+name+'" has '+Game.rooms[name].energyAvailable+' energy');
    }

    // run tick logic
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if (creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if (creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }   
    }
}