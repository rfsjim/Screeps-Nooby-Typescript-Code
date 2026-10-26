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

function createRecoveryScenario({
  creeps = [],
  energy,
  containerEnergy = 0,
  spawnResults = {}
}) {
  const spawnAttempts = [];
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
  const room = {
    name: 'W1N1',
    energyAvailable: energy,
    energyCapacityAvailable: energy,
    find(type, options = {}) {
      if (type === FIND_MY_CREEPS) {return creeps;}
      if (type === FIND_STRUCTURES) {
        return options.filter ? structures.filter(options.filter) : structures;
      }
      return [];
    }
  };
  const spawn = new StructureSpawn();
  spawn.name = 'Spawn1';
  spawn.my = true;
  spawn.spawning = null;
  spawn.room = room;
  spawn.memory = {
    minCreeps: {
      harvester: 0,
      lorry: 0,
      claimer: 0,
      upgrader: 0,
      repairer: 0,
      builder: 0,
      wallRepairer: 0
    },
    minLongDistanceHarvesters: {}
  };
  spawn.spawnCreep = (body, name, options) => {
    spawnAttempts.push({ body, name, role: options.memory.role });
    return spawnResults[options.memory.role] ?? OK;
  };
  global.Game = { creeps: {}, time: 42 };

  return { spawn, spawnAttempts };
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

test('the main loop survives when no spawn is named Spawn1', () => {
  global.Memory = { creeps: {}, rooms: {}, spawns: {} };
  global.Game = {
    spawns: {},
    rooms: {},
    creeps: {},
    structures: {},
    time: 1,
    cpu: { tickLimit: 500, limit: 20, bucket: 1000, getUsed: () => 0 },
    map: { describeExits: () => ({}) }
  };

  const main = require('../src/main');
  assert.doesNotThrow(() => main.loop());
});

test('an unknown creep role does not throw from role dispatch', () => {
  const creep = new Creep();
  creep.memory = { role: 'roleThatDoesNotExist' };

  assert.doesNotThrow(() => creep.runRole());
});

test('a failed miner spawn does not block a viable lower-priority spawn', () => {
  const spawnAttempts = [];
  const source = {
    id: 'source-1',
    pos: {
      inRangeTo(position, range) {
        return position.id === 'source-container-position' && range === 1;
      }
    }
  };
  const sourceContainer = {
    structureType: STRUCTURE_CONTAINER,
    pos: { id: 'source-container-position' },
    store: { [RESOURCE_ENERGY]: 0 }
  };
  const creeps = [
    { memory: { role: 'harvester' } },
    { memory: { role: 'lorry' } }
  ];
  const room = {
    name: 'W1N1',
    energyAvailable: 600,
    energyCapacityAvailable: 600,
    find(type, options = {}) {
      if (type === FIND_MY_CREEPS) {return creeps;}
      if (type === FIND_SOURCES) {return [source];}
      if (type === FIND_STRUCTURES) {
        const structures = [sourceContainer];
        return options.filter ? structures.filter(options.filter) : structures;
      }
      return [];
    }
  };
  const spawn = new StructureSpawn();
  spawn.name = 'Spawn1';
  spawn.my = true;
  spawn.room = room;
  spawn.memory = {
    minCreeps: {
      harvester: 1,
      lorry: 1,
      claimer: 0,
      upgrader: 1,
      repairer: 0,
      builder: 0,
      wallRepairer: 0
    },
    minLongDistanceHarvesters: {}
  };
  spawn.spawnCreep = (body, name, options) => {
    spawnAttempts.push({ body, name, role: options.memory.role });
    return body.length === 6 && body.filter(part => part === WORK).length === 5
      ? ERR_NOT_ENOUGH_ENERGY
      : OK;
  };

  global.Game = { creeps: {}, time: 42 };
  spawn.spawnCreepsIfNecessary();

  assert.deepEqual(
    spawnAttempts.map(attempt => attempt.role),
    ['miner', 'upgrader'],
    'the upgrader attempt should still occur after the miner returns ERR_NOT_ENOUGH_ENERGY'
  );
});
