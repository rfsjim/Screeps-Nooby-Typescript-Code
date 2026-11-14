const ROOM_BOUNDARY_VALUES = { minX: 0, minY: 0, maxX: 49, maxY: 49 }; // Min and max values for room x y position
const INITIAL_DISTANCE = 255;
const LARGE_DISTANCE = 100;
const WALL_DISTANCE = 0;
const FORWARD_NEIGHBOURS = [
	{ x: -1, y: 0 },
	{ x: 0, y: -1 },
	{ x: -1, y: -1 },
	{ x: -1, y: 1 },
];
const BACKWARD_NEIGHBOURS = [
	{ x: 1, y: 0 },
	{ x: 0, y: 1 },
	{ x: 1, y: 1 },
	{ x: 1, y: -1 },
];

/**
 * Calculates a two-pass, eight-neighbour chessboard-distance transform.
 *
 * Terrain walls and room boundaries are treated as obstacles.
 * Each walkable tile receives its distance from the nearest obstacle.
 *
 * @param {string} roomName
 * @returns {CostMatrix} Construction-clearance matrix
 */
function getDistanceTransform(roomName) {
	const costs = new PathFinder.CostMatrix();
	const terrain = new Room.Terrain(roomName);

	// initialize all costs
	for (
		let x = ROOM_BOUNDARY_VALUES.minX;
		x <= ROOM_BOUNDARY_VALUES.maxX;
		x++
	) {
		for (
			let y = ROOM_BOUNDARY_VALUES.minY;
			y <= ROOM_BOUNDARY_VALUES.maxY;
			y++
		) {
			if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
				costs.set(x, y, WALL_DISTANCE);
				continue;
			}
			if (x < 1 || x > 48 || y < 1 || y > 48) {
				costs.set(x, y, WALL_DISTANCE);
				continue;
			}
			// initialize with highest cost value
			costs.set(x, y, INITIAL_DISTANCE);
		}
	}

	// run forward pass of room
	for (
		let x = ROOM_BOUNDARY_VALUES.minX;
		x <= ROOM_BOUNDARY_VALUES.maxX;
		x++
	) {
		for (
			let y = ROOM_BOUNDARY_VALUES.minY;
			y <= ROOM_BOUNDARY_VALUES.maxY;
			y++
		) {
			let distance = costs.get(x, y);
			for (const vector of FORWARD_NEIGHBOURS) {
				distance = Math.min(
					distance,
					neighbourDistance(costs, x, y, vector.x, vector.y),
				);
			}
			costs.set(x, y, distance);
		}
	}

	// run backward pass of room
	for (
		let x = ROOM_BOUNDARY_VALUES.maxX;
		x >= ROOM_BOUNDARY_VALUES.minX;
		x--
	) {
		for (
			let y = ROOM_BOUNDARY_VALUES.maxY;
			y >= ROOM_BOUNDARY_VALUES.minY;
			y--
		) {
			let distance = costs.get(x, y);
			for (const vector of BACKWARD_NEIGHBOURS) {
				distance = Math.min(
					distance,
					neighbourDistance(costs, x, y, vector.x, vector.y),
				);
			}
			costs.set(x, y, distance);
		}
	}

	return costs;
}

/**
 * Calculate Neighbour Distance
 * Helper for safe distances
 * @param {CostMatrix} costs
 * @param {number} x
 * @param {number} y
 * @param {number} dx
 * @param {number} dy
 * @returns {number} neighbour distance cost
 */
function neighbourDistance(costs, x, y, dx, dy) {
	const nx = x + dx,
		ny = y + dy;

	// out of bounds check - treat as far
	if (
		nx < ROOM_BOUNDARY_VALUES.minX ||
		nx > ROOM_BOUNDARY_VALUES.maxX ||
		ny < ROOM_BOUNDARY_VALUES.minY ||
		ny > ROOM_BOUNDARY_VALUES.maxY
	) {
		return LARGE_DISTANCE;
	}

	const neighbour = costs.get(nx, ny);

	return neighbour + 1;
}

/**
 * Draws Debug Visuals based on Distance Transform
 * @param {string} roomName - Room represented by the supplied transform
 * @param {CostMatrix} costs - Previously calculated distance transform
 * @returns {void}
 */
function drawDebugVisuals(roomName, costs) {
	if (Memory.debugVisuals?.roomName !== roomName) {
		return;
	}

	const terrain = new Room.Terrain(roomName);

	const roomVisual = new RoomVisual(roomName);

	let maxDistance = 0;
	for (
		let x = ROOM_BOUNDARY_VALUES.minX;
		x <= ROOM_BOUNDARY_VALUES.maxX;
		x++
	) {
		for (
			let y = ROOM_BOUNDARY_VALUES.minY;
			y <= ROOM_BOUNDARY_VALUES.maxY;
			y++
		) {
			if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
				continue;
			}

			const cost = costs.get(x, y);
			maxDistance = Math.max(maxDistance, cost);
		}
	}

	if (maxDistance === 0) {
		return;
	}

	for (
		let x = ROOM_BOUNDARY_VALUES.minX;
		x <= ROOM_BOUNDARY_VALUES.maxX;
		x++
	) {
		for (
			let y = ROOM_BOUNDARY_VALUES.minY;
			y <= ROOM_BOUNDARY_VALUES.maxY;
			y++
		) {
			if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
				continue;
			}

			const cost = costs.get(x, y);
			if (cost === 0) {
				continue;
			}

			const hue = 180 * Math.sqrt(cost / maxDistance);
			const colour = `hsl(${hue},100%,60%)`;

			roomVisual.text(`${cost}`, x, y);
			roomVisual.rect(x - 0.5, y - 0.5, 1, 1, {
				fill: colour,
				opacity: 0.4,
			});
		}
	}
}

module.exports = { getDistanceTransform, drawDebugVisuals };
