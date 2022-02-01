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
    createPreparationBatch,
    setDurationAndOffset,
    setRuntimes,
    createFinalBatch
} from "libs/batch-lib";
import {
    getMaxValue,
    sortFirstColumn
} from "libs/helper-lib.js";
import {
    scripts
} from "libs/deploy-lib.js";
import {
    progressLoop
} from "libs/network-lib";
import {
    BatchLogEntry
} from "models/batch-log-entry";

var hackScriptRam;
var weakenScriptRam;
var growScriptRam;
const batchLogFile = "batch-log-file.txt";
var serversWithPreparationBatch = [];
var serversWithFinalBatches = [];

/** 
 * @param {import(".").NS} ns 
 */
export async function main(ns) {
    var loop = ns.args[0] ?? true;
    var hackedServers = {};
    var batches = {};
    var misc = {};
    var purchasedServers = {};

    await ns.write(batchLogFile, "[]", "w");
    initScriptRam(ns);
    while (true) {
        var started = Date.now();
        var gameStateLevel = await progressLoop(ns);
        updateServerInfo(ns, hackedServers, purchasedServers, batches);
        updateBatches(misc, ns, hackedServers, batches, gameStateLevel);
        await runBatches(ns, hackedServers, purchasedServers, batches, misc);
        if (!loop) break;

        //var ended = Date.now();
        //console.log("Batch loop took " + (ended - started) + " ms");
        await ns.sleep(10000);
    }
}

/** 
 * @param {import(".").NS} ns 
 */
function initScriptRam(ns) {
    if (weakenScriptRam == undefined) {
        weakenScriptRam = ns.getScriptRam(scripts[0]);
    }
    if (growScriptRam == undefined) {
        growScriptRam = ns.getScriptRam(scripts[1]);
    }
    if (hackScriptRam == undefined) {
        hackScriptRam = ns.getScriptRam(scripts[2]);
    }
}

/** 
 * @param {import(".").NS} ns 
 */
function updateServerInfo(ns, hackedServers, purchasedServers, batches) {
    //console.log("updateServerInfo");
    var player = ns.getPlayer();
    updateHackedServers(ns, hackedServers, player, batches);
    updatePurchasedServers(ns, purchasedServers);
    //console.log(hackedServers);
}

/** 
 * @param {import("index").NS} ns
 * @param {import("index").Player} player
 */
function updateHackedServers(ns, hackedServers, player, batches) {
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
            serverInfo.predictedSecurity = server.hackDifficulty;

            // Grow Info
            serverInfo.growTime = ns.getGrowTime(server.hostname);
            serverInfo.growSecurityRise = ns.growthAnalyzeSecurity(1);

            // Weaken Info
            serverInfo.weakenAmount = ns.weakenAnalyze(1);
            serverInfo.weakenTime = ns.getWeakenTime(server.hostname);
            serverInfo.updateHackedServersAt = Date.now();

            if (serverInfo.serverAtMinSecurity) {
                // Hack Info
                serverInfo.hackTime = ns.getHackTime(server.hostname);
                serverInfo.hackSecurityRise = ns.hackAnalyzeSecurity(1);
                serverInfo.hackAmount = ns.hackAnalyze(server.hostname) * serverInfo.server.moneyMax;
            }
            hackedServers[serverName] = serverInfo;

        } else {
            serverInfo.freeRam = server.maxRam - server.ramUsed;
            hackedServers[serverName] = serverInfo;
        }

        if (!serversWithPreparationBatch.includes(serverName) && !serversWithFinalBatches.includes(serverName)) {
            if (serverInfo.serverAtMinSecurity && serverInfo.serverAtMaxMoney) {
                serversWithFinalBatches.push(serverName);
            } else {
                serversWithPreparationBatch.push(serverName);
            }
        }
    }
}

/** 
 * @param {import("index").NS} ns
 */
function updatePurchasedServers(ns, purchasedServers) {
    var servers = ns.getPurchasedServers();
    servers.push("home");
    for (var serverName of servers) {
        var server = ns.getServer(serverName);
        var serverInfo = purchasedServers[serverName] ?? new ServerInfo(server, "purchased");
        serverInfo.freeRam = server.maxRam - server.ramUsed;
        purchasedServers[serverName] = serverInfo;
    }
}

/** 
 * @param {import(".").NS} ns 
 */
function updateBatches(misc, ns, hackedServers, batches, gameStateLevel) {
    //console.log("updateBatches");
    misc.formulasExists = ns.fileExists("Formulas.exe");
    createBatches(ns, hackedServers, batches);
    priotizeBatches(hackedServers, batches, misc);
    //console.log("updateBatches | batches:");
    //console.log(batches);
}

/** 
 * @param {import(".").NS} ns 
 */
async function createBatches(ns, hackedServers, batches) {
    var updated = false;
    for (var hackedServer in hackedServers) {
        //console.log(batches[hackedServer]);
        if (batches[hackedServer] == undefined) {
            /** @type{ServerInfo} */
            var serverInfo = hackedServers[hackedServer];
            var batch;
            if (serversWithPreparationBatch.includes(hackedServer)) {
                batch = createPreparationBatch(ns, serverInfo);
            } else if (serversWithFinalBatches.includes(hackedServer)) {
                batch = createFinalBatch(ns, serverInfo);
            }
            if (batch == undefined) {
                console.log("Neither created a preparation batch nor a final batch for " + hackedServer);
            }

            setDurationAndOffset(batch);
            batches[hackedServer] = batch;
            updated = true;
        }
    }

    if (updated) {
        console.log("createBatches | batches:");
        console.log(batches);
    }
}

/**
 * 
 * @param {*} hackedServers 
 * @param {*} batches 
 * @param {string[]} hostnamesByPriority 
 */
async function priotizeBatches(hackedServers, batches, misc) {
    var moneyHostnameDictionary = [];
    misc.hostnamesByPriority = [];
    moneyHostnameDictionary = [];

    // Priotize batch preparation
    for (var hostname of serversWithPreparationBatch) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (batches[hostname] != undefined) {
            //console.log("push to hostnamesByPriority: "+hostname)
            misc.hostnamesByPriority.push(hostname);
            break;
        }
    }
    //console.log("Priotized preparation for " + hostnamesByPriority.length + " servers");

    // Prepare money per second dictionary
    for (var hostname of serversWithFinalBatches) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (batches[hostname] != undefined) {
            moneyHostnameDictionary.push([serverInfo.batchMoneyPerSecond, hostname]);
        }
    }

    // Priotize by money per second
    moneyHostnameDictionary = moneyHostnameDictionary.sort(sortFirstColumn).reverse();
    for (var moneyHostname of moneyHostnameDictionary) {
        if (moneyHostname[0] != undefined) {
            //console.log("push to hostnamesByPriority: "+moneyHostname[1])
            misc.hostnamesByPriority.push(moneyHostname[1]);
        }
    }
    if (moneyHostnameDictionary[0] != undefined && moneyHostnameDictionary[0][0] != undefined) {
        //console.log("Priotized hacking " + moneyHostnameDictionary[0][1] + " for " + moneyHostnameDictionary[0][0] + " $ per second (returns " + misc.hostnamesByPriority[0] + ")");
    }

    // hack n00dles first in the beginning for quick cash
    if (Object.keys(hackedServers).length < 6 && moneyHostnameDictionary.length > 0) {
        var newPriority = ["n00dles"];
        for (var hostname of misc.hostnamesByPriority) {
            if (hostname != "n00dles") {
                newPriority.push(hostname);
            }
        }
        misc.hostnamesByPriority = newPriority;
    }

    //console.log("priotizeBatches | hostnamesByPriority:");
    //console.log(misc.hostnamesByPriority);
}

/** 
 * @param {import(".").NS} ns 
 */
async function runBatches(ns, hackedServers, purchasedServers, batches, misc) {
    //console.log("runBatches");
    await assignToFreeServers(purchasedServers, misc.hostnamesByPriority, batches, ns);
    await assignToFreeServers(hackedServers, misc.hostnamesByPriority, batches, ns);
}

/** 
 * @param {import(".").NS} ns 
 * @param {JobBatch[]} batches
 */
async function assignToFreeServers(servers, hostnamesByPriority, batches, ns) {
    for (var hostname in servers) {
        //console.log("assignToFreeServers | check server " + hostname);
        /** @type{ServerInfo} */
        var serverInfo = servers[hostname];

        if (serverInfo.freeRam >= weakenScriptRam) {
            for (var targetname of hostnamesByPriority) {
                //console.log("assignToFreeServers | check target " + targetname);
                /** @type{JobBatch} */
                var batch = batches[targetname];
                if (batch != undefined) {
                    if (batch.batchStart == undefined) {
                        setRuntimes(batch);
                    }
                    var ranAll = await runJobs(ns, batch, serverInfo);
                    if (ranAll) {
                        if (!batch.isFinalBatch) {
                            serversWithPreparationBatch.splice(serversWithPreparationBatch.indexOf(targetname), 1);
                            serversWithFinalBatches.push(targetname);
                        }
                        var maxOffset = getMaxValue([batch.weakenAfterHackJob?.startOffset, batch.weakenAfterGrowJob?.startOffset, batch.hackJob?.startOffset, batch.growJob?.startOffset]);
                        var startWithOffset = batch.jobsRunsUntil - serverInfo.fullBatchTime + maxOffset;
                        if (Date.now() > startWithOffset) {
                            console.log("batch running, schedule next for "+targetname);
                            delete batches[targetname];
                        }
                        else {
                            console.log("wait for batch fully start for "+targetname);
                            console.log("maxOffset "+maxOffset+"batch.jobsRunsUntil "+batch.jobsRunsUntil+" serverInfo.fullBatchTime "+serverInfo.fullBatchTime+" startWithOffset "+startWithOffset+" Date.now() "+Date.now());
                        }
                    }
                }
            }
        } else {
            //console.log("not enough ram available: " + serverInfo.freeRam);
            //console.log(serverInfo);
        }
    }
}

/** 
 * @param {import(".").NS} ns
 * @param {JobBatch} batch 
 * @param {ServerInfo} serverInfo
 */
async function runJobs(ns, batch, serverInfo) {
    //console.log("runJobs " + serverInfo.server.hostname);
    await execJob(ns, batch.weakenAfterHackJob, serverInfo, batch);
    if (batch.weakenAfterHackJob == undefined || batch.weakenAfterHackJob?.threads == 0) {
        //batch.weakenAfterHackJob = undefined;
        await execJob(ns, batch.growJob, serverInfo, batch);
        if (batch.growJob == undefined || batch.growJob?.threads == 0) {
            //batch.growJob = undefined;
            await execJob(ns, batch.weakenAfterGrowJob, serverInfo, batch);
            if (batch.weakenAfterGrowJob == undefined || batch.weakenAfterGrowJob?.threads == 0) {
                //batch.weakenAfterGrowJob = undefined;
                await execJob(ns, batch.hackJob, serverInfo, batch);
                if (batch.hackJob == undefined || batch.hackJob?.threads == 0) {
                    //batch.hackJob = undefined;
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * @param {import("index").NS} ns 
 * @param {Job} job 
 * @param {ServerInfo} serverInfo 
 * @returns {boolean}
 */
async function execJob(ns, job, serverInfo, batch) {
    if (job != undefined && job.threads > 0 && Date.now() >= job.runtimeStart) {
        //console.log("execJob " + job.scriptname + " @ " + serverInfo.server.hostname + " with " + serverInfo.freeRam + " GB free RAM");

        var scriptRam = hackScriptRam;
        if (job.scriptname == scripts[0]) scriptRam = weakenScriptRam;
        else if (job.scriptname == scripts[1]) scriptRam = growScriptRam;
        var threadsAvailable = Math.floor(serverInfo.freeRam / scriptRam);
        var assignThreads = threadsAvailable < job.threads ? threadsAvailable : job.threads;
        if (assignThreads != job.threads && assignThreads > 0) {
            //console.log("Reduced " + job + " to " + assignThreads + " threads");
        } else if (assignThreads == 0) {
            return false;
        }

        var pid = ns.exec(job.scriptname, serverInfo.server.hostname, assignThreads, job.target, Date.now());
        if (pid > 0) {
            job.jobStarted = true;
            job.threads -= assignThreads;
            serverInfo.freeRam -= scriptRam * assignThreads;
            if (batch.jobsRunsUntil < job.runtime + Date.now()) {
                batch.jobsRunsUntil = job.runtime + Date.now();
            }

            var now = Date.now();
            var delay = (now - job.runtimeStart)
            //console.log("exec " + job.scriptname + " on " + serverInfo.server.hostname + " with " + assignThreads + " threads and target " + job.target + " with " + delay + " ms delay")
            await logBatches(ns, now, serverInfo, job, assignThreads, delay);

            return true;
        } else {
            console.log("Failed " + job.scriptname + " on " + serverInfo.server.hostname + " with " + assignThreads + " threads and target " + job.target + " with " + (Date.now() - job.runtimeStart) + " ms delay")
        }
    }
    return false;
}

async function logBatches(ns, now, serverInfo, job, assignThreads, delay) {
    var logfileText = await ns.read(batchLogFile);
    /** @type{BatchLogEntry[]} */
    var logEntries = JSON.parse(logfileText);
    var newEntry = new BatchLogEntry(now, ns.tFormat(now), serverInfo.server.hostname, job.scriptname, assignThreads, job.target, delay);
    logEntries.push(newEntry);
    await ns.write(batchLogFile, JSON.stringify(logEntries), "w");
}