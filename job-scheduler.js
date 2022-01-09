import {
    findHackedServers
} from "libs/server-lib.js";

var weakenScriptname = "weaken.js";
var growScriptname = "grow.js";
var hackScriptname = "hack.js";
var batchDelay = 2000;

/** @param {import(".").NS} ns */
export async function main(ns) {
    var batch = createBatch(ns, "n00dles");
    setRuntimes(ns, batch);
    await runJobs(ns, batch);
}

/** @param {import(".").NS} ns
 * @param {JobBatch} batch */
async function runJobs(ns, batch) {
    var hostname = "home";
    while (batch.hackJob?.jobStarted == false || batch.weakenAfterHackJob?.jobStarted == false || batch.growJob?.jobStarted == false || batch.weakenAfterGrowJob?.jobStarted == false) {
        var now = Date.now();
        if (!execJob(ns, batch.hackJob, now, hostname)) {
            await ns.sleep(batchDelay / 2);
            continue;
        }
        if (!execJob(ns, batch.weakenAfterHackJob, now, hostname)) {
            await ns.sleep(batchDelay / 2);
            continue;
        }
        if (!execJob(ns, batch.growJob, now, hostname)) {
            await ns.sleep(batchDelay / 2);
            continue;
        }
        if (!execJob(ns, batch.weakenAfterGrowJob, now, hostname)) {
            await ns.sleep(batchDelay / 2);
            continue;
        }
        await ns.sleep(batchDelay / 2);
    }
}

/** @param {import(".").NS} ns
 * @param {Date} now
 * @param {Job} job */
function execJob(ns, job, now, hostname) {
    if (job != undefined && job.threads > 0) {
        var ramAvailable = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
        var scriptRam = ns.getScriptRam(job.scriptname, hostname);
        if (scriptRam * job.threads > ramAvailable) {
            var threadsAvailable = Math.floor(ramAvailable / scriptRam);
            ns.tprint("Reducing "+job.threads+" threads to " + threadsAvailable);
        }

        if (job?.jobStarted == false && now >= job.runtimeStart) {
            var pid = ns.exec(job.scriptname, "home", threadsAvailable ?? job.threads, job.target);
            if (pid > 0) {
                job.jobStarted = true;
                ns.tprint("Started " + job + " with " + (Date.now() - job.runtimeStart) + " ms delay");
            } else {
                ns.tprint("Failed to start " + job);
                return false;
            }
        }
    }
    return true;
}

/** @param {import(".").NS} ns
 * @param {JobBatch} batch */
function setRuntimes(ns, batch) {
    var durations = [batch.hackJob?.runtime, batch.weakenAfterHackJob?.runtime, batch.growJob?.runtime, batch.weakenAfterGrowJob?.runtime];
    var maxDuration = getMaxValue(durations);
    var now = Date.now();

    if (batch.hackJob != undefined) {
        var end = now + maxDuration + (4 * batchDelay);
        var start = end - batch.hackJob.runtime;
        batch.hackJob.runtimeEnd = end;
        batch.hackJob.runtimeStart = start;
    }

    if (batch.weakenAfterGrowJob != undefined) {
        var end = now + maxDuration + (3 * batchDelay);
        var start = end - batch.weakenAfterGrowJob.runtime;
        batch.weakenAfterGrowJob.runtimeEnd = end;
        batch.weakenAfterGrowJob.runtimeStart = start;
    }

    if (batch.growJob != undefined) {
        var end = now + maxDuration + (2 * batchDelay);
        var start = end - batch.growJob.runtime;
        batch.growJob.runtimeEnd = end;
        batch.growJob.runtimeStart = start;
    }

    if (batch.weakenAfterHackJob != undefined) {
        var end = now + maxDuration + (1 * batchDelay);
        var start = end - batch.weakenAfterHackJob.runtime;
        batch.weakenAfterHackJob.runtimeEnd = end;
        batch.weakenAfterHackJob.runtimeStart = start;
    }

    /*
    ns.tprint("setRuntimes for now = "+formatDate(now));
    if (batch.hackJob != undefined) ns.tprint("Hack: "+formatDate(batch.hackJob?.runtimeStart)+" - "+formatDate(batch.hackJob?.runtimeEnd));
    if (batch.weakenAfterGrowJob != undefined) ns.tprint("Weaken: "+formatDate(batch.weakenAfterGrowJob.runtimeStart)+" - "+formatDate(batch.weakenAfterGrowJob.runtimeEnd));
    if (batch.growJob != undefined) ns.tprint("Grow: "+formatDate(batch.growJob.runtimeStart)+" - "+formatDate(batch.growJob.runtimeEnd));
    if (batch.weakenAfterHackJob != undefined) ns.tprint("Weaken: "+formatDate(batch.weakenAfterHackJob.runtimeStart)+" - "+formatDate(batch.weakenAfterHackJob.runtimeEnd));
    */
}

/** @param{number[]} candidates */
function getMaxValue(candidates) {
    var maxValue = 0;
    if (candidates != undefined) {
        for (var candidate of candidates) {
            if (candidate != undefined && candidate > maxValue)
                maxValue = candidate;
        }
    }
    return maxValue;
}

/** 
 * @param {import(".").NS} ns
 * @param {string} hostname of target server
 * @returns {JobBatch} batch of needed jobs without start and end times
 */
function createBatch(ns, hostname) {
    var batch = new JobBatch(hostname);
    var server = ns.getServer(hostname);
    var formulasExist = ns.fileExists("Formulas.exe");
    ns.tprint("Create batch for "+hostname);
    ns.tprint("Current security: " + server.hackDifficulty + " min security: " + server.minDifficulty + " current money: " + ns.nFormat(server.moneyAvailable, '0.a') + " $ max money: " + ns.nFormat(server.moneyMax, '0.a') + " $");

    if (server.hackDifficulty == server.minDifficulty && server.moneyAvailable == server.moneyMax) {
        batch.hackJob = createHackJob(server, ns);
    }
    batch.weakenAfterHackJob = createWeakenToMinJob(server, ns, formulasExist);
    batch.growJob = createGrowToMaxJob(server, ns, formulasExist);
    batch.weakenAfterGrowJob = createWeakenToMinJob(server, ns, formulasExist);

    return batch;
}

/** 
 * @param {import(".").NS} ns
 * @param {import(".").Server} server
 */
function createHackJob(server, ns) {
    var hackAmountPerThread = ns.hackAnalyze(server.hostname);
    var hackThreads = Math.floor(server.moneyAvailable / hackAmountPerThread);
    if (hackThreads == 0) return;

    var hackTime = ns.getHackTime(server.hostname);
    var tjob = new Job(hackScriptname, hackThreads, server.hostname, hackTime);
    var securityRise = ns.hackAnalyzeSecurity(hackThreads);
    server.hackDifficulty += securityRise;
    return tjob;
}

/** 
 * @param {import(".").NS} ns
 * @param {import(".").Server} server
 */
function createGrowToMaxJob(server, ns, formulasExist) {
    var needGrow = server.moneyMax / server.moneyAvailable;
    if (needGrow == 0) return;

    var growThreads = Math.ceil(ns.growthAnalyze(server.hostname, needGrow));
    if (formulasExist) {
        growThreads = Math.ceil(needGrow / ns.formulas.hacking.growPercent(server, 1, ns.getPlayer()));
    }
    if (growThreads == 0) return;

    var growTime = ns.getGrowTime(server.hostname);
    //ns.tprint("Forecast for growing: Need " + growThreads + " threads and " + ns.nFormat(growTime / 1000, '0.a') + " s for grow x" + needGrow);
    var tjob = new Job(growScriptname, growThreads, server.hostname, growTime);
    var securityRise = ns.growthAnalyzeSecurity(growThreads);
    server.hackDifficulty += securityRise;
    return tjob;
}

/** 
 * @param {import(".").NS} ns
 * @param {import(".").Server} server
 */
function createWeakenToMinJob(server, ns, formulasExist) {
    var needWeaken = server.hackDifficulty - server.minDifficulty;
    if (needWeaken == 0) return;

    var securityThreads = Math.ceil(needWeaken / (ns.weakenAnalyze(1)));
    if (securityThreads == 0) return;

    var securityTime = ns.getWeakenTime(server.hostname);
    if (formulasExist) {
        securityTime = ns.formulas.hacking.weakenTime(server, ns.getPlayer());
    }
    //ns.tprint("Forecast for weakening: Need " + securityThreads + " threads and " + ns.nFormat(securityTime / 1000, '0.a') + " s for weaken " + needWeaken);
    var tjob = new Job(weakenScriptname, securityThreads, server.hostname, securityTime);
    server.hackDifficulty = server.minDifficulty;
    return tjob;
}

function formatDate(ms) {
    var date = new Date(ms);
    let formatted_date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return formatted_date;
}

class JobBatch {
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

class Job {
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