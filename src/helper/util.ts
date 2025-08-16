import { ROOM_BOUNDARY_VALUES } from "consts";

/**
 * Get Distance Transform
 * Uniform Distance Transform
 * Two-Pass distance transform sweep
 * Based on Felzenszwalb’s distance transform
 * @param roomName 
 * @returns 
 */
export function getDistanceTransform(roomName: string): CostMatrix
{
    const TERRAIN_COSTS = 
    {
        plainCost: 1,
        swampCost: 5,
        wallCost: 0
    };

    const BOTTOM_LEFT = 
    [
        { x: -1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: -1 },
        { x: -1, y: 1 }
    ];

    const TOP_RIGHT =
    [
        { x: 1, y: 0 },
        { x: 0, y: +1 },
        { x: 1, y: 1 },
        { x: 1, y: -1 }
    ];

    let costs = new PathFinder.CostMatrix();

    const terrain = new Room.Terrain(roomName);

    // initialize all costs
    for (let x = ROOM_BOUNDARY_VALUES.minX; x <= ROOM_BOUNDARY_VALUES.maxX; x++)
    {
        for (let y = ROOM_BOUNDARY_VALUES.minY; y <= ROOM_BOUNDARY_VALUES.maxY; y++)
        {
            if (terrain.get(x , y) === TERRAIN_MASK_WALL)
            {
                costs.set(x, y, TERRAIN_COSTS.wallCost);
                continue;
            }
            if (x < 1 || x > 48 || y < 1 || y > 48)
            {
                costs.set(x, y, TERRAIN_COSTS.wallCost);
                continue;
            }
            // initialize with large value
            costs.set(x, y, 1 << 8);
        }
    }

    // run forward pass of room
    for (let x = ROOM_BOUNDARY_VALUES.minX; x <= ROOM_BOUNDARY_VALUES.maxX; x++)
    {
        for (let y = ROOM_BOUNDARY_VALUES.minY; y <= ROOM_BOUNDARY_VALUES.maxY; y++)
        {
            let distance = costs.get(x, y);
            for (const vector of BOTTOM_LEFT)
            {
                distance = Math.min(distance, neighbourDistance(costs, x, y, vector.x, vector.y));
            }
            costs.set(x, y, distance);
        }
    }

    let maxDistance = 0;

    // run backward pass of room
    for (let x = ROOM_BOUNDARY_VALUES.maxX; x >= ROOM_BOUNDARY_VALUES.minX; x--)
    {
        for (let y = ROOM_BOUNDARY_VALUES.maxY; y >= ROOM_BOUNDARY_VALUES.minY; y--)
        {
            let distance = costs.get(x, y);
            for (const vector of TOP_RIGHT)
            {
                distance = Math.min(distance, neighbourDistance(costs, x, y, vector.x, vector.y));
            }
            maxDistance = Math.max(maxDistance, distance);
            costs.set(x, y, distance);
        }
    }

    const roomVisual = new RoomVisual(roomName);

    for (let x = ROOM_BOUNDARY_VALUES.maxX; x >= ROOM_BOUNDARY_VALUES.minX; x--)
    {
        for (let y = ROOM_BOUNDARY_VALUES.maxY; y >= ROOM_BOUNDARY_VALUES.minY; y--)
        {
            if (terrain.get(x , y) === TERRAIN_MASK_WALL) continue;

            const cost = costs.get(x, y);

            if (cost === 0) continue;

            const hue = 180 * (Math.sqrt(cost / maxDistance));
            const color = `hsl(${hue},100%,60%)`;

            roomVisual.text(`${cost}`, x, y);
            roomVisual.rect(x - 0.5, y - 0.5, 1, 1,
                {
                    fill: color,
                    opacity: 0.4
                });
        }
    }

    return costs;
}

/**
 * Calculate Neighbour Distance
 * Helper for safe distances
 * @param costs 
 * @param x 
 * @param y 
 * @param dx 
 * @param dy 
 * @returns 
 */
function neighbourDistance(costs: CostMatrix, x: number, y: number, dx: number, dy: number): number
{
    const nx = x + dx, ny = y + dy;

    // out of bounds check - treat as far
    if (nx < ROOM_BOUNDARY_VALUES.minX || nx > ROOM_BOUNDARY_VALUES.maxX || ny < ROOM_BOUNDARY_VALUES.minY || ny > ROOM_BOUNDARY_VALUES.maxY) return 100;

    const neighbour = costs.get(nx, ny);

    // if undefined (should never get to this code as is all init) fallback
    if (neighbour === undefined) return 100;

    return neighbour + 1;
}