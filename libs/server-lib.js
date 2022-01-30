import {
    tryRootServer
} from "libs/hack-lib.js";
import {
    deployScriptTo,
    scripts
} from "libs/deploy-lib";

const purchasedServerPrefix = "pserv";

export async function main(ns) {
    var servers = findHackedServers(ns, "home", "home");
    for (var server of servers) {
        await deployScriptTo(ns, scripts, "home", server);
    }
}

/** @param {import("..").NS} ns
 * @param {string} home
 * @param {string} origin
 * @returns {string[]} hostname array **/
export function findHackableServers(ns, home, origin) {
    let servers = ns.scan(home);
    const hackedServers = [];
    servers.forEach(function (server) {
        if (!server.startsWith(purchasedServerPrefix) && server != origin) {
            hackedServers.push(server);
        }
    });

    return hackedServers;
}

/** @param {import("..").NS} ns **/
export async function exploreAndRootServers(ns, home, origin) {
    let hostnames = findHackableServers(ns, home, origin);
    if (hostnames.length > 0) {
        //ns.tprintf("-- Found hackable servers at %s from %s: %s", home, origin, hostnames);
        for (let i = 0; i < hostnames.length; i++) {
            let iHostname = hostnames[i];
            if (await tryRootServer(ns, iHostname)) {
                await exploreAndRootServers(ns, iHostname, home);
            }
        }
    }
}

/** @param {import("..").NS} ns
 * @param {string} home
 * @param {string} origin
 * @returns {string[]} hostname array **/
export function findHackedServers(ns, home, origin, hackedServers) {
    if (home == undefined) {
        ns.alert("server-lib:findHackedServers | missing home argument");
        return;
    }
    if (hackedServers == undefined) {
        hackedServers = [];
    }
    let hostnames = findHackableServers(ns, home, origin);

    if (hostnames.length > 0) {
        for (let i = 0; i < hostnames.length; i++) {
            let iHostname = hostnames[i];
            var server = ns.getServer(iHostname);
            if (server.hasAdminRights) {
                hackedServers.push(iHostname);
                findHackedServers(ns, iHostname, home, hackedServers);
            }
        }
    }
    return hackedServers;
}

/** @param {import("..").NS} ns
 * @param {number} ram
 * @returns {string} hostname of bought server **/
export function tryPurchaseServer(ns, ram) {
    //ns.tprintf("Trying to purchase new servers...");
    if (ram == undefined) {
        ram = 8;
    }

    if ((ns.getPurchasedServers()).length < ns.getPurchasedServerLimit()) {
        let moneyAvailable = ns.getServerMoneyAvailable("home");
        let moneyNeeded = ns.getPurchasedServerCost(ram);
        if (moneyAvailable > moneyNeeded) {
            ns.tprintf("- Purchasing new %u GB server", ram);
            return ns.purchaseServer(purchasedServerPrefix, ram);
        } else {
            //console.log("-- Could not purchase server; Missing " + ns.nFormat(moneyAvailable - moneyNeeded, '0a') + " $ for sale price of " + ns.nFormat(moneyNeeded, '0a') + " $")
            //ns.tprint("-- Could not purchase server; Missing "+ns.nFormat(moneyAvailable - moneyNeeded, '0a')+" $ for sale price of "+ns.nFormat(moneyNeeded, '0a')+" $");
        }
    } else {
        //console.log("- Server limit reached");
        //ns.tprint("- Server limit reached");
    }
}

/** @param {import("..").NS} ns
 * @param {number} ram
 * @returns {string} hostname of upgraded server **/
export function tryReplaceServer(ns, ram) {
    for (var i = 0; i < ns.getPurchasedServers().length; i++) {
        var hostname = ns.getPurchasedServers()[i];
        if (ns.getServerMaxRam(hostname) < ram) {
            let moneyAvailable = ns.getServerMoneyAvailable("home");
            let moneyNeeded = ns.getPurchasedServerCost(ram);
            if (moneyAvailable > moneyNeeded) {
                ns.tprintf("Replacing purchased server %s", hostname);
                ns.killall(hostname);
                ns.deleteServer(hostname);
                return tryPurchaseServer(ns, ram);
            } else {
                console.log("- Money available %s; needed for %s GB RAM: %s", ns.nFormat(moneyAvailable, '0.a'), ram, ns.nFormat(moneyNeeded, '0.a'));
                return;
            }
        }
    }
}

/** @param {import("..").NS} ns **/
export function allServersUpgraded(ns, ram) {
    for (var i = 0; i < ns.getPurchasedServers().length; i++) {
        var hostname = ns.getPurchasedServers()[i];
        if (ns.getServerMaxRam(hostname) < ram) {
            return false;
        }
    }
    return true;
}