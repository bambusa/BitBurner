export const portBusters = ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'];
export const scripts = ["weaken.js", "grow.js", "hack.js"];

/** @param {import("..").NS} ns **/
export async function getNumberOfOwnedPortBusters(ns) {
    var ownedBusters = 0;
    for (var i = 0; i < portBusters.length; i++) {
        if (ns.fileExists(portBusters[i], 'home')) {
            ownedBusters++;
        }
    }
    //ns.tprintf("Owned busters: %u", ownedBusters);
    return ownedBusters;
}

/** @param {import("..").NS} ns **/
export async function tryRootServer(ns, hostname) {
    var server = ns.getServer(hostname);
    if (server.hasAdminRights) {
        //ns.tprintf("- Root access to %s already gained", hostname);
        return true;
    }

    if (server.requiredHackingSkill <= ns.getHackingLevel()) {
        let ownedBusters = await getNumberOfOwnedPortBusters(ns);
        if (server.numOpenPortsRequired <= ownedBusters) {
            if (ownedBusters >= 1 && !server.sshPortOpen) {
                ns.brutessh(hostname);
                ns.tprintf("-- BruteSSH on %s", hostname);
            }
            if (ownedBusters >= 2 && !server.ftpPortOpen) {
                ns.ftpcrack(hostname);
                ns.tprintf("-- FTPCrack on %s", hostname);
            }
            if (ownedBusters >= 3 && !server.smtpPortOpen) {
                ns.relaysmtp(hostname);
                ns.tprintf("-- relaySMTP on %s", hostname);
            }
            if (ownedBusters >= 4 && !server.httpPortOpen) {
                ns.httpworm(hostname);
                ns.tprintf("-- HTTPWorm on %s", hostname);
            }
            if (ownedBusters >= 5 && !server.sqlPortOpen) {
                ns.sqlinject(hostname);
                ns.tprintf("-- SQLInject on %s", hostname);
            }
            ns.nuke(hostname);
            ns.tprintf("- Gained root access to %s", hostname);

            /*if (hostname == "CSEC") {
                ns.alert("Gained root access to CSEC > Need to install backdoor manually");
            }
            else if (hostname == "avmnite-02h") {
                ns.alert("Gained root access to avmnite-02h > Need to install backdoor manually");
            }
            else if (hostname == "I.I.I.I") {
                ns.alert("Gained root access to I.I.I.I > Need to install backdoor manually");
            }
            else if (hostname == "run4theh111z") {
                ns.alert("Gained root access to run4theh111z > Need to install backdoor manually");
            }
            else if (hostname == "fulcrumassets") {
                ns.alert("Gained root access to fulcrumassets > Need to install backdoor manually");
            }*/

            await deployScripts(ns, hostname);
            return true;
        }
    }
    else {
        //ns.tprintf("- Could not obtain root access to %s", hostname);
    }

    return false;
}