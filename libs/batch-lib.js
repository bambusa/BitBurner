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

/** 
 * @param {ServerInfo} serverInfo
 * @returns {JobBatch}
 */
export function createBatch(serverInfo) {
    var server = serverInfo.server;
    var batch = new JobBatch(server.hostname);
    console.log(server.hostname+": Current security: " + server.hackDifficulty + " min security: " + server.minDifficulty + " current money: " + server.moneyAvailable + " $ max money: " + server.moneyMax + " $");

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