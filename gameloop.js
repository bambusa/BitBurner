import {
    findHackedServers
} from "libs/server-lib";
import {
    ServerInfo
} from "models/server-info";
import {
    sortFirstColumn
} from "libs/helper-lib.js";
import {
    scripts
} from "libs/deploy-lib.js";
import {
    RunningJob
} from "models/running-job";

var hackScriptRam;
var weakenScriptRam;
var growScriptRam;
const batchLogFile = "batch-log-file.txt";

/** 
 * @param {import(".").NS} ns 
 */
export async function main(ns) {
    var loop = ns.args[0] ?? true;
    var hackedServers = {};
    var purchasedServers = {};
    var runningJobs = {};

    await ns.write(batchLogFile, "[]", "w");
    initScriptRam(ns);
    while (true) {
        var started = Date.now();
        updateServerInfo(ns, hackedServers, purchasedServers);
        var priotizedServers = prioitizeServers(hackedServers);

        // runJobs
        for (var serverInfo of purchasedServers.concat(hackedServers)) {
            if (serverInfo.freeRam < weakenScriptRam) continue;

            for (var targetname of priotizedServers) {
                if (serverInfo.freeRam < weakenScriptRam) continue;

                /** @type{ServerInfo} */
                var targetInfo = hackedServers[targetname];
                /** @type{RunningJob[]} */
                var runningJobsForTarget = runningJobs[targetname];

                var now = Date.now();
                var hacktime = ns.getHackTime(targetname);
                var growtime = ns.getGrowTime(targetname);
                var weakentime = ns.getWeakenTime(targetname);
                var hackEnd = now + hacktime;
                var growEnd = now + growtime;
                var weakenEnd = now + weakentime;

                var predictedStates = {};
                predictedStates[scripts[0]] = [targetInfo.server.hackDifficulty, targetInfo.server.moneyAvailable];
                predictedStates[scripts[1]] = [targetInfo.server.hackDifficulty, targetInfo.server.moneyAvailable];
                predictedStates[scripts[2]] = [targetInfo.server.hackDifficulty, targetInfo.server.moneyAvailable];

                console.log("Check host "+serverInfo.server.hostname+" target "+targetname+" with freeRam " + serverInfo.freeRam)

                for (var i = 0; i < runningJobsForTarget.length; i++) {
                    /** @type{RunningJob} */
                    var runningJob = runningJobsForTarget[i];

                    // Remove finished jobs
                    if (!ns.isRunning(runningJob.type, serverInfo.server.hostname, targetname, runningJob.start)) {
                        runningJobsForTarget.splice(i, 1);
                        runningJobs[targetname] = runningJobsForTarget;
                        continue;
                    }

                    // Predict state end of hack job
                    if (runningJob.end < hackEnd) { 
                        predictedStates[scripts[2]][0] = predictSecurityForJob(runningJob, predictedStates[scripts[2]][0], targetInfo);
                        predictedStates[scripts[2]][1] = predictMoneyForJob(predictedStates[scripts[2]][1], runningJob, targetInfo);
                    }

                    // Predict state end of grow job
                    if (runningJob.end < growEnd) {
                        predictedStates[scripts[1]][0] = predictSecurityForJob(runningJob, predictedStates[scripts[1]][0], targetInfo);
                        predictedStates[scripts[1]][1] = predictMoneyForJob(predictedStates[scripts[1]][1], runningJob, targetInfo);
                    }

                    // Predict state end of weaken job
                    if (runningJob.end < weakenEnd) {
                        predictedStates[scripts[0]][0] = predictSecurityForJob(runningJob, predictedStates[scripts[0]][0], targetInfo);
                        predictedStates[scripts[0]][1] = predictMoneyForJob(predictedStates[scripts[0]][1], runningJob, targetInfo);
                    }
                }
                
                console.log("predict after hacktime: security " + predictedStates[scripts[2]][0] +"/"+ targetInfo.server.minDifficulty+"; money "+predictedStates[scripts[2]][1] +"/"+ targetInfo.server.moneyMax);
                console.log("predict after weakentime: security " + predictedStates[scripts[0]][0] +"/"+ targetInfo.server.minDifficulty+"; money "+predictedStates[scripts[0]][1] +"/"+ targetInfo.server.moneyMax);
                console.log("predict after growtime: security " + predictedStates[scripts[1]][0] +"/"+ targetInfo.server.minDifficulty+"; money "+predictedStates[scripts[1]][1] +"/"+ targetInfo.server.moneyMax);

                if (predictedStates[scripts[2]][0] == targetInfo.server.minDifficulty && predictedStates[scripts[2]][1] == targetInfo.server.moneyMax) {
                    var newRunningJob = runHack(serverInfo, targetInfo, predictedStates[scripts[2]][1], ns, now, hackEnd, runningJobs);
                    if (newRunningJob != null) continue;
                }
                if (predictedStates[scripts[0]][0] != targetInfo.server.minDifficulty) {
                    var newRunningJob = runWeaken(serverInfo, targetInfo, predictedStates[scripts[0]][0], ns, now, hackEnd, runningJobs);
                    if (newRunningJob != null) continue;
                }
                if (predictedStates[scripts[1]][0] == targetInfo.server.minDifficulty && predictedStates[scripts[1]][1] != targetInfo.server.moneyMax) {
                    var newRunningJob = runGrow(serverInfo, targetInfo, predictedStates[scripts[1]][1], ns, now, hackEnd, runningJobs);
                    if (newRunningJob != null) continue;
                }
            }
        }

        var ended = Date.now();
        console.log("Loop took " + (ended - started) + " ms");
        if (!loop) break;
        await ns.sleep(10000);
    }
}

function prioitizeServers(hackedServers) {
    var prepareServers = [];
    var readyServers = [];
    for (var hostname of hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        if (serverInfo.server.hackDifficulty > serverInfo.server.minDifficulty && serverInfo.server.moneyAvailable < serverInfo.server.moneyMax) {
            prepareServers.push([serverInfo.hackPotential, hostname]);
        } else {
            readyServers.push([serverInfo.hackPotential, hostname]);
        }
    }
    prepareServers = prepareServers.sort(sortFirstColumn).reverse();
    readyServers = readyServers.sort(sortFirstColumn).reverse();
    console.log("prepareServers:");
    console.log(prepareServers);
    console.log("readyServers:");
    console.log(readyServers);

    var priotizedServers = [];
    if (prepareServers.length > 0) {
        priotizedServers.push(prepareServers[0][1]);
    }
    for (var server of readyServers) {
        priotizedServers.push(server[1]);
    }
    for (var i = 1; i < prepareServers.length; i++) {

        priotizedServers.push(prepareServers[i][1]);
    }
    return priotizedServers;
}

/**
 * 
 * @param {ServerInfo} serverInfo 
 * @param {ServerInfo} targetInfo 
 * @param {number} predictedMoney 
 * @param {import("index").NS} ns 
 * @param {number} now 
 * @param {number} hackEnd 
 * @param {number} runningJobs 
 * @returns 
 */
function runHack(serverInfo, targetInfo, predictedMoney, ns, now, hackEnd, runningJobs) {
    var threads = Math.floor(serverInfo.freeRam / hackScriptRam);
    if (targetInfo.hackAmount * threads > predictedMoney) {
        threads = Math.floor(predictedMoney / targetInfo.hackAmount);
    }
    var pid = ns.exec(scripts[2], serverInfo.server.hostname, threads, targetInfo.server.hostname, now);
    if (pid > 0) {
        var expectedOutcome = predictedMoney - (targetInfo.hackAmount * threads);
        var newRunningJob = new RunningJob(pid, scripts[2], serverInfo.server.hostname, targetInfo.server.hostname, threads, now, hackEnd, expectedOutcome);
        runningJobs[targetname].push(newRunningJob);
        serverInfo.freeRam -= hackScriptRam * threads;
        console.log("Exec " + scripts[2] + " on " + serverInfo.server.hostname + " with " + threads + " threads and target " + targetInfo.server.hostname + "; expectedOutcome " + expectedOutcome);
        return newRunningJob;
    } else {
        console.log("Failed " + scripts[2] + " on " + serverInfo.server.hostname + " with " + threads + " threads and target " + targetInfo.server.hostname);
    }
    return null;
}

/**
 * 
 * @param {ServerInfo} serverInfo 
 * @param {ServerInfo} targetInfo 
 * @param {number} predictedSecurity 
 * @param {import("index").NS} ns 
 * @param {number} now 
 * @param {number} hackEnd 
 * @param {number} runningJobs 
 * @returns 
 */
function runWeaken(serverInfo, targetInfo, predictedSecurity, ns, now, hackEnd, runningJobs) {
    var threads = Math.floor(serverInfo.freeRam / weakenScriptRam);
    if (targetInfo.weakenAmount * threads > predictedSecurity - serverInfo.server.minDifficulty) {
        threads = Math.ceil((predictedSecurity - serverInfo.server.minDifficulty) / targetInfo.weakenAmount);
    }
    var pid = ns.exec(scripts[0], serverInfo.server.hostname, threads, targetInfo.server.hostname, now);
    if (pid > 0) {
        var expectedOutcome = predictedSecurity - (targetInfo.weakenAmount * threads);
        var newRunningJob = new RunningJob(pid, scripts[0], serverInfo.server.hostname, targetInfo.server.hostname, threads, now, hackEnd, expectedOutcome);
        runningJobs[targetname].push(newRunningJob);
        serverInfo.freeRam -= weakenScriptRam * threads;
        console.log("Exec " + scripts[0] + " on " + serverInfo.server.hostname + " with " + threads + " threads and target " + targetInfo.server.hostname + "; expectedOutcome " + expectedOutcome);
        return newRunningJob;
    } else {
        console.log("Failed " + scripts[0] + " on " + serverInfo.server.hostname + " with " + threads + " threads and target " + targetInfo.server.hostname);
    }
    return null;
}

/**
 * 
 * @param {ServerInfo} serverInfo 
 * @param {ServerInfo} targetInfo 
 * @param {number} predictedMoney 
 * @param {import("index").NS} ns 
 * @param {number} now 
 * @param {number} hackEnd 
 * @param {number} runningJobs 
 * @returns 
 */
function runGrow(serverInfo, targetInfo, predictedMoney, ns, now, hackEnd, runningJobs) {
    var threads = Math.floor(serverInfo.freeRam / growScriptRam);
    var growNeeded = targetInfo.server.moneyMax / predictedMoney;
    if ((targetInfo.growThreadsToDouble * threads / 2) > growNeeded) {
        threads = Math.ceil(growNeeded / targetInfo.growThreadsToDouble / 2);
    }
    var pid = ns.exec(scripts[1], serverInfo.server.hostname, threads, targetInfo.server.hostname, now);
    if (pid > 0) {
        var expectedOutcome = (targetInfo.growThreadsToDouble * threads / 2) * predictedMoney;
        var newRunningJob = new RunningJob(pid, scripts[1], serverInfo.server.hostname, targetInfo.server.hostname, threads, now, hackEnd, expectedOutcome);
        runningJobs[targetname].push(newRunningJob);
        serverInfo.freeRam -= growScriptRam * threads;
        console.log("Exec " + scripts[1] + " on " + serverInfo.server.hostname + " with " + threads + " threads and target " + targetInfo.server.hostname + "; expectedOutcome " + expectedOutcome);
        return newRunningJob;
    } else {
        console.log("Failed " + scripts[1] + " on " + serverInfo.server.hostname + " with " + threads + " threads and target " + targetInfo.server.hostname);
    }
    return null;
}

/**
 * 
 * @param {RunningJob} runningJob 
 * @param {number} predictedSecurity 
 * @param {ServerInfo} targetInfo 
 * @returns {number} the predicted money after job is finished
 */
function predictMoneyForJob(predictedMoney, runningJob, targetInfo) {
    var money = predictedMoney;
    if (runningJob.type == scripts[1]) {
        var growMultiplier = 2 * runningJob.threads / targetInfo.growThreadsToDouble;
        money = money * growMultiplier;
        if (targetInfo.server.moneyMax > money) {
            money = targetInfo.server.moneyMax;
        }
    }
    return money;
}

/**
 * 
 * @param {RunningJob} runningJob 
 * @param {number} predictedSecurity 
 * @param {ServerInfo} targetInfo 
 * @returns {number} the predicted security after job is finished
 */
function predictSecurityForJob(runningJob, predictedSecurity, targetInfo) {
    var security = predictedSecurity;
    if (runningJob.type == scripts[0]) {
        security -= targetInfo.weakenAmount * runningJob.threads;
        if (security < targetInfo.server.minDifficulty) {
            security = targetInfo.server.minDifficulty;
        }
    } else if (runningJob.type == scripts[1]) {
        security += targetInfo.growSecurityRise * runningJob.threads;
    } else if (runningJob.type == scripts[2]) {
        security += targetInfo.hackSecurityRise * runningJob.threads;
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
function updateServerInfo(ns, hackedServers, purchasedServers) {
    //console.log("updateServerInfo");
    var player = ns.getPlayer();
    updateHackedServers(ns, hackedServers, player);
    updatePurchasedServers(ns, purchasedServers);
    //console.log(hackedServers);
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
        serverInfo.createdAtHackExp = player.hacking_exp;
        serverInfo.serverAtMinSecurity = server.hackDifficulty == server.minDifficulty;
        serverInfo.serverAtMaxMoney = server.moneyMax == server.moneyAvailable;
        serverInfo.freeRam = server.maxRam - server.ramUsed;
        serverInfo.growThreadsToDouble = ns.growthAnalyze(serverName, 2);
        serverInfo.growSecurityRise = ns.growthAnalyzeSecurity(1);
        serverInfo.weakenAmount = ns.weakenAnalyze(1);
        serverInfo.hackSecurityRise = ns.hackAnalyzeSecurity(1);
        serverInfo.hackAmount = ns.hackAnalyze(server.hostname) * serverInfo.server.moneyMax;
        serverInfo.hackPotential = serverInfo.hackAmount / serverInfo.server.minDifficulty;
        hackedServers[serverName] = serverInfo;
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