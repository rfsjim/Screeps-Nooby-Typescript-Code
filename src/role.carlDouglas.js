/**
 * Carl Douglas
 * When everybody is Kung Fu Fighting Carl steps up to the plate and provides a ranged attack and medic role.
 * Combat medic — RANGED_ATTACK + HEAL Can attack at range while healing itself or an adjacent friendly.
 * It can contribute to defence and sustain itself without necessarily competing with the tower's actions.
 * Spawned for protection of an owned room when baddies are sighted.
 *
 * Body composition TOUGH + RANGED_ATTACK + HEAL + MOVE
 * Available pipeline for multi intent movements rangedAttack() + heal() OR rangedMassAttack() + heal()
 * CAN NOT perform rangedAttack / rangedMassAttack AND rangedHeal together.
 *
 * Combat policy - prefers kiting opponents, keeping them at range 3. If in melee range uses rangedMassAttack() as a
 * situational effective bonk.
 * Prefer moving to a given range over moving directly to a given target.
 *
 * Healing policy
 * - first heal self,
 * - then adjacent friendly that can be saved (range 1 heal),
 * - then nearby friendly that can be saved (range <= 3 rangedHeal if worth losing the rest of the tick),
 * - then endangered combat-capable friendlies with practical travel distance,
 * - then injured combat-capable friendlies with practical travel distance,
 * - then any injured friendly with no combat threat
 *
 * Movement policy - one movement decision per tick.
 * During combat, positioning should support both ranged attacks and any direct healing he can provide.
 * Outside combat, he can approach an injured friendly or return to a designated defensive position.
 *
 * Works hand in hand with room towers to contribute to net HP loss per tick. This means that capability of Carl will assist
 * in sharing load of any rescue plans with the towers.
 * The tower manager observes the result of Carl's healing; it doesn't know Carl's future intentions.
 *
 * TODO
 * - Consider if later iterations when Creep Manager exists take advantage of recycleCreep(target) or renewCreep(target)
 * - Immediate threat to critical infrastructure outranks general combat capability. (Position in room with active parts matters)
 * A creep with a claim part right next to the controller should rank higher than an attacker on an exit tile, a creep with a work
 * part along side a structure higher threat than no attackers and a healer out of range.
 *
 */

module.exports = {
	/**
	 * Run Carl Douglas Role (Defenders)
	 * @param {Creep} creep
	 */
	run: function (creep) {
		const canRanged = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
		const canHeal = creep.getActiveBodyparts(HEAL) > 0;
		let target = null;

		//find hostile creeps by priority to attack if creep has ranged attack parts
		if (canRanged) {
			const combatCapableParts = [ATTACK, RANGED_ATTACK, HEAL];
			const hostileCapableParts = [CLAIM, WORK];
			const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);

			target = selectTarget(creep, hostileCreeps, [
				combatCapableParts,
				hostileCapableParts,
			]);
		}

		/**
		 * Healing Policy
		 * find creeps to heal if creep has heal parts
		 * simultaneous execution of actions will allow
		 * rangedAttack() + heal() OR rangedMassAttack() + heal()
		 * BUT NOT rangedAttack / rangedMassAttack AND rangedHeal together
		 * It will perform the last intent of the same type so request an action and perform it
		 * Don't allow for further actions to change intent
		 * - first heal self,
		 * - then adjacent friendly that can be saved (range 1 heal),
		 * - then nearby friendly that can be saved (range <= 3 rangedHeal if worth losing the rest of the tick),
		 * - then actively attacked combat-capable friendlies with practical travel distance,
		 * - then injured combat-capable friendlies with practical travel distance,
		 * - then any injured friendly with no combat threat
		 **/
		if (canHeal) {
			let healTarget = undefined;
			//first heal self if needed
			if (creep.hits < creep.hitsMax) {
				creep.heal(creep);
			} else {
				//find my creeps in room to heal if required
				const myDamagedCreeps = creep.room.find(FIND_MY_CREEPS, {
					filter: (c) => c.hits < c.hitsMax,
				});
				healTarget =
					myDamagedCreeps.find(
						(c) =>
							creep.pos.isNearTo(c) &&
							hasActivePart(c, combatCapableParts),
					) ??
					myDamagedCreeps.find(
						(c) =>
							creep.pos.inRangeTo(c, 3) &&
							hasActivePart(c, combatCapableParts),
					) ??
					myDamagedCreeps.find((c) => {
						if (hasActivePart(c, combatCapableParts)) {
							const previous =
								c.memory.towerManagerPreviousHits ?? c.hits;
							const projectedDamage = Math.max(
								0,
								previous - c.hits,
							);
							if (
								projectedDamage === 0 ||
								c.hits > projectedDamage
							) {
								return false;
							}
							return creep.pos.inRangeTo(c, 12);
						}
						return false;
					}) ??
					myDamagedCreeps.find(
						(c) =>
							creep.pos.inRangeTo(c, 12) &&
							hasActivePart(c, combatCapableParts),
					) ??
					myDamagedCreeps[0];
			}

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

/**
 * Returns if a creep has one or more given body part
 * @param {Creep} creep
 * @param {BodyPartConstant[]} parts
 * @returns {boolean} Does Creep Have one or more given body part
 */
function hasActivePart(creep, parts) {
	return parts.some((part) => creep.getActiveBodyparts(part) > 0);
}

/**
 * Select the closest target from the first matching priority group
 * @param {Creep} creep
 * @param {Creep[]} targets
 * @param {BodyPartConstant[][]} priorityGroups
 * @returns {Creep | null} Creep Target or null
 */
function selectTarget(creep, targets, priorityGroups) {
	for (const parts in priorityGroups) {
		const matchingTargets = targets.filter((c) => hasActivePart(c, parts));

		if (matchingTargets.length > 0) {
			return creep.pos.findClosestByRange(matchingTargets);
		}
	}

	return targets.length > 0 ? creep.pos.findClosestByRange(targets) : null;
}
