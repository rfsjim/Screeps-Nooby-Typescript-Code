const test = require('node:test');
const assert = require('node:assert/strict');

const {
	createMockRoom,
	createStructure,
	installScreepsGlobals,
} = require('./helpers/screeps');

installScreepsGlobals();

const ResourceManager = require('../src/manager.resource');

test('getDroppedResources returns only the requested resource type', () => {
	const energy = {
		id: 'dropped-energy',
		resourceType: RESOURCE_ENERGY,
		amount: 100,
	};
	const hydrogen = {
		id: 'dropped-hydrogen',
		resourceType: RESOURCE_HYDROGEN,
		amount: 100,
	};
	const manager = new ResourceManager(
		createMockRoom({ droppedResources: [energy, hydrogen] }),
	);

	assert.deepEqual(manager.getDroppedResources(RESOURCE_ENERGY), [energy]);
});

test('getStructuresWithResources returns eligible structures with energy', () => {
	const container = createStructure({
		id: 'container-1',
		structureType: STRUCTURE_CONTAINER,
		store: { [RESOURCE_ENERGY]: 100 },
	});
	const emptyContainer = createStructure({
		id: 'container-empty',
		structureType: STRUCTURE_CONTAINER,
		store: { [RESOURCE_ENERGY]: 0 },
	});
	const storage = createStructure({
		id: 'storage-1',
		structureType: STRUCTURE_STORAGE,
		store: { [RESOURCE_ENERGY]: 200 },
	});
	const terminal = createStructure({
		id: 'terminal-1',
		structureType: STRUCTURE_TERMINAL,
		store: { [RESOURCE_ENERGY]: 300 },
	});
	const extension = createStructure({
		id: 'extension-1',
		structureType: STRUCTURE_EXTENSION,
		store: { [RESOURCE_ENERGY]: 50 },
	});
	const manager = new ResourceManager(
		createMockRoom({
			structures: [
				container,
				emptyContainer,
				storage,
				terminal,
				extension,
			],
		}),
	);

	assert.deepEqual(manager.getStructuresWithResources(RESOURCE_ENERGY), [
		container,
		storage,
		terminal,
	]);
});

test('getTombstonesWithResources returns only tombstones carrying the requested resource', () => {
	const energyTombstone = {
		id: 'energy-tombstone',
		store: { [RESOURCE_ENERGY]: 100, [RESOURCE_HYDROGEN]: 0 },
	};
	const hydrogenTombstone = {
		id: 'hydrogen-tombstone',
		store: { [RESOURCE_ENERGY]: 0, [RESOURCE_HYDROGEN]: 100 },
	};
	const manager = new ResourceManager(
		createMockRoom({
			tombstones: [energyTombstone, hydrogenTombstone],
		}),
	);

	assert.deepEqual(manager.getTombstonesWithResources(RESOURCE_ENERGY), [
		energyTombstone,
	]);
});

test('getRuinsWithResources returns only ruins carrying the requested resource', () => {
	const energyRuin = {
		id: 'energy-ruin',
		store: { [RESOURCE_ENERGY]: 100 },
	};
	const hydrogenRuin = {
		id: 'hydrogen-ruin',
		store: { [RESOURCE_HYDROGEN]: 100 },
	};
	const manager = new ResourceManager(
		createMockRoom({ ruins: [energyRuin, hydrogenRuin] }),
	);

	assert.deepEqual(manager.getRuinsWithResources(RESOURCE_HYDROGEN), [
		hydrogenRuin,
	]);
});

test('resource queries return empty arrays when the requested resource is absent', () => {
	const manager = new ResourceManager(
		createMockRoom({
			droppedResources: [{ resourceType: RESOURCE_ENERGY, amount: 100 }],
			structures: [
				createStructure({
					structureType: STRUCTURE_CONTAINER,
					store: { [RESOURCE_ENERGY]: 100 },
				}),
			],
			tombstones: [{ store: { [RESOURCE_ENERGY]: 100 } }],
			ruins: [{ store: { [RESOURCE_ENERGY]: 100 } }],
		}),
	);

	assert.deepEqual(manager.getDroppedResources(RESOURCE_HYDROGEN), []);
	assert.deepEqual(manager.getStructuresWithResources(RESOURCE_HYDROGEN), []);
	assert.deepEqual(manager.getTombstonesWithResources(RESOURCE_HYDROGEN), []);
	assert.deepEqual(manager.getRuinsWithResources(RESOURCE_HYDROGEN), []);
});
