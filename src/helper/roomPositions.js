/**
 * Library of tools for calculating and using Room Positions
 */

/**
 * @typedef {Object} RoomXYObject
 * @property {number} x - The room roomObject's x position
 * @property {number} y - The room roomObject's y position
 */

/**
 * Extract coordinates From a Given Room Object
 *
 * @param {RoomObject} roomObject
 * @returns {RoomXYObject} A roomObject containing the room position
 */
function getCoords(roomObject) {
	assertValid(roomObject);
	const { x, y } = roomObject.pos;
	return { x, y };
}

/**
 * Reject objects without room or position
 *
 * @param {RoomObject} roomObject
 */
function assertValid(roomObject) {
	if (!roomObject?.room || !roomObject?.pos) {
		throw new Error('Invalid RoomObject');
	}
}

/**
 * Returns walkable terrain positions adjacent to a room roomObject.
 * Does not account for creeps or structures.
 *
 * @param {RoomObject} roomObject
 * @returns {RoomPosition[]} An array of Room Positions
 */
function getAdjacentWalkablePositions(roomObject) {
	assertValid(roomObject);
	const positions = [];
	const terrain = roomObject.room.getTerrain();
	const { x, y } = roomObject.pos;

	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			if (dx === 0 && dy === 0) {
				continue;
			}

			const nextX = x + dx;
			const nextY = y + dy;

			if (nextX < 0 || nextX > 49 || nextY < 0 || nextY > 49) {
				continue;
			}

			if ((terrain.get(nextX, nextY) & TERRAIN_MASK_WALL) !== 0) {
				continue;
			}

			positions.push(
				new RoomPosition(nextX, nextY, roomObject.room.name),
			);
		}
	}

	return positions;
}

/**
 * Get Count of walkable terrain positions adjacent to a room roomObject.
 * Does not account for creeps or structures.
 * @param {RoomObject} roomObject
 * @returns {number} Count of walkable terrain positions
 */
function getAdjacentWalkablePositionCount(roomObject) {
	return getAdjacentWalkablePositions(roomObject).length;
}

module.exports = {
	getCoords,
	getAdjacentWalkablePositions,
	getAdjacentWalkablePositionCount,
};
