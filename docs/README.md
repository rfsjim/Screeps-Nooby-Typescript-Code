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
$$\boxed{H=2W(1500-T)}$$\
Where $T$ is the total time spent not harvesting.

A miner with five `WORK` parts working continuously with a 30 tick travel time could theoretically harvest 14,700 energy. This is ignoring the limits of sources or other variables.

### Movement is a significant hidden cost
Documentation specifies fatigue generation per non-`MOVE` part:
| Terrain | Fatigue per loaded non-MOVE part | MOVE requirement for 1 tile/tick |
|:-------:|:--------------------------------:|:--------------------------------:|
| Road    | 1                                | 1 MOVE per 2 other parts         |
| Plain   | 2                                | 1 MOVE per 1 other part          |
| Swamp   | 10                               | 5 MOVE per 1 other part          |

- Empty `CARRY` parts do not generate fatigue. Boosted movement changes the calculation.
- Road infrastructure economically important: a hauler travelling a road network can dedicate more of its 50 parts to carrying resources.
- A useful design pattern is to calculate the required movement parts from the actual route, rather than using a fixed ratio for every creep.

## Harvesting and logistics

### Harvesting matching source output to WORK capacity
Standard source capacities and regeneration intervals produce these theoretical rates:
|     Source type     | Energy / regeneration | Energy / tick | `WORK` to saturate |
|:-------------------:|:---------------------:|:-------------:|:----------------:|
| Owned room          | 3,000 / 300 ticks     | 10            | 5                |
| Neutral, unreserved | 1,500 / 300 ticks     | 5             | 3                |
| Reserved room       | 3,000 / 300 ticks     | 10            | 5                |
| Source Keeper room  | 4,000 / 300 ticks     | 13.33         | 7                |

The last column rounds up to whole `WORK` parts. It assumes continuous harvesting, no contention, and a source with its normal regeneration behaviour.

Useful constants
- `ENERGY_REGEN_TIME`,
- `SOURCE_ENERGY_CAPACITY`,
- `SOURCE_ENERGY_NEUTRAL_CAPACITY`, and
- `SOURCE_ENERGY_KEEPER_CAPACITY`

A stationary five-`WORK` miner is sufficient to saturate a normal owned-room source. Adding more `WORK` parts provides no additional sustainable output unless you're trying to empty an accumulated source faster or compensate for downtime.

#### Exception - Harvesting for Recovery
- When a source has regenerated to its full capacity, a larger miner can extract that stored energy faster. For example, ten `WORK` parts harvest 20 energy/tick, allowing 3,000 stored energy to be extracted in 150 ticks rather than 300.
- That can be valuable after a workforce collapse, even though it doesn't increase long-run regeneration.

### Hauler Sizing: a throughput problem
Need to consider calculating required carrying capacity based on source output, route distance and transport arrangements.

The fundamental relationship for `CARRY` parts is:\
$$\boxed{C_{\text{carry required}} = \frac{P\T_{\text{round trip}}}{50}}$$

Where:
- $P$ is the energy production rate in energy/tick.
- $T_{\text{round trip}}$ is the complete loaded and unloaded cycle time.
- $C_{\text{carry required}}$ is the number of `CARRY` parts needed across the hauler workforce.

The work could be distributed between a number of lorries as long as the combined `CARRY` parts fits into the equation. For example two smaller lorries or one larger lorry, depending on room energy capacity, spawn utilisation and reliability.

## Construction and maintenance

### Decay and repair economics
How much energy must be allocated to maintenance over time?
The basic repair equation is:
$$\boxed{E_{\text{repair}} = \frac{hits lost}{100}}$$
One unboosted `WORK` part repairs 100 hits/tick at a cost of one energy/tick.

#### Decay rates and maintenance budgets
|        Structure        |           Decay           | Average energy required |
|:-----------------------:|:-------------------------:|:-----------------------:|
| Container, owned room   | 5,000 hits / 500 ticks    | 0.10 energy/tick        |
| Container, neutral room | 5,000 hits / 100 ticks    | 0.50 energy/tick        |
| Road, plain             | 100 hits / 1,000 ticks    | 0.001 energy/tick       |
| Road, swamp             | 500 hits / 1,000 ticks    | 0.005 energy/tick       |
| Road, natural wall tile | 15,000 hits / 1,000 ticks | 0.15 energy/tick        |
| Rampart, owned room     | 300 hits / 100 ticks      | 0.03 energy/tick        |

- The road figures are *natural decay only*. Creep traffic accelerates road decay, so a heavily used mining route may cost substantially more.
- Rampart decay also varies by ownership and room status.

#### Owned room with two container mined sources and 30 plain road tiles
Ignoring traffic-induced road wear:

$$\boxed{E_{\text{maintenance}} = 2(0.10) + 30(0.001) = 0.23}$$

0.23 energy/tick, or 345 energy over 1,500 ticks (normal creep lifespan without `CLAIM`).

A dedicated repairer would be a very inefficient investment for this workload alone. A miner or lorry carrying one `WORK` part could potentially handle the maintenance while performing its normal job.

But there is a trade-off: an extra `WORK` part costs 100 energy and consumes a body slot. It should only be added where the expected repair work justifies the cost and doesn't disrupt harvesting or transport.

#### Repair before rebuilding
A container has 250,000 maximum hits and costs 5,000 energy to construct. Restoring 250,000 hits through repair costs 2,500 energy.

Ignoring creep and logistics costs, repairing an existing container is half the energy cost of constructing a replacement.