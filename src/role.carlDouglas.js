module.exports = {

    /** @param {Creep} creep **/
    run: function(creep) {

      //find hostile creeps to attack if creep has attack parts
      if (creep.getActiveBodyparts(ATTACK)>0) {
        var target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
      }

      // find creeps to heal if creep has heal parts - simultaneous execution of actions does right most action first
      // so, if heal is at end of code it will cancel out any attacks, best to get it out of the way if needed
      // not all creeps will have heal parts so most will skip this section
      if (creep.getActiveBodyparts(HEAL)>0) {
        //first heal self if needed
        if (creep.hits < creep.hitsMax) {
          creep.heal(creep);
          return;
        }
        //find my creeps in room to heal if required
        var healTarget = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
          filter: function(object) {
            return object.hits < object.hitsMax;
          }
        });
        if (healTarget) {
          // melee heal is better try it first
          if (creep.heal(healTarget) == ERR_NOT_IN_RANGE) {
            // if out of melee range try ranged heal
            if (creep.rangedHeal(healTarget) == ERR_NOT_IN_RANGE) {
              // otherwise move closer
              creep.moveTo(healTarget);
            }
          }
          return;
        }
      }

      //work on attacking
      if (target) {
        // creeps with ranged attack should move in with ranged attack first
        if (creep.getActiveBodyparts(RANGED_ATTACK)>0) {
          // melee attack stronger than ranged attack, try melee first
          if (creep.attack(target) == ERR_NOT_IN_RANGE) {
            // too far away for melee try rangedAttacks
            let targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
            if (targets.length > 0) {
              // rangedMassAttack provides bonus splash damage
              creep.rangedMassAttack();
              return;
            } else if (creep.rangedAttack(target) == ERR_NOT_IN_RANGE) {
              //keep walking towards the badie
              creep.moveTo(target);
            }
          }
        } else if (creep.getActiveBodyparts(ATTACK)>0) {
            if (creep.attack(target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(target);
            }
          }
        }
      }
};
