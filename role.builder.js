var roleUpgrader = require('./role.upgrader');

module.exports = {
  // a function to run logic for builders
  run: function(creep) {
    // if creep has a target but not in target room
    if (creep.memory.target != undefined && creep.room.name != creep.memory.target) {
      // find exit to room
      var exit = creep.room.findExitTo(creep.memory.target);
      // move to exit
      creep.moveTo(creep.pos.findClosestByRange(exit));
      // don't do anything else this turn
      return;
    }

    if (creep.memory.target != undefined && creep.room.name == creep.memory.target && creep.room.controller.ticksToDowngrade < 999) {
        roleUpgrader.run(creep);
    }

    // if creep is trying to complete a constructionSite but has no energy left
    if (creep.memory.working == true && creep.store[RESOURCE_ENERGY] == 0) {
      // switch state
      creep.memory.working = false;
    } else if (creep.memory.working == false && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
      // if creep is harvesting energy but is full
      // switch state
      creep.memory.working = true;
    }

    // if creep is completing constructionSite
    if (creep.memory.working == true) {
      // find closest constructionSite
      var constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
      // if one is found
      if (constructionSite != undefined) {
        // try to build
        if (creep.build(constructionSite) == ERR_NOT_IN_RANGE) {
          creep.moveTo(constructionSite);
        }
      } else {
        // no construction sites so upgrade the controller
        roleUpgrader.run(creep);
      }
    }
    // creep should get energy
    else {
      creep.getEnergy(true, true);
    }
  }
};
