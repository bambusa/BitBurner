/** @param {import("..").NS} ns */
export async function main(ns) {
    ns.tprint("Analyze joesguns min / max values");
    var joesguns = ns.getServer("joesguns");
    joesguns.moneyAvailable = joesguns.moneyMax;
    joesguns.hackDifficulty = joesguns.minDifficulty;
    var player = ns.getPlayer();
    logStats(ns, joesguns, player);

    joesguns.moneyAvailable = joesguns.moneyMax / 2;
    logStats(ns, joesguns, player);

    joesguns.moneyAvailable = 0;
    logStats(ns, joesguns, player);

    joesguns.moneyAvailable = joesguns.moneyMax;
    joesguns.hackDifficulty = joesguns.minDifficulty * 2;
    logStats(ns, joesguns, player);

    joesguns.hackDifficulty = joesguns.minDifficulty * 10;
    logStats(ns, joesguns, player);

    ns.tprint("Analyze comptek min / max values");
    var comptek = ns.getServer("comptek");
    comptek.moneyAvailable = comptek.moneyMax;
    comptek.hackDifficulty = comptek.minDifficulty;
    var player = ns.getPlayer();
    logStats(ns, comptek, player);

    comptek.moneyAvailable = comptek.moneyMax / 2;
    logStats(ns, comptek, player);

    comptek.moneyAvailable = 0;
    logStats(ns, comptek, player);

    comptek.moneyAvailable = comptek.moneyMax;
    comptek.hackDifficulty = comptek.minDifficulty * 2;
    logStats(ns, comptek, player);

    comptek.hackDifficulty = comptek.minDifficulty * 10;
    logStats(ns, comptek, player);

    ns.tprint("Analyze comptek with joesguns values");
    comptek.moneyAvailable = joesguns.moneyMax;
    comptek.hackDifficulty = joesguns.minDifficulty;
    var player = ns.getPlayer();
    logStats(ns, comptek, player);

    comptek.moneyAvailable = joesguns.moneyMax / 2;
    logStats(ns, comptek, player);

    comptek.moneyAvailable = 0;
    logStats(ns, comptek, player);

    comptek.moneyAvailable = joesguns.moneyMax;
    comptek.hackDifficulty = joesguns.minDifficulty * 2;
    logStats(ns, comptek, player);

    comptek.hackDifficulty = joesguns.minDifficulty * 10;
    logStats(ns, comptek, player);
}

function logStats(ns, server, player) {
    var percent = ns.formulas.hacking.hackPercent(server, player);
    var stats = { serverName: server.name, moneyAvailable: ns.nFormat(server.moneyAvailable, '0.a'), hackDifficulty: server.hackDifficulty, hackPercent: percent };
    ns.tprint(stats);
}
