/*
 * Checks Tasks
 */

/**
 * Situation	Task status
 * No assigned creeps, task newly created	untasked
 * Two creeps travelling, neither working	tasked
 * One harvesting, another travelling	in_progress
 * One harvesting, another dies	in_progress
 * Last available worker dies	hand_over
 * Replacement assigned, travelling	tasked
 */

/**
 * @typedef {'untasked'|'tasked'|'in_progress'|'completed'|'hand_over'|'error'} TaskStatus
 */

/**
 * @typedef {'harvest'|'upgrade'|'build'|'resource_collection'|'repair'|'fill'} TaskType
 */

/**
 * @typedef {'finite'|'continuous'} TaskDuration
 */

/**
 * @typedef {Object} Task
 * @property {Id<Creep>[]} [assignedCreepIds] - Array of creep Ids assigned to the task (optional)
 * @property {string} id - The Task Id
 * @property {number} [maxCreeps] - The maximum number of creeps to be assigned to the task (optional)
 * @property {TaskStatus} status - The current status of the task
 * @property {string} [statusReason] - Explanation for the current status
 * @property {number} [statusChangedAt] - Game tick when status last changed
 * @property {TaskDuration} duration - The length that the task is required for
 * @property {Id<Source|Mineral|Deposit|Structure|ConstructionSite|Resource|Tombstone|Ruin|Creep>|undefined} [targetId] - The optional id of the task target
 * @property {TaskType} type - The type of task
 */

/**
 * Checks if task is a Resource Collection Task
 * @param {Task} task
 * @returns {boolean} Is Task Resource Collection
 */
function isResourceCollectionTask(task) {
	return task.type === 'resource_collection';
}

/**
 * Checks if task is a Harvest Task
 * @param {Task} task
 * @returns {boolean}
 */
function isHarvestTask(task) {
	return task.type === 'harvest';
}

/**
 * Checks is task a build task
 * @param {Task} task
 * @returns {boolean}
 */
function isBuildTask(task) {
	return task.type === 'build';
}

/**
 * Checks is task an upgrade task
 * @param {Task} task
 * @returns {boolean}
 */
function isUpgradeTask(task) {
	return task.type === 'upgrade';
}

/**
 * Checks is task a repair task
 * @param {Task} task
 * @returns {boolean}
 */
function isRepairTask(task) {
	return task.type === 'repair';
}

/**
 * Checks is task a fill task
 * @param {Task} task
 * @returns {boolean}
 */
function isFillTask(task) {
	return task.type === 'fill';
}

module.exports = {
	isResourceCollectionTask,
	isHarvestTask,
	isBuildTask,
	isUpgradeTask,
	isRepairTask,
	isFillTask,
};
