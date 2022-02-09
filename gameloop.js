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
import {
    progressLoop
} from "libs/network-lib";

var hackScriptRam;
var weakenScriptRam;
var growScriptRam;
const batchLogFile = "batch-log-file.txt";

/** 
 * @param {import(".").NS} ns 
 */
export async function main(ns) {
    console.log("/// *** Starting main function of gameloop.js *** \\\\\\");
    const loop = ns.args[0] ?? true;
    const hackedServers = {};
    const purchasedServers = {};
    const runningJobs = {
        /** @type{RunningJob[]} */
        "jobs": []
    };
    const misc = {};

    await ns.write(batchLogFile, "[]", "w");
    initScriptRam(ns);
    while (true) {
        console.log("/// *** Starting loop of gameloop.js *** \\\\\\");
        const started = Date.now();
        var player = ns.getPlayer();
        var gameStateLevel = await progressLoop(ns);
        console.log("Game State Level: " + gameStateLevel);
        updateServerInfo(ns, hackedServers, purchasedServers, misc, player);
        var priotizedServers = prioitizeServers(hackedServers, misc, gameStateLevel);

        // runJobs
        for (var hostname of Object.keys(purchasedServers).concat(Object.keys(hackedServers))) {
            var serverInfo = purchasedServers[hostname];
            if (serverInfo == undefined) {
                serverInfo = hackedServers[hostname];
            }
            if (serverInfo.freeRam < weakenScriptRam) continue;

            for (var targetname of priotizedServers) {
                if (serverInfo.freeRam < weakenScriptRam) continue;

                /** @type{ServerInfo} */
                var targetInfo = hackedServers[targetname];
                var hacktime = ns.getHackTime(targetname);
                var growtime = ns.getGrowTime(targetname);
                var weakentime = ns.getWeakenTime(targetname);
                var beforeHackJobCount = 0;
                var beforeGrowJobCount = 0;
                var beforeWeakenJobCount = 0;

                var predictedStates = {};
                predictedStates[scripts[0]] = [targetInfo.server.hackDifficulty, targetInfo.server.moneyAvailable];
                predictedStates[scripts[1]] = [targetInfo.server.hackDifficulty, targetInfo.server.moneyAvailable];
                predictedStates[scripts[2]] = [targetInfo.server.hackDifficulty, targetInfo.server.moneyAvailable];

                var approxThreads = Math.floor(serverInfo.freeRam / hackScriptRam);
                // console.log("Check host " + hostname + " target " + targetname + " with freeRam " + serverInfo.freeRam + " approximately free threads " + approxThreads);

                var now = Date.now();
                var hackEnd = Math.ceil(now + hacktime);
                var growEnd = Math.ceil(now + growtime);
                var weakenEnd = Math.ceil(now + weakentime);

                for (var runningJob of runningJobs.jobs.filter(x => x.target == targetname)) {

                    // Remove finished jobs
                    if (!ns.isRunning(runningJob.type, runningJob.hostname, runningJob.target, runningJob.start)) {
                        // console.log("did not find job "+runningJob.type+" on "+runningJob.hostname+" args "+runningJob.target+", "+runningJob.start);
                        var index = runningJobs.jobs.indexOf(runningJob);
                        runningJobs.jobs.splice(index, 1);
                        continue;
                    }

                    // Predict state end of hack job
                    if (runningJob.end < hackEnd) {
                        beforeHackJobCount++;
                        predictedStates[scripts[2]][0] = predictSecurityForJob(runningJob, predictedStates[scripts[2]][0], targetInfo);
                        predictedStates[scripts[2]][1] = predictMoneyForJob(predictedStates[scripts[2]][1], runningJob, targetInfo, ns);
                    }

                    // Predict state end of grow job
                    if (runningJob.end < growEnd) {
                        beforeGrowJobCount++;
                        predictedStates[scripts[1]][0] = predictSecurityForJob(runningJob, predictedStates[scripts[1]][0], targetInfo);
                        predictedStates[scripts[1]][1] = predictMoneyForJob(predictedStates[scripts[1]][1], runningJob, targetInfo, ns);
                    }

                    // Predict state end of weaken job
                    if (runningJob.end < weakenEnd) {
                        beforeWeakenJobCount++;
                        predictedStates[scripts[0]][0] = predictSecurityForJob(runningJob, predictedStates[scripts[0]][0], targetInfo);
                        predictedStates[scripts[0]][1] = predictMoneyForJob(predictedStates[scripts[0]][1], runningJob, targetInfo, ns);
                    }
                }


                // console.log("predict "+targetname+" after hacktime: security " + predictedStates[scripts[2]][0] + "/" + targetInfo.server.minDifficulty + "; money " + predictedStates[scripts[2]][1] + "/" + targetInfo.server.moneyMax + "; " + beforeHackJobCount + " jobs before");
                // console.log("predict "+targetname+" after weakentime: security " + predictedStates[scripts[0]][0] + "/" + targetInfo.server.minDifficulty + "; money " + predictedStates[scripts[0]][1] + "/" + targetInfo.server.moneyMax + "; " + beforeWeakenJobCount + " jobs before");
                // console.log("predict "+targetname+" after growtime: security " + predictedStates[scripts[1]][0] + "/" + targetInfo.server.minDifficulty + "; money " + predictedStates[scripts[1]][1] + "/" + targetInfo.server.moneyMax + "; " + beforeGrowJobCount + " jobs before");

                if (predictedStates[scripts[2]][0] == targetInfo.server.minDifficulty && predictedStates[scripts[2]][1] == targetInfo.server.moneyMax) {
                    var newRunningJob = runHack(serverInfo, targetInfo, predictedStates[scripts[2]][1], ns, now, hackEnd, runningJobs);
                    if (newRunningJob != null) {
                        await ns.sleep(200);
                        continue;
                    }
                }
                if (predictedStates[scripts[0]][0] != targetInfo.server.minDifficulty) {
                    var newRunningJob = runWeaken(serverInfo, targetInfo, predictedStates[scripts[0]][0], ns, now, hackEnd, runningJobs);
                    if (newRunningJob != null) {
                        await ns.sleep(200);
                        continue;
                    }
                }
                if (predictedStates[scripts[1]][0] == targetInfo.server.minDifficulty && predictedStates[scripts[1]][1] != targetInfo.server.moneyMax) {
                    var newRunningJob = runGrow(serverInfo, targetInfo, predictedStates[scripts[1]][1], ns, now, hackEnd, runningJobs);
                    if (newRunningJob != null) {
                        await ns.sleep(200);
                        continue;
                    }
                }

            }
        }

        console.log(runningJobs);
        var ended = Date.now();
        console.log("Loop took " + (ended - started) + " ms");
        if (!loop) break;
        await ns.sleep(10);
    }
}

function prioitizeServers(hackedServers, misc, gameStateLevel) {
    var servers = [];
    for (var hostname in hackedServers) {
        /** @type{ServerInfo} */
        var serverInfo = hackedServers[hostname];
        servers.push([serverInfo.hackPotential, hostname]);
    }
    servers = servers.sort(sortFirstColumn).reverse();

    var priotizedServers = [];
    for (var server of servers) {
        if (server[0] > 1000) {
            // console.log("server[0] / misc[ram] = "+(server[0] / misc["ram"]));
            if (hackedServers[server[1]].server.minDifficulty > (gameStateLevel > 3 ? gameStateLevel + 1 : 3)) {
                // console.log("too early for "+server[1]);
            } else {
                priotizedServers.push(server[1]);
            }
        }
    }

    console.log("Priotize target " + priotizedServers[0] + " with minSecurity " + hackedServers[priotizedServers[0]].server.minDifficulty + " and maxMoney " + hackedServers[priotizedServers[0]].server.moneyMax);
    // console.log("misc[ram] = "+misc["ram"]);
    // console.log(servers);
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
 * @param {*} runningJobs 
 * @returns 
 */
function runHack(serverInfo, targetInfo, predictedMoney, ns, now, hackEnd, runningJobs) {
    var threads = Math.floor(serverInfo.freeRam / hackScriptRam);
    if (threads < 1) {
        // console.log("hack threads < 1: serverInfo.freeRam "+serverInfo.freeRam+" / hackScriptRam "+hackScriptRam+")");
        return null;
    }
    if (targetInfo.hackAmount * threads > predictedMoney) {
        threads = Math.ceil(predictedMoney / targetInfo.hackAmount);
        if (threads < 1) {
            console.log("hack threads < 1: (predictedMoney " + predictedMoney + " / targetInfo.hackAmount " + targetInfo.hackAmount + " = " + threads);
        }
    }
    if (threads < 1) {
        threads = 1;
    }
    var pid = ns.exec(scripts[2], serverInfo.server.hostname, threads, targetInfo.server.hostname, now, hackEnd);
    if (pid > 0) {
        var expectedOutcome = predictedMoney - (targetInfo.hackAmount * threads);
        var newRunningJob = new RunningJob(pid, scripts[2], serverInfo.server.hostname, targetInfo.server.hostname, threads, now, hackEnd, expectedOutcome);
        runningJobs.jobs.push(newRunningJob);
        serverInfo.freeRam -= hackScriptRam * threads;
        // console.log("Exec " +pid+" " +scripts[2] + " on " + serverInfo.server.hostname + " with " + threads + " threads and args " + targetInfo.server.hostname + ", "+now+ "; expectedOutcome " + expectedOutcome);
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
 * @param {number} jobs 
 * @returns 
 */
function runWeaken(serverInfo, targetInfo, predictedSecurity, ns, now, hackEnd, runningJobs) {
    var threads = Math.floor(serverInfo.freeRam / weakenScriptRam);
    if (threads < 1) {
        // console.log("weaken threads < 1: serverInfo.freeRam "+serverInfo.freeRam+" / weakenScriptRam "+weakenScriptRam);
        return null;
    }
    if (targetInfo.weakenAmount * threads > predictedSecurity - targetInfo.server.minDifficulty) {
        threads = Math.ceil((predictedSecurity - targetInfo.server.minDifficulty) / targetInfo.weakenAmount);
        if (threads < 1) {
            console.log("weaken threads < 1: (predictedSecurity " + predictedSecurity + " - targetInfo.server.minDifficulty " + targetInfo.server.minDifficulty + ") / targetInfo.weakenAmount " + targetInfo.weakenAmount + " = " + threads);
        }
    }
    if (threads < 1) {
        threads = 1;
    }

    var pid = ns.exec(scripts[0], serverInfo.server.hostname, threads, targetInfo.server.hostname, now, hackEnd);
    if (pid > 0) {
        var expectedOutcome = predictedSecurity - (targetInfo.weakenAmount * threads);
        // console.log("expectedOutcome "+expectedOutcome+" = predictedSecurity "+predictedSecurity+" - (targetInfo.weakenAmount "+targetInfo.weakenAmount +" * threads "+threads+")");
        var newRunningJob = new RunningJob(pid, scripts[0], serverInfo.server.hostname, targetInfo.server.hostname, threads, now, hackEnd, expectedOutcome);
        runningJobs.jobs.push(newRunningJob);
        serverInfo.freeRam -= weakenScriptRam * threads;
        // console.log("Exec " + scripts[0] + " on " + serverInfo.server.hostname + " with " + threads + " threads and args " + targetInfo.server.hostname + ", "+now+ "; expectedOutcome " + expectedOutcome);
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
 * @param {*} runningJobs 
 * @returns 
 */
function runGrow(serverInfo, targetInfo, predictedMoney, ns, now, hackEnd, runningJobs) {
    var threads = Math.floor(serverInfo.freeRam / growScriptRam);
    if (threads < 1) {
        // console.log("grow threads < 1: serverInfo.freeRam "+serverInfo.freeRam+" / growScriptRam "+growScriptRam);
        return null;
    }
    var growNeeded = targetInfo.server.moneyMax / predictedMoney;
    if ((targetInfo.growThreadsToDouble * threads / 2) > growNeeded) {
        threads = Math.ceil(growNeeded / targetInfo.growThreadsToDouble / 2);
        if (threads < 1) {
            console.log("grow threads < 1: (growNeeded " + growNeeded + " / targetInfo.growThreadsToDouble " + targetInfo.growThreadsToDouble + " / 2 = " + threads);
        }
    }
    if (threads < 1) {
        threads = 1;
    }
    var pid = ns.exec(scripts[1], serverInfo.server.hostname, threads, targetInfo.server.hostname, now, hackEnd);
    if (pid > 0) {
        var expectedOutcome = (threads / targetInfo.growThreadsToDouble * 2) * predictedMoney;
        var newRunningJob = new RunningJob(pid, scripts[1], serverInfo.server.hostname, targetInfo.server.hostname, threads, now, hackEnd, expectedOutcome);
        runningJobs.jobs.push(newRunningJob);
        serverInfo.freeRam -= growScriptRam * threads;
        // console.log("Exec " + scripts[1] + " on " + serverInfo.server.hostname + " with " + threads + " threads and args " + targetInfo.server.hostname + ", "+now+ "; expectedOutcome " + expectedOutcome);
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
 * @param {import("index").NS} ns
 * @returns {number} the predicted money after job is finished
 */
function predictMoneyForJob(predictedMoney, runningJob, targetInfo, ns) {
    var money = predictedMoney;
    if (runningJob.type == scripts[1]) {
        var growMultiplier = 2 * runningJob.threads / ns.growthAnalyze(targetInfo.server.hostname, 2);
        // console.log("growMultiplier "+growMultiplier+" = 2 * runningJob.threads "+runningJob.threads+" / ns.growthAnalyze(targetInfo.server.hostname, 2) "+ns.growthAnalyze(targetInfo.server.hostname, 2));
        money += money * growMultiplier;
        if (targetInfo.server.moneyMax < money) {
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
        if (isNaN(security) || security == undefined) {
            console.log("security isNan || security == undefined: predictedSecurity " + predictedSecurity + " targetInfo.weakenAmount " + targetInfo.weakenAmount + " runningJob.threads " + runningJob.threads + " targetInfo.server.minDifficulty " + targetInfo.server.minDifficulty);
        }
    } else if (runningJob.type == scripts[1]) {
        security += targetInfo.growSecurityRise * runningJob.threads;
        if (isNaN(security) || security == undefined) {
            console.log("security isNan || security == undefined: predictedSecurity " + predictedSecurity + " targetInfo.growSecurityRise " + targetInfo.growSecurityRise + " runningJob.threads " + runningJob.threads + " targetInfo.server.minDifficulty " + targetInfo.server.minDifficulty);
        }
    } else if (runningJob.type == scripts[2]) {
        security += targetInfo.hackSecurityRise * runningJob.threads;
        if (isNaN(security) || security == undefined) {
            console.log("security isNan || security == undefined: predictedSecurity " + predictedSecurity + " targetInfo.hackSecurityRise " + targetInfo.hackSecurityRise + " runningJob.threads " + runningJob.threads + " targetInfo.server.minDifficulty " + targetInfo.server.minDifficulty);
        }
    }
    return security;
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
function updateServerInfo(ns, hackedServers, purchasedServers, misc, player) {
    //console.log("updateServerInfo");
    misc["ram"] = 0;
    updateHackedServers(ns, hackedServers, player, misc);
    updatePurchasedServers(ns, purchasedServers, misc);
    //console.log(hackedServers);
}

/** 
 * @param {import("index").NS} ns
 * @param {import("index").Player} player
 */
function updateHackedServers(ns, hackedServers, player, misc) {
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
        misc["ram"] += server.maxRam;
    }
}

/** 
 * @param {import("index").NS} ns
 */
function updatePurchasedServers(ns, purchasedServers, misc) {
    var servers = ns.getPurchasedServers();
    servers.push("home");
    for (var serverName of servers) {
        var server = ns.getServer(serverName);
        var serverInfo = purchasedServers[serverName] ?? new ServerInfo(server, "purchased");
        serverInfo.freeRam = server.maxRam - server.ramUsed;
        purchasedServers[serverName] = serverInfo;
        misc["ram"] += server.maxRam;
    }
}

function calculateHackingTime(ns, player, hostname) {
    let calc_weak_time = 4 * 5000 * 
        (2.5 * ns.getServerRequiredHackingLevel(host) * ns.getServerMinSecurityLevel(host) + 500) 
        / (ns.getPlayer().hacking + 50) 
        / ns.getPlayer().hacking_speed_mult / intelligence_bonus; //from calculateHackingTime
}