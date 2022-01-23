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
 * @param {ServerInfo} serverInfo
 * @returns {JobBatch}
 */
export function createBatch(serverInfo) {
    var server = serverInfo.server;
    var batch = new JobBatch(server.hostname);
    console.log(server.hostname + ": Current security: " + server.hackDifficulty + " min security: " + server.minDifficulty + " current money: " + server.moneyAvailable + " $ max money: " + server.moneyMax + " $");

    if (serverInfo.serverAtMinSecurity && serverInfo.serverAtMaxMoney) {
        serverInfo.predictedSecurity = serverInfo.server.minDifficulty;
        batch.hackJob = createHackJob(serverInfo);
    }
    batch.weakenAfterHackJob = createWeakenToMinJob(serverInfo);
    batch.growJob = createGrowToMaxJob(serverInfo);
    batch.weakenAfterGrowJob = createWeakenToMinJob(serverInfo);

    // Analyze money per second
    if (serverInfo.serverAtMinSecurity && serverInfo.serverAtMaxMoney) {
        serverInfo.fullBatchTime = getMaxValue([serverInfo.hackTime, serverInfo.weakenTime, serverInfo.growTime]);
        serverInfo.batchMoneyPerSecond = Math.round((serverInfo.hackAmount / fullBatchTime) / 1000);
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
 * @param {ServerInfo} serverInfo
 */
function createGrowToMaxJob(serverInfo) {
    var tjob = new Job(scripts[1], serverInfo.growThreadsToMax, serverInfo.server.hostname, serverInfo.growTime);
    serverInfo.predictedSecurity += serverInfo.growSecurityRise * serverInfo.growThreadsToMax;
    return tjob;
}

/** 
 * @param {ServerInfo} serverInfo
 */
function createWeakenToMinJob(serverInfo) {
    var weakenNeeded = serverInfo.server.hackDifficulty - serverInfo.server.minDifficulty;
    var weakenThreads = Math.ceil(weakenNeeded / serverInfo.weakenAmount);
    var tjob = new Job(scripts[0], weakenThreads, serverInfo.server.hostname, serverInfo.weakenTime);
    serverInfo.predictedSecurity -= serverInfo.weakenAmount * weakenThreads;
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
    batch.duration = maxDuration + (8 * batchDelay);

    if (batch.hackJob != undefined) {
        var end = maxDuration + (8 * batchDelay);
        var start = end - batch.hackJob.runtime - (1 * batchDelay);
        batch.hackJob.startOffset = start;
    }

    if (batch.weakenAfterGrowJob != undefined) {
        var end = maxDuration + (6 * batchDelay);
        var start = end - batch.weakenAfterGrowJob.runtime - (1 * batchDelay);
        batch.weakenAfterGrowJob.startOffset = start;
    }

    if (batch.growJob != undefined) {
        var end = maxDuration + (4 * batchDelay);
        var start = end - batch.growJob.runtime - (1 * batchDelay);
        batch.growJob.startOffset = start;
    }

    if (batch.weakenAfterHackJob != undefined) {
        var end = maxDuration + (2 * batchDelay);
        var start = end - batch.weakenAfterHackJob.runtime - (1 * batchDelay);
        batch.weakenAfterHackJob.startOffset = start;
    }

    console.log("setDurationAndOffset | batch:");
    console.log(batch);

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
        console.log(batch);
        batch.weakenAfterHackJob.runtimeStart = batch.batchStart[0] + batch.weakenAfterHackJob?.startOffset;
    }
    if (batch.growJob) {
        batch.growJob.runtimeStart = batch.batchStart[0] + batch.growJob?.startOffset;
    }
    if (batch.weakenAfterGrowJob) {
        batch.weakenAfterGrowJob.runtimeStart = batch.batchStart[0] + batch.weakenAfterGrowJob?.startOffset;
    }

    console.log("setRuntimes | batch:");
    console.log(batch);
}