import { findHackableServers, findHackedServers } from "server-lib.js";
import { tryRootServer, scripts } from "hack-lib.js";

/** @param {import(".").NS} ns **/
export async function calculateMaxThreads(ns, hostname, scriptname) {
    let threads = 0;
    let memoryNeeded = 0;
    let memoryAvailable = await ns.getServerMaxRam(hostname);
    while (memoryNeeded < memoryAvailable) {
        let scriptMemory = ns.getScriptRam(scriptname);
        memoryNeeded = scriptMemory * (threads + 1);
        //ns.tprintf("%s GB RAM needed for %u threads of %s; %u GB available", ns.nFormat(memoryNeeded, '0.0'), threads + 1, scriptname, memoryAvailable);
        if (memoryNeeded == 0 || memoryNeeded > memoryAvailable) {
            break;
        }
        threads += 1;
    }
    return threads;
}

/** @param {import(".").NS} ns **/
export async function exploreAndRootServers(ns, home, origin) {
    let hostnames = await findHackableServers(ns, home, origin);
    if (hostnames.length > 0) {
        //ns.tprintf("-- Found hackable servers at %s from %s: %s", home, origin, hostnames);
        for (let i = 0; i < hostnames.length; i++) {
            let iHostname = hostnames[i];
            if (await tryRootServer(ns, iHostname)){
                await exploreAndRootServers(ns, iHostname, home);
            }
        }
    }
}

/** @param {import(".").NS} ns **/
async function exploreAndDeployServers(ns, scriptname, home, origin, target) {
    let hostnames = await findHackableServers(ns, home, origin);
    if (hostnames.length > 0) {
        //ns.tprintf("-- Found hackable servers at %s from %s: %s", home, origin, hostnames);
        for (let i = 0; i < hostnames.length; i++) {
            let iHostname = hostnames[i];
            if (await tryRootServer(ns, iHostname)) {
                await deployScriptTo(ns, scriptname, iHostname, target);
                await exploreAndDeployServers(ns, scriptname, iHostname, home, target);
            }
        }
    }
}

/** @param {import(".").NS} ns **/
async function deployScriptTo(ns, scriptname, hostname, target) {
    if (ns.scriptRunning(scriptname, hostname)) {
        //ns.tprintf("-- %s is running already on %s", scriptname, hostname);
        return;
    }

    await ns.scp(scriptname, "home", hostname);
    let threads = await calculateMaxThreads(ns, hostname, scriptname);
    if (threads > 0) {
        var pid = 0;
        if (target != undefined) {
            pid = ns.exec(scriptname, hostname, threads, target);
        }
        else {
            pid = ns.exec(scriptname, hostname, threads);
        }

        if (pid > 0) {
            ns.tprintf("- Deployed %s on %s %s", scriptname + " -t " + threads, hostname, target);
        }
        else {
            ns.print("- Could not exec " + scriptname + " -t " + threads + " on " + hostname);
        }
    }
    else {
        ns.print("- Could not deploy " + scriptname + " on " + hostname + ": " + ns.nFormat(ns.getServerMaxRam(hostname), '0.0') + " GB RAM available");
    }
}

/** @param {import(".").NS} ns **/
export async function deployScriptsToAllServers(ns) {
    var hackedServers = await findHackedServers(ns, "home", "home");
    var hostnames = ns.getPurchasedServers().concat(hackedServers);
    for (var hostname of hostnames) {
        await deployScripts(ns, hostname);
    }
}

/** @param {import(".").NS} ns **/
export async function stopAllScripts(ns) {
    var hostnames = ns.getPurchasedServers();
    hostnames = hostnames.concat(await findHackedServers(ns, "home"));
    for (var i = 0; i < hostnames.length; i++) {
        ns.killall(hostnames[i]);
    }
    ns.tprintf("Stopped all scripts on %u servers", hostnames.length);
}

/** @param {import(".").NS} ns **/
export async function deployScripts(ns, hostname) {
    if (!ns.fileExists(scripts[scripts.length - 1])) {
        await ns.scp(scripts, "home", hostname);
        ns.tprintf("Deployed scripts to %s", hostname);
    }
}

/** @param {import(".").NS} ns **/
export async function main(ns) {
    await deployScriptsToAllServers(ns);
    ns.tprint("Deployed scripts to all servers");
}