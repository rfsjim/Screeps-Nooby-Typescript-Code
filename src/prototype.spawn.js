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
	'carlDouglas',
];

const spawnPriority = {
	routine: 100,
	miner: 300,
	defence: 400,
	recovery: 500,
};

const affordabilityPolicy = {
	wait: 'wait',
	downsize: 'downsize',
	skip: 'skip',
};

// Transient per-tick coordination. Snapshots contain live game objects and
// therefore must never be written to persistent Screeps Memory.
const roomSpawnSchedules = new WeakMap();

function getSpawningMemory(spawn) {
	const name = spawn.spawning?.name;
	if (!name) {
		return undefined;
	}
	const memoryCreeps =
		typeof Memory === 'undefined' ? undefined : Memory.creeps;
	return Game.creeps[name]?.memory ?? memoryCreeps?.[name];
}

/**
 * Capture every fact used for demand calculation once per room and tick.
 */
StructureSpawn.prototype.createSpawnRoomSnapshot = function () {
	const room = this.room;
	const creeps = room.find(FIND_MY_CREEPS);
	const sources = room.find(FIND_SOURCES);
	const structures = room.find(FIND_STRUCTURES);
	const myStructures =
		room.controller?.level >= 6 ? room.find(FIND_MY_STRUCTURES) : [];
	const constructionSites = room.find(FIND_CONSTRUCTION_SITES, {
		filter: (site) => site.my,
	});
	const hostiles = room.find(FIND_HOSTILE_CREEPS);
	const roomSpawns = Object.values(Game.spawns ?? {}).filter(
		(spawn) => spawn.my && spawn.room.name === room.name,
	);
	if (!roomSpawns.includes(this)) {
		roomSpawns.push(this);
	}
	const spawningCreeps = roomSpawns
		.map((spawn) => getSpawningMemory(spawn))
		.filter(Boolean);
	const operationalPopulation = {};
	const committedPopulation = {};
	for (const role of listOfRoles) {
		operationalPopulation[role] = _.sum(
			creeps,
			(creep) => creep.memory.role === role,
		);
		committedPopulation[role] = _.sum(
			[...creeps, ...spawningCreeps],
			(creep) => (creep.memory?.role ?? creep.role) === role,
		);
	}
	const containers = structures.filter(
		(structure) => structure.structureType === STRUCTURE_CONTAINER,
	);
	const containerEnergy = _.sum(
		containers,
		(container) => container.store[RESOURCE_ENERGY],
	);
	const storageEnergy = room.storage?.store[RESOURCE_ENERGY] ?? 0;

	return {
		roomName: room.name,
		tick: Game.time,
		energy: {
			available: room.energyAvailable,
			capacity: room.energyCapacityAvailable,
			container: containerEnergy,
			storage: storageEnergy,
		},
		creeps,
		spawningCreeps,
		operationalPopulation,
		committedPopulation,
		policy: room.memory.spawnPolicy,
		sources,
		structures,
		myStructures,
		containers,
		constructionSites,
		hostiles,
		roomSpawns,
		controllerLevel: room.controller?.level ?? 0,
		hasExtractor: myStructures.some(
			(structure) => structure.structureType === STRUCTURE_EXTRACTOR,
		),
		hasAvailableClaimSlot:
			Object.values(Game.rooms).filter(
				(gameRoom) => gameRoom.controller?.my,
			).length < Game.gcl.level,
	};
};

function addDemand(queue, request) {
	queue.push({ ...request, sequence: queue.length });
}

function addRecoveryDemand(snapshot, queue) {
	const { operationalPopulation, committedPopulation, energy } = snapshot;
	const hasOperationalHarvester = operationalPopulation.harvester > 0;
	const hasOperationalLorry = operationalPopulation.lorry > 0;
	const hasOperationalMiner = operationalPopulation.miner > 0;
	const hasEnergySupply = hasOperationalMiner || energy.container > 0;
	const hasEnergyProduction = hasOperationalHarvester || hasOperationalMiner;
	const hasEnergyDelivery =
		hasOperationalHarvester || (hasOperationalLorry && hasEnergySupply);
	const hasRecoveryEnergy =
		energy.available + energy.container + energy.storage >= 800;

	if (hasEnergyProduction && hasEnergyDelivery) {
		return false;
	}
	if (
		committedPopulation.lorry === 0 &&
		hasRecoveryEnergy &&
		energy.container + energy.storage > 0
	) {
		addDemand(queue, {
			key: 'recovery-lorry',
			role: 'lorry',
			priority: spawnPriority.recovery,
			minEnergy: 150,
			desiredEnergy: 150,
			affordability: affordabilityPolicy.wait,
		});
	}
	if (committedPopulation.harvester === 0) {
		addDemand(queue, {
			key: 'recovery-harvester',
			role: 'harvester',
			priority: spawnPriority.recovery - 1,
			minEnergy: 200,
			desiredEnergy: 200,
			affordability: affordabilityPolicy.wait,
		});
	}
	return true;
}

function addDefenceDemand(snapshot, queue) {
	if (snapshot.hostiles.length === 0) {
		return;
	}
	const groupCost =
		BODYPART_COST[TOUGH] +
		BODYPART_COST[RANGED_ATTACK] +
		BODYPART_COST[HEAL] +
		3 * BODYPART_COST[MOVE];
	const desiredGroups = Math.min(
		snapshot.committedPopulation.carlDouglas + 1,
		Math.floor(MAX_CREEP_SIZE / 6),
	);
	addDemand(queue, {
		key: 'defence-carlDouglas',
		role: 'carlDouglas',
		priority: spawnPriority.defence,
		minEnergy: groupCost,
		desiredEnergy: groupCost * desiredGroups,
		energyStep: groupCost,
		affordability: affordabilityPolicy.downsize,
	});
}

function addMinerDemand(snapshot, queue) {
	const assignedSourceIds = new Set(
		[...snapshot.creeps, ...snapshot.spawningCreeps]
			.filter(
				(creep) =>
					(creep.memory?.role ?? creep.role) === 'miner' &&
					(creep.memory?.sourceId ?? creep.sourceId),
			)
			.map((creep) => creep.memory?.sourceId ?? creep.sourceId),
	);
	for (const source of snapshot.sources) {
		const hasContainer = snapshot.containers.some((container) =>
			source.pos.inRangeTo(container.pos, 1),
		);
		if (hasContainer && !assignedSourceIds.has(source.id)) {
			addDemand(queue, {
				key: `miner-${source.id}`,
				role: 'miner',
				priority: spawnPriority.miner,
				minEnergy: BODYPART_COST[WORK] * 5 + BODYPART_COST[MOVE],
				desiredEnergy: BODYPART_COST[WORK] * 5 + BODYPART_COST[MOVE],
				affordability: affordabilityPolicy.wait,
				sourceId: source.id,
			});
		}
	}
}

function addConfiguredRoleDemand(snapshot, queue, spawn) {
	const needsConstruction = snapshot.constructionSites.length > 0;
	const needsRepairs = snapshot.structures.some(
		(structure) =>
			structure.hits < structure.hitsMax &&
			structure.structureType !== STRUCTURE_WALL &&
			structure.structureType !== STRUCTURE_RAMPART,
	);
	const needsWallRepairs = snapshot.structures.some(
		(structure) =>
			(structure.structureType === STRUCTURE_WALL ||
				structure.structureType === STRUCTURE_RAMPART) &&
			structure.hits < structure.hitsMax * 0.5,
	);
	const extractorReady =
		snapshot.controllerLevel >= 6 &&
		snapshot.hasExtractor &&
		spawn.room.storage !== undefined &&
		spawn.room.terminal !== undefined;

	for (const role of listOfRoles) {
		if (
			role === 'harvester' ||
			role === 'miner' ||
			role === 'claimer' ||
			role === 'carlDouglas'
		) {
			continue;
		}
		if (role === 'builder' && !needsConstruction) {
			continue;
		}
		if (role === 'repairer' && !needsRepairs) {
			continue;
		}
		if (role === 'wallRepairer' && !needsWallRepairs) {
			continue;
		}
		if (role === 'extractor' && !extractorReady) {
			continue;
		}
		const deficit =
			(snapshot.policy.minCreeps?.[role] ?? 0) -
			(snapshot.committedPopulation[role] ?? 0);
		for (let index = 0; index < deficit; index++) {
			const isLorry = role === 'lorry';
			addDemand(queue, {
				key: `role-${role}-${index}`,
				role,
				priority: spawnPriority.routine,
				minEnergy: isLorry ? 150 : 200,
				desiredEnergy: snapshot.energy.capacity,
				energyStep: isLorry ? 150 : 200,
				affordability: isLorry
					? affordabilityPolicy.downsize
					: affordabilityPolicy.wait,
			});
		}
	}
}

function addClaimDemand(snapshot, queue) {
	if (
		snapshot.policy.claimRoom === undefined ||
		!snapshot.hasAvailableClaimSlot
	) {
		return;
	}
	addDemand(queue, {
		key: 'claimer',
		role: 'claimer',
		priority: spawnPriority.routine,
		minEnergy: BODYPART_COST[CLAIM] + BODYPART_COST[MOVE],
		desiredEnergy: BODYPART_COST[CLAIM] + BODYPART_COST[MOVE],
		affordability: affordabilityPolicy.skip,
		target: snapshot.policy.claimRoom,
	});
}

function addRemoteDemand(snapshot, queue) {
	for (const target in snapshot.policy.minLongDistanceHarvesters ?? {}) {
		const active = _.sum(
			Game.creeps,
			(creep) =>
				creep.memory.role === 'longDistanceHarvester' &&
				creep.memory.target === target,
		);
		const spawning = _.sum(
			snapshot.spawningCreeps,
			(creep) =>
				(creep.memory?.role ?? creep.role) ===
					'longDistanceHarvester' &&
				(creep.memory?.target ?? creep.target) === target,
		);
		const deficit =
			snapshot.policy.minLongDistanceHarvesters[target] -
			active -
			spawning;
		for (let index = 0; index < deficit; index++) {
			addDemand(queue, {
				key: `longDistanceHarvester-${target}-${index}`,
				role: 'longDistanceHarvester',
				priority: spawnPriority.routine - 1,
				minEnergy: 250,
				desiredEnergy: snapshot.energy.capacity,
				affordability: affordabilityPolicy.wait,
				home: snapshot.roomName,
				target,
				sourceIndex: 0,
			});
		}
	}
}

/**
 * Express room demand without considering currently available spawn energy.
 */
StructureSpawn.prototype.buildSpawnQueue = function (
	snapshot = this.createSpawnRoomSnapshot(),
) {
	const queue = [];
	if (!addRecoveryDemand(snapshot, queue)) {
		addDefenceDemand(snapshot, queue);
		addMinerDemand(snapshot, queue);
		addClaimDemand(snapshot, queue);
		addConfiguredRoleDemand(snapshot, queue, this);
		addRemoteDemand(snapshot, queue);
	}
	return queue.sort(
		(left, right) =>
			right.priority - left.priority || left.sequence - right.sequence,
	);
};

function affordableEnergy(request, availableEnergy) {
	if (availableEnergy >= request.desiredEnergy) {
		return request.desiredEnergy;
	}
	if (
		request.affordability !== affordabilityPolicy.downsize ||
		availableEnergy < request.minEnergy
	) {
		return undefined;
	}
	const step = request.energyStep ?? 1;
	return (
		request.minEnergy +
		Math.floor((availableEnergy - request.minEnergy) / step) * step
	);
}

StructureSpawn.prototype.executeSpawnRequest = function (request, energy) {
	if (request.role === 'miner') {
		return this.createMiner(request.sourceId);
	}
	if (request.role === 'lorry') {
		return this.createLorry(energy);
	}
	if (request.role === 'claimer') {
		return this.createClaimer(request.target, 'claim');
	}
	if (request.role === 'carlDouglas') {
		return this.spawnCarlDouglas(energy);
	}
	if (request.role === 'longDistanceHarvester') {
		return this.createLongDistanceHarvester(
			energy,
			2,
			request.home,
			request.target,
			request.sourceIndex,
		);
	}
	return this.createCustomCreep(energy, request.role);
};

StructureSpawn.prototype.getSpawnSchedule = function () {
	const existing = roomSpawnSchedules.get(this.room);
	if (existing?.tick === Game.time) {
		return existing;
	}
	const snapshot = this.createSpawnRoomSnapshot();
	const schedule = {
		tick: Game.time,
		snapshot,
		queue: this.buildSpawnQueue(snapshot),
	};
	roomSpawnSchedules.set(this.room, schedule);
	return schedule;
};

function createUniqueCreepName(roleName, spawnName) {
	const baseName = roleName + Game.time;
	const memoryCreeps =
		typeof Memory === 'undefined' ? undefined : Memory.creeps;
	if (!Game.creeps[baseName] && !memoryCreeps?.[baseName]) {
		return baseName;
	}
	return `${baseName}-${spawnName}`;
}

/**
 * Let every spawn cooperate through one room-scoped schedule.
 */
StructureSpawn.prototype.spawnCreepsIfNecessary = function () {
	if (!this.my) {
		return;
	}
	const schedule = this.getSpawnSchedule();
	this.memory.spawnQueue = schedule.queue;
	if (this.spawning) {
		return;
	}

	for (let index = 0; index < schedule.queue.length; index++) {
		const request = schedule.queue[index];
		const energy = affordableEnergy(
			request,
			schedule.snapshot.energy.available,
		);
		if (energy === undefined) {
			if (request.affordability === affordabilityPolicy.skip) {
				continue;
			}
			return;
		}
		const attempt = this.executeSpawnRequest(request, energy);
		if (attempt.result === OK) {
			schedule.queue.splice(index, 1);
			schedule.snapshot.energy.available = this.room.energyAvailable;
			this.memory.spawnQueue = schedule.queue;
			if (request.role === 'claimer') {
				delete schedule.snapshot.policy.claimRoom;
			}
			console.log(`${this.name} spawned new creep: ${attempt.name}`);
			return;
		}
		if (attempt.result === ERR_BUSY) {
			return;
		}
	}
};

/**
 * Function to spawn custom sized creeps
 * @param {number} energy
 * @param {string} roleName
 */
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
	const name = createUniqueCreepName(roleName, this.name);

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

/**
 * spawn long distance miners
 * @param {number} energy
 * @param {number} numberOfWorkParts
 * @param {string} home
 * @param {string} target
 * @param {number} sourceIndex
 */
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
	const name = createUniqueCreepName('longDistanceHarvester', this.name);

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

/**
 *
 * @param {string} target
 * @param {'claim'|'reserve'} action
 */
StructureSpawn.prototype.createClaimer = function (target, action) {
	// claimer just needs move and claim part
	if (action !== 'claim' && action !== 'reserve') {
		throw new Error(`Invalid claimer action: ${action}`);
	}

	const creepMemory = {
		memory: { role: 'claimer', target: target, controllerAction: action },
	};
	const name = createUniqueCreepName('claimer', this.name);
	const body = [CLAIM, MOVE];

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

/**
 * spawn miner
 * @param {string} sourceId
 */
StructureSpawn.prototype.createMiner = function (sourceId) {
	// accept sourceId that requires miner. Miners five work parts will empty a source in the refresh time frame
	const creepMemory = { memory: { role: 'miner', sourceId: sourceId } };
	const name = createUniqueCreepName('miner', this.name);
	const body = [WORK, WORK, WORK, WORK, WORK, MOVE];

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

/**
 * spawn lorry
 * @param {number} energy
 */
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
	const name = createUniqueCreepName('lorry', this.name);

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};

/**
 * Spawns Carl Douglas Home Base Defender
 * @param {number} energy
 */
StructureSpawn.prototype.spawnCarlDouglas = function (energy) {
	// composition of fighter changes depending on room size
	const roleName = 'carlDouglas';
	const body = [];
	const partsPerGroup = 6;
	const minRequiredEnergy =
		BODYPART_COST[MOVE] * 3 +
		BODYPART_COST[TOUGH] +
		BODYPART_COST[RANGED_ATTACK] +
		BODYPART_COST[HEAL];

	if (energy < minRequiredEnergy) {
		return {
			name: undefined,
			result: ERR_NOT_ENOUGH_ENERGY,
		};
	}

	const numberOfParts = Math.min(
		Math.floor(energy / minRequiredEnergy),
		Math.floor(MAX_CREEP_SIZE / partsPerGroup),
	);

	for (let i = 0; i < numberOfParts; i++) {
		body.push(TOUGH);
	}

	for (let i = 0; i < numberOfParts; i++) {
		body.push(RANGED_ATTACK);
	}

	for (let i = 0; i < numberOfParts; i++) {
		body.push(HEAL);
	}

	for (let i = 0; i < numberOfParts; i++) {
		body.push(MOVE);
		body.push(MOVE);
		body.push(MOVE);
	}

	const creepMemory = {
		memory: {
			role: roleName,
		},
	};
	const name = createUniqueCreepName(roleName, this.name);

	return {
		name: name,
		result: this.spawnCreep(body, name, creepMemory),
	};
};
