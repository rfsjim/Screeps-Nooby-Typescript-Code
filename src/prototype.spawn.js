const listOfRoles = [
	'harvester',
	'lorry',
	'miner',
	'claimer',
	'upgrader',
	'repairer',
	'builder',
	'wallRepairer'
];

// create a new function for StructureSpawn
StructureSpawn.prototype.spawnCreepsIfNecessary =
  function() {
    // find room name
    const room = this.room;
	if (!this.my || this.spawning) {return;}
	const sources = room.find(FIND_SOURCES);

    // find creeps in room
    const creepsInRoom = room.find(FIND_MY_CREEPS);
    const numberOfCreeps = {};
    for (const role of listOfRoles) {
      numberOfCreeps[role] = _.sum(creepsInRoom, (c) => c.memory.role === role);
      // console.log(role + ": " + numberOfCreeps[role] + " - " + JSON.stringify(creepsInRoom));
    }
    const maxEnergy = room.energyCapacityAvailable; 
	const currentEnergy = room.energyAvailable;
	const containers = room.find(
		FIND_STRUCTURES, {
			filter: s => s.structureType === STRUCTURE_CONTAINER
		});
	const containerEnergy = _.sum(
		containers,
		c => c.store[RESOURCE_ENERGY]
	);
	const storageEnergy = room.storage?.store[RESOURCE_ENERGY] ?? 0;
	const availableEnergy = currentEnergy + storageEnergy + containerEnergy;

	const canSpawnHarvester = currentEnergy >= 200;
	//TODO Needed?: const canFundSpecialisedRecovery = currentEnergy >= 800;
	const hasRecoveryEnergy = availableEnergy >= 800;

    let name = undefined;

	// Priority 1 - Keep the colony safe and productive
	const hasHarvester = numberOfCreeps.harvester > 0;
	const hasLorry = numberOfCreeps.lorry > 0;
	const hasMiner = numberOfCreeps.miner > 0;

	const hasEnergySupply = hasMiner || containerEnergy > 0;
	const hasEnergyProduction = hasHarvester || hasMiner;
	const hasEnergyDelivery = hasHarvester || (hasLorry && hasEnergySupply);
	const hasTransportableEnergy = containerEnergy + storageEnergy > 0;

	const needsEconomyRecovery = !hasEnergyProduction || !hasEnergyDelivery;
	const needsEnergyTransport = !hasHarvester && !hasLorry;
	
	const canSpawnLorry = currentEnergy >= 150 && hasRecoveryEnergy && hasTransportableEnergy && needsEnergyTransport;

	if (needsEconomyRecovery) {
		if (canSpawnLorry) {
			const attempt = this.createLorry((BODYPART_COST[CARRY] * 2) + BODYPART_COST[MOVE]);

			if (attempt.result === OK) {
				name = attempt.name;
				console.log('Create Lorry');
				return;
			}
			if (attempt.result === ERR_BUSY) {return;} 
		}
		if (canSpawnHarvester) {
			const attempt= this.createCustomCreep(200, 'harvester');

			if (attempt.result === OK) {
				name = attempt.name;
				console.log('Create Harvester');
				return;
			}
			if (attempt.result === ERR_BUSY) {return;} 
		}
		return;
	}
	// Priority 2 maintain dedicated miners
	for (const source of sources) {
		const sourceContainer = containers.find(
		container => source.pos.inRangeTo(container.pos, 1)
		);

		if (!sourceContainer) {continue;}

		const hasAssignedMiner = creepsInRoom.some(
		c => c.memory.role === 'miner' &&
		c.memory.sourceId === source.id
		);

		if (hasAssignedMiner) {continue;}

		const minerCost = (BODYPART_COST[WORK] * 5) + BODYPART_COST[MOVE];

		if (currentEnergy < minerCost) {return;}

		const attempt = this.createMiner(source.id);
		if (attempt.result === OK) {
		name = 'miner' + Game.time;
		console.log('Create Miner');
		return;
		}

		if (
		attempt.result === ERR_BUSY ||
		attempt.result === ERR_NOT_ENOUGH_ENERGY) {return;}

		return;
	}

    // if none of others caused a spawn check for other required roles
    if (name === undefined) {
      for (const role of listOfRoles) {
        // check if any orders to claim a new room
        if (role === 'claimer' && this.memory.claimRoom !== undefined) {
            console.log('Role Claimer?');
          // check available energy and try to spawn claimer
          if (
			currentEnergy >= (BODYPART_COST['claim'] + BODYPART_COST['move'])) {
            name = this.createClaimer(this.memory.claimRoom);
            console.log('Create Claimer');
          }
          if (name !== undefined && _.isString(name)) {
            // delete claim order because claimer successful
            delete this.memory.claimRoom;
          }
        }
        // if no claim order continue checking roles
        else if (numberOfCreeps[role] < this.memory.minCreeps[role]) {
          if (
			role === 'lorry' &&
			currentEnergy >= (
				(BODYPART_COST['carry']*2) + BODYPART_COST['move']
			)) {
            name = this.createLorry(currentEnergy);
            console.log('Create Lorry');
          }
          else {
            if (currentEnergy === maxEnergy) {
            name = this.createCustomCreep(maxEnergy, role);
            console.log(`Create Custom ${role}`);
            }
          }
          break;
        }
      }
    }

    // if none of the above caused a spawn command check for LongDistanceHarvesters
    const numberOfLongDistanceHarvesters = {};
    if (name === undefined) {
      // count global number of harvesters
      for (const roomName in this.memory.minLongDistanceHarvesters) {
        numberOfLongDistanceHarvesters[roomName] = _.sum(Game.creeps, (c) =>
        c.memory.role === 'longDistanceHarvester' && c.memory.target === roomName);

      if (
		numberOfLongDistanceHarvesters[roomName] <
		this.memory.minLongDistanceHarvesters[roomName] &&
		currentEnergy === maxEnergy
		) {
        name = this.createLongDistanceHarvester(maxEnergy, 2, room.name, roomName, 0);
        console.log('Create Long Distance Harvester');
      }
      }
    }
    // if spawning was a success print name to console
    if (name !== undefined && _.isString(name)) {
      console.log(
		`${this.name} spawned new creep: ${name} ( ${Game.creeps[name].memory.role} )`
		);
      for (const role of listOfRoles) {
        console.log(`${role}: ${numberOfCreeps[role]}`);
      }
      for (const roomName in numberOfLongDistanceHarvesters) {
        console.log(
			`LongDistanceHarvester ${roomName}: ${numberOfLongDistanceHarvesters[roomName]}`
		);
      }
    }
    };

// create new function to spawn creeps
StructureSpawn.prototype.createCustomCreep =
  function(energy, roleName) {
    // create balance creep as big as possible with the given energy
    // min parts group is a work move carry
    const minFloorRequiredEnergy = (
		BODYPART_COST['work'] + BODYPART_COST['move'] + BODYPART_COST['carry']);
    let numberofParts = Math.floor(energy / minFloorRequiredEnergy);
    numberofParts = Math.min(numberofParts, Math.floor(50/3));
    const body = [];
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
    const creepMemory = { memory: {role: roleName, working: false}};
	const name = roleName + Game.time;

	return {
		name: name,
		result: this.spawnCreep(
			body,
			name,
			creepMemory
		)
	};
  };

// create new function to spawn long distance miners
StructureSpawn.prototype.createLongDistanceHarvester =
  function(energy, numberOfWorkParts, home, target, sourceIndex) {
    // create a body array first with requested work parts
    // have one move part per non move part and ensure that specified workParts can be made otherwise reduce
    // calculate min required energy for each part group
    const minFloorLDHPartsGroup = 
	BODYPART_COST['work'] + BODYPART_COST['carry'] + (BODYPART_COST['move'] *2);
    // ensure number of work parts is not more than can be balanced out
    numberOfWorkParts = Math.min(numberOfWorkParts, Math.floor(50/4));
    // check sufficient energy available
    if ((numberOfWorkParts * minFloorLDHPartsGroup) <= energy) {
      const body = [];
      for (let  i=0;i<numberOfWorkParts;i++) {
        body.push(WORK);
      }
    }

    // take cost of work and move from available energy to create rest of body parts using left over available energy
    const costOfWorkMove = BODYPART_COST['work'] + BODYPART_COST['move'];
    energy -= (costOfWorkMove * numberOfWorkParts);

    // numberOfParts is remaining parts to add to creep - move and carry cost
    let numberOfParts = Math.floor(
		energy / (BODYPART_COST['move'] + BODYPART_COST['carry']));
    // cap final creep body parts size below 50 limit
    numberOfParts = Math.min(numberOfParts, Math.floor(((50 - numberOfWorkParts)*2)/2));
    for (let i=0;i<numberOfParts;i++) {
      body.push(CARRY);
    }
    for (let i=0;i<numberOfParts;i++) {
      body.push(MOVE);
    }

    const creepMemory = {
		memory: 
		{role: 'longDistanceHarvester',
			home: home,
			target: target,
			sourceIndex: sourceIndex,
			working: false
		}};
    return this.spawnCreep(body, 'longDistanceHarvester' + Game.time, creepMemory);
  };

// create function to spawn claimer
StructureSpawn.prototype.createClaimer =
  function(target) {
    // claimer just needs move and claim part
    const creepMemory = {memory: {role: 'claimer', target: target}};
    return this.spawnCreep([CLAIM, MOVE], 'claimer' + Game.time, creepMemory);
  };

// create function to spawn miner
StructureSpawn.prototype.createMiner =
  function(sourceId) {
    // accept sourceId that requires miner. Miners five work parts will empty a source in the refresh time frame
    const creepMemory = {memory: {role: 'miner', sourceId: sourceId}};
	const name = 'miner' + Game.time;
	const body = [WORK, WORK, WORK, WORK, WORK, MOVE];

	return {
		name: name,
		result: this.spawnCreep(
			body,
			name,
			creepMemory
		)
	};
  };

// create function to spawn lorry
StructureSpawn.prototype.createLorry =
  function(energy) {
    // lorry has twice the carry parts to move parts
    let numberOfParts = Math.floor(
		energy / ((BODYPART_COST[CARRY]*2) + BODYPART_COST[MOVE]));
    // Make sure creep isn't too big
    numberOfParts = Math.min(numberOfParts,Math.floor(50/3));
    const body = [];
    for (let i=0;i<numberOfParts * 2;i++) {
      body.push(CARRY);
    }
    for (let i=0;i<numberOfParts;i++) {
      body.push(MOVE);
    }

    // create creep with the created body and the role lorry
    const creepMemory = {
		memory: {
			role: 'lorry',
			working: false
		}
	};
	const name = 'lorry' + Game.time;

	return {
		name: name,
		result: this.spawnCreep(
			body,
			name,
			creepMemory
		)
	};
  };
