import sortBy from "lodash/sortBy";
import filter from "lodash/filter";

export default class towerManager {
    repairClosestStructure(tower:StructureTower) {
        const damagedStructre = filter(Game.structures,
            (s) => s.hits < (s.hitsMax * 0.8) &&
                   s.hits < 10000
            );
        const mostDamagedStructre = sortBy(damagedStructre, 'hits');
            
        if (mostDamagedStructre && tower.store[RESOURCE_ENERGY] >= tower.store.getCapacity(RESOURCE_ENERGY) /2) {
            tower.repair(mostDamagedStructre[0]);
        }
    }

    attackClosestHostile(tower:StructureTower) {
        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                
        if (closestHostile) {
            tower.attack(closestHostile);
        }
    }

    healClosestCreep(tower:StructureTower) {
        const closestDamagedCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: (myCreep:Creep) => myCreep.hits < myCreep.hitsMax
        });

        if (closestDamagedCreep) {
            tower.heal(closestDamagedCreep);
        }
    }    
}