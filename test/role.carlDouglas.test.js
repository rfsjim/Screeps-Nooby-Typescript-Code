'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { installScreepsGlobals } = require('./helpers/screeps');

installScreepsGlobals();

const roleCarlDouglas = require('../src/role/role.carlDouglas');

function createUnit({
	activeParts = [],
	hits = 100,
	hitsMax = 100,
	name = 'unit',
	previousHits,
	range = 1,
} = {}) {
	return {
		hits,
		hitsMax,
		memory:
			previousHits === undefined
				? {}
				: { towerManagerPreviousHits: previousHits },
		name,
		_range: range,
		getActiveBodyparts(part) {
			return activeParts.filter((activePart) => activePart === part)
				.length;
		},
	};
}

function createScenario({
	carlHits = 100,
	carlHitsMax = 100,
	friendlies = [],
	hostiles = [],
	parts = [RANGED_ATTACK, HEAL],
	rangedAttackResult = OK,
} = {}) {
	const calls = {
		heal: [],
		moveTo: [],
		rangedAttack: [],
		rangedHeal: [],
		rangedMassAttack: 0,
	};
	const carl = createUnit({
		activeParts: parts,
		hits: carlHits,
		hitsMax: carlHitsMax,
		name: 'Carl',
		range: 0,
	});

	carl.pos = {
		findClosestByRange(targets) {
			return targets.reduce(
				(closest, target) =>
					closest === null || target._range < closest._range
						? target
						: closest,
				null,
			);
		},
		findInRange(type, range) {
			assert.equal(type, FIND_HOSTILE_CREEPS);
			return hostiles.filter((hostile) => hostile._range <= range);
		},
		getRangeTo(target) {
			return target._range;
		},
		inRangeTo(target, range) {
			return target._range <= range;
		},
		isNearTo(target) {
			return target._range <= 1;
		},
	};
	carl.heal = (target) => {
		calls.heal.push(target);
		return OK;
	};
	carl.moveTo = (target, options) => {
		calls.moveTo.push({ target, options });
		return OK;
	};
	carl.rangedAttack = (target) => {
		calls.rangedAttack.push(target);
		return rangedAttackResult;
	};
	carl.rangedHeal = (target) => {
		calls.rangedHeal.push(target);
		return OK;
	};
	carl.rangedMassAttack = () => {
		calls.rangedMassAttack += 1;
		return OK;
	};
	carl.room = {
		find(type) {
			if (type === FIND_HOSTILE_CREEPS) {
				return hostiles;
			}
			if (type === FIND_MY_CREEPS) {
				return [carl, ...friendlies];
			}
			return [];
		},
	};

	return { calls, carl };
}

test('attacks the nearest hostile from the highest-priority combat group', () => {
	const worker = createUnit({
		activeParts: [WORK],
		name: 'worker',
		range: 1,
	});
	const distantAttacker = createUnit({
		activeParts: [ATTACK],
		name: 'attacker',
		range: 3,
	});
	const nearbyHealer = createUnit({
		activeParts: [HEAL],
		name: 'healer',
		range: 2,
	});
	const { calls, carl } = createScenario({
		hostiles: [worker, distantAttacker, nearbyHealer],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.rangedAttack, [nearbyHealer]);
});

test('falls back to the nearest hostile when no priority group matches', () => {
	const distantScout = createUnit({ name: 'distant', range: 3 });
	const nearbyScout = createUnit({ name: 'nearby', range: 2 });
	const { calls, carl } = createScenario({
		hostiles: [distantScout, nearbyScout],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.rangedAttack, [nearbyScout]);
});

test('approaches an attack target only to ranged distance', () => {
	const hostile = createUnit({ activeParts: [ATTACK], range: 4 });
	const { calls, carl } = createScenario({
		hostiles: [hostile],
		rangedAttackResult: ERR_NOT_IN_RANGE,
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.moveTo, [
		{ target: hostile, options: { range: 3 } },
	]);
});

test('uses a mass attack against multiple adjacent hostiles', () => {
	const hostiles = [
		createUnit({ activeParts: [ATTACK], range: 1 }),
		createUnit({ activeParts: [WORK], range: 1 }),
	];
	const { calls, carl } = createScenario({ hostiles });

	roleCarlDouglas.run(carl);

	assert.equal(calls.rangedMassAttack, 1);
	assert.deepEqual(calls.rangedAttack, []);
});

test('heals itself while mass-attacking multiple adjacent hostiles', () => {
	const hostiles = [
		createUnit({ activeParts: [ATTACK], range: 1 }),
		createUnit({ activeParts: [WORK], range: 1 }),
	];
	const { calls, carl } = createScenario({
		carlHits: 90,
		carlHitsMax: 100,
		hostiles,
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.heal, [carl]);
	assert.equal(calls.rangedMassAttack, 1);
	assert.deepEqual(calls.rangedAttack, []);
});

test('heals itself before a friendly and still performs a ranged attack', () => {
	const friendly = createUnit({
		activeParts: [ATTACK],
		hits: 50,
		hitsMax: 100,
		range: 1,
	});
	const hostile = createUnit({ activeParts: [ATTACK], range: 3 });
	const { calls, carl } = createScenario({
		carlHits: 90,
		carlHitsMax: 100,
		friendlies: [friendly],
		hostiles: [hostile],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.heal, [carl]);
	assert.deepEqual(calls.rangedAttack, [hostile]);
});

test('directly heals an adjacent endangered non-combat friendly', () => {
	const worker = createUnit({
		activeParts: [WORK],
		hits: 40,
		hitsMax: 100,
		previousHits: 100,
		range: 1,
	});
	const injuredDefender = createUnit({
		activeParts: [ATTACK],
		hits: 80,
		hitsMax: 100,
		range: 1,
	});
	const hostile = createUnit({ activeParts: [ATTACK], range: 3 });
	const { calls, carl } = createScenario({
		friendlies: [injuredDefender, worker],
		hostiles: [hostile],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.heal, [worker]);
	assert.deepEqual(calls.rangedAttack, [hostile]);
});

test('ranged-heals an endangered friendly instead of attacking', () => {
	const endangered = createUnit({
		activeParts: [ATTACK],
		hits: 40,
		hitsMax: 100,
		previousHits: 100,
		range: 3,
	});
	const hostile = createUnit({ activeParts: [ATTACK], range: 3 });
	const { calls, carl } = createScenario({
		friendlies: [endangered],
		hostiles: [hostile],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.rangedHeal, [endangered]);
	assert.deepEqual(calls.rangedAttack, []);
	assert.equal(calls.rangedMassAttack, 0);
});

test('ranged-heals an endangered friendly without active ranged attack parts', () => {
	const endangered = createUnit({
		activeParts: [ATTACK],
		hits: 40,
		hitsMax: 100,
		previousHits: 100,
		range: 3,
	});
	const hostile = createUnit({ activeParts: [ATTACK], range: 3 });
	const { calls, carl } = createScenario({
		friendlies: [endangered],
		hostiles: [hostile],
		parts: [HEAL],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.rangedHeal, [endangered]);
	assert.deepEqual(calls.rangedAttack, []);
	assert.equal(calls.rangedMassAttack, 0);
});

test('attacks instead of ranged-healing a non-endangered friendly', () => {
	const injured = createUnit({
		activeParts: [ATTACK],
		hits: 80,
		hitsMax: 100,
		range: 3,
	});
	const hostile = createUnit({ activeParts: [ATTACK], range: 3 });
	const { calls, carl } = createScenario({
		friendlies: [injured],
		hostiles: [hostile],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.rangedHeal, []);
	assert.deepEqual(calls.rangedAttack, [hostile]);
});

test('moves toward an injured combat friendly during peacetime', () => {
	const defender = createUnit({
		activeParts: [RANGED_ATTACK],
		hits: 80,
		hitsMax: 100,
		range: 10,
	});
	const { calls, carl } = createScenario({ friendlies: [defender] });

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.moveTo, [{ target: defender, options: undefined }]);
});

test('does not leave combat to pursue a distant non-emergency heal', () => {
	const defender = createUnit({
		activeParts: [ATTACK],
		hits: 80,
		hitsMax: 100,
		range: 4,
	});
	const hostile = createUnit({ activeParts: [ATTACK], range: 3 });
	const { calls, carl } = createScenario({
		friendlies: [defender],
		hostiles: [hostile],
	});

	roleCarlDouglas.run(carl);

	assert.deepEqual(calls.heal, []);
	assert.deepEqual(calls.rangedHeal, []);
	assert.deepEqual(calls.moveTo, []);
	assert.deepEqual(calls.rangedAttack, [hostile]);
});
