/** @param {import(".").NS} ns */
export async function main(ns) {
    var hostname = "joesguns";
    var server = ns.getServer(hostname);
    ns.tprint("Server: hackDifficulty "+server.hackDifficulty+" moneyAvailable "+server.moneyAvailable+" serverGrowth "+server.serverGrowth);
    var hackAmount = ns.hackAnalyze(hostname) * server.moneyAvailable;
    ns.tprint("hackAnalyze: steal with one thread "+hackAmount);
    ns.tprint("hackAnalyzeChance: "+ns.hackAnalyzeChance(hostname));
    var securityRise = ns.hackAnalyzeSecurity(1);
    ns.tprint("hackAnalyzeSecurity: "+securityRise);
    ns.tprint("hackAnalyzeThreads: "+ns.hackAnalyzeThreads(hostname, hackAmount));

    var weakenThreads = Math.ceil(securityRise / ns.weakenAnalyze(1));
    ns.tprint("weakenThreads: "+weakenThreads);

    var moneyAfterHack = server.moneyAvailable - hackAmount;
    var wishedGrowth = server.moneyAvailable / moneyAfterHack;
    var growThreads = Math.ceil(ns.growthAnalyze(hostname, wishedGrowth));
    ns.tprint("threads to grow x"+wishedGrowth+": "+growThreads);
    securityRise = ns.growthAnalyzeSecurity(growThreads);
    ns.tprint("growthAnalzyeSecurity: "+securityRise);

    var weakenThreads = Math.ceil(securityRise / ns.weakenAnalyze(1));
    ns.tprint("weakenThreads: "+weakenThreads);
}