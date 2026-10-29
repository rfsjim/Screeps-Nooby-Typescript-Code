# Common Local Server Commands to Assist in Testing Code

## CLI One-Liner Generator
This folder contains some commands available when running a local private server to test your codebase and change the simulation as required.

Using node we can run a script to get a one line command generated back that can be copy and pasted into the private server CLI interface.

- User Management - Change GCL, GPL, Market Credits, CPU Limit -
	- `node server-scripts/user-management.mjs <username> <gcl|power|money|cpu|active> <set|add> <non-negative-integer>`
	- `node server-scripts/user-management.mjs Alice gcl set 38000000`
	- `node server-scripts/user-management.mjs Alice money add 5000`
- Add Energy to Storage - `node server-scripts/storage-energy.mjs add W7N3 10000`
Returns `storage.db['rooms.objects'].update({ type: 'storage', room: "W7N3" }, { $inc: { 'store.energy': 10000 } })`
- Set Energy in Storage to - `node server-scripts/storage-energy.mjs set W7N3 10000`
Returns `storage.db['rooms.objects'].update({ type: 'storage', room: "W7N3" }, { $set: { 'store.energy': 10000 } })`
- Set Energy in all Room Extensions - `node .\server-scripts\extension-energy.mjs W1N1 8 50` Returns `storage.db['rooms.objects'].update({ type: 'extension', room: "W1N1" }, { $set: { 'store.energy': 50 } })`
- Adjust Controller Progress - `node server-scripts/controller-progress.mjs <set|add> <controllerId> <amount>` Returns `storage.db['rooms.objects'].update({ _id: aefb1234567890fe }, { $inc: { progress: 679 } })`
- Adjust Room RCL - `node server-scripts/room-rcl.mjs <set|add> <controllerId> <level>`
- Adjust Construction Site Progress - `node server-scripts/construction-site-progress.mjs <set|add> <room> <amount>`

## Other CLI Commands
### Help
- General `help()`
- System Management `help(system)`
- Database Storage `help(storage)`

### Utilities
- Pause Simulation `system.pauseSimulation()`
- Resume Simulation `system.resumeSimulation()`
- Get Tick Duration `system.getTickDuration()`
- Set Tick Duration `system.setTickDuration()`
- Inspect Database Objects `storage.db['rooms.objects'].find({ type: 'spawn' });`
- Find Spawns in Given Room `storage.db['rooms.objects'].find({ type: 'spawn', room: 'W5N8' })`
- Find Spawn by ID `storage.db['rooms.objects'].findOne({ _id: 'acc164a51cbfb59' });`
- Find First Spawn Object `storage.db['rooms.objects'].findOne({ type: 'spawn' });`

### When Private Server Gets Buggy
Documented issues where all Spawns will get 0/0 energy store
- Complete repair restore both energy and capacity `storage.db['rooms.objects'].update({ _id: 'acc164a51cbfb59' }, { $set: { store: { energy: 1 }, storeCapacityResource: { energy: 300 } }, $unset: { 'store.energy': 1 } })`