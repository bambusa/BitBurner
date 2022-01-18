export class JobBatch {
    /** @param{string} target hostname of target */
    constructor(target) {
        this.target = target;
    }
    /** @type{string} */
    target;
    /** @type{number} */
    duration;
    /** @type{Job} */
    hackJob;
    /** @type{Job} */
    weakenAfterHackJob;
    /** @type{Job} */
    growJob;
    /** @type{Job} */
    weakenAfterGrowJob;
    /** @type{number[]} */
    jobsRunsUntil;
    /** @type{number[]} */
    batchStart;
};