//setup memory for each room

const EXIT_NAME = {
  [FIND_EXIT_TOP]: 'FIND_EXIT_TOP',
  [FIND_EXIT_LEFT]: 'FIND_EXIT_LEFT',
  [FIND_EXIT_BOTTOM]: 'FIND_EXIT_BOTTOM',
  [FIND_EXIT_RIGHT]: 'FIND_EXIT_RIGHT',
};

let Phases = [
  {},
  {
    Level: 1,
    checkLevelPeriod: 1001,
    SpawnPeriod: 25,
    checkGoal: (room) => {
      // First goal build a container for each source, five extensions and a storage
      let desiredExtensionCount = 5,
        desiredContainerCount = (room.find(FIND_SOURCES) || {}).length || 0,
        structures = room.find(FIND_STRUCTURES);

      for (let i = 0; i < structures.length; i++) {
        let structure = structures[i];
        if (structure.structureType === 'extension') {
          desiredExtensionCount--;
        } else if (structure.structureType === 'container') {
          desiredContainerCount--;
        }

        if (desiredContainerCount <= 0 && desiredExtensionCount <= 0) {
          return true;
        }
      }
      return false;
    },
    Harvester: {
      count: 2
    },
    Upgrader: {
      count: 4
    },
    Builder: {
      count: 4
    },
    Claimer: {
      count: 0
    },
    Cleaner: {
      count: 0
    },
    RoleExtractor: {
      count: 0
    },
    Lorry: {
      count: 0
    },
    Repairer: {
      count: 0
    },
    WallRepairer: {
      count: 0
    },
    LongDistanceHarvester: {
      count: 0
    },
    Miner: {
      count: 0
    }
  },
  {
    // Extensions and containers built
    Level: 2,
    checkLevelPeriod: 1001,
    SpawnPeriod: 50,
    checkGoal: (room) => {
      // Goal build a tower
      let structures = room.find(FIND_MY_STRUCTURES);

      for (let i=0; i<structures.length;i++) {
        let structure = structures[i];
        if (structure.structureType === 'tower') {
          return true;
        }
      }
      return false;
    },
    Harvester: {
      count: 1
    },
    Upgrader: {
      count: 3
    },
    Builder: {
      count: 1
    },
    Repairer: {
      count: 1
    },
    Miner: {
      count: LOOK_SOURCES
    },
    Lorry: {
      count: LOOK_SOURCES
    },
    Claimer: {
      count: 0
    },
    Cleaner: {
      count: 0
    },
    RoleExtractor: {
      count: 0
    },
    WallRepairer: {
      count: 0
    },
    LongDistanceHarvester: {
      count: 0
    }
  },
  {
    // Build defenses
    Level: 3,
    RampartDesiredHealth: RAMPART_HITS_MAX[2]*0.1,
    checkLevelPeriod: 1001,
    SpawnPeriod: 50,
    checkGoal: () => false,
    Harvester: {
      count: 1
    },
    Upgrader: {
      count: 2
    },
    Builder: {
      count: 1
    },
    Repairer: {
      count: 1
    },
    WallRepairer: {
      count: 1
    },
    Miner: {
      count: LOOK_SOURCES
    },
    Lorry: {
      count: LOOK_SOURCES
    },
    Cleaner: {
      count: 1
    },
    Claimer: {
      count: 0
    },
    RoleExtractor: {
      count: 0
    },
    LongDistanceHarvester: {
      count: 0
    }
  },
];

let init = {
  EXIT_NAME: EXIT_NAME,
  EXITS: [FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT],

  getInitialData(roomName) {
    let data = { roomName: roomName, exits: {}, sMiners: {} };
    let exits = Game.map.describeExits(roomName);

    this.EXITS.forEach((exitDir) => {
      let isConnected =  !!exits[exitDir];

      if (isConnected) {
        let name = exits[exitDir];
        if (Memory.rooms[name]) {
          data.exits[exitDir] = name;
        } else {
          data.exits[exitDir] = true;
        }
      } else {
        data.exits[exitDir] = false;
      }
    });

    Game.rooms[roomName].find(FIND_SOURCES).forEach((source) => {
      data.sMiners[source.id] = 0;
    });

    data.phase = 1;
    data.lastChecked = Game.time;

    return data;
  },

  determineRoomName: function(roomName, exitDir) {
    let pre1 = roomName[0],
      leftright = parseInt(roomName[1]),
      pre2 = roomName[2],
      topbottom = parseInt(roomName[3]);

    switch (exitDir) {
      case FIND_EXIT_TOP:
        topbottom++;
        break;
      case FIND_EXIT_BOTTOM:
        topbottom--;
        break;
      case FIND_EXIT_RIGHT:
        leftright--;
        break;
      case FIND_EXIT_LEFT:
        leftright++;
        break;
      default:
        throw new Error('invalid direction ' + exitDir);
    }
    let newRoom = pre1 + leftright + pre2 + topbottom;
    return newRoom;
  },

  getCurrentPhaseInfo: function(room) {
    let number = this.getCurrentPhaseNumber(room);
    while (!Phases[number]) {
      number--;
      if (number < 0) {
        throw new Error('Phases do not exist');
      }
    }
    return Phases[number];
  },

  getCurrentPhaseNumber: function(room) {
    return room.memory.phase || 1;
  },

  determineCurrentPhaseNumber: function(room) {
    let roomName = room.name || room,
      phaseNo = Memory.rooms[roomName].phase || 1,
      phase = Phases[phaseNo],
      period = phase.checkLevelPeriod,
      checkGoal = phase.checkGoal;

      // dont check on every tick
      if (Game.time % period === 0 && checkGoal(room)) {
        room.memory.phase++;
        console.log(`Updated ${room} phase to ${Memory.rooms[roomName].phase}`);
      }

      room.memory.phase = room.memory.phase || 1;
      return room.memory.phase;
  },

  initGame: function(phaseNumber) {
    if (!Memory.gcl) {
      Memory.gcl = 0;
      for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
          Memory.gcl++;
        }
      }
    }

    if (!Memory.decon) Memory.decon = {};
    if (!Memory.con) Memory.con = {};
    if (!Memory.rooms) Memory.rooms = {};
    if (!Memory.towers) Memory.towers = {};
    if (!Memory.spawns) Memory.spawns = {};

    for (let roomName in Game.rooms) {
      if (!Memory.rooms[roomName]) {
        Memory.rooms[roomName] = this.getInitialData(roomName);
      }
    }

    for (let spawnName in Game.spawns) {
      if (!Memory.spawns[spawnName]) {
        let phase = this.getCurrentPhaseInfo(Game.spawns[spawnName].room);

        Memory.spawns[spawnName] = {};

        if (!Memory.spawns[spawnName].minCreeps) {
          Memory.spawns[spawnName].minCreeps = {}
          Memory.spawns[spawnName].minCreeps.harvester = phase.Harvester.count;
          Memory.spawns[spawnName].minCreeps.lorry = phase.Lorry.count;
          Memory.spawns[spawnName].minCreeps.claimer = phase.Claimer.count;
          Memory.spawns[spawnName].minCreeps.upgrader = phase.Upgrader.count;
          Memory.spawns[spawnName].minCreeps.cleaner = phase.Cleaner.count;
          Memory.spawns[spawnName].minCreeps.repairer = phase.Repairer.count;
          Memory.spawns[spawnName].minCreeps.builder = phase.Builder.count;
          Memory.spawns[spawnName].minCreeps.wallRepairer = phase.WallRepairer.count;
          Memory.spawns[spawnName].minCreeps.roleExtractor = phase.RoleExtractor.count;
        }
      }
    }

  }

};
