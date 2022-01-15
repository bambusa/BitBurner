import {JobBatch} from "../models/job-batch.js";
import {ServerInfo} from "../models/server-info"

/** 
 * @param {ServerInfo} serverInfo
 */
 function createBatch(serverInfo) {
    var batch = new JobBatch(hostname);
    var server = serverInfo.server;
    console.log("Create batch for "+hostname);
    console.log("Current security: " + server.hackDifficulty + " min security: " + server.minDifficulty + " current money: " + ns.nFormat(server.moneyAvailable, '0.a') + " $ max money: " + ns.nFormat(server.moneyMax, '0.a') + " $");

    if (server.hackDifficulty == server.minDifficulty && server.moneyAvailable == server.moneyMax) {
        batch.hackJob = createHackJob(server, ns);
    }
    batch.weakenAfterHackJob = createWeakenToMinJob(server, ns, formulasExist);
    batch.growJob = createGrowToMaxJob(server, ns, formulasExist);
    batch.weakenAfterGrowJob = createWeakenToMinJob(server, ns, formulasExist);

    return batch;
}

/** 
 * @param {import("..").NS} ns
 * @param {import("..").Server} server
 */
function createHackJob(server, ns, threadLimit) {
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
 * @param {import("..").NS} ns
 * @param {import("..").Server} server
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
 * @param {import("..").NS} ns
 * @param {import("..").Server} server
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