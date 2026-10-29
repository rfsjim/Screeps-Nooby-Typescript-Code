'use strict';

const DEFAULT_STRUCTURE_HITS = 5000;

function installScreepsGlobals() {
	const constants = {
		OK: 0,
		ERR_NOT_ENOUGH_ENERGY: -6,
		ERR_BUSY: -4,
		FIND_EXIT_TOP: 1,
		FIND_EXIT_RIGHT: 3,
		FIND_EXIT_BOTTOM: 5,
		FIND_EXIT_LEFT: 7,
		FIND_MY_CREEPS: 101,
		FIND_MY_STRUCTURES: 102,
		FIND_HOSTILE_CREEPS: 103,
		FIND_STRUCTURES: 104,
		FIND_SOURCES: 105,
		FIND_SOURCES_ACTIVE: 106,
		FIND_CONSTRUCTION_SITES: 107,
		FIND_DROPPED_RESOURCES: 108,
		FIND_TOMBSTONES: 109,
		FIND_RUINS: 110,
		FIND_MINERALS: 111,
		LOOK_SOURCES: 'source',
		MAX_CONSTRUCTION_SITES: 100,
		MAX_CREEP_SIZE: 50,
		RESOURCE_ENERGY: 'energy',
		RESOURCE_HYDROGEN: 'H',
		STRUCTURE_SPAWN: 'spawn',
		STRUCTURE_EXTENSION: 'extension',
		STRUCTURE_TOWER: 'tower',
		STRUCTURE_CONTAINER: 'container',
		STRUCTURE_STORAGE: 'storage',
		STRUCTURE_WALL: 'constructedWall',
		STRUCTURE_RAMPART: 'rampart',
		STRUCTURE_EXTRACTOR: 'extractor',
		STRUCTURE_TERMINAL: 'terminal',
		ORDER_BUY: 'buy',
		WORK: 'work',
		CARRY: 'carry',
		MOVE: 'move',
		CLAIM: 'claim',
		ATTACK: 'attack',
		RANGED_ATTACK: 'ranged_attack',
		HEAL: 'heal',
		CONTAINER_HITS: 250000,
	};

	Object.assign(global, constants);
	global.BODYPART_COST = { work: 100, carry: 50, move: 50, claim: 600 };
	global.RAMPART_HITS_MAX = { 2: 300000 };

	global._ = {
		filter(collection, predicate) {
			return Object.values(collection).filter(predicate);
		},
		some(collection, predicate) {
			return Object.values(collection).some(predicate);
		},
		sum(collection, predicate) {
			const values = Object.values(collection || {});
			return predicate
				? values.reduce(
						(total, value) => total + Number(predicate(value) || 0),
						0,
					)
				: values.reduce(
						(total, value) => total + Number(value || 0),
						0,
					);
		},
		isString(value) {
			return typeof value === 'string';
		},
		max(values) {
			return Math.max(...values);
		},
	};

	global.Creep = class Creep {};
	global.StructureSpawn = class StructureSpawn {};
	global.StructureTower = class StructureTower {};
	global.StructureTerminal = class StructureTerminal {};
}

function createMockRoom({
	creeps = [],
	sources = [],
	structures = [],
	constructionSites = [],
	controller = {
		my: true,
		level: 1,
	},
	energy,
	energyCapacity = energy,
} = {}) {
	const storage = structures.find(
		(structure) => structure.structureType === STRUCTURE_STORAGE,
	);
	const terminal = structures.find(
		(structure) => structure.structureType === STRUCTURE_TERMINAL,
	);

	return {
		name: 'W1N1',
		energyAvailable: energy,
		energyCapacityAvailable: energyCapacity,
		controller,
		storage,
		terminal,
		find(type, options = {}) {
			let results = [];
			if (type === FIND_MY_CREEPS) {
				results = creeps;
			}
			if (type === FIND_SOURCES) {
				results = sources;
			}
			if (type === FIND_STRUCTURES) {
				results = structures;
			}
			if (type === FIND_MY_STRUCTURES) {
				results = structures.filter(
					(structure) => structure.my !== false,
				);
			}
			if (type === FIND_CONSTRUCTION_SITES) {
				results = constructionSites;
			}
			return options.filter ? results.filter(options.filter) : results;
		},
	};
}

function createSource(id = 'source-1') {
	return {
		id,
		pos: {
			inRangeTo(position, range) {
				return position.sourceId === id && range === 1;
			},
		},
	};
}

function createSourceContainer({
	adjacentToSourceId = 'source-1',
	energy = 0,
	hits = CONTAINER_HITS,
	hitsMax = CONTAINER_HITS,
} = {}) {
	return {
		structureType: STRUCTURE_CONTAINER,
		pos: { sourceId: adjacentToSourceId },
		store: { [RESOURCE_ENERGY]: energy },
		hitsMax,
		hits,
	};
}

function createStructure({
	id = 'structure-1',
	hits = DEFAULT_STRUCTURE_HITS,
	hitsMax = DEFAULT_STRUCTURE_HITS,
	structureType,
	my = true,
	store = {},
} = {}) {
	return {
		id,
		my,
		structureType,
		hits,
		hitsMax,
		store,
	};
}

function createConstructionSite(id = 'construction-site-1', progress = 0) {
	return {
		id,
		my: true,
		structureType: STRUCTURE_CONTAINER,
		progress,
		progressTotal: 5000,
	};
}

function createProductiveCreeps() {
	return [
		{ memory: { role: 'harvester' } },
		{ memory: { role: 'lorry' } },
		{
			memory: {
				role: 'miner',
				sourceId: 'source-1',
			},
		},
	];
}

module.exports = {
	DEFAULT_STRUCTURE_HITS,
	createConstructionSite,
	createMockRoom,
	createProductiveCreeps,
	createSource,
	createSourceContainer,
	createStructure,
	installScreepsGlobals,
};
