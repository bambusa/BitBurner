export class JobBatch {
    /** @param{string} target hostname of target */
    constructor(target) {
        this.target = target;
    }
    /** @type{Job} */
    hackJob;
    /** @type{Job} */
    weakenAfterHackJob;
    /** @type{Job} */
    growJob;
    /** @type{Job} */
    weakenAfterGrowJob;
};