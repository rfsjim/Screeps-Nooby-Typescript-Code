/** Coordinates every tower in a room using its range-adjusted power. */
const COMBAT_PARTS = [ATTACK, RANGED_ATTACK, HEAL];
const REPAIR_ENERGY_RATIO = 0.5;
const REPAIR_HITS_RATIO = 0.6;

/**
 * Run Room's Tower Logic
 * @param {Room} room
 * @returns {void}
 */
function run(room) {
	const towers = room.find(FIND_MY_STRUCTURES, {
		filter: (s) =>
			s.structureType === STRUCTURE_TOWER &&
			s.store[RESOURCE_ENERGY] >= TOWER_ENERGY_COST,
	});
	if (towers.length === 0) {
		return;
	}
	const friendlies = room.find(FIND_MY_CREEPS);
	const hostiles = room.find(FIND_HOSTILE_CREEPS);
	const defenders = friendlies.filter(isCombatCapable);
	const available = new Set(towers);

	// Reserve the minimum useful group of towers for each endangered defender.
	const plans = defenders
		.map((creep) => makeRescuePlan(creep, towers))
		.filter((plan) => plan !== null)
		.sort((a, b) => b.priority - a.priority);
	for (const plan of plans) {
		const usable = plan.contributions.filter(({ tower }) =>
			available.has(tower),
		);
		const required = Math.max(
			1,
			plan.projectedDamage - plan.creep.hits + 1,
		);
		if (sumPower(usable) < required) {
			continue;
		}
		let healing = 0;
		for (const contribution of usable) {
			if (healing >= required) {
				break;
			}
			if (contribution.tower.heal(plan.creep) === OK) {
				available.delete(contribution.tower);
				healing += contribution.power;
			}
		}
	}

	if (hostiles.length > 0) {
		attackHostiles([...available], hostiles);
		rememberHits(friendlies);
		return;
	}

	// Workers are intentionally ignored; only combat creeps receive tower healing.
	const injured = defenders
		.filter((creep) => creep.hits < creep.hitsMax)
		.sort((a, b) => friendlyPriority(b) - friendlyPriority(a));
	const projectedHits = new Map(injured.map((creep) => [creep, creep.hits]));
	for (const tower of available) {
		const target = injured.find(
			(creep) => projectedHits.get(creep) < creep.hitsMax,
		);
		if (!target) {
			break;
		}
		if (tower.heal(target) === OK) {
			projectedHits.set(
				target,
				Math.min(
					target.hitsMax,
					projectedHits.get(target) +
						getTowerPower(tower, target, TOWER_POWER_HEAL),
				),
			);
			available.delete(tower);
		}
	}
	repairStructures(room, [...available]);
	rememberHits(friendlies);
}

/**
 * Create Plan to Rescue Creeps
 * @param {Creep} creep
 * @param {StructureTower[]} towers
 */
function makeRescuePlan(creep, towers) {
	if (creep.hits >= creep.hitsMax) {
		return null;
	}
	const previous = creep.memory.towerManagerPreviousHits ?? creep.hits;
	const projectedDamage = Math.max(0, previous - creep.hits);
	if (projectedDamage === 0 || creep.hits > projectedDamage) {
		return null;
	}
	const contributions = towers
		.map((tower) => ({
			tower,
			power: getTowerPower(tower, creep, TOWER_POWER_HEAL),
		}))
		.sort((a, b) => b.power - a.power);
	if (creep.hits + sumPower(contributions) <= projectedDamage) {
		return null;
	}
	return {
		creep,
		contributions,
		projectedDamage,
		priority: friendlyPriority(creep) + projectedDamage / creep.hitsMax,
	};
}

/**
 * Attack Hostile Creeps
 * @param {StructureTower[]} towers
 * @param {Creep[]} hostiles
 */
function attackHostiles(towers, hostiles) {
	const remainingHits = new Map(hostiles.map((creep) => [creep, creep.hits]));
	for (const tower of towers) {
		const target = hostiles
			.filter((creep) => remainingHits.get(creep) > 0)
			.sort(
				(a, b) =>
					hostilePriority(b, towers) - hostilePriority(a, towers),
			)[0];
		if (target && tower.attack(target) === OK) {
			remainingHits.set(
				target,
				remainingHits.get(target) -
					getTowerPower(tower, target, TOWER_POWER_ATTACK),
			);
		}
	}
}

/**
 * Prioritise Hostile Creeps
 * @param {Creep} creep
 * @param {StructureTower[]} towers
 * @returns
 */
function hostilePriority(creep, towers) {
	const danger =
		activePartPower(creep, ATTACK, 'attack') * 1.2 +
		activePartPower(creep, RANGED_ATTACK, 'rangedAttack') * 1.1 +
		activePartPower(creep, HEAL, 'heal');
	const pressure = towers.reduce(
		(total, tower) =>
			total + getTowerPower(tower, creep, TOWER_POWER_ATTACK),
		0,
	);
	return danger * 1000 + pressure / Math.max(1, creep.hits);
}

/**
 * Calculates the power for given active parts
 * Takes into account boosts if any
 * @param {Creep} creep
 * @param {BodyPartConstant} type
 * @param {string} effect
 * @returns {number}
 */
function activePartPower(creep, type, effect) {
	return creep.body.reduce((total, part) => {
		if (part.hits <= 0 || part.type !== type) {
			return total;
		}
		const boost = part.boost && BOOSTS[type][part.boost];
		return total + (boost ? boost[effect] : 1);
	}, 0);
}

/**
 * Repair Structures
 * @param {Room} room
 * @param {StructureTower[]} towers
 * @returns {void}
 */
function repairStructures(room, towers) {
	const ready = towers.filter(
		(tower) =>
			tower.store[RESOURCE_ENERGY] /
				tower.store.getCapacity(RESOURCE_ENERGY) >=
			REPAIR_ENERGY_RATIO,
	);
	const structures = room.find(FIND_STRUCTURES, {
		filter: (s) =>
			s.hits < s.hitsMax * REPAIR_HITS_RATIO &&
			s.structureType !== STRUCTURE_WALL &&
			s.structureType !== STRUCTURE_RAMPART,
	});
	const projectedHits = new Map(
		structures.map((structure) => [structure, structure.hits]),
	);
	for (const tower of ready) {
		const target = structures
			.filter((s) => projectedHits.get(s) < s.hitsMax)
			.sort(
				(a, b) =>
					usefulRepair(tower, b, projectedHits.get(b)) -
					usefulRepair(tower, a, projectedHits.get(a)),
			)[0];
		if (target && tower.repair(target) === OK) {
			projectedHits.set(
				target,
				Math.min(
					target.hitsMax,
					projectedHits.get(target) +
						usefulRepair(tower, target, projectedHits.get(target)),
				),
			);
		}
	}
}

/**
 * Identifies the most useful structure to repair
 * @param {StructureTower} tower
 * @param {Structure} structure
 * @param {number} hits
 * @returns {number}
 */
function usefulRepair(tower, structure, hits = structure.hits) {
	return Math.min(
		structure.hitsMax - hits,
		getTowerPower(tower, structure, TOWER_POWER_REPAIR),
	);
}

/**
 * Prioritise a Friendly Creep
 * @param {Creep} creep
 * @returns {number}
 */
function friendlyPriority(creep) {
	const previous = creep.memory.towerManagerPreviousHits ?? creep.hits;
	return (
		(1 - creep.hits / creep.hitsMax) * 10 +
		Math.max(0, previous - creep.hits) / creep.hitsMax
	);
}

/**
 * Returns true if Creep body contains Heal Attack or Ranged_Attack
 * @param {Creep} creep
 * @returns {boolean}
 */
function isCombatCapable(creep) {
	return creep.body.some(
		(part) => part.hits > 0 && COMBAT_PARTS.includes(part.type),
	);
}

/**
 * Persists Creep Hit Points for future strategic assessment
 * @param {Creep} creeps
 */
function rememberHits(creeps) {
	for (const creep of creeps) {
		creep.memory.towerManagerPreviousHits = creep.hits;
	}
}

/**
 * @typedef {Object} Contributions
 * @property {StructureTower} tower
 * @property {number} power
 */
/**
 * Sums the contributions of each tower to create total power
 * @param {Contributions[]} contributions
 * @returns {number}
 */
function sumPower(contributions) {
	return contributions.reduce((total, item) => total + item.power, 0);
}

/**
 * Apply Screeps' linear tower falloff at the target's actual range.
 * @param {StructureTower} tower
 * @param {{pos: RoomPosition}} target
 * @param {number} basePower
 * @returns {number}
 */
function getTowerPower(tower, target, basePower) {
	const range = tower.pos.getRangeTo(target.pos);
	const falloff = Math.max(
		0,
		Math.min(
			1,
			(range - TOWER_OPTIMAL_RANGE) /
				(TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE),
		),
	);
	return Math.floor(basePower * (1 - TOWER_FALLOFF * falloff));
}

module.exports = { getTowerPower, run };
