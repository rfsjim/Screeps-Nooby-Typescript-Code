/**
 * Carl Douglas
 * When everybody is Kung Fu Fighting Carl steps up to the plate and provides a ranged attack and medic role.
 * Combat medic — RANGED_ATTACK + HEAL Can attack at range while healing itself or an adjacent friendly.
 * It can contribute to defence and sustain itself without necessarily competing with the tower's actions.
 * Spawned for protection of an owned room when baddies are sighted.
 *
 * Body composition TOUGH + RANGED_ATTACK + HEAL + MOVE
 * Available pipeline for multi intent movements rangedAttack() + heal() OR rangedMassAttack() + heal()
 * CAN NOT perform rangedAttack / rangedMassAttack and rangedHeal together.
 *
 * Combat policy - prefers kiting opponents, keeping them at range 3. If in melee range uses rangedMassAttack() as a
 * situational effective bonk.
 * Prefer moving to a given range over moving directly to a given target.
 *
 * Healing policy - first heal self, then endangered combat-capable friendlies, then injured combat-capable friendlies, then
 * non combat workers.
 *
 * Movement policy - one movement decision per tick.
 * During combat, positioning should support both ranged attacks and any direct healing he can provide.
 * Outside combat, he can approach an injured friendly or return to a designated defensive position.
 *
 * Works hand in hand with room towers to contribute to net HP loss per tick. This means that capability of Carl will assist
 * in sharing load of any rescue plans with the towers.
 * The tower manager observes the result of Carl's healing; it doesn't know Carl's future intentions.
 *
 * TODO - Consider if later iterations when Creep Manager exists take advantage of recycleCreep(target) or renewCreep(target)
 *
 */
module.exports = {
	/**
	 * Run Carl Douglas Role (Defenders)
	 * @param {Creep} creep
	 */
	run: function (creep) {
		const hostileCapableParts = [CLAIM, WORK];
		const combatCapableParts = [ATTACK, RANGED_ATTACK, HEAL];
		const canRanged = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
		const canHeal = creep.getActiveBodyparts(HEAL) > 0;
		let target;

		const hasActivePart = (creep, parts) =>
			parts.some((part) => creep.getActiveBodyparts(part) > 0);

		//find hostile creeps to attack if creep has ranged attack parts
		if (canRanged) {
			const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
			target =
				hostileCreeps.find((c) =>
					hasActivePart(c, combatCapableParts),
				) ??
				hostileCreeps.find((c) =>
					hasActivePart(c, hostileCapableParts),
				) ??
				hostileCreeps[0];
		}

		// find creeps to heal if creep has heal parts - simultaneous execution of actions does right most action first
		// so, if heal is at end of code it will cancel out any attacks, best to get it out of the way if needed
		// not all creeps will have heal parts so most will skip this section
		if (canHeal) {
			//first heal self if needed
			if (creep.hits < creep.hitsMax) {
				creep.heal(creep);
			}
			//find my creeps in room to heal if required
			const healTarget = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
				filter: function (object) {
					return object.hits < object.hitsMax;
				},
			});
			if (healTarget) {
				// melee heal is better try it first
				if (creep.heal(healTarget) === ERR_NOT_IN_RANGE) {
					// if out of melee range try ranged heal
					if (creep.rangedHeal(healTarget) === ERR_NOT_IN_RANGE) {
						// otherwise move closer
						creep.moveTo(healTarget);
					}
				}
				return;
			}
		}

		//work on attacking
		if (target) {
			// creeps with ranged attack should move in with ranged attack first
			if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
				// melee attack stronger than ranged attack, try melee first
				if (creep.attack(target) === ERR_NOT_IN_RANGE) {
					// too far away for melee try rangedAttacks
					const targets = creep.pos.findInRange(
						FIND_HOSTILE_CREEPS,
						3,
					);
					if (targets.length > 0) {
						// rangedMassAttack provides bonus splash damage
						creep.rangedMassAttack();
						return;
					} else if (
						creep.rangedAttack(target) === ERR_NOT_IN_RANGE
					) {
						//keep walking towards the badie
						creep.moveTo(target);
					}
				}
			} else if (creep.getActiveBodyparts(ATTACK) > 0) {
				if (creep.attack(target) === ERR_NOT_IN_RANGE) {
					creep.moveTo(target);
				}
			}
		}
	},
};
