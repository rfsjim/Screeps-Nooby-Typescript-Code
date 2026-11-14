# Changelog

All notable changes to the Screeps Colony Automation will be documented in this file.

## Unreleased
### Added

- Feat: Add esbuild for single node file packaging
- Feat: Priority 1 recovery-gate checkpoint - Ensure screeps are spawned for a safe and productive colony
- Feat: Miner Spawning Logic
- Feat: Spawn policy for builders
- Feat: Conditional Repairer Spawning
- Feat: claimer spawn logic
- Feat: Role Extractor Spawn Logic
- Feat: Initial Scaffolding for LongDistanceHarvester spawn logic and spawning order
- Feat: Long Distance Harvester
- Feat: Analytical Timing Recording of Long Distance Harvester Trips to assist with optimal body calculations
- Feat: Server Management and Testing Scripts
- Feat: Private Server Script for GCL Power Money and CPU management
- Feat: RCL Management Tool
- Feat: Controller Progress Tool
- Feat: Energy Extension Tool
- Feat: Construction Site Progress Tool
- Feat: Tooling to modify structure hits
- Feat module es testing
- Feat: Add testing for ES Modules with mjs
- Feat: Telemetry for can mining operations
- Feat: Add Creep Messages and Path Displays
- Feat: Resource Manager Allows Searching for Resources in Containers and Dropped within a room
- Feat: Market Manager Finds Available BUY TRADES to sell to
- Feat: Buy and Sell Order Discovery
- Feat: Add New Market Functions to Terminal
- Feat: Added New Resource Policy for Z
- Feat: Variables for additional used RESOURCES for mock to pass
- Feat: Basic scafolding for a tower manager, no code fleshing out ideas
- Feat: Tower Manager to Co-Ordinate Attack Heal and Repair
- Feat: Expand Tower Logic to cover edge cases - add documentation and tests around tower logic
- Feat: Carl Douglas Room Defender
- Feat: Home Base Defenders Spawn Logic
- Feat: Add Spawn Manager
- Feat: Mineral Detection in Room Init
- Feat: Wire Mineral Room Memory Init and Gracefull Handle Generating Pixels outside of Screeps World
- Feat: Wire Mineral Room Memory Init and Gracefull Handle Generating Pixels outside of Screeps World
- Feat: Add spawn logic for extractor role
- Feat: Add helpers for future tasking and target capability assessments
- Feat: Add helper getters
### Fixed

- Fix: Fixed premature access to Game.spawns['Spawn1'].room
- Fix: handles unknown creep role without throwing error
- Fix: adjust variable assignment from const to let to allow reassignment of values for targets
- Fix: correct handling of room object for init and phase calculations
- Fix: handle missing energy containers during source harvesting
- Fix: Energy Collection Logic
- Fix: Harvester fill structure logic
- Fix: Logic error to identify targets
- Fix: Logic error to identify targets
- Fix: Adjust threshold for inefficient tower repairs
- Fix: Role Extractor Target Logic
- Fix: Adjust targetting logic
- Fix: Targetting Logic
- Fix: Long Distance Harvester Work Part Number Argument Restriction Clamping
- Fix: Error moving between rooms when all targets return null
- Fix: Clamp Energy based on RCL
- Fix: Logic errors within storage Upgrader finding appropriate structure
- Fix: Logic error with using container OR source for getEnergy
- Fix: Repair issue where missing source or container would prevent further code from running
- Fix: Tower busy state never resets after the first successful attack.
- Fix: Latex Math Notation
- Fix: Latex Math Notation
- Fix: Logic errors causing init data to be incorrect or incorrectly handled
- Fix: Init bug fixes and logical areas
- Fix: Fix Error where CPU statistics initialization throws on a clean memory state
- Fix: Error in taget logic accepting null targets
- Fix: Update Builder Logic
- Fix: Fix logic for home base defenders Carl Douglas
- Fix: Remove references to console.error() as it isn't supplied in API
