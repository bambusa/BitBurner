export class RunningJob {
    constructor(pid, type, hostname, target, threads, start, end, expectedOutcome){
        this.pid = pid;
        this.type = type;
        this.hostname = hostname;
        this.target = target;
        this.threads = threads;
        this.start = start;
        this.end = end;
        this.expectedOutcome = expectedOutcome;
    }
    /** @type{number} */
    pid;
    /** @type{string} */
    type;
    /** @type{string} */
    hostname;
    /** @type{string} */
    target;
    /** @type{number} */
    threads;
    /** @type{number} */
    start;
    /** @type{number} */
    end;
    /** @type{number} */
    expectedOutcome
}

RunningJob.prototype.toString = function () {
    return ""+this.pid+" "+this.type+" "+this.hostname+" "+this.target+" "+this.threads+" "+this.start+" "+this.end+" "+this.expectedOutcome;
}