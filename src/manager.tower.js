/**
 * Tower Manager
 * Coordinates every tower in a room using its range-adjusted power.
 * Supersedes prototype.tower
 * aaf29c531e718d471b6ab5ee80c0021fca8a0074 on development/colony-v2
 *
 * Tower Priorities
 * Priority	Situation	Tower response
 * 1	Defender or healer at imminent risk of death	Heal the critical creep
 * 2	Hostile creep present	Attack
 * 3	Injured defender or healer, no hostile threat	Heal
 * 4	No combat needs, sufficient energy	Repair eligible structures
 * —	Injured worker	Ignore; spawn/recovery logic handles replacement
 *
 * Friendly triage: Which friendly combat-capable creep is at greatest risk, and can our healing change its survival outcome?
 * Hostile assessment: Which hostile is dangerous, and can tower damage overcome or meaningfully pressure its healing and damage reduction?
 * Action selection: Is healing, attacking, or conserving energy the most valuable action this tick?
 *
 * Triage considers three ratios
 * Measurement	What it tells us
 * Health ratio	How damaged is the creep?
 * Health trend	Is it losing, recovering, or maintaining HP?
 * Survival outlook	Can our tower meaningfully change the outcome?
 *
 * Don't heal the creep with the least health.
 * Heal the creep for which intervention produces the greatest useful improvement in the
 * colony's defensive position.
 *
 * When several towers are involved, their combined healing could save a creep that
 * none could save individually.
 * So the unsalvageable decision must account for available tower support,
 * not just one tower in isolation.
 **/

/**
 * @typedef {Object} Contribution
 * @property {StructureTower} tower
 * @property {number} power
 */
/**
 * @typedef {Object} Plan
 * @property {Creep} creep
 * @property {Contribution[]} contributions
 * @property {number} projectedDamage
 * @property {number} required
 * @property {number} priority
 */

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

	// Allocate towers across all endangered defenders so a versatile tower is
	// not greedily consumed when a constrained defender needs it more.
	// doesn't recalculate the rescue assignments using the remaining available towers.
	// It proceeds with the existing allocations and eventually attacks with unused towers.
	const plans = defenders
		.map((creep) => makeRescuePlan(creep, towers))
		.filter((plan) => plan !== null)
		.sort((a, b) => b.priority - a.priority);
	for (const allocation of allocateRescues(plans)) {
		for (const contribution of allocation.contributions) {
			if (contribution.tower.heal(allocation.plan.creep) === OK) {
				available.delete(contribution.tower);
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
 * Based around Emergency rescue while hostiles are present:
 * Where Creep Expected to die next tick without intervention.
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
	const required = Math.max(1, projectedDamage - creep.hits + 1);
	const missingHits = creep.hitsMax - creep.hits;
	if (required > missingHits || sumPower(contributions) < required) {
		return null;
	}
	return {
		creep,
		contributions,
		projectedDamage,
		required,
		priority: friendlyPriority(creep) + projectedDamage / creep.hitsMax,
	};
}

/**
 * @typedef {Object} BestPlan
 * @property {Array} allocations
 * @property {number} saved
 * @property {number} priority
 * @property {number} towers
 */
/**
 * Find the non-overlapping allocation that saves the most defenders, then the
 * greatest combined priority, while using the fewest towers.
 * @param {Plan[]} plans
 * @returns {Object[]}
 */
function allocateRescues(plans) {
	const candidates = plans.map((plan) => ({
		plan,
		groups: healingGroups(plan),
	}));
	let best = { allocations: [], saved: 0, priority: 0, towers: 0 };

	function search(index, used, allocations, priority) {
		if (index === candidates.length) {
			const result = {
				allocations,
				saved: allocations.length,
				priority,
				towers: used.size,
			};
			if (isBetterAllocation(result, best)) {
				best = result;
			}
			return;
		}

		search(index + 1, used, allocations, priority);
		const { plan, groups } = candidates[index];
		for (const contributions of groups) {
			if (contributions.some(({ tower }) => used.has(tower))) {
				continue;
			}
			const nextUsed = new Set(used);
			for (const { tower } of contributions) {
				nextUsed.add(tower);
			}
			search(
				index + 1,
				nextUsed,
				[...allocations, { plan, contributions }],
				priority + plan.priority,
			);
		}
	}

	search(0, new Set(), [], 0);
	return best.allocations;
}

/**
 * Groups for Healing
 * This allocation search has exponential complexity
 * TODO: a bounded search or pruning strategy before scaling
 * @param {Plan} plan
 */
function healingGroups(plan) {
	const groups = [];
	const count = plan.contributions.length;
	for (let mask = 1; mask < 2 ** count; mask += 1) {
		const contributions = plan.contributions.filter(
			(contribution, index) => mask & (1 << index),
		);
		if (sumPower(contributions) >= plan.required) {
			groups.push(contributions);
		}
	}
	return groups.sort(
		(a, b) => a.length - b.length || sumPower(a) - sumPower(b),
	);
}

function isBetterAllocation(candidate, current) {
	return (
		candidate.saved > current.saved ||
		(candidate.saved === current.saved &&
			(candidate.priority > current.priority ||
				(candidate.priority === current.priority &&
					candidate.towers < current.towers)))
	);
}

/**
 * Attack Hostile Creeps
 * Performs a coordinated target selection,
 * does not perform a coordinated damage assessment
 * nor does it take into account for creeps with boosted TOUGH parts
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
 * @returns {number}
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
 * the result is a boost-adjusted count of equivalent body parts
 * TODO Future a function for multiplying by ATTACK_POWER, RANGED_ATTACK_POWER, and HEAL_POWER
 * will give comparable HP-per-tick values
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
 * Favours the greatest immediately useful repair amount over
 * most strategically important structure
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
 * The previous-to-current HP difference is net health change, not actual incoming damage
 * Storing a net-loss estimate on the creep's memory
 * @param {Creep} creeps
 */
function rememberHits(creeps) {
	for (const creep of creeps) {
		creep.memory.towerManagerPreviousHits = creep.hits;
	}
}

/**
 * Sums the contributions of each tower to create total power
 * @param {Contribution[]} contributions
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
