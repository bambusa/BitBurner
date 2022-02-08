export const scripts = ["weaken.js", "grow.js", "hack.js"];

/** 
 * @param {import("..").NS} ns 
 */
export async function main(ns) {
    var hostname = ns.args[0];
    if (hostname != undefined) {
        await deployScriptTo(ns, scripts, "home", hostname);
    }
    else {
        console.log("define target to copy to");
    }
}

/** @param {import("..").NS} ns **/
export async function calculateMaxThreads(ns, hostname, scriptname) {
    let threads = 0;
    let memoryNeeded = 0;
    let memoryAvailable = ns.getServerMaxRam(hostname);
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

/** 
 * @param {import("..").NS} ns 
 * @param {string[]} copyScripts
 * @param {string} hostname
 * @param {string} targetname
 * @param {any[]} parameter
 * @param {boolean} runScript
 * @param {boolean} overwrite
 */
export async function deployScriptTo(ns, copyScripts, hostname, targetname, parameter, runScript, overwrite) {
    if (overwrite == undefined) {
        overwrite = true;
    }

    if (copyScripts.length > 0) {
        if (overwrite != true && ns.scriptRunning(scriptname, hostname)) {
            console.log("-- %s is running already on %s", scriptname, hostname);
            return;
        }

        for (var scriptname of copyScripts) {
            await ns.scp(scriptname, hostname, targetname);
            await ns.sleep(100);
            console.log("Copied " + scriptname + " to " + targetname);
            if (runScript == true) {
                let threads = await calculateMaxThreads(ns, hostname, scriptname);
                if (threads > 0) {
                    var pid = 0;
                    if (parameter != undefined) {
                        pid = ns.exec(scriptname, hostname, threads, parameter);
                    } else {
                        pid = ns.exec(scriptname, hostname, threads);
                    }

                    if (pid > 0) {
                        ns.tprintf("- Deployed %s on %s %s", scriptname + " -t " + threads, hostname, targetname);
                    } else {
                        ns.print("- Could not exec " + scriptname + " -t " + threads + " on " + hostname);
                    }
                } else {
                    ns.print("- Could not deploy " + scriptname + " on " + hostname + ": " + ns.nFormat(ns.getServerMaxRam(hostname), '0.0') + " GB RAM available");
                }
            }
        }
    } else {
        console.log("Error: No scripts given");
    }
}