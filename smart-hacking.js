import { findHackedServers } from "server-lib.js";
import { sortFirstColumn } from "helper-lib.js";
import { gameStateFile } from "smart-networking.js";

export const scripts = ["weaken.js", "grow.js", "hack.js"];

/** @param {NS} ns **/
export async function main(ns) {
	var loop = ns.args[0] ?? true;
	var sortFunction = ns.args[1] ?? sortByWeakeningNeed;
	await distributeJobs(ns, sortFunction);
	while (loop) {
		await distributeJobs(ns, sortFunction);
		await ns.asleep(1000);
	}
}

/** @param {NS} ns **/
async function distributeJobs(ns, sortFunction) {
	sortFunction == sortFunction ?? sortByWeakeningNeed;
	if (parseInt(await ns.read(gameStateFile)) > 2) sortFunction = sortByServerHackPotential;

	// get needed jobs
	var cores = 1;
	var hackedServers = await findHackedServers(ns, "home");
	const sortedServers = sortFunction(ns, hackedServers);
	const neededJobs = analyzeNeededJobs(ns, sortedServers, cores);
	var jobs = neededJobs;

	// distribute job execution
	var availableExecutors = ns.getPurchasedServers().concat(hackedServers);
	availableExecutors.push("home");
	// availableExecutors = [availableExecutors[0]];
	await copyScripts(ns, availableExecutors);
	//ns.tprintf("Found %u potential executors", availableExecutors.length);

	//console.log("distribute jobs for " + sortedServers);
	for (var j = 0; j < sortedServers.length; j++) {
		for (var i = 0; i < scripts.length; i++) {
			startJobs(ns, availableExecutors, jobs[i], scripts[i], sortedServers[j]);
		}
	}
}

/** @param {NS} ns **/
async function copyScripts(ns, availableExecutors) {
	for (var executor of availableExecutors) {
		await ns.scp(scripts, "home", executor);
	}
}

/** @param {NS} ns **/
function startJobs(ns, availableExecutors, jobsOfType, scriptname, sortedServer) {
	var targetName = sortedServer[1];
	var ramPerThread = ns.getScriptRam(scriptname);
	// find next weaken job
	var job;
	for (var i = 0; i < jobsOfType.length; i++) {
		var entry = jobsOfType[i];
		if (entry[0] == targetName && entry[1] > 0) {
			job = entry;
			//console.log("found " + scriptname + " job for " + targetName);
			break;
		}
		else {
			//console.log("no " + scriptname + " jobs for " + targetName);
		}
	}

	if (job != undefined && job[1] > 0) {
		// assign executors
		for (var executor of availableExecutors) {

			// assign threads
			var ramAvailable = ns.getServerMaxRam(executor) - ns.getServerUsedRam(executor);
			if (executor == "home") {
				ramAvailable -= 30;
			}

			var threadsAvailable = Math.floor(ramAvailable / ramPerThread);
			var assignThreads = threadsAvailable;
			if (job[1] < threadsAvailable) {
				assignThreads = job[1];
			}

			// execute job
			//ns.tprintf("%s: %s t-av: %u, t-need: %u, t-as: %u, trg: %s", executor, scriptname, threadsAvailable, job[1], assignThreads, job[0]);
			if (assignThreads > 0) {
				var pid = ns.exec(scriptname, executor, assignThreads, job[0])
				//ns.tprint("pid "+pid);
				if (pid > 0) {
					console.log("exec " + executor + ": " + scriptname + " -t " + assignThreads + " " + job[0] + " (" + job[1] + " remaining)");
					//ns.tprint("exec "+executor+": "+scriptname+" -t "+assignThreads+" "+job[0]+" ("+job[1]+" remaining)");
					job[1] = job[1] - assignThreads;
					threadsAvailable = threadsAvailable - assignThreads;
				}
				else {
					console.log(executor + ": Could not start " + scriptname + " with " + assignThreads + " threads");
					//ns.tprint(executor+": Could not start "+scriptname+" with "+assignThreads+" threads");
				}
			}
		}
	}
}

/** @param {NS} ns
 * @returns {[number, string]} [serverGrowth, hostname] **/
function sortByServerHackPotential(ns, hackedServers) {
	var serverGrowths = [];

	for (const hostname of hackedServers) {
		var growPotential = ns.getServerMaxMoney(hostname) * (ns.getServerGrowth(hostname) / 100);
		var hackPotential = growPotential * ns.hackAnalyze(hostname);
		//ns.tprint(hostname+" hack potential: "+hackPotential);
		serverGrowths.push([hackPotential, hostname]);
	}

	// sort servers by growth
	serverGrowths = serverGrowths.sort(sortFirstColumn).reverse();
	//ns.tprint(serverGrowths);
	return serverGrowths;
}

/** @param {NS} ns
 * @returns {[number, string]} [serverGrowth, hostname] **/
function sortByWeakeningNeed(ns, hackedServers) {
	var weakeningNeeded = [];

	for (const hostname of hackedServers) {
		var server = ns.getServer(hostname);
		var growSecurityPenalty = ns.growthAnalyze(hostname, 2) * 0.004;
		var weakenThreadsNeeded = growSecurityPenalty / 0.05;
		//ns.tprint(hostname+" weaken threads needed: "+weakenThreadsNeeded);
		weakeningNeeded.push([weakenThreadsNeeded, hostname]);
	}

	// sort servers by weakening needed
	weakeningNeeded = weakeningNeeded.sort(sortFirstColumn);
	return weakeningNeeded;
}

/** @param {NS} ns
 * @param {[number, string]} sortedServers
 * @param {number} cores
 * @returns {[[string, number][],[string, number][],[string, number][]]} [weaken, grow, hack] **/
function analyzeNeededJobs(ns, sortedServers, cores) {
	var jobs = [[], [], []] // weaken, grow, hack

	for (const sortedServer of sortedServers) {
		var hostname = sortedServer[1];
		var server = ns.getServer(hostname);

		var needsWeakening = false;
		if (server.hackDifficulty > server.minDifficulty) {
			var neededWeakening = server.hackDifficulty - server.minDifficulty;
			var neededWeakeningThreads = Math.floor(neededWeakening / ns.weakenAnalyze(1, cores));
			//ns.tprint(neededWeakening);
			jobs[0].push([hostname, neededWeakeningThreads]);
			needsWeakening = true;
		}

		var needsGrowth = false;
		if (server.moneyAvailable > 1000000 && server.moneyAvailable < server.moneyMax * 0.9) {
			var neededGrowth = server.moneyMax / server.moneyAvailable;
			//console.log("growthAnalyze hostname: " + hostname + "; neededGrowth: " + neededGrowth + "; cores: " + cores);
			var neededGrowthThreads = Math.floor(ns.growthAnalyze(hostname, neededGrowth, cores));
			//ns.tprint(neededGrowthThreads);
			jobs[1].push([hostname, neededGrowthThreads]);
			needsGrowth = true;
		}

		ns.hackAnalyzeChance(hostname);
		if (!needsWeakening && !needsGrowth) {
			var neededHackThreads = Math.floor(ns.hackAnalyzeThreads(hostname, server.moneyAvailable));
			//ns.tprint(neededHackThreads);
			jobs[2].push([hostname, neededHackThreads]);
		}
	}

	//ns.tprint(jobs);
	return jobs;
}