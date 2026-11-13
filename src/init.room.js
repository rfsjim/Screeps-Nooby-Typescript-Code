class InitRoom {
	/**
	 * Source and Container Position Candidate Discovery
	 * @param {Room} room
	 */
	constructor(room) {
		this.room = room;
		this.sources = room.find(FIND_SOURCES);
		this.terrain = room.getTerrain();
	}

	/**
	 * Get Number of Sources in Room
	 * @returns number
	 */
	getSources() {
		return this.sources.length;
	}

	/**
	 * Supplies Candidate Positions for Source Mining Containers
	 * @returns {Map<Id<Source>, RoomPosition[]>}
	 */
	ensureContainers() {
		const candidatesBySource = new Map();

		this.sources.forEach((source) => {
			const x = source.pos.x;
			const y = source.pos.y;

			let hasContainerOrSite = false;
			const candidatePositions = [];

			for (let i = x - 1; i <= x + 1; i++) {
				for (let j = y - 1; j <= y + 1; j++) {
					if (i === x && j === y) {
						// source own position can not be a candidate
						continue;
					}

					if (i < 0 || i > 49 || j < 0 || j > 49) {
						continue;
					}

					if (this.terrain.get(i, j) === TERRAIN_MASK_WALL) {
						// if terrain next to source is wall ignore as no container can be here
						continue;
					}

					const currentPosition = new RoomPosition(
						i,
						j,
						this.room.name,
					);
					const structuresHere =
						currentPosition.lookFor(LOOK_STRUCTURES);
					const constructionsHere = currentPosition.lookFor(
						LOOK_CONSTRUCTION_SITES,
					);

					if (
						structuresHere.some(
							(s) => s.structureType === STRUCTURE_CONTAINER,
						) ||
						constructionsHere.some(
							(s) => s.structureType === STRUCTURE_CONTAINER,
						)
					) {
						hasContainerOrSite = true;
						continue;
					}

					if (
						structuresHere.length === 0 &&
						constructionsHere.length === 0
					) {
						candidatePositions.push(currentPosition);
					}
				}
			}

			if (!hasContainerOrSite) {
				candidatesBySource.set(source.id, candidatePositions);
			}
		});

		return candidatesBySource;
	}

	/**
	 * Gets Information for Mineral in Room and Saves to Room Memory
	 * @returns {void}
	 */
	storeMineral() {
		if (this.room.memory.mineral) {
			return;
		}

		const [mineral] = this.room.find(FIND_MINERALS);

		if (!mineral) {
			return;
		}

		this.room.memory.mineral = {
			id: mineral.id,
			mineralType: mineral.mineralType,
			density: mineral.density,
			x: mineral.pos.x,
			y: mineral.pos.y,
		};
	}
}

module.exports = InitRoom;
