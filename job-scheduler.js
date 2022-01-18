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
    createBatch,
    setDurationAndOffset,
    setRuntimes
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
    var purchasedServers = {};

    await executeNsFunctions(loop, ns, hackedServers, purchasedServers, batches, hostnamesByPriority, misc);

    //var batch = createBatch(ns, "n00dles");
    //setRuntimes(ns, batch);
    //await runJobs(ns, batch);
}

/** 
 * @param {boolean} loop
 * @param {import(".").NS} ns 
 */
async function executeNsFunctions(loop, ns, hackedServers, purchasedServers, batches, hostnamesByPriority, misc) {
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
        updatePurchasedServers(ns, purchasedServers);
        misc.formulasExists = ns.fileExists("Formulas.exe");
        updateBatches(hackedServers, batches);
        priotizeBatches(hackedServers, batches, hostnamesByPriority);
        assignBatches(ns, hackedServers, purchasedServers, hostnamesByPriority, batches);

        if (!loop) break;
        await ns.sleep(10000);
    }
}

function assignBatches(ns, hackedServers, hostnamesByPriority, batches) {
    var currentBatch = hostnamesByPriority[0];
    if (currentBatch == undefined) {
        console.log("no batches to assign");
    }

    for (var hostname in purchasedServers.concat(hackedServers)) {
        /** @type{ServerInfo} */
        var serverInfo = purchasedServers[hostname] ?? hackedServers[hostname];

        if (serverInfo.freeRam >= hackScriptRam) {

            for (var targetname of hostnamesByPriority) {
                /** @type{JobBatch} */
                var batch = batches[targetname];
                if (batch.batchStart == undefined || batch.batchStart.length == 0) {
                    setRuntimes(batch);
                    runJobs(ns, batch, serverInfo);
                }
            }
        } else {
            console.log("not enough ram available: " + serverInfo.freeRam);
            console.log(serverInfo);
        }
    }
}

function getJobWithLowestOffset(batch) {
    var highestOffset = 0;
    var jobWithHighestOffset;
    if (batch.hackJob?.startOffset > highestOffset) {
        highestOffset = batch.hackJob.startOffset;
        jobWithHighestOffset = batch.hackJob;
    }
    if (batch.weakenAfterHackJob?.startOffset > highestOffset) {
        highestOffset = batch.weakenAfterHackJob.startOffset;
        jobWithHighestOffset = batch.weakenAfterHackJob;
    }
    if (batch.growJob?.startOffset > highestOffset) {
        highestOffset = batch.growJob.startOffset;
        jobWithHighestOffset = batch.growJob;
    }
    if (batch.weakenAfterGrowJob?.startOffset > highestOffset) {
        highestOffset = batch.weakenAfterGrowJob.startOffset;
        jobWithHighestOffset = batch.weakenAfterGrowJob;
    }
    return jobWithHighestOffset;
}

/** 
 * @param {import("index").NS} ns
 */
function updatePurchasedServers(ns, purchasedServers) {
    var servers = ns.getPurchasedServers();
    for (var serverName of servers) {
        var server = ns.getServer(serverName);
        var serverInfo = purchasedServers[serverName] ?? new ServerInfo(server, "purchased");
        serverInfo.freeRam = server.maxRam - server.ramUsed;
        purchasedServers[serverName] = serverInfo;
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
        var serverInfo = hackedServers[serverName] ?? new ServerInfo(server, "hacked");
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
            setDurationAndOffset(batch);
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
    if (moneyHostnameDictionary[0] != undefined && moneyHostnameDictionary[0][0] != undefined) {
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
async function runJobs(ns, batch, serverInfo) {
    var hostname = serverInfo.server.hostname;
    execJob(ns, batch.hackJob, hostname)
    execJob(ns, batch.weakenAfterHackJob, hostname)
    execJob(ns, batch.growJob, hostname)
    execJob(ns, batch.weakenAfterGrowJob, hostname)
}

/** 
 * @param {import(".").NS} ns
 * @param {Date} now
 * @param {Job} job 
 */
async function execJob(ns, job, hostname) {
    if (job != undefined && job.threads > 0) {
        while (!job.jobStarted) {
            if (Date.now() >= job.runtimeStart) {
                var threadsAvailable = Math.round(serverInfo.freeRam / hackScriptRam);
                var assignThreads = threadsAvailable < job.threads ? threadsAvailable : job.threads;
                if (assignThreads != job.threads) {
                    console.log("Reduced " + job + " from " + job.threads + " to " + assignThreads + " threads");
                    job.threads -= assignThreads;
                }

                var pid = ns.exec(job.scriptname, hostname, assignThreads, job.target);
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