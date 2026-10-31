// Setup memory for each room

const EXIT_NAME = {
	[FIND_EXIT_TOP]: 'FIND_EXIT_TOP',
	[FIND_EXIT_LEFT]: 'FIND_EXIT_LEFT',
	[FIND_EXIT_BOTTOM]: 'FIND_EXIT_BOTTOM',
	[FIND_EXIT_RIGHT]: 'FIND_EXIT_RIGHT',
};

const Phases = [
	{},
	{
		Level: 1,
		checkLevelPeriod: 1001,
		SpawnPeriod: 25,
		/**
		 * Has Level 1 Phase Progressed
		 * @param {Room} room
		 * @returns {boolean}
		 */
		checkGoal: (room) => {
			// First goal build a container for each source and five extensions
			// Covers RCL2
			const structures = room.find(FIND_STRUCTURES);
			const sources = room.find(FIND_SOURCES);

			const extensionCount = structures.filter(
				(structure) => structure.structureType === STRUCTURE_EXTENSION,
			).length;

			if (extensionCount < 5) {
				return false;
			}

			return sources.every(
				(source) =>
					source.pos.findInRange(FIND_STRUCTURES, 1, {
						filter: (structure) =>
							structure.structureType === STRUCTURE_CONTAINER,
					}).length > 0,
			);
		},
		Upgrader: {
			count: 4,
		},
		Builder: {
			count: 4,
		},
		Claimer: {
			count: 0,
		},
		RoleExtractor: {
			count: 0,
		},
		Lorry: {
			count: 0,
		},
		Repairer: {
			count: 0,
		},
		WallRepairer: {
			count: 0,
		},
		LongDistanceHarvester: {
			count: 0,
		},
		Miner: {
			count: 0,
		},
	},
	{
		// Extensions and containers built
		// Build a tower RCL3
		Level: 2,
		checkLevelPeriod: 1001,
		SpawnPeriod: 50,
		/**
		 * Has Level 2 Phase Progressed
		 * @param {Room} room
		 * @returns {boolean}
		 */
		checkGoal: (room) => {
			// Goal build a tower
			const structures = room.find(FIND_MY_STRUCTURES);

			for (let i = 0; i < structures.length; i++) {
				const structure = structures[i];
				if (structure.structureType === STRUCTURE_TOWER) {
					return true;
				}
			}
			return false;
		},
		Upgrader: {
			count: 3,
		},
		Builder: {
			count: 1,
		},
		Repairer: {
			count: 1,
		},
		Miner: {},
		Lorry: {},
		Claimer: {
			count: 0,
		},
		RoleExtractor: {
			count: 0,
		},
		WallRepairer: {
			count: 0,
		},
		LongDistanceHarvester: {
			count: 0,
		},
	},
	{
		// Build defenses
		// Rampart available at RCL2 or above
		Level: 3,
		RampartDesiredHealth: RAMPART_HITS_MAX[2] * 0.1,
		checkLevelPeriod: 1001,
		SpawnPeriod: 50,
		/**
		 * Has Level 3 Phase Progressed
		 * @param {Room} room
		 * @returns {boolean}
		 */
		checkGoal: (room) => {
			// Goal build rampart
			const structures = room.find(FIND_MY_STRUCTURES);

			for (let i = 0; i < structures.length; i++) {
				const structure = structures[i];
				if (structure.structureType === STRUCTURE_RAMPART) {
					return true;
				}
			}
			return false;
		},
		Upgrader: {
			count: 2,
		},
		Builder: {
			count: 1,
		},
		Repairer: {
			count: 1,
		},
		WallRepairer: {
			count: 1,
		},
		Miner: {},
		Lorry: {},
		Claimer: {
			count: 0,
		},
		RoleExtractor: {
			count: 0,
		},
		LongDistanceHarvester: {
			count: 0,
		},
	},
];

const init = {
	EXIT_NAME: EXIT_NAME,
	EXITS: [FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT],

	/**
	 * Get Initial Room Data
	 * @param {string} roomName
	 */
	getInitialData: function (roomName) {
		const data = { roomName: roomName, exits: {}, sMiners: {} };
		const exits = Game.map.describeExits(roomName);

		this.EXITS.forEach((exitDir) => {
			const isConnected = !!exits[exitDir];

			if (isConnected) {
				const name = exits[exitDir];
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

	/**
	 * Returns room name for a given exit
	 * @param {string} roomName
	 * @param {number} exitDir
	 */
	determineRoomName: function (roomName, exitDir) {
		const newRoom = Game.map.describeExits(roomName);
		return newRoom[exitDir];
	},

	/**
	 * Gets information about the current room phase
	 * @param {Room} room
	 * @returns
	 */
	getCurrentPhaseInfo: function (room) {
		let number = this.getCurrentPhaseNumber(room);
		while (!Phases[number]) {
			number--;
			if (number < 0) {
				throw new Error('Phases do not exist');
			}
		}
		return Phases[number];
	},

	/**
	 * Get Current Room Phase Number
	 * @param {Room} room
	 * @returns {number}
	 */
	getCurrentPhaseNumber: function (room) {
		return room.memory.phase || 1;
	},

	/**
	 * Determines the current phase number
	 * @param {Room} room
	 * @returns {number}
	 */
	determineCurrentPhaseNumber: function (room) {
		room.memory.phase ??= 1;
		room.memory.lastChecked ??= Game.time;

		const phaseNo = room.memory.phase,
			phase = Phases[phaseNo];

		if (!phase || phaseNo >= Phases.length - 1) {
			return phaseNo;
		}

		// dont check on every tick
		if (Game.time - room.memory.lastChecked >= phase.checkLevelPeriod) {
			room.memory.lastChecked = Game.time;

			if (phase.checkGoal(room)) {
				room.memory.phase++;
				console.log(
					`Updated ${room.name} phase to ${room.memory.phase}`,
				);
			}
		}

		return room.memory.phase;
	},

	initGame: function () {
		this.setGCL();

		if (!Memory.decon) {
			Memory.decon = {};
		}
		if (!Memory.con) {
			Memory.con = {};
		}
		if (!Memory.rooms) {
			Memory.rooms = {};
		}
		if (!Memory.towers) {
			Memory.towers = {};
		}
		if (!Memory.spawns) {
			Memory.spawns = {};
		}

		for (const roomName in Game.rooms) {
			if (!Memory.rooms[roomName]) {
				Memory.rooms[roomName] = this.getInitialData(roomName);
			}
		}

		for (const spawnName in Game.spawns) {
			if (!Memory.spawns[spawnName]) {
				const phase = this.getCurrentPhaseInfo(
					Game.spawns[spawnName].room,
				);

				Memory.spawns[spawnName] = {};

				if (!Memory.spawns[spawnName].minCreeps) {
					Memory.spawns[spawnName].minCreeps = {};
					Memory.spawns[spawnName].minCreeps.lorry =
						Game.spawns[spawnName].room.find(FIND_SOURCES).length ||
						0;
					Memory.spawns[spawnName].minCreeps.claimer =
						phase.Claimer.count;
					Memory.spawns[spawnName].minCreeps.upgrader =
						phase.Upgrader.count;
					Memory.spawns[spawnName].minCreeps.repairer =
						phase.Repairer.count;
					Memory.spawns[spawnName].minCreeps.builder =
						phase.Builder.count;
					Memory.spawns[spawnName].minCreeps.wallRepairer =
						phase.WallRepairer.count;
					Memory.spawns[spawnName].minCreeps.roleExtractor =
						phase.RoleExtractor.count;
				}
			}
		}
	},

	setGCL: function () {
		if (!Memory.gcl) {
			Memory.gcl = {};
		}

		Memory.gcl.level = Game.gcl.level;
		Memory.gcl.used = this.getNumberRoomsUsed();
	},

	/**
	 * Gets number of rooms used
	 * @returns {number}
	 */
	getNumberRoomsUsed: function () {
		let numberRoomsUsed = 0;
		for (const roomName in Game.rooms) {
			const room = Game.rooms[roomName];
			if (room.controller && room.controller.my) {
				numberRoomsUsed++;
			}
		}
		return numberRoomsUsed;
	},

	clearRoomMemory: function () {
		// check for memory entries of rooms that are no longer existing
		for (const name in Memory.rooms) {
			// and checking if the room exists in game array
			if (Game.rooms[name] === undefined) {
				// if not, delete the memory entry
				delete Memory.rooms[name];
			}
		}
	},
};

module.exports = init;
