//import modules
require('./prototype/prototype.creep'); // common code for all creeps
require('./prototype/prototype.spawn'); // common code for all spawns
require('./prototype/prototype.terminal'); // common code for all terminals

const init = require('./init/init'); // game init details
const InitRoom = require('./init/init.room'); // init room details
const towerManager = require('./manager/manager.tower'); // common code for all towers

module.exports.loop = function () {
	// get phase and initGame details
	const firstSpawn = Object.values(Game.spawns)[0];
	if (firstSpawn) {
		const room = firstSpawn.room;
		const phaseNumber = init.getCurrentPhaseNumber(room);
		init.initGame(phaseNumber);
	}

	if (Game.cpu.tickLimit < 50) {
		console.log('Game CPU dangerously low ' + JSON.stringify(Game.cpu));
		return;
	}

	// check for memory entries of dead creeps by iterating over Memory.creeps
	for (const name in Memory.creeps) {
		const creep = Game.creeps[name];
		// and checking if the creep is still alive
		if (creep === undefined) {
			// if not, delete the memory entry
			delete Memory.creeps[name];
		}
	}

	// Tell the current creeps what to do - for each creeps
	for (const name in Game.creeps) {
		// run creep logic
		const creep = Game.creeps[name];
		creep.runRole();
	}

	// Coordinate towers once per room so their combined power can be considered.
	const towerRooms = new Set(
		_.filter(
			Game.structures,
			(structure) => structure.structureType === STRUCTURE_TOWER,
		).map((tower) => tower.room),
	);
	for (const room of towerRooms) {
		towerManager.run(room);
	}

	// for each spawn
	for (const spawnName in Game.spawns) {
		const spawn = Game.spawns[spawnName];
		const room = spawn.room;

		// Discover mineral metadata once per room
		if (!room.memory.mineral) {
			const mineralMemory = new InitRoom(room);
			mineralMemory.storeMineral();
		}

		// run spawn logic
		spawn.spawnCreepsIfNecessary();

		// run terminal trades
		if (room.terminal && Game.time % 10 === 0) {
			room.terminal.findTrade();
		}
	}

	if (!Memory.stats) {
		Memory.stats = {};
		Memory.stats.getUsed = Game.cpu.getUsed();
		Memory.stats.limit = Game.cpu.limit;
		Memory.stats.bucket = Game.cpu.bucket;
	}

	Memory.stats.cpu = {
		getUsed: Game.cpu.getUsed(),
		limit: Game.cpu.limit,
		bucket: Game.cpu.bucket,
	};

	if (
		typeof Game.cpu.generatePixel === 'function' &&
		Game.cpu.bucket >= 10000
	) {
		Game.cpu.generatePixel();
	}
};
