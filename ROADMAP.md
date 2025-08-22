# 📘 ROADMAP.md – Screeps AI Development

## 🧠 Vision
> Build a fully autonomous Screeps AI capable of managing multiple rooms, using every available structure, adapting to threats, and scaling to max GCL in a modular and intelligent fashion.

---

## 🔢 Milestones & Versioning

### ✅ v0.1.0 — Room Bootstrap & Basic Roles
- [x] Spawn basic creeps: `harvester`, `upgrader`, `builder`
- [x] Harvest from nearest source
- [x] Upgrade controller
- [x] Simple build logic
- [x] Creep lifecycle logging
- [x] Basic memory structure and cleanup

---

### 🔁 v0.2.0 — Central Task Coordination
- [ ] Task manager assigns roles
- [ ] Prevent multiple creeps per target
- [ ] Role switching (e.g., harvester ↔ upgrader)
- [ ] Centralized creep memory management

---

### 🛠️ v0.3.0 — Midgame Economy
- [ ] Auto build: containers, roads, towers
- [ ] Prioritized construction
- [ ] Start integrating `StructureLink`
- [ ] Optimize creep body sizes based on role logic

---

### 🛡️ v0.4.0 — Defense System
- [ ] Tower logic (heal, repair, attack priorities)
- [ ] Rampart open/close logic
- [ ] Defender creep with simple logic
- [ ] Hostile tracking and memory

---

### 🏘️ v0.5.0 — Multi-Room Empire
- [ ] Expansion planner (claim next GCL room)
- [ ] Outpost logic for remote mining
- [ ] Shared memory map
- [ ] Room visual status display

---

### 🚚 v0.6.0 — Remote Harvesting & Links
- [ ] Use `StructureLink` for room transfers
- [ ] Efficient remote mining behavior
- [ ] Begin `StructureKeeperLair` logic
- [ ] Energy delivery to home room

---

### ⚗️ v0.7.0 — Labs & Factory Automation
- [ ] Manage `StructureLab` reactions
- [ ] Boost creeps intelligently
- [ ] Automate `StructureFactory` with production goals
- [ ] Resource transport coordination

---

### 🛰️ v0.8.0 — Scouting & Global Vision
- [ ] Use `StructureObserver` to scan key sectors
- [ ] Track room ownership and invader cores
- [ ] Intelligence memory system
- [ ] Explore portal logic

---

### 🔋 v0.9.0 — Power & Nukes
- [ ] Mine `StructurePowerBank`
- [ ] Power creep behavior (optional)
- [ ] Use `StructurePowerSpawn`
- [ ] Nuke construction + targeting logic
- [ ] Advanced terminal usage

---

### 🚀 v1.0.0 — Endgame AI Loop
- [ ] Fully autonomous empire (multi-room)
- [ ] Robust memory & error handling
- [ ] Dynamic scaling logic
- [ ] Deployment script (optional)
- [ ] README + architecture docs + usage guide
- [ ] Fully tagged SemVer release

---

## 📌 Release Strategy

| Version     | Stage             | Tag Examples             | Description                                   |
|-------------|-------------------|--------------------------|-----------------------------------------------|
| `v0.x.x`    | Pre-alpha/alpha    | `v0.3.1-alpha`, `v0.5.0` | Features under heavy change                   |
| `v0.x.x`    | Beta milestones    | `v0.9.0-beta`            | Near complete, testing complex interactions   |
| `v1.0.0`    | Stable             | `v1.0.0`, `v1.1.1`       | Full feature parity + consistent stability    |
| `vX.Y.Z-rc` | Release candidate  | `v1.0.0-rc.1`            | Testing before final stable release           |

Use GitHub tags or Git release pages to tag versions and write short changelogs. Example:

```bash
git tag v0.4.0-beta.1
git push origin v0.4.0-beta.1
