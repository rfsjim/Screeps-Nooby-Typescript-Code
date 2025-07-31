var listOfRoles = ['harvester', 'lorry', 'claimer', 'upgrader', 'cleaner', 'repairer', 'builder', 'wallRepairer', 'roleExtractor'];

// create a new function for StructureSpawn
StructureSpawn.prototype.spawnCreepsIfNecessary =
  function() {
      // check to make sure spawn not currently spawning
      if (this.spawning) return;
    // find room name
    let room = this.room;

    // check minCreeps memory exists
    // temp add Memory
    // Todo needs to be better with numbers based on current phase
    if (!this.memory.minCreeps) {
      this.memory.minCreeps = {};
      this.memory.minCreeps.harvester = 1;
      this.memory.minCreeps.lorry = 1;
      this.memory.minCreeps.claimer = 0;
      this.memory.minCreeps.upgrader = 1;
      this.memory.minCreeps.cleaner = 0;
      this.memory.minCreeps.repairer = 1;
      this.memory.minCreeps.builder = 1;
      this.memory.minCreeps.wallRepairer = 0;
      this.memory.minCreeps.roleExtractor = 0;
    }
    // find creeps in room
    let creepsInRoom = room.find(FIND_MY_CREEPS);
    let numberOfCreeps = {};
    for (let role of listOfRoles) {
      numberOfCreeps[role] = _.sum(creepsInRoom, (c) => c.memory.role == role);
    }
    // general creeps max cost will be 3.2k energy
    // starting from RCL 7 this can be used with 2.4k energy left over
    // restricting maxEnergy to only the full room capacity size is wasteful
    // at higher RCL due to lost time for maxEnergy to max out at max general creep size
    let maxEnergy = Math.min(room.energyCapacityAvailable,3200);
    let name = undefined;

    // if no harvesters and no lorries we need a back up creep
    if (numberOfCreeps['harvester'] == 0 && numberOfCreeps['lorry'] == 0) {
      // if there still are miners or enough available in the room's storage spawn first backup option
      // make sure the storage has enough for a lorry this round (min two carry one move) and
      // a miner next round ( must be five work one move)
      let minFloorRequiredEnergy = (BODYPART_COST["carry"] * 2) + BODYPART_COST["move"] +
      (BODYPART_COST["work"] * 5) + BODYPART_COST["move"];
      if (numberOfCreeps['miner'] > 0 ||
      (room.storage != undefined && room.storage.store[RESOURCE_ENERGY] >= minFloorRequiredEnergy)) {
        //create a lorry using least amount of energy required
        name = this.createLorry((BODYPART_COST["carry"] * 2) + BODYPART_COST["move"]);
      }
      // if no miners and insufficient storage left in room
      else {
        // back up option two - create harvester using available energy to get economy up and running again
        name = this.createCustomCreep(room.energyAvailable, 'harvester');
      }
    }
    // if no back up creeps required
    else {
      // make sure miner at all sources
      let sources = room.find(FIND_SOURCES);
      // loop through sources
      for (let source of sources) {
        // if the source has no miner
        if (!_.some(creepsInRoom, (c) => c.memory.role == 'miner' && c.memory.sourceId == source.id)) {
          // does source have a container?
          let containers = source.pos.findInRange(FIND_STRUCTURES, 1,
            {filter: s => s.structureType == STRUCTURE_CONTAINER
            });
            // if there is a container next to the source
            if (containers.length > 0) {
              // spawn a miner for container
              console.log("Room: " + room + " containers not being mined in room " + this.name);
              name = this.createMiner(source.id);
              break;
            }
        }
      }
    }

    // if none of others caused a spawn check for other required roles
    if (name == undefined) {
      for (let role of listOfRoles) {
        // check if any orders to claim a new room
        if (role == 'claimer' && this.memory.claimRoom != undefined) {
          // check available energy and try to spawn claimer
          console.log("Room: " + room + " " + this.name + " Trying to run claimer creation");
          if (room.energyAvailable >= (BODYPART_COST["claim"] + BODYPART_COST["move"])) {
            name = this.createClaimer(this.memory.claimRoom);
            delete this.memory.claimRoom;
            console.log("Claimer " + this.name)
          }
          if (name != undefined && _.isString(name)) {
            // delete claim order because claimer successful
            delete this.memory.claimRoom;
          }
        }
        // if no claim order continue checking roles
        // can build variable sized lorries
        else if (numberOfCreeps[role] < this.memory.minCreeps[role]) {
          if (role == 'lorry' && room.energyAvailable >= ((BODYPART_COST["carry"]*2) + BODYPART_COST["move"])) {
            name = this.createLorry(room.energyAvailable);
          }
          else {
            if (room.energyAvailable >= maxEnergy) {
            // only want full size of other creeps
            name = this.createCustomCreep(maxEnergy, role);
            console.log("Spawned custom creep in room: " + room + ", " + name + " (" + role + ")");
            }
          }
          break;
        }
      }
    }
    // if none of the above caused a spawn command check for LongDistanceHarvesters
    let numberOfLongDistanceHarvesters = {};
    if (name == undefined) {
      // count global number of harvesters
      for (let roomName in this.memory.minLongDistanceHarvesters) {
        numberOfLongDistanceHarvesters[roomName] = _.sum(Game.creeps, (c) =>
        c.memory.role == 'longDistanceHarvester' && c.memory.target == roomName);

      if (numberOfLongDistanceHarvesters[roomName] < this.memory.minLongDistanceHarvesters[roomName] &&
      room.energyAvailable >= maxEnergy) {
        name = this.createLongDistanceHarvester(maxEnergy, 2, room.name, roomName, 0);
      }
      }
    }

    if (room.storage.store[RESOURCE_ENERGY] > 0 && room.energyAvailable >= maxEnergy) {
      this.createCustomCreep(maxEnergy, 'storageUpgrader');
      console.log("Excess Storage creating Large Upgrader for " + room.name);
    }

    // if spawning was a success print name to console
    if (name != undefined && _.isString(name)) {
      console.log(this.name + " spawned new creep: " + name + " (" + Game.creeps[name].memory.role + ")");
      for (let role of listOfRoles) {
        console.log(role + ": " + numberOfCreeps[role]);
      }
      for (let roomName in numberOfLongDistanceHarvesters) {
        console.log("LongDistanceHarvester" + roomName + ": " + numberOfLongDistanceHarvesters[roomName]);
      }
    }
  };

// function to engage safe mode if required
StructureSpawn.prototype.engageSafeMode =
    function() {
        console.log("Emergency Mode " + this.room.name + " engaged");
        this.room.controller.activateSafeMode();
        this.createKungFuFighter(this.room.energyAvailable);
    }

// create new function to spawn creeps
StructureSpawn.prototype.createCustomCreep =
  function(energy, roleName) {
    // create balance creep as big as possible with the given energy
    // min parts group is a work move carry
    let minFloorRequiredEnergy = (BODYPART_COST["work"] + BODYPART_COST["move"] + BODYPART_COST["carry"])
    var numberofParts = Math.floor(energy / minFloorRequiredEnergy);
    var numberofParts = Math.min(numberofParts, Math.floor(50/3));
    var body = [];
    for (let i=0;i<numberofParts;i++) {
      body.push(WORK);
    }
    for (let i=0;i<numberofParts;i++) {
      body.push(CARRY);
    }
    for (let i=0;i<numberofParts;i++) {
      body.push(MOVE);
    }

    // create a creep with created body part for the given role
    let creepMemory = { memory: {role: roleName, working: false}};
    if (this.spawnCreep(body, roleName + Game.time, creepMemory) == 0) {
        return;
    }
  };

// create new function to spawn long distance miners
StructureSpawn.prototype.createLongDistanceHarvester =
  function(energy, numberOfWorkParts, home, target, sourceIndex) {
    // create a body array first with requested work parts
    // have one move part per non move part and ensure that specified workParts can be made otherwise reduce
    // calculate min required energy for each part group
    let minFloorLDHPartsGroup = BODYPART_COST["work"] + BODYPART_COST["carry"] + (BODYPART_COST["move"] *2);
    // ensure number of work parts is not more than can be balanced out
    numberOfWorkParts = Math.min(numberOfWorkParts, Math.floor(50/4));
    // check sufficient energy available
    if ((numberOfWorkParts * minFloorLDHPartsGroup) <= energy) {
      var body = [];
      for (let  i=0;i<numberOfWorkParts;i++) {
        body.push(WORK);
      }
    }

    // take cost of work and move from available energy to create rest of body parts using left over available energy
    let costOfWorkMove = BODYPART_COST["work"] + BODYPART_COST["move"];
    energy -= (costOfWorkMove * numberOfWorkParts);

    // numberOfParts is remaining parts to add to creep - move and carry cost
    var numberOfParts = Math.floor(energy / (BODYPART_COST["move"] + BODYPART_COST["carry"]));
    // cap final creep body parts size below 50 limit
    var numberOfParts = Math.min(numberOfParts, Math.floor(((50 - numberOfWorkParts)*2)/2));
    for (let i=0;i<numberOfParts;i++) {
      body.push(CARRY);
    }
    for (let i=0;i<numberOfParts;i++) {
      body.push(MOVE);
    }

    let creepMemory = {memory: {role: 'longDistanceHarvester',home: home,target: target,sourceIndex: sourceIndex,working: false}};
    if (this.spawnCreep(body, 'longDistanceHarvester' + Game.time, creepMemory) == 0) {
        return;
    }
  };

// create function to spawn claimer
StructureSpawn.prototype.createClaimer =
  function(target) {
    // claimer just needs move and claim part
    let creepMemory = {memory: {role: 'claimer', target: target}};
    if (this.spawnCreep([CLAIM, MOVE], 'claimer' + Game.time, creepMemory) == 0) {
        return;
    }
  };

// create function to spawn miner
StructureSpawn.prototype.createMiner =
  function(sourceId) {
    // accept sourceId that requires miner. Miners five work parts will empty a source in the refresh time frame
    let creepMemory = {memory: {role: 'miner', sourceId: sourceId}};
    if (this.spawnCreep([WORK, WORK, WORK, WORK, WORK, MOVE], 'miner' + Game.time, creepMemory) == 0) {
        return;
    }
  };

// create function to spawn lorry
StructureSpawn.prototype.createLorry =
  function(energy, newRole = 'lorry') {
    // lorry has twice the carry parts to move parts
    var numberOfParts = Math.floor(energy / ((BODYPART_COST["carry"]*2) + BODYPART_COST["move"]));
    // Make sure creep isn't too big
    numberOfParts = Math.min(numberOfParts,Math.floor(50/3));
    var body = [];
    for (let i=0;i<numberOfParts * 2;i++) {
      body.push(CARRY);
    }
    for (let i=0;i<numberOfParts;i++) {
      body.push(MOVE);
    }

    // create creep with the created body and the role lorry
    let creepMemory = {memory: {role: newRole, working: false}};
    if (this.spawnCreep(body, 'lorry'+Game.time, creepMemory) == 0) {
        return;
    }
  };

 // everybody was kung fu fighting
 StructureSpawn.prototype.createKungFuFighter =
    function(energy) {
        // composition of fighter changes depending on room size
        let roleName = "carlDouglas";
        var body = [];
        if (energy < ((BODYPART_COST["move"]*2) + BODYPART_COST["attack"] + BODYPART_COST["ranged_attack"])) {
            // not enough energy to make a ranged attacked make basic bob (for each non move part make a move part)
            var numberOfParts = Math.floor(energy / (BODYPART_COST["move"] + BODYPART_COST["attack"]));
            // keep under 50 part cap
            numberOfParts = Math.min(numberOfParts,Math.floor(50/2));
            for (let i=0;i<numberOfParts;i++) {
                body.push(ATTACK);
            }
            for (let i=0;i<numberOfParts;i++) {
                body.push(MOVE);
            }
        }
        else if (energy < ((BODYPART_COST["move"]*3) + BODYPART_COST["attack"] + BODYPART_COST["ranged_attack"] + BODYPART_COST["heal"]) ) {
            var numberOfParts = Math.floor(energy / ((BODYPART_COST["move"]*2) + BODYPART_COST["attack"] + BODYPART_COST["ranged_attack"]));
            // keep under 50 part cap
            numberOfParts = Math.min(numberOfParts,Math.floor(50/4));
            for (let i=0;i<numberOfParts;i++) {
                body.push(RANGED_ATTACK);
            }
            for (let i=0;i<numberOfParts;i++) {
                body.push(ATTACK);
            }
            for (let i=0;i<numberOfParts*2;i++) {
                body.push(MOVE);
            }
        } else {
            var numberOfParts = Math.floor(energy / ((BODYPART_COST["move"]*3) + BODYPART_COST["attack"] + BODYPART_COST["ranged_attack"] + BODYPART_COST["heal"]));
            // keep under 50 part cap
            numberOfParts = Math.min(numberOfParts,Math.floor(50/6));
            for (let i=0;i<numberOfParts;i++) {
                body.push(HEAL);
            }
            for (let i=0;i<numberOfParts;i++) {
                body.push(RANGED_ATTACK);
            }
            for (let i=0;i<numberOfParts;i++) {
                body.push(ATTACK);
            }
            for (let i=0;i<numberOfParts*3;i++) {
                body.push(MOVE);
            }
            }
            let creepMemory = {memory: {role: roleName, working: false}};
            if (this.spawnCreep(body, roleName + Game.time, creepMemory) == 0) {
                return;
            }
    };
