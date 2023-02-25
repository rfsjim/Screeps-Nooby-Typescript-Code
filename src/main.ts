// import modules
import clearMemory from "./helper";
import initRoom from "./init";

module.exports.loop = function() {

    // make sure memory is initiated
    if (!Memory.rooms[Game.spawns["Spawn1"].room.name]) {
        initRoom(Game.spawns.room.name);
    }

    // get current progress

    // run tick logic
    
}