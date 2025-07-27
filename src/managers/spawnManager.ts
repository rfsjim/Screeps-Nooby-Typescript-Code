/*
 * Control spawning of creeps
 */

import { CreepMemory } from "types";

export function manageSpawning()
{
    const harvesters = Object.values(Game.creeps).filter((c) => (c.memory as CreepMemory).role === 'harvester');
    const upgraders = Object.values(Game.creeps).filter((c) => (c.memory as CreepMemory).role === 'upgrader');

    const spawn = Game.spawns['Spawn1'];

    if (!spawn.spawning)
    {
        if (harvesters.length < 2)
            {
                spawn.spawnCreep([WORK, CARRY, MOVE], `harvester-${Game.time}`, {
                    memory: { role: "harvester", working: false}
                });
            } else if (upgraders.length < 1)
            {
                spawn.spawnCreep([WORK, CARRY, MOVE], `upgrader - ${Game.time}`, {
                    memory: {role: "upgrader", working: false}
                });
            }
    } else
    {
        const spawningCreep = Game.creeps[spawn.spawning.name];
        spawn.room.visual.text(
            '🛠️' + (spawningCreep.memory as CreepMemory).role,
            spawn.pos.x + 1,
            spawn.pos.y,
            {align: 'left', opacity: 0.8});
    }
}