// import modules
import clearMemory from "./helper";
import initRoom from "./init";

// import role modules
import roleHarvester from "./role.harvester";

module.exports.loop = function() {

    // make sure memory is initiated
    if (!Memory.rooms[Game.spawns["Spawn1"].room.name]) {
        initRoom(Game.spawns.room.name);
    }

    // get current progress

    // run tick logic
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        roleHarvester.run(creep);
    }
    
}