import {
    findHackedServers
} from "libs/server-lib.js";

var weakenScriptname = "weaken.js";
var growScriptname = "grow.js";
var hackScriptname = "hack.js";
var batchDelay = 2000;

/** @param {import(".").NS} ns */
export async function main(ns) {
    //var candidates = getTargetsMoneyMax(ns);
    //analyzeCycle(ns, "joesguns");
    var batch = createPrepareBatch(ns, "n00dles");
    setRuntimes(ns, batch);
    await runJobs(ns, batch);
}

/** @param {import(".").NS} ns
 * @param {JobBatch} batch */
async function runJobs(ns, batch) {
    while (batch.hackJob?.jobStarted == false || batch.weakenAfterHackJob?.jobStarted == false || batch.growJob?.jobStarted == false || batch.weakenAfterGrowJob?.jobStarted == false) {
        var now = Date.now();
        execJob(batch.hackJob, now, ns);
        execJob(batch.weakenAfterHackJob, now, ns);
        execJob(batch.growJob, now, ns);
        execJob(batch.weakenAfterGrowJob, now, ns);
        await ns.sleep(batchDelay / 2);
    }
}

/** @param {import(".").NS} ns
 * @param {Date} now
 * @param {Job} job */
function execJob(job, now, ns) {
    if (job?.jobStarted == false && now >= job.runtimeStart) {
        ns.exec(job.scriptname, "home", job.threads, job.target);
        job.jobStarted = true;
        ns.tprint("Started " + job);
    }
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

/** @param {import(".").NS} ns */
function analyzeCycle(ns, hostname) {
    var server = ns.getServer(hostname);
    ns.tprint("Analzye " + hostname);
    var formulasExist = ns.fileExists("Formulas.exe");

    // Hack
    server.hackDifficulty = server.minDifficulty;
    var hackAmount = server.moneyMax * ns.hackAnalyze(hostname);
    if (formulasExist) {
        hackAmount = server.moneyMax * ns.formulas.hacking.hackPercent(server, ns.getPlayer());
    }
    var hackThreads = Math.floor(server.moneyMax / hackAmount);
    var hackTime = ns.getHackTime(hostname);
    ns.tprint("Could hack " + ns.nFormat(hackAmount, '0.a') + " $ per thread, max " + ns.nFormat(hackAmount * hackThreads, '0.a') + " with " + hackThreads + " threads, takes " + ns.nFormat(hackTime / 1000, '0.a') + " s");

    // Weaken
    var securityRise = ns.hackAnalyzeSecurity(hackThreads);
    server.hackDifficulty = server.hackDifficulty + securityRise;
    var securityThreads = Math.ceil(securityRise / ns.weakenAnalyze(1));
    var securityTime = ns.getWeakenTime(hostname);
    if (formulasExist) {
        securityTime = ns.formulas.hacking.weakenTime(server, ns.getPlayer());
    }
    server.hackDifficulty = server.minDifficulty;
    ns.tprint("Need to weaken " + securityRise + " with " + securityThreads + " threads, takes " + ns.nFormat(securityTime / 1000, '0.a') + " s");

    // Grow
    var needGrow = server.moneyMax / (server.moneyMax - hackAmount);
    var growThreads = ns.growthAnalyze(hostname, needGrow);
    if (formulasExist) {
        growThreads = Math.ceil(needGrow / ns.formulas.hacking.growPercent(server, 1, ns.getPlayer()));
    }
    var growTime = ns.getGrowTime(hostname);
    ns.tprint("Need to grow x" + needGrow + " with " + growThreads + " threads, takes " + ns.nFormat(growTime / 1000, '0.a') + " s")

    // Weaken
    var securityRise2 = ns.growthAnalyzeSecurity(growThreads);
    server.hackDifficulty = server.hackDifficulty + securityRise2;
    var securityThreads2 = Math.ceil(securityRise2 / ns.weakenAnalyze(1));
    var securityTime2 = ns.getWeakenTime(hostname);
    if (formulasExist) {
        securityTime2 = ns.formulas.hacking.weakenTime(server, ns.getPlayer());
    }
    server.hackDifficulty = server.minDifficulty;
    ns.tprint("Need to weaken " + securityRise2 + " with " + securityThreads2 + " threads, takes " + ns.nFormat(securityTime2 / 1000, '0.a') + " s");
}

/** 
 * @param {import(".").NS} ns
 * @param {string} hostname of target server
 * @returns {JobBatch} batch of needed jobs without start and end times
 */
function createPrepareBatch(ns, hostname) {
    var batch = new JobBatch(hostname);
    var server = ns.getServer(hostname);
    ns.tprint("Prepare " + hostname);
    ns.tprint("Current security: " + server.hackDifficulty + " min security: " + server.minDifficulty + " current money: " + ns.nFormat(server.moneyAvailable, '0.a') + " $ max money: " + ns.nFormat(server.moneyMax, '0.a') + " $");

    batch.weakenAfterHackJob = createWeakenToMinJob(server, ns);
    batch.growJob = createGrowToMaxJob(server, ns);
    batch.weakenAfterGrowJob = createWeakenToMinJob(server, ns);

    return batch;
}

/** 
 * @param {import(".").NS} ns
 * @param {import(".").Server} server
 */
function createGrowToMaxJob(server, ns) {
    var formulasExist = ns.fileExists("Formulas.exe");
    var needGrow = server.moneyMax / server.moneyAvailable;
    var growThreads = ns.growthAnalyze(server.hostname, needGrow);
    if (formulasExist) {
        growThreads = Math.ceil(needGrow / ns.formulas.hacking.growPercent(server, 1, ns.getPlayer()));
    }
    var growTime = ns.getGrowTime(server.hostname);
    ns.tprint("Forecast for growing: Need " + growThreads + " threads and " + ns.nFormat(growTime / 1000, '0.a') + " s for grow x" + needGrow);
    var tjob = new Job(growScriptname, growThreads, server.hostname, growTime);
    var securityRise = ns.growthAnalyzeSecurity(growThreads);
    server.hackDifficulty = server.hackDifficulty + securityRise;
    return tjob;
}

/** 
 * @param {import(".").NS} ns
 * @param {import(".").Server} server
 */
function createWeakenToMinJob(server, ns) {
    var formulasExist = ns.fileExists("Formulas.exe");
    var needWeaken = server.hackDifficulty - server.minDifficulty;
    var securityThreads = Math.ceil(needWeaken / (ns.weakenAnalyze(1)));
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

Job.prototype.toString = function() {
    return this.scriptname+" job: "+this.threads+" threads on "+this.target+"; duration: "+Math.round(this.runtime / 1000)+" s "+formatDate(this.runtimeStart)+" - "+formatDate(this.runtimeEnd)+"; started: "+this.jobStarted;
}