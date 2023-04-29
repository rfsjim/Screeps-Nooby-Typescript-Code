interface TowerManager {
    repairClosestStructure(tower:StructureTower):void;
    attackClosestHostile(tower:StructureTower):void;
}

const towerManager:TowerManager = {
    repairClosestStructure: (tower) => {
        let closestDamagedStructre = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure:Structure) => structure.hits < structure.hitsMax 
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
    }
};

export default (towerManager);