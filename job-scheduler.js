import {
    findHackedServers
} from "./libs/server-lib.js";
import {
    ServerInfo
} from "./models/server-info";
import {
    Job
} from "./models/job.js";
import {
    JobBatch
} from "./models/job-batch.js";
import {
    createBatch
} from "./libs/batch-lib";


var weakenScriptname = "weaken.js";
var growScriptname = "grow.js";
var hackScriptname = "hack.js";
var batchDelay = 2000;

var batches = {};
var availableServers = {};

/** @param {import(".").NS} ns */
export async function main(ns) {
    var loop = ns.args[0] ?? true;
    var hackedServers = {};
    var batches = {};
    var targets = {};
    var misc = {};
    executeNsFunctions(loop, ns, hackedServers, misc, executors);
    updateExecutors(loop, executors);
    updateBatches(loop);

    //var batch = createBatch(ns, "n00dles");
    //setRuntimes(ns, batch);
    //await runJobs(ns, batch);
}

/** @param {boolean} loop
 * @param {import(".").NS} ns */
async function executeNsFunctions(loop, ns, hackedServers, misc) {
    while (loop) {
        updateHackedServers(ns, hackedServers);
        misc.formulasExists = ns.fileExists("Formulas.exe");

        await ns.sleep(5000);
    }
}

/** @param {import(".").NS} ns
 * @param {hackedServers} */
function updateHackedServers(ns, hackedServers) {
    console.log("updateHackedServers");
    var servers = findHackedServers(ns, "home", "home");
    for (var serverName of servers) {
        var server = ns.getServer(serverName);

        /** @type{ServerInfo} */
        var serverInfo = hackedServers[serverName] ?? new ServerInfo(server);
        serverInfo.serverAtMinSecurity = server.hackDifficulty == server.minDifficulty;
        serverInfo.serverAtMaxMoney = server.moneyMax == server.moneyAvailable;

        if (serverInfo.serverAtMinSecurity) {
            // Hack Info
            serverInfo.hackTime = ns.getHackTime(server.hostname);
            serverInfo.hackSecurityRise = ns.hackAnalyzeSecurity(1);

            // Grow Info
            var neededGrowToMax = server.moneyMax / server.moneyAvailable;
            serverInfo.growThreadsToMax = Math.round(ns.growthAnalyze(server.hostname, neededGrowToMax));
            serverInfo.growThreadsToDouble = Math.round(ns.growthAnalyze(server.hostname, 2));
            serverInfo.growTime = ns.getGrowTime(server.hostname);
            serverInfo.growSecurityRise = ns.growthAnalyzeSecurity(growThreads);

            // Weaken Info
            serverInfo.weakenAmount = ns.weakenAnalyze(1);
            serverInfo.weakenTime = ns.getWeakenTime(server.hostname);
            serverInfo.updateHackedServersAt = Date.now();
            hackedServers[serverName] = serverInfo;
        }
    }
}

async function updateBatches(hackedServers) {
    console.log("updateBatches");
    for (var hackedServer in hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hackedServer];
        var batch = createBatch(serverInfo);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** @param {import(".").NS} ns
 * @param {JobBatch} batch */
async function runJobs(ns, batch) {
    var hostname = "home";
    while (batch.hackJob ? .jobStarted == false || batch.weakenAfterHackJob ? .jobStarted == false || batch.growJob ? .jobStarted == false || batch.weakenAfterGrowJob ? .jobStarted == false) {
        var now = Date.now();
        if (!execJob(ns, batch.hackJob, now, hostname)) {
            continue;
        }
        if (!execJob(ns, batch.weakenAfterHackJob, now, hostname)) {
            continue;
        }
        if (!execJob(ns, batch.growJob, now, hostname)) {
            continue;
        }
        if (!execJob(ns, batch.weakenAfterGrowJob, now, hostname)) {
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
            ns.tprint("Reducing " + job.threads + " threads to " + threadsAvailable);
        }

        if (job ? .jobStarted == false && now >= job.runtimeStart) {
            var pid = ns.exec(job.scriptname, "home", threadsAvailable ? ? job.threads, job.target);
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
    var durations = [batch.hackJob ? .runtime, batch.weakenAfterHackJob ? .runtime, batch.growJob ? .runtime, batch.weakenAfterGrowJob ? .runtime];
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

function formatDate(ms) {
    var date = new Date(ms);
    let formatted_date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return formatted_date;
}