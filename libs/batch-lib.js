import {
    Job
} from "models/job.js";
import {
    ServerInfo
} from "models/server-info";
import {
    scripts
} from "libs/deploy-lib";
import {
    getMaxValue
} from "libs/helper-lib.js";
import {
    JobBatch
} from "models/job-batch.js";

var batchDelay = 2000;

/** 
 * @param {import("index").NS} ns
 * @param {ServerInfo} serverInfo
 */
export function createBatch(ns, serverInfo) {
    var server = serverInfo.server;
    var batch = new JobBatch(server.hostname);
    //console.log(server.hostname + ": Current security: " + server.hackDifficulty + " min security: " + server.minDifficulty + " current money: " + server.moneyAvailable + " $ max money: " + server.moneyMax + " $");

    if (serverInfo.serverAtMinSecurity && serverInfo.serverAtMaxMoney) {
        serverInfo.predictedSecurity = serverInfo.server.minDifficulty;
        batch.hackJob = createHackJob(serverInfo);
    }
    batch.weakenAfterHackJob = createWeakenToMinJob(serverInfo);
    batch.growJob = createGrowToMaxJob(ns, serverInfo);
    batch.weakenAfterGrowJob = createWeakenToMinJob(serverInfo);

    // Analyze money per second
    if (serverInfo.serverAtMinSecurity && serverInfo.serverAtMaxMoney) {
        serverInfo.fullBatchTime = getMaxValue([serverInfo.hackTime, serverInfo.weakenTime, serverInfo.growTime]);
        serverInfo.batchMoneyPerSecond = Math.round((serverInfo.hackAmount / serverInfo.fullBatchTime) * 1000);
    }

    return batch;
}

/** 
 * @param {ServerInfo} serverInfo
 */
function createHackJob(serverInfo) {
    var hackThreads = 1;
    var tjob = new Job(scripts[2], hackThreads, serverInfo.server.hostname, serverInfo.hackTime);
    serverInfo.predictedSecurity += serverInfo.hackSecurityRise * hackThreads;
    return tjob;
}

/** 
 * @param {import("index").NS} ns
 * @param {ServerInfo} serverInfo
 */
function createGrowToMaxJob(ns, serverInfo) {
    var neededGrowToMax = serverInfo.server.moneyMax / serverInfo.server.moneyAvailable;
    if (neededGrowToMax >= 1) {
        var growThreadsToMax = Math.ceil(ns.growthAnalyze(serverInfo.server.hostname, neededGrowToMax));
        var tjob = new Job(scripts[1], growThreadsToMax, serverInfo.server.hostname, serverInfo.growTime);
        serverInfo.predictedSecurity += serverInfo.growSecurityRise * growThreadsToMax;
        return tjob;
    }
}

/** 
 * @param {ServerInfo} serverInfo
 */
function createWeakenToMinJob(serverInfo) {
    var weakenNeeded = serverInfo.predictedSecurity ?? serverInfo.server.hackDifficulty - serverInfo.server.minDifficulty;
    var weakenThreads = Math.ceil(weakenNeeded / serverInfo.weakenAmount);
    var tjob = new Job(scripts[0], weakenThreads, serverInfo.server.hostname, serverInfo.weakenTime);
    serverInfo.predictedSecurity -= weakenNeeded;
    return tjob;
}

/** 
 * @param {JobBatch} batch 
 */
export function setDurationAndOffset(batch) {
    if (batch != undefined && batch.growJob != undefined && batch.growJob.runtimeStart != undefined) {
        return;
    }

    var durations = [batch.hackJob?.runtime, batch.weakenAfterHackJob?.runtime, batch.growJob?.runtime, batch.weakenAfterGrowJob?.runtime];
    var maxDuration = getMaxValue(durations);
    var predecessors = 0;

    if (batch.weakenAfterHackJob != undefined) {
        var end = maxDuration;
        var start = end - batch.weakenAfterHackJob.runtime - (1 * batchDelay);
        batch.weakenAfterHackJob.startOffset = start;
        predecessors++;
    }

    if (batch.growJob != undefined) {
        var end = maxDuration + (predecessors * batchDelay);
        var start = end - batch.growJob.runtime - batchDelay;
        batch.growJob.startOffset = start;
        predecessors++;
    }

    if (batch.weakenAfterGrowJob != undefined) {
        var end = maxDuration + (predecessors * batchDelay);
        var start = end - batch.weakenAfterGrowJob.runtime - batchDelay;
        batch.weakenAfterGrowJob.startOffset = start;
        predecessors
    }

    if (batch.hackJob != undefined) {
        var end = maxDuration + (predecessors * batchDelay);
        var start = end - batch.hackJob.runtime - batchDelay;
        batch.hackJob.startOffset = start;
    }

    //console.log("setDurationAndOffset | batch:");
    //console.log(batch);

    /*
    ns.tprint("setRuntimes for now = "+formatDate(now));
    if (batch.hackJob != undefined) ns.tprint("Hack: "+formatDate(batch.hackJob?.runtimeStart)+" - "+formatDate(batch.hackJob?.runtimeEnd));
    if (batch.weakenAfterGrowJob != undefined) ns.tprint("Weaken: "+formatDate(batch.weakenAfterGrowJob.runtimeStart)+" - "+formatDate(batch.weakenAfterGrowJob.runtimeEnd));
    if (batch.growJob != undefined) ns.tprint("Grow: "+formatDate(batch.growJob.runtimeStart)+" - "+formatDate(batch.growJob.runtimeEnd));
    if (batch.weakenAfterHackJob != undefined) ns.tprint("Weaken: "+formatDate(batch.weakenAfterHackJob.runtimeStart)+" - "+formatDate(batch.weakenAfterHackJob.runtimeEnd));
    */
}

export function setRuntimes(batch) {
    if (batch.batchStart != undefined && batch.batchStart.length == 0) {
        batch.batchStart = [Date.now()];
    }
    if (batch.hackJob != undefined) {
        batch.hackJob.runtimeStart = batch.batchStart[0] + batch.hackJob?.startOffset;
    }
    if (batch.weakenAfterHackJob != undefined) {
        batch.weakenAfterHackJob.runtimeStart = batch.batchStart[0] + batch.weakenAfterHackJob?.startOffset;
    }
    if (batch.growJob) {
        batch.growJob.runtimeStart = batch.batchStart[0] + batch.growJob?.startOffset;
    }
    if (batch.weakenAfterGrowJob) {
        batch.weakenAfterGrowJob.runtimeStart = batch.batchStart[0] + batch.weakenAfterGrowJob?.startOffset;
    }

    //console.log("setRuntimes | batch:");
    //console.log(batch);
}