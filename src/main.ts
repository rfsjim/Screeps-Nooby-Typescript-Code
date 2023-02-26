var _ = require('lodash'); // Lodash is a JavaScript library which provides utility functions for common programming tasks

// required code
require('./prototype.spawn'); // common code for all spawns

// import modules
import clearMemory from "./helper"; // local console helper functions
import initRoom from "./init"; // local initalisation functions

// import role modules
import roleHarvester from "./role.harvester"; // common code for all harvesters
import roleUpgrader from "./role.upgrader"; // common code for all upgraders
import roleBuilder from "./role.builder"; // common code for all builders

module.exports.loop = function() {

    // make sure memory is initiated & current
    for (var name in Game.rooms) {
        if (!Memory.rooms[name].name) {
            initRoom(name);
        }
    }

    for (var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory: ', name);
        }
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
    for (var name in Game.spawns) {
        if (!Game.spawns[name].spawning) {
            Game.spawns[name].spawnHarvesterIfRequired();
        }
    }
}