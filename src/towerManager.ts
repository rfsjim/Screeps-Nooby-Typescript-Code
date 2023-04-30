interface TowerManager {
    repairClosestStructure(tower:StructureTower):void;
    attackClosestHostile(tower:StructureTower):void;
    healClosestCreep(tower:StructureTower):void;
}

const towerManager:TowerManager = {
    repairClosestStructure: (tower) => {
        let closestDamagedStructre = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure:Structure) => structure.hits < (structure.hitsMax / 8)
        });
    
        if (closestDamagedStructre) {
            tower.repair(closestDamagedStructre);
        }
    },
    attackClosestHostile: (tower) => {
        let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        
        if (closestHostile) {
            tower.attack(closestHostile);
        }
    },
    healClosestCreep: (tower) => {
        let closestDamagedCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: (myCreep:Creep) => myCreep.hits < myCreep.hitsMax
        });
    }
};

export default (towerManager);