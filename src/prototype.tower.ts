interface StructureTower {
    repairClosestStructure():void;
    attackClosestHostile():void;
}

StructureTower.prototype.repairClosestStructure = function() {
    var closestDamagedStructre = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure:Structure) => structure.hits < structure.hitsMax 
    });

    if (closestDamagedStructre) {
        this.repair(closestDamagedStructre);
    }
};

StructureTower.prototype.attackClosestHostile = function() {
    var closestHostile = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

    if (closestHostile) {
        this.attack(closestHostile);
    }
    };