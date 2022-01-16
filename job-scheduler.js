import {
    findHackedServers
} from "libs/server-lib";
import {
    ServerInfo
} from "models/server-info";
import {
    Job
} from "models/job.js";
import {
    JobBatch
} from "models/job-batch.js";
import {
    createBatch
} from "libs/batch-lib";
import {
    sortFirstColumn,
    getMaxValue
} from "libs/helper-lib.js";
import {
    scripts
} from "libs/deploy-lib.js";

var hackScriptRam;
var weakenScriptRam;
var growScriptRam;
var batchDelay = 2000;
var batches = {};
var availableServers = {};

/** 
 * @param {import(".").NS} ns 
 */
export async function main(ns) {
    var loop = ns.args[0] ?? true;
    var hackedServers = {};
    var batches = {};
    var hostnamesByPriority = [];
    var misc = {};

    await executeNsFunctions(loop, ns, hackedServers, batches, hostnamesByPriority, misc);

    //var batch = createBatch(ns, "n00dles");
    //setRuntimes(ns, batch);
    //await runJobs(ns, batch);
}

/** 
 * @param {boolean} loop
 * @param {import(".").NS} ns 
 */
async function executeNsFunctions(loop, ns, hackedServers, batches, hostnamesByPriority, misc) {
    console.log("executeNsFunctions");
    if (weakenScriptRam == undefined) {
        weakenScriptRam = ns.getScriptRam(scripts[0])
    }
    if (growScriptRam == undefined) {
        growScriptRam = ns.getScriptRam(scripts[1])
    }
    if (hackScriptRam == undefined) {
        hackScriptRam = ns.getScriptRam(scripts[2]);
    }

    while (true) {
        var player = ns.getPlayer();
        updateHackedServers(ns, hackedServers, player);
        misc.formulasExists = ns.fileExists("Formulas.exe");
        updateBatches(hackedServers, batches);
        priotizeBatches(hackedServers, batches, hostnamesByPriority);
        assignAndRunJobs(ns, hackedServers, hostnamesByPriority, batches);

        if (!loop) break;
        await ns.sleep(10000);
    }
}

function assignAndRunJobs(ns, hackedServers, hostnamesByPriority, batches) {
    for (var hostname in hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (serverInfo.freeRam >= hackScriptRam) {
            console.log(hostnamesByPriority);
            var targetname = hostnamesByPriority[0];
            /** @type{JobBatch} */
            var batch = batches[targetname];


            if (batch != undefined) {
                console.log("assigning " + hostname + " to hack " + batch.target);
                runJobs(ns, batch, serverInfo, batches, targetname);
            } else {
                console.log("batch undefined for "+targetname);
                hostnamesByPriority.shift();
            }
        }
        else {
            console.log("not enough ram available: "+serverInfo.freeRam);
            console.log(serverInfo);
        }
    }
}

/** 
 * @param {import("index").NS} ns
 * @param {import("index").Player} player
 */
function updateHackedServers(ns, hackedServers, player) {
    var servers = findHackedServers(ns, "home", "home");
    for (var serverName of servers) {
        var server = ns.getServer(serverName);

        /** @type{ServerInfo} */
        var serverInfo = hackedServers[serverName] ?? new ServerInfo(server);
        if (player.hacking_exp != serverInfo.createdAtHackExp) {
            serverInfo.createdAtHackExp = player.hacking_exp;
            serverInfo.serverAtMinSecurity = server.hackDifficulty == server.minDifficulty;
            serverInfo.serverAtMaxMoney = server.moneyMax == server.moneyAvailable;
            serverInfo.freeRam = server.maxRam - server.ramUsed;

            // Grow Info
            var neededGrowToMax = server.moneyMax / server.moneyAvailable;
            serverInfo.growThreadsToMax = Math.round(ns.growthAnalyze(server.hostname, neededGrowToMax));
            serverInfo.growThreadsToDouble = Math.round(ns.growthAnalyze(server.hostname, 2));
            serverInfo.growTime = ns.getGrowTime(server.hostname);
            serverInfo.growSecurityRise = ns.growthAnalyzeSecurity(serverInfo.growThreadsToMax);

            // Weaken Info
            serverInfo.weakenAmount = ns.weakenAnalyze(1);
            serverInfo.weakenTime = ns.getWeakenTime(server.hostname);
            serverInfo.updateHackedServersAt = Date.now();

            if (serverInfo.serverAtMinSecurity) {
                // Hack Info
                serverInfo.hackTime = ns.getHackTime(server.hostname);
                serverInfo.hackSecurityRise = ns.hackAnalyzeSecurity(1);
                serverInfo.hackAmount = ns.hackAnalyze(server.hostname);
            }
            hackedServers[serverName] = serverInfo;
        }
    }

    console.log("updateHackedServers | hackedServers:");
    console.log(hackedServers);
}

async function updateBatches(hackedServers, batches) {
    for (var hackedServer in hackedServers) {
        if (batches[hackedServer] == undefined) {
            /** @type{ServerInfo} */
            var serverInfo = hackedServers[hackedServer];
            var batch = createBatch(serverInfo);
            setRuntimes(batch);
            batches[hackedServer] = batch;
        }
    }

    console.log("updateBatches | batches:");
    console.log(batches);
}

async function priotizeBatches(hackedServers, batches, hostnamesByPriority) {
    var moneyHostnameDictionary = [];

    // Priotize batch preparation
    for (var hostname in hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (batches[hostname] != undefined && serverInfo.batchMoneyPerSecond == undefined) {
            hostnamesByPriority.push(hostname);
        }
    }
    console.log("Priotized preparation for " + hostnamesByPriority.length + " servers");

    // Prepare money per second dictionary
    for (var hostname in hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (batches[hostname] != undefined && serverInfo.batchMoneyPerSecond == undefined) {
            moneyHostnameDictionary.push([serverInfo.batchMoneyPerSecond, hostname]);
        }
    }

    // Priotize by money per second
    moneyHostnameDictionary = moneyHostnameDictionary.sort(sortFirstColumn).reverse();
    for (var moneyHostname of moneyHostnameDictionary) {
        if (serverInfo.batchMoneyPerSecond != undefined) {
            hostnamesByPriority.push(moneyHostname[1]);
        }
    }
    if (moneyHostnameDictionary[0] != undefined && moneyHostnameDictionary[0][0] != undefined   ) {
        console.log("Priotized hacking " + moneyHostnameDictionary[0][1] + " for " + moneyHostnameDictionary[0][0] + " $ per second (returns " + hostnamesByPriority[0] + ")");
    }

    console.log("priotizeBatches | hostnamesByPriority:");
    console.log(hostnamesByPriority);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** 
 * @param {import(".").NS} ns
 * @param {JobBatch} batch 
 * @param {ServerInfo} serverInfo
 */
async function runJobs(ns, batch, serverInfo, batches, targetname) {
    var hostname = serverInfo.server.hostname;
    //while (batch.hackJob?.jobStarted == false || batch.weakenAfterHackJob?.jobStarted == false || batch.growJob?.jobStarted == false || batch.weakenAfterGrowJob?.jobStarted == false) {
        var now = Date.now();
        if (serverInfo.freeRam >= hackScriptRam && execJob(ns, batch.hackJob, hostname)) {
            serverInfo.freeRam -= hackScriptRam;
            batch.hackJob = undefined;
        } else {
            //continue;
        }

        if (serverInfo.freeRam >= weakenScriptRam && execJob(ns, batch.weakenAfterHackJob, hostname)) {
            serverInfo.freeRam -= weakenScriptRam;
            batch.weakenAfterHackJob = undefined;
        } else {
            //continue;
        }

        if (serverInfo.freeRam >= growScriptRam && execJob(ns, batch.growJob, hostname)) {
            serverInfo.freeRam -= growScriptRam;
            batch.growJob = undefined;
        } else {
            //continue;
        }

        if (serverInfo.freeRam >= weakenScriptRam && execJob(ns, batch.weakenAfterGrowJob, hostname)) {
            serverInfo.freeRam -= weakenScriptRam;
            batch.weakenScriptRam = undefined;
        } else {
            //continue;
        }

        //await ns.sleep(batchDelay / 2);
    //}

    delete batches[targetname];
}

/** 
 * @param {import(".").NS} ns
 * @param {Date} now
 * @param {Job} job 
 */
async function execJob(ns, job, hostname) {
    if (job != undefined && job.threads > 0) {
        var ramAvailable = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
        var scriptRam = ns.getScriptRam(job.scriptname, hostname);
        if (scriptRam * job.threads > ramAvailable) {
            var threadsAvailable = Math.floor(ramAvailable / scriptRam);
            console.log("Reducing " + job.threads + " threads to " + threadsAvailable);
        }

        while (!job.jobStarted) {
            
        if (Date.now() >= job.runtimeStart) {
            var pid = ns.exec(job.scriptname, hostname, threadsAvailable ?? job.threads, job.target);
            if (pid > 0) {
                job.jobStarted = true;
                //if (threadsAvailable != undefined) job.threads -= threadsAvailable;
                console.log("Started " + job + " with " + (Date.now() - job.runtimeStart) + " ms delay");
            } else {
                console.log("Failed to start " + job);
                return false;
            }
        }

        await sleep(1000);
    }
    }
    return true;
}

/** 
 * @param {JobBatch} batch 
 */
function setRuntimes(batch) {
    if (batch?.growJob?.runtimeStart != undefined) {
        return;
    }

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

    console.log("setRuntimes | batch:");
    console.log(batch);

    /*
    ns.tprint("setRuntimes for now = "+formatDate(now));
    if (batch.hackJob != undefined) ns.tprint("Hack: "+formatDate(batch.hackJob?.runtimeStart)+" - "+formatDate(batch.hackJob?.runtimeEnd));
    if (batch.weakenAfterGrowJob != undefined) ns.tprint("Weaken: "+formatDate(batch.weakenAfterGrowJob.runtimeStart)+" - "+formatDate(batch.weakenAfterGrowJob.runtimeEnd));
    if (batch.growJob != undefined) ns.tprint("Grow: "+formatDate(batch.growJob.runtimeStart)+" - "+formatDate(batch.growJob.runtimeEnd));
    if (batch.weakenAfterHackJob != undefined) ns.tprint("Weaken: "+formatDate(batch.weakenAfterHackJob.runtimeStart)+" - "+formatDate(batch.weakenAfterHackJob.runtimeEnd));
    */
}