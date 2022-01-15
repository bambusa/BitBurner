export class Job {
    constructor(scriptname, threads, target, runtime, runtimeStart, runtimeEnd, hackAmount) {
        this.scriptname = scriptname;
        this.threads = threads;
        this.target = target;
        this.runtime = runtime;
        this.runtimeStart = runtimeStart;
        this.runtimeEnd = runtimeEnd;
        this.hackAmount = hackAmount;
    }
    /** @type{string} */
    scriptname;
    /** @type{number} */
    threads;
    /** @type{string} */
    target;
    /** @type{number} */
    runtime;
    /** @type{number} */
    runtimeStart;
    /** @type{number} */
    runtimeEnd;
    /** @type{number} */
    hackAmount;
    /** @type{boolean} */
    jobStarted = false;
};

Job.prototype.toString = function () {
    return this.scriptname + " job: " + parseInt(this.threads) + " threads on " + this.target + "; duration: " + Math.round(this.runtime / 1000) + " s " + formatDate(this.runtimeStart) + " - " + formatDate(this.runtimeEnd) + "; started: " + this.jobStarted;
}