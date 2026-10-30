# Screeps: The mathematics of an efficient colony

Screeps is essentially a game of mathematics, an optimisation problem disguised as a real-time strategy game. Nearly every decision can be expressed mathematically: how much energy to invest in a creep, how long it takes to repay that investment, how much work a creep can accomplish before dying, and whether several specialised creeps outperform one generalist.

There are *six* areas of mathematics that is worth focusing on
- **Creep economics**: body composition, energy efficiency, lifetime productivity and replacement scheduling.
- **Harvesting and logistics**: source saturation, hauler sizing, movement speed and round-trip throughput.
- **Construction and maintenance**: building productivity, decay rates, repair demand and optimal workforce.
- **Combat**: attack/heal mathematics, damage mitigation, offensive quads and tower interactions.
- **Room economics**: upgrading, extensions, links, storage, terminal transfers and energy allocation.
- **Strategic optimisation**: CPU efficiency, opportunity costs, reserve management and dynamic workforce planning.

## Creep Economics
[Screeps Documentation](https://docs.screeps.com/index.html)

| Part     | Cost | Unboosted performance                       |
|:-------------:|:----:|:------------------------------------------------------------------:|
| `MOVE`          | 50   | Removes 2 fatigue tick                                             |
| `WORK`          | 100  | Harvest 2 energy/tick; build 5 progress/tick; repair 100 hits/tick |
| `CARRY`        | 50   | 50 resource capacity                                               |
| `ATTACK`        | 80   | 30 damage/tick                                                     |
| `RANGED_ATTACK` | 150  | 10 single-target damage/tick                                       |
| `HEAL`          | 250  | 12 adjacent or 4 ranged healing/tick                               |
| `CLAIM`         | 600  | Claim, reserve, attack controllers                                 |
| `TOUGH`         | 10   | 100 HP, boostable resistance                                       |

Normal creeps live for 1,500 ticks, creeps with `CLAIM` parts live for 600 ticks. The maximum body is 50 parts, with spawning requiring 3 ticks per part.

That identifies three different optimisation objective:
- **Capital efficiency:** minimise energy spent per unit of productive work.
- **Throughput:** maximise useful work completed per tick.
- **Lifetime efficiency:** maximise productive work before the creep expires, accounting for travel and spawning.

For a creep with $W$ work parts, its theoretical lifetime energy harvest is:\
$$H=2W(1500-T)$$
where $T$ is the total time spent not harvesting.