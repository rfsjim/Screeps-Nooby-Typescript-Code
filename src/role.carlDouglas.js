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

const combatCapableParts = [ATTACK, RANGED_ATTACK, HEAL];

module.exports = {
	/**
	 * Run Carl Douglas Role (Defenders)
	 * @param {Creep} creep
	 */
	run: function (creep) {
		const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
		const friendlyCreeps = creep.room.find(FIND_MY_CREEPS);
		const canRanged = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
		const canHeal = creep.getActiveBodyparts(HEAL) > 0;
		const hasHostileCreeps = hostileCreeps > 0;
		let attackTarget = null;

		//find hostile creeps by priority to attack if creep has ranged attack parts
		if (canRanged && hasHostileCreeps) {
			const numberRangedAttack = creep.getActiveBodyparts(RANGED_ATTACK);
			// TODO further with calc attack power
			// eslint-disable-next-line no-unused-vars
			const rangedAttackPower = numberRangedAttack * RANGED_ATTACK_POWER;
			const hostileCapableParts = [CLAIM, WORK];

			attackTarget = selectTarget(creep, hostileCreeps, [
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
			if (canHeal) {
				const healTarget = selectHealTarget(
					creep,
					friendlyCreeps,
					hasHostileCreeps,
				);

				if (healTarget) {
					const range = creep.pos.getRangeTo(healTarget);

					if (range <= 1) {
						// Direct healing is compatible with ranged attacking.
						creep.heal(healTarget);
					} else if (
						range <= 3 &&
						hasHostileCreeps &&
						isCreepEndangered(healTarget)
					) {
						// Explicitly sacrifice ranged attack for emergency healing.
						creep.rangedHeal(healTarget);
					} else if (!hasHostileCreeps) {
						// Travel to assist during peacetime.
						creep.moveTo(healTarget);
					}
				}
			}
		}

		//work on attacking
		if (attackTarget) {
			// creeps with ranged attack should move in with ranged attack first
			if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
				// melee attack stronger than ranged attack, try melee first
				if (creep.attack(attackTarget) === ERR_NOT_IN_RANGE) {
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
						creep.rangedAttack(attackTarget) === ERR_NOT_IN_RANGE
					) {
						//keep walking towards the badie
						creep.moveTo(attackTarget);
					}
				}
			} else if (creep.getActiveBodyparts(ATTACK) > 0) {
				if (creep.attack(attackTarget) === ERR_NOT_IN_RANGE) {
					creep.moveTo(attackTarget);
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

/**
 * Returns if Creep is Endangered
 * @param {Creep} creep
 * @returns {boolean} Is Creep Endangered?
 */
function isCreepEndangered(creep) {
	const previous = creep.memory.towerManagerPreviousHits ?? creep.hits;
	const projectedDamage = Math.max(0, previous - creep.hits);

	return projectedDamage > 0 && creep.hits <= projectedDamage;
}

/**
 * Selects the first matching healing target according to Carl's triage policy.
 * @param {Creep} carl
 * @param {Creep[]} friendlies
 * @param {boolean} hostilesPresent
 * @returns {Creep|undefined} creep target to heal
 */
function selectHealTarget(carl, friendlies, hostilesPresent) {
	if (carl.hits < carl.hitsMax) {
		return carl;
	}

	const injured = friendlies.filter((c) => c.hits < c.hitsMax);

	const combatInjured = injured.filter((c) =>
		hasActivePart(c, combatCapableParts),
	);

	const endangered = combatInjured.filter(isCreepEndangered);

	return (
		endangered.find((c) => carl.pos.isNearTo(c)) ??
		combatInjured.find((c) => carl.pos.isNearTo(c)) ??
		endangered.find((c) => carl.pos.inRangeTo(c, 3)) ??
		combatInjured.find((c) => carl.pos.inRangeTo(c, 3)) ??
		(!hostilesPresent
			? (endangered.find((c) => carl.pos.inRangeTo(c, 12)) ??
				combatInjured.find((c) => carl.pos.inRangeTo(c, 12)) ??
				injured[0])
			: undefined)
	);
}
