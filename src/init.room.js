export class initRoom {
	constructor(room) {
		this.room = room;
		this.sources = Game.rooms[this.room].find(FIND_SOURCES);
		this.terrain = new Room.Terrain(Game.rooms[this.room.name]);
	}

	getSources() {
		this.sources.forEach((source) => {
			Game.rooms[this.room].memory.sMiners[source.id] = 0;
		});

		return Object.keys(this.sources).length;
	}

	ensureContainers() {
		this.sources.forEach((source) => {
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
							if (structuresHere.length === 0) {
								structuresHere = currentPosition.lookFor(
									LOOK_CONSTRUCTION_SITES,
								);
							}
							if (structuresHere.length === 0) {
								continue;
							}
							for (const structure in structuresHere) {
								if (
									structure.structureType ===
									STRUCTURE_CONTAINER
								) {
									return 1;
								}
							}
					}
				}
			}
			// No container found around source
			// return candidate positions for container
			let candidatePositions;
			x = source.pos.x;
			y = source.pos.y;
			for (let i = x - 1; i < x + 2; i++) {
				for (let j = y - 1; j < y + 2; j++) {
					switch (this.terrain.get(i, j)) {
						case TERRAIN_MASK_WALL:
							// it is wall no construction site can go here
							break;
						default:
							candidatePositions.push = new RoomPosition(
								i,
								j,
								this.room,
							);
					}
				}
			}
			return candidatePositions;
		});
	}
}
