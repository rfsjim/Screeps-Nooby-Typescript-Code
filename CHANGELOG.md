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
