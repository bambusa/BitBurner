export class BatchLogEntry {
    constructor(timestamp, datestring, hostname, scriptname, threads, target, delayed) {
        this.timestamp = timestamp;
        this.datestring = datestring;
        this.hostname = hostname;
        this.scriptname = scriptname;
        this.threads = threads;
        this.target = target;
        this.delayed = delayed;
    }

    /** @type{number} */
    timestamp;
    /** @type{string} */
    datestring;
    /** @type{string} */
    hostname;
    /** @type{string} */
    scriptname;
    /** @type{string} */
    threads;
    /** @type{string} */
    target;
    /** @type{number} */
    delayed
}