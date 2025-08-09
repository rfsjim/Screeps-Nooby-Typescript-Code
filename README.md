# Screeps Typescript Nooby Code

An adventure into Typescript using *Screeps: World* an open source MMO RTS sandbox game

 Creating an automated script that will  make an army of creeps  who will take over the screeps world

## Key Ideas
* Use this as a way to practice using TypeScript Interfaces and get comfortable using VS Code and CI/CD
    * Utilise the gang of four’s object oriented software design patterns.
        * Singleton - Central Manager Co-Ordinating Roles
        * Factory - Creep Generation
        * Observer - Event listeners / publish-subscribe as part of task issuing
        * Strategy - Base Creep Generation on behavioural abilities.
        * Decorator – Wrap Custom creeps behaviours
        * Flyweight – reuse shared objects to save memory
    * CI/CD In VS Code
    * Lint & type-check your Screeps code before pushing
* Modularise creeps' behaviour
* Memory optimisations structure config and cache data cleanly, reducing CPU usage.
* Central Manager Co-ordinating Roles

## Milestones
- [ROADMAP](ROADMAP.md)

## Project Plan

### Expansion
Quickly upgrade the controller to get access to extensions so room capacity can grow:

* As the room's energy capacity increases, creepers spawned will become more powerful
* Level 0 & 1 - Initial creeps harvest all around the available spots of the source,
    * Quickly upgrade the controller level
* Level 0 - When combined creeps have 200 energy available upgrade to level 1,
* Level 1 - When combined creeps have 45,000 energy available upgrade to level 2
* Level 2 - Build containers next to the sources, build extensions
* Level 3 onwards - Check if it can build towers and more extensions.
* Level 4 - Resources will be collected and stored in storage.
* Level 5 - Once two towers exist start defending room, if overwhelmed utilise available resources to create defender squads
    * Prioritise quads, if insufficient resources then produce defenders as can be afforded.
* Level 6 - Labs, extractors and terminals become available. Minerals are fetched from the extractor and transported to the source. Depending on availability of minerals in controlled rooms, reactions are basically implemented. Depending on a threshold excess minerals are sold on the market.

#### Phase 1 - Bootstrap Screeps AI Strategy
* **Goal** - Reach RCL 2 ASAP to unlock:
    * Containers
    * Extensions
    * Inital Defensive Infrastructure

Generate a layout for the room and builds the structures for the current RCL.
When the controller level upgrades, check if it can build towers and more extensions.
If the current number of rooms is less than the GCL, acquire new rooms.

### Routing
Instead of running Game.map.findRoute(start, end) everytime instead use an array to store the route for further use.
Optimise routing by exploring using a pathfinding library or algorithm to enhance efficiency.

### AI Strategy
Essentially the game is a maths problem. Every decision to be made is based on a mathematical formula.
For example - there is a finite amount of energy available to be harvested from a source each 300 ticks, therefore there is no point in having creeps with massive amounts of work parts who will just drain the source too quickly and sit idle for the rest of the tick cycle or have too many smaller basic creeps who will also cause the same issue of prematurely draining the source.

Use publish - subscriber pattern to task creeps.

**Resource Management**: Priorities energy usage and production. TODO: create a decision tree or flowchart to visualise the priority logic.

#### Initial Phases
* Spawn basic creeps
* Build containers next to sources
* Upgrade the controller as quickly as possible
* Build extensions

#### Regular Colony Behaviour
* Spawn Miners that do nothing but harvest Sources and transfer energy to containers.
* Haulers will move energy to extensions and surplus into storage structures.
* All other creeps will try to get energy from these containers and storage structures.
* Continue to upgrade the Controller.
* Build towers near Sources and then Controllers.

#### Defense
* Builder creeps no longer repair. Towers repair.
* Find each exit and build walls and ramparts around it
* Spawn defenders when enemies enter the room.
* Low cost creeps can scout to detect incoming threats before getting to room

#### Mature Room Behaviour
* Maximize creep sizes and minimize unneeded Creeps

##### Expansion
* When a room has two towers and if the current number of rooms is less than the GCL, the AI will acquire new rooms, start expanding into other rooms.
* Send Scouts to discover other rooms, avoiding enemy rooms. Periodically recheck the room to see if other players have laid claim.
* Spawned Settlers will go two rooms away to reserve a room with two Miners and a Controller. Sending a defender or two harvesters * along the way.
* If there are no more unexplored safe rooms. Build an army and send it to a room at the top of the desirable room queue that has an enemy.

#### Current Roles

##### Core Roles
* Builder - build buildings from constructions sites, repair roads/walls/ramparts
* Miner - source of energy. mine energy sources in the room or neighboring rooms
    * There are 4 kinds of available resources: `energy`, `minerals`, `power`, and `commodities`. They can all be harvested but how they are harvested and processed is different for each resource. It needs clean modular design pattern.
    * Strategy pattern is the best fit for resource harvesting.
    * The Strategy Pattern is ideal when you want to define a family of algorithms, encapsulate them, and make them interchangeable.
    * Each resource type has its own harvesting strategy, and likely also its own transport, storage, and processing strategy.
    * The core creep logic stays the same, but need to swap out the resource strategy depending on what the creep's role or assignment is.
* Upgraders get energy from the storage, and put it into the controller.
* Hauler - move energy to extensions and surplus into storage structures and transfers energy to free structures on the path. On low energy in storage, the harvester falls back to the start up phase without relying on anything (storage, links, other creeps).

##### Military
* Breaker - destroys enemy buildings. Pair with medic.
* Medic - heals other military units
* Range Attacker
* Quad unit - ranged group of 4 units. 2 x range attacker units and 2 x medic units. The units travel formation, and attack/heal together.
    * Provides ability to co-ordinate units attack formations and prioritse targets
* Defender - Defend against enemy invaders.
* Robber - takes resources from enemy rooms

##### Other
* Claimer - claim rooms (GCL 2 or above) below can reserve a room
* Mineral Miner - mine mineral source in the room
* Deposit Miner - mine deposits in nearby highway rooms
* Power Miner - mine power in nearby highway rooms
* Power Creep - boost other creeps/resources/structures in a room
* Scout - scout nearby rooms using breadth-first search based room exploring
* Un-claimer - attack enemy controllers
* Nextroomer moves to the target room and builds up that room.

#### Room Setup

##### Positions
* Upgrader creep next to the controller
* Storage structure next to the upgrader
* Links are placed next to the sources and at the paths to the exits.
* Layers of walls are placed at the exits, positions within the pre-calculated paths are replaced by ramparts.

##### Logic
* Queue required tasks based on priority of task so that more important tasks are completed over lower priority tasks
    * TODO We can use first in first out queues or last in first out stacks, which will perform better in practice? Can both operate at the same time? Highest priority tasks are in a stack if no stack items then goto queue?
* Tasks driven by observer publish-subscribe pattern for communication between creeps and a singleton central control object
* The number of structures are checked and if applicable new constructionSites are placed.
* Links are triggered to transfer energy to links near the storage.
* Towers attack incoming creeps or heal my creeps.
* If no spawn is available nextroomer from other rooms are called, to build up the room.
* The basic creep is the harvester which can make sure that enough energy will be available to build the rest of the creeps. For this we check if a harvester is within the room, otherwise spawn it. For the rest a priority queue is used.

##### Optimal Harvester Configuration
**Formula**: Harvest Rate (per tick) = Number of WORK parts × 2

**Goal**: Configure creeps so the total work output matches the source’s regeneration over 300 ticks (i.e., 3000 energy → 10 energy/tick).

**Strategy**: Assign one or two dedicated miners per source with exactly 5 WORK parts each (or 10 total per source).

**Bonus**: Place a container adjacent to the source for static miners to dump into, avoiding movement inefficiencies.

##### Creep Role Decoupling
**Avoid**: "do-everything" creeps. Specialize:

**Miners**: Static, optimized for WORK parts.

**Haulers**: Purely move energy from containers to base (optimized for CARRY + MOVE).

**Builders/Upgraders**: Spawned dynamically based on available energy surplus.

##### Energy Flow Modeling
Model room's energy flow as a directed graph:

* **Nodes**: Sources, containers, spawns, extensions, controller, construction sites.

* **Edges**: Paths/links representing energy transport.

* **Goal**: Minimize transport cost (tick delay × energy cost) while ensuring all sinks are supplied.

##### Dynamic Spawn Prioritization
Use priority queues based on:

* Controller downgrade timer
* Available energy income
* Defensive need (hostiles present?)
* Room development phase (early game = more builders, late = more upgraders/links)

Choose creep roles to spawn based on room state using scoring weights.

##### Resource Efficiency Score
Custom KPI:

* `efficiency` = (`energyUsedProductively` / `totalEnergyHarvested`)
* Log energy spent on `spawns`, `repairs`, `upgrades`, etc.
* Aim to reduce waste (e.g. dropped energy, idle creeps).

KPI will tune your AI and reward changes that reduce idle time or wasted ticks.

##### Memory-Driven Learning
Store metrics in Memory over time:

* Source usage patterns
* Idle time for creeps
* Transport delays

Then adapt logic based on long-term stats (e.g. add an extra hauler if transport time averages too long).

##### Pathfinding Heatmaps
Generate a heatmap of creep traffic per tile.
Use it to avoid congestion and plan roads automatically.

**Bonus**: Use decay rate of structures to prioritize repair scheduling.

##### Controlled Room States
Room modes:
* *Bootstrap* (low energy, focus on basic harvesters and spawn)
* *Growth* (expansion, more builders and upgrader ratio increase)
* *Fortify* (hostile presence: prioritize tower energy and defenders)
* *Stable* (optimized, low creep churn, efficient economy)

Switch between these based on thresholds.

##### Spawn Simulation Debugger
A tool that simulates room state and spawn queue using stored Memory data. Use it to test and benchmark AI logic changes locally (outside of live ticks).

##### Scouting & Intel System
Low-cost scout creeps to:
* Find unclaimed rooms
* Detect enemy activity
* Monitor hostile creep movement patterns (good for early PvP avoidance or planning)

Build an intel Memory module and use the data for expansion planning.

### Memory

#### Memory Usage
* TODO: Can these memory items be optimised by compressing data or using bitwise operations for boolean arrays?

* Garbage collection mechanism to periodicially clean up unused memory.

* Room Exits and Phases
* Check for dead creeps,
* Track script version,
* Track CPU bucket used and CPU limit
* Track amount of creeps
* Creep
    * Role
    * target room name,
    * working state machine
* Mineral Miner
    * track mineral id and
    * mineral type
* Miner - track source id
* Hauler - track container id
* Memory Structure
* Rooms
* Name
* Exits as boolean array
* Allocated Miners
* SourceID
* Phase
* Last Checked
* StorageID
* GCL
* List of required deconstructions
* Room Name
* Structure type
* Position
* queue
* List of required constructions
* Room name
* Structure type
* Position
* Queue
* Towers
* towerID
* repairID
* wallID
* Spawns
* Name
* minCreeps
* Builder
* Upgrader
* Hauler
* Miner
* Level
* Room name
* Creeps
* Name
* Role
* State
* Move list
* Destination
* Pos
* Room
* Time
* Path
* SCRIPT_VERSION
* Stats[]
* Persistent[]
* Cpu[]
* Usage[]
* Limit
* Bucket
* getUsed
* Gcl[]
* Progress
* progressTotal
* Level
* Memory[]
* Used
* Intel

#### Memory Structure

# Contains Legacy Code
This repo includes a legacy JavaScript implementation stored in /legacy/. Please don’t judge me — I was young, and JavaScript let me get away with too much.