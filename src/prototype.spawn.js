const listOfRoles = [
	'harvester',
	'lorry',
	'miner',
	'claimer',
	'upgrader',
	'repairer',
	'builder',
	'wallRepairer',
	'extractor',
];

// create a new function for StructureSpawn
StructureSpawn.prototype.spawnCreepsIfNecessary = function () {
	// find room name
	const room = this.room;
	if (!this.my || this.spawning) {
		return;
	}
	const sources = room.find(FIND_SOURCES);

	// find creeps in room
	const creepsInRoom = room.find(FIND_MY_CREEPS);
	const numberOfCreeps = {};
	for (const role of listOfRoles) {
		numberOfCreeps[role] = _.sum(
			creepsInRoom,
			(c) => c.memory.role === role,
		);
	}
	const maxEnergy = room.energyCapacityAvailable;
	const currentEnergy = room.energyAvailable;
	const containers = room.find(FIND_STRUCTURES, {
		filter: (s) => s.structureType === STRUCTURE_CONTAINER,
	});
	const containerEnergy = _.sum(containers, (c) => c.store[RESOURCE_ENERGY]);
	const storageEnergy = room.storage?.store[RESOURCE_ENERGY] ?? 0;
	const availableEnergy = currentEnergy + storageEnergy + containerEnergy;

	const canSpawnHarvester = currentEnergy >= 200;
	//TODO Needed? Currently not used:
	// const canFundSpecialisedRecovery = currentEnergy >= 800;
	const hasRecoveryEnergy = availableEnergy >= 800;
	const ownedRoomCount = Object.values(Game.rooms).filter(
		(room) => room.controller?.my,
	).length;

	let name = undefined;

	// Priority 1 - Keep the colony safe and productive
	const hasHarvester = numberOfCreeps.harvester > 0;
	const hasLorry = numberOfCreeps.lorry > 0;
	const hasMiner = numberOfCreeps.miner > 0;

	const hasEnergySupply = hasMiner || containerEnergy > 0;
	const hasEnergyProduction = hasHarvester || hasMiner;
	const hasEnergyDelivery = hasHarvester || (hasLorry && hasEnergySupply);
	const hasTransportableEnergy = containerEnergy + storageEnergy > 0;
	const hasConstructionSites =
		room.find(FIND_CONSTRUCTION_SITES, {
			filter: (s) => s.my,
		}).length > 0;
	const hasAvailableClaimSlot = ownedRoomCount < Game.gcl.level;
	let hasExtractor = false;
	if (room.controller?.level >= 6) {
		hasExtractor =
			room.find(FIND_MY_STRUCTURES, {
				filter: (structure) =>
					structure.structureType === STRUCTURE_EXTRACTOR,
			}).length > 0;
	}

	const needsEconomyRecovery = !hasEnergyProduction || !hasEnergyDelivery;
	const needsEnergyTransport = !hasHarvester && !hasLorry;
	const needsRepairs =
		room.find(FIND_STRUCTURES, {
			filter: (s) =>
				s.hits < s.hitsMax &&
				s.structureType !== STRUCTURE_WALL &&
				s.structureType !== STRUCTURE_RAMPART,
		}).length > 0;
	// TODO: Review wall/rampart repair thresholds and align with role target selection.
	const needsWallRepairs =
		room.find(FIND_STRUCTURES, {
			filter: (s) =>
				(s.structureType === STRUCTURE_WALL ||
					s.structureType === STRUCTURE_RAMPART) &&
				s.hits < s.hitsMax * 0.5,
		}).length > 0;

	const canSpawnLorry =
		currentEnergy >= 150 &&
		hasRecoveryEnergy &&
		hasTransportableEnergy &&
		needsEnergyTransport;
	const canSpawnExtractor =
		room.controller?.level >= 6 &&
		hasExtractor &&
		room.storage !== undefined &&
		room.terminal !== undefined;

	if (needsEconomyRecovery) {
		if (canSpawnLorry) {
			const attempt = this.createLorry(
				BODYPART_COST[CARRY] * 2 + BODYPART_COST[MOVE],
			);

			if (attempt.result === OK) {
				name = attempt.name;
				return;
			}
			if (attempt.result === ERR_BUSY) {
				return;
			}
		}
		if (canSpawnHarvester) {
			const attempt = this.createCustomCreep(200, 'harvester');

			if (attempt.result === OK) {
				name = attempt.name;
				return;
			}
			if (attempt.result === ERR_BUSY) {
				return;
			}
		}
		return;
	}
	// Priority 2 maintain dedicated miners
	for (const source of sources) {
		const sourceContainer = containers.find((container) =>
			source.pos.inRangeTo(container.pos, 1),
		);

		if (!sourceContainer) {
			continue;
		}

		const hasAssignedMiner = creepsInRoom.some(
			(c) => c.memory.role === 'miner' && c.memory.sourceId === source.id,
		);

		if (hasAssignedMiner) {
			continue;
		}

		const minerCost = BODYPART_COST[WORK] * 5 + BODYPART_COST[MOVE];

		if (currentEnergy < minerCost) {
			return;
		}

		const attempt = this.createMiner(source.id);
		if (attempt.result === OK) {
			name = attempt.name;
			return;
		}

		if (
			attempt.result === ERR_BUSY ||
			attempt.result === ERR_NOT_ENOUGH_ENERGY
		) {
			return;
		}

		return;
	}

	// if none of others caused a spawn check for other required roles
	if (name === undefined) {
		for (const role of listOfRoles) {
			if (role === 'harvester') {
				continue;
			}
			// check if any orders to claim a new room
			if (role === 'claimer' && this.memory.claimRoom !== undefined) {
				// check available energy and try to spawn claimer
				const claimerRoleCost =
					BODYPART_COST[CLAIM] + BODYPART_COST[MOVE];
				if (!hasAvailableClaimSlot || currentEnergy < claimerRoleCost) {
					continue;
				}

				const attempt = this.createClaimer(
					this.memory.claimRoom,
					'claim',
				);

				if (attempt.result === OK) {
					name = attempt.name;
					//TODO What happens if the spawn stops existing before this was spawned?
					// May need a state machine pending → spawning → travelling → claimed
					delete this.memory.claimRoom;
					break;
				}

				return;
			}
			// if no claim order continue checking roles
			if (numberOfCreeps[role] < this.memory.minCreeps[role]) {
				if (role === 'lorry') {
					const lorryCost =
						BODYPART_COST[CARRY] * 2 + BODYPART_COST[MOVE];
					if (currentEnergy < lorryCost) {
						continue;
					}

					const attempt = this.createLorry(currentEnergy);

					if (attempt.result === OK) {
						name = attempt.name;
						break;
					}

					return;
				}
				if (currentEnergy === maxEnergy) {
					if (role === 'builder' && !hasConstructionSites) {
						continue;
					}
					if (role === 'repairer' && !needsRepairs) {
						continue;
					}
					if (role === 'wallRepairer' && !needsWallRepairs) {
						continue;
					}
					if (role === 'extractor' && !canSpawnExtractor) {
						continue;
					}

					const attempt = this.createCustomCreep(maxEnergy, role);
					if (attempt.result === OK) {
						name = attempt.name;
						break;
					}

					if (attempt.result === ERR_BUSY) {
						return;
					}
				}
			}
		}
	}

	// if none of the above caused a spawn command check for LongDistanceHarvesters
	const numberOfLongDistanceHarvesters = {};
	if (name === undefined) {
		// count global number of harvesters
		for (const roomName in this.memory.minLongDistanceHarvesters) {
			numberOfLongDistanceHarvesters[roomName] = _.sum(
				Game.creeps,
				(c) =>
					c.memory.role === 'longDistanceHarvester' &&
					c.memory.target === roomName,
			);

			if (
				numberOfLongDistanceHarvesters[roomName] <
					this.memory.minLongDistanceHarvesters[roomName] &&
				currentEnergy === maxEnergy
			) {
				const attempt = this.createLongDistanceHarvester(
					maxEnergy,
					2,
					room.name,
					roomName,
					0,
				);

				if (attempt.result === OK) {
					name = attempt.name;
					break;
				}

				if (
					attempt.result === ERR_BUSY ||
					attempt.result === ERR_INVALID_ARGS ||
					attempt.result === ERR_NOT_ENOUGH_ENERGY
				) {
					console.log(attempt.result);
					return;
				}
			}
		}
	}
	// if spawning was a success print name to console
	if (name !== undefined && _.isString(name)) {
		console.log(`${this.name} spawned new creep: ${name}`);
		for (const role of listOfRoles) {
			console.log(`${role}: ${numberOfCreeps[role]}`);
		}
		for (const roomName in numberOfLongDistanceHarvesters) {
			console.log(
				`LongDistanceHarvester ${roomName}: ${numberOfLongDistanceHarvesters[roomName]}`,
			);
		}
	}
};

// create new function to spawn creeps
StructureSpawn.prototype.createCustomCreep = function (energy, roleName) {
	// create balance creep as big as possible with the given energy
	// min parts group is a work move carry
	if (energy < 200) {
		return {
			name: undefined,
			result: ERR_NOT_ENOUGH_ENERGY,
		};
	}
	const minFloorRequiredEnergy =
		BODYPART_COST[WORK] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY];
	let numberofParts = Math.floor(energy / minFloorRequiredEnergy);
	numberofParts = Math.min(numberofParts, Math.floor(MAX_CREEP_SIZE / 3));
	const body = [];
	for (let i = 0; i < numberofParts; i++) {
		body.push(WORK);
	}
	for (let i = 0; i < numberofParts; i++) {
		body.push(CARRY);
	}
	for (let i = 0; i < numberofParts; i++) {
		body.push(MOVE);
	}

	// create a creep with created body part for the given role
	const creepMemory = { memory: { role: roleName, working: false } };
	const name = roleName + Game.time;

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

// create new function to spawn long distance miners
StructureSpawn.prototype.createLongDistanceHarvester = function (
	energy,
	numberOfWorkParts,
	home,
	target,
	sourceIndex,
) {
	// create a body array first with requested work parts
	const body = [];
	// have one move part per non move part and ensure that specified workParts can be made otherwise reduce
	// min required energy for smallest creep is 250
	if (energy < 250) {
		return {
			name: undefined,
			result: ERR_NOT_ENOUGH_ENERGY,
		};
	}
	// numberOfWorkParts is a positive number between 1 and 5
	if (
		!Number.isInteger(numberOfWorkParts) ||
		numberOfWorkParts < 1 ||
		numberOfWorkParts > 5
	) {
		return {
			name: undefined,
			result: ERR_INVALID_ARGS,
		};
	}
	// calculate min required energy for each part group
	const minFloorLDHPartsGroup =
		BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE] * 2;
	// ensure number of work parts is not more than can be balanced out
	numberOfWorkParts = Math.min(
		numberOfWorkParts,
		Math.floor(MAX_CREEP_SIZE / 10),
		Math.floor(energy / minFloorLDHPartsGroup),
	);

	// take cost of work and move from available energy to create rest of body parts using left over available energy
	const costOfWorkMove = BODYPART_COST[WORK] + BODYPART_COST[MOVE];
	const remainingEnergy = energy - costOfWorkMove * numberOfWorkParts;
	const numberOfCarryParts = Math.min(
		Math.floor(
			remainingEnergy / (BODYPART_COST[CARRY] + BODYPART_COST[MOVE]),
		),
		Math.floor(MAX_CREEP_SIZE / 2) - numberOfWorkParts,
	);

	for (let i = 0; i < numberOfWorkParts; i++) {
		body.push(WORK);
	}

	for (let i = 0; i < numberOfCarryParts; i++) {
		body.push(CARRY);
	}

	for (let i = 0; i < numberOfWorkParts + numberOfCarryParts; i++) {
		body.push(MOVE);
	}

	const creepMemory = {
		memory: {
			role: 'longDistanceHarvester',
			home: home,
			target: target,
			sourceIndex: sourceIndex,
			working: false,
		},
	};
	const name = 'longDistanceHarvester' + Game.time;

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

// create function to spawn claimer
StructureSpawn.prototype.createClaimer = function (target, action) {
	// claimer just needs move and claim part
	const creepMemory = {
		memory: { role: 'claimer', target: target, controllerAction: action },
	};
	const name = 'claimer' + Game.time;
	const body = [CLAIM, MOVE];

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

// create function to spawn miner
StructureSpawn.prototype.createMiner = function (sourceId) {
	// accept sourceId that requires miner. Miners five work parts will empty a source in the refresh time frame
	const creepMemory = { memory: { role: 'miner', sourceId: sourceId } };
	const name = 'miner' + Game.time;
	const body = [WORK, WORK, WORK, WORK, WORK, MOVE];

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

// create function to spawn lorry
StructureSpawn.prototype.createLorry = function (energy) {
	// lorry has twice the carry parts to move parts
	let numberOfParts = Math.floor(
		energy / (BODYPART_COST[CARRY] * 2 + BODYPART_COST[MOVE]),
	);
	// Make sure creep isn't too big
	numberOfParts = Math.min(numberOfParts, Math.floor(MAX_CREEP_SIZE / 3));
	const body = [];
	for (let i = 0; i < numberOfParts * 2; i++) {
		body.push(CARRY);
	}
	for (let i = 0; i < numberOfParts; i++) {
		body.push(MOVE);
	}

	// create creep with the created body and the role lorry
	const creepMemory = {
		memory: {
			role: 'lorry',
			working: false,
		},
	};
	const name = 'lorry' + Game.time;

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};
