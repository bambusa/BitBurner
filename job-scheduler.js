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
    sortFirstColumn
} from "libs/helper-lib.js";
import {
    scripts
} from "libs/deploy-lib.js";

var hackScriptRam;
var weakenScriptRam;
var growScriptRam;

/** 
 * @param {import(".").NS} ns 
 */
export async function main(ns) {
    var loop = ns.args[0] ?? true;
    var hackedServers = {};
    var batches = {};
    var misc = {};
    var purchasedServers = {};

    initScriptRam(ns);
    while (true) {
        var started = Date.now();
        updateServerInfo(ns, hackedServers, purchasedServers, batches);
        updateBatches(misc, ns, hackedServers, batches);
        runBatches(ns, hackedServers, purchasedServers, batches, misc);
        if (!loop) break;

        var ended = Date.now();
        console.log("Batch loop took " + (ended - started) + " ms");
        await ns.sleep(10000)
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
    console.log(hackedServers);
}

/** 
 * @param {import("index").NS} ns
 * @param {import("index").Player} player
 */
async function updateHackedServers(ns, hackedServers, player, batches) {
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
    }
}

/** 
 * @param {import("index").NS} ns
 */
async function updatePurchasedServers(ns, purchasedServers) {
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
function updateBatches(misc, ns, hackedServers, batches) {
    //console.log("updateBatches");
    misc.formulasExists = ns.fileExists("Formulas.exe");
    createBatches(ns, hackedServers, batches);
    priotizeBatches(hackedServers, batches, misc);
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
            var batch = createBatch(ns, serverInfo);
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
    for (var hostname in hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (batches[hostname] != undefined && serverInfo.batchMoneyPerSecond == undefined) {
            //console.log("push to hostnamesByPriority: "+hostname)
            misc.hostnamesByPriority.push(hostname);
            break;
        }
    }
    //console.log("Priotized preparation for " + hostnamesByPriority.length + " servers");

    // Prepare money per second dictionary
    for (var hostname in hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (batches[hostname] != undefined && serverInfo.batchMoneyPerSecond != undefined) {
            moneyHostnameDictionary.push([serverInfo.batchMoneyPerSecond, hostname]);
        }
    }

    // Select first server on game start
    var hostnameMemory = []
    if (Object.keys(hackedServers).length < 5 && moneyHostnameDictionary.length >= 1) {
        for (var hostname of misc.hostnamesByPriority) {
            hostnameMemory.push(hostname);
        }
        misc.hostnamesByPriority = [];
    }

    // Priotize by money per second
    moneyHostnameDictionary = moneyHostnameDictionary.sort(sortFirstColumn).reverse();
    for (var moneyHostname of moneyHostnameDictionary) {
        if (moneyHostname[0] != undefined) {
            misc.hostnamesByPriority.push(moneyHostname[1]);
        }
    }
    if (moneyHostnameDictionary[0] != undefined && moneyHostnameDictionary[0][0] != undefined) {
        console.log("Priotized hacking " + moneyHostnameDictionary[0][1] + " for " + moneyHostnameDictionary[0][0] + " $ per second (returns " + misc.hostnamesByPriority[0] + ")");
    }
    if (hostnameMemory.length > 0) {
        for (var hostname of hostnameMemory) {
            misc.hostnamesByPriority.push(hostname);
        }
    }

    //console.log("priotizeBatches | hostnamesByPriority:");
    //console.log(misc.hostnamesByPriority);
}

/** 
 * @param {import(".").NS} ns 
 */
function runBatches(ns, hackedServers, purchasedServers, batches, misc) {
    //console.log("runBatches");
    assignToFreeServers(purchasedServers, misc.hostnamesByPriority, batches, ns);
    assignToFreeServers(hackedServers, misc.hostnamesByPriority, batches, ns);
}

/** 
 * @param {import(".").NS} ns 
 */
function assignToFreeServers(servers, hostnamesByPriority, batches, ns) {
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
                    if (batch.batchStart == undefined || batch.batchStart.length == 0) {
                        setRuntimes(batch);
                    }
                    var ranAll = runJobs(ns, batch, serverInfo);
                    if (ranAll) {
                        delete batches[targetname];
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
function runJobs(ns, batch, serverInfo) {
    //console.log("runJobs " + serverInfo.server.hostname);
    execJob(ns, batch.weakenAfterHackJob, serverInfo);
    if (batch.weakenAfterHackJob == undefined || batch.weakenAfterHackJob?.threads == 0) {
        batch.weakenAfterHackJob = undefined;
        execJob(ns, batch.growJob, serverInfo);
        if (batch.growJob == undefined || batch.growJob?.threads == 0) {
            batch.growJob = undefined;
            execJob(ns, batch.weakenAfterGrowJob, serverInfo);
            if (batch.weakenAfterGrowJob == undefined || batch.weakenAfterGrowJob?.threads == 0) {
                batch.weakenAfterGrowJob = undefined;
                execJob(ns, batch.hackJob, serverInfo);
                if (batch.hackJob == undefined || batch.hackJob?.threads == 0) {
                    batch.hackJob = undefined;
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
function execJob(ns, job, serverInfo) {
    if (job != undefined && job.threads > 0 && Date.now() >= job.runtimeStart) {
        //console.log("execJob " + job.scriptname + " @ " + serverInfo.server.hostname + " with " + serverInfo.freeRam + " GB free RAM");

        var scriptRam = hackScriptRam;
        if (job.scriptname == scripts[0]) scriptRam = weakenScriptRam;
        else if (job.scriptname == scripts[1]) scriptRam = growScriptRam;
        var threadsAvailable = Math.floor(serverInfo.freeRam / scriptRam);
        var assignThreads = threadsAvailable < job.threads ? threadsAvailable : job.threads;
        if (assignThreads != job.threads && assignThreads > 0) {
            console.log("Reduced " + job + " to " + assignThreads + " threads");
        } else if (assignThreads == 0) {
            return false;
        }

        var pid = ns.exec(job.scriptname, serverInfo.server.hostname, assignThreads, job.target, Date.now());
        if (pid > 0) {
            job.jobStarted = true;
            job.threads -= assignThreads;
            serverInfo.freeRam -= scriptRam * assignThreads;
            console.log("exec " + job.scriptname + " on " + serverInfo.server.hostname + " with " + assignThreads + " threads and target " + job.target + " with " + (Date.now() - job.runtimeStart) + " ms delay")
            return true;
        } else {
            console.log("Failed " + job.scriptname + " on " + serverInfo.server.hostname + " with " + assignThreads + " threads and target " + job.target + " with " + (Date.now() - job.runtimeStart) + " ms delay")
        }
    }
    return false;
}