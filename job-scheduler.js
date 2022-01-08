import {findHackedServers} from "libs/server-lib.js";

/** @param {import(".").NS} ns */
export async function main(ns) {
    var candidates = getTargetsMoneyMax(ns);
    var maxValue = getMaxValue(candidates);
    ns.tprint(ns.nFormat(maxValue, '0.a'));
}

function getMaxValue(candidates) {
    var maxValue = 0;
    for (var candidate of candidates) {
        if (candidate[0] > maxValue)
            maxValue = candidate[0];
    }
    return maxValue;
}

/** @param {import(".").NS} ns */
function getTargetsMoneyMax(ns) {
    var hackedServers = findHackedServers(ns, "home", "home");
    var targets = [];
    for (var hostname of hackedServers) {
        var hackAmount = ns.analyze
        var moneyMax = ns.getServer(hostname).moneyMax;
        //ns.tprint(hostname+": "+ns.nFormat(moneyMax, '0.a'));
        var potential = moneyMax * ns.hackAnalyze(hostname) / ns.hackt
    }
    return targets;
}
