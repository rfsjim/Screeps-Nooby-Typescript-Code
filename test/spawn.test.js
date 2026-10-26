'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

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
    RESOURCE_ENERGY: 'energy',
    RESOURCE_HYDROGEN: 'H',
    STRUCTURE_SPAWN: 'spawn',
    STRUCTURE_EXTENSION: 'extension',
    STRUCTURE_TOWER: 'tower',
    STRUCTURE_CONTAINER: 'container',
    STRUCTURE_STORAGE: 'storage',
    STRUCTURE_WALL: 'constructedWall',
    STRUCTURE_RAMPART: 'rampart',
    ORDER_BUY: 'buy',
    WORK: 'work',
    CARRY: 'carry',
    MOVE: 'move',
    CLAIM: 'claim',
    ATTACK: 'attack',
    RANGED_ATTACK: 'ranged_attack',
    HEAL: 'heal'
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
        ? values.reduce((total, value) => total + Number(predicate(value) || 0), 0)
        : values.reduce((total, value) => total + Number(value || 0), 0);
    },
    isString(value) {
      return typeof value === 'string';
    },
    max(values) {
      return Math.max(...values);
    }
  };

  global.Creep = class Creep {};
  global.StructureSpawn = class StructureSpawn {};
  global.StructureTower = class StructureTower {};
  global.StructureTerminal = class StructureTerminal {};
}

installScreepsGlobals();

// Load the unchanged production prototypes after installing the Screeps API shim.
require('../src/prototype.creep');
require('../src/prototype.spawn');

function createMockRoom({
  creeps = [],
  sources = [],
  structures = [],
  energy,
  energyCapacity = energy
}) {
  return {
    name: 'W1N1',
    energyAvailable: energy,
    energyCapacityAvailable: energyCapacity,
    find(type, options = {}) {
      let results = [];
      if (type === FIND_MY_CREEPS) {results = creeps;}
      if (type === FIND_SOURCES) {results = sources;}
      if (type === FIND_STRUCTURES) {results = structures;}
      return options.filter ? results.filter(options.filter) : results;
    }
  };
}

function createSpawnScenario({ room, minCreeps = {}, spawnResults = {} }) {
  const spawnAttempts = [];
  const spawn = new StructureSpawn();
  spawn.name = 'Spawn1';
  spawn.my = true;
  spawn.spawning = null;
  spawn.room = room;
  spawn.memory = {
    minCreeps: {
      harvester: 0,
      lorry: 0,
      miner: 0,
      claimer: 0,
      upgrader: 0,
      repairer: 0,
      builder: 0,
      wallRepairer: 0,
      ...minCreeps
    },
    minLongDistanceHarvesters: {}
  };
  spawn.spawnCreep = (body, name, options) => {
    spawnAttempts.push({ body, name, memory: options.memory, role: options.memory.role });
    return spawnResults[options.memory.role] ?? OK;
  };
  global.Game = { creeps: {}, time: 42 };

  return { spawn, spawnAttempts };
}

function createRecoveryScenario({
  creeps = [],
  energy,
  containerEnergy = 0,
  spawnResults = {}
}) {
  const structures = [
    {
      structureType: STRUCTURE_CONTAINER,
      store: { [RESOURCE_ENERGY]: containerEnergy }
    },
    {
      structureType: STRUCTURE_EXTENSION,
      store: { [RESOURCE_ENERGY]: 1000 }
    }
  ];

  return createSpawnScenario({
    room: createMockRoom({ creeps, structures, energy }),
    spawnResults
  });
}

function createSource(id = 'source-1') {
  return {
    id,
    pos: {
      inRangeTo(position, range) {
        return position.sourceId === id && range === 1;
      }
    }
  };
}

function createSourceContainer(sourceId = 'source-1') {
  return {
    structureType: STRUCTURE_CONTAINER,
    pos: { sourceId },
    store: { [RESOURCE_ENERGY]: 0 }
  };
}

function createGrowingRoomScenario({
  creeps = [
    { memory: { role: 'harvester' } },
    { memory: { role: 'lorry' } }
  ],
  sources = [createSource()],
  containers = [createSourceContainer()],
  energy = 600,
  energyCapacity = energy,
  minCreeps = {},
  spawnResults = {}
} = {}) {
  return createSpawnScenario({
    room: createMockRoom({
      creeps,
      sources,
      structures: containers,
      energy,
      energyCapacity
    }),
    minCreeps,
    spawnResults
  });
}

const recoveryCases = [
  {
    name: 'no creeps with 200 spawn energy and no reserves spawns a harvester',
    energy: 200,
    expectedRoles: ['harvester']
  },
  {
    name: 'no creeps with 800 spawn energy and no reserves spawns a harvester',
    energy: 800,
    expectedRoles: ['harvester']
  },
  {
    name: 'no transport with 200 spawn energy and 1,000 container energy spawns a lorry',
    energy: 200,
    containerEnergy: 1000,
    expectedRoles: ['lorry']
  },
  {
    name: 'no transport with 100 spawn energy and 1,000 container energy waits',
    energy: 100,
    containerEnergy: 1000,
    expectedRoles: []
  },
  {
    name: 'a lorry with no miner or harvester and empty containers spawns a harvester',
    energy: 200,
    creeps: [{ memory: { role: 'lorry' } }],
    expectedRoles: ['harvester']
  }
];

for (const scenario of recoveryCases) {
  test(scenario.name, () => {
    const { spawn, spawnAttempts } = createRecoveryScenario(scenario);

    spawn.spawnCreepsIfNecessary();

    assert.deepEqual(
      spawnAttempts.map(attempt => attempt.role),
      scenario.expectedRoles
    );
  });
}

test('a miner with recoverable container energy spawns a lorry before priority two', () => {
  const { spawn, spawnAttempts } = createRecoveryScenario({
    energy: 200,
    containerEnergy: 1000,
    creeps: [{ memory: { role: 'miner' } }]
  });
  spawn.memory.minCreeps.upgrader = 1;

  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(
    spawnAttempts.map(attempt => attempt.role),
    ['lorry'],
    'a successful recovery spawn should prevent priority-two spawning in the same operation'
  );
});

test('a lorry energy failure falls back to a harvester', () => {
  const { spawn, spawnAttempts } = createRecoveryScenario({
    energy: 200,
    containerEnergy: 1000,
    spawnResults: {
      lorry: ERR_NOT_ENOUGH_ENERGY,
      harvester: OK
    }
  });

  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(
    spawnAttempts.map(attempt => attempt.role),
    ['lorry', 'harvester']
  );
});

test('a busy lorry attempt stops the recovery pipeline', () => {
  const { spawn, spawnAttempts } = createRecoveryScenario({
    energy: 200,
    containerEnergy: 1000,
    spawnResults: { lorry: ERR_BUSY }
  });

  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(
    spawnAttempts.map(attempt => attempt.role),
    ['lorry']
  );
});

test('a miner and lorry exit the recovery gate', () => {
  const { spawn, spawnAttempts } = createRecoveryScenario({
    energy: 300,
    creeps: [
      { memory: { role: 'miner' } },
      { memory: { role: 'lorry' } }
    ]
  });
  spawn.memory.minCreeps.upgrader = 1;

  spawn.spawnCreepsIfNecessary();

  assert.equal(
    spawnAttempts[0]?.role,
    'upgrader',
    'legacy priority-two processing should be reachable after recovery is satisfied'
  );
});

test('a growing room without a source container does not spawn a miner', () => {
  const { spawn, spawnAttempts } = createGrowingRoomScenario({ containers: [] });

  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(spawnAttempts, []);
});

test('a growing room does not spawn a miner for an already assigned source', () => {
  const { spawn, spawnAttempts } = createGrowingRoomScenario({
    creeps: [
      { memory: { role: 'harvester' } },
      { memory: { role: 'lorry' } },
      { memory: { role: 'miner', sourceId: 'source-1' } }
    ]
  });

  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(spawnAttempts, []);
});

test('a growing room waits when it cannot afford a miner', () => {
  const { spawn, spawnAttempts } = createGrowingRoomScenario({ energy: 549 });

  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(spawnAttempts, []);
});

test('an unaffordable miner reserves energy from optional roles', () => {
    const { spawn, spawnAttempts } = createGrowingRoomScenario({
        energy: 549,
        minCreeps: { upgrader: 1 }
    });

    spawn.spawnCreepsIfNecessary();

    assert.deepEqual(spawnAttempts, []);
});

test('a busy miner attempt stops growing-room spawning', () => {
  const { spawn, spawnAttempts } = createGrowingRoomScenario({
    spawnResults: { miner: ERR_BUSY },
    minCreeps: { upgrader: 1 }
  });

  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(
    spawnAttempts.map(attempt => attempt.role),
    ['miner']
  );
});

test('a growing room spawns a miner for an unassigned source with a container', () => {
  const { spawn, spawnAttempts } = createGrowingRoomScenario();

  spawn.spawnCreepsIfNecessary();

  assert.equal(spawnAttempts.length, 1);
  assert.equal(spawnAttempts[0].role, 'miner');
  assert.equal(spawnAttempts[0].memory.sourceId, 'source-1');
  assert.deepEqual(
    spawnAttempts[0].body,
    [WORK, WORK, WORK, WORK, WORK, MOVE]
  );
});
