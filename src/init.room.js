export class initRoom {
	constructor(room) {
		this.room = room;
		this.sources = Game.rooms[this.room].find(FIND_SOURCES);
		this.terrain = new Room.Terrain(Game.rooms[this.room]);
	}

	getSources() {
		for (const id in this.sources) {
			Game.rooms[this.room].memory.sMiners[id] = [];
		}

		return Object.keys(this.sources).length;
	}

	ensureContainers() {
		for (const id in this.sources) {
			const source = Game.getObjectById(id);
			let x = source.pos.x;
			let y = source.pos.y;
			for (let i = x - 1; i < x + 2; i++) {
				for (let j = y - 1; j < y + 2; j++) {
					switch (this.terrain.get(i, j)) {
						case TERRAIN_MASK_WALL:
							// if terrain next to source is wall ignore as no container can be here
							break;
						default:
							const currentPosition = new RoomPosition(
								i,
								j,
								this.room,
							);
							let structuresHere =
								currentPosition.lookFor(LOOK_STRUCTURES);
							if (!structuresHere) {
								structuresHere = currentPosition.lookFor(
									LOOK_CONSTRUCTION_SITES,
								);
							}
							if (!structuresHere) {
								continue;
							}
							for (const structureType in structuresHere) {
								if (structureType === STRUCTURE_CONTAINER) {
									return 1;
								}
							}
					}
				}
			}
			// No container found around source - createConstructionSite for container
			x = source.pos.x;
			y = source.pos.y;
			for (let i = x - 1; i < x + 2; i++) {
				for (let j = y - 1; j < y + 2; j++) {
					switch (this.terrain.get(i, j)) {
						case TERRAIN_MASK_WALL:
							// it is wall no construction site can go here
							break;
						default:
							const currentPosition = new RoomPosition(
								i,
								j,
								this.room,
							);
							return currentPosition.createConstructionSite(
								STRUCTURE_CONTAINER,
							);
					}
				}
			}
		}
	}
}
