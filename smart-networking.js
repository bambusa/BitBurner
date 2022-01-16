import { tryPurchaseServer, tryReplaceServer, allServersUpgraded } from "libs/server-lib.js";
import { tryPurchaseNode, tryUpgradeNodes, allNodesUpgraded } from "libs/node-lib.js";
import { exploreAndRootServers } from "libs/server-lib.js";

export const gameStateFile = "game-state-level.txt";
var gameStateLevel;

/** @param {import(".").NS} ns **/
export async function main(ns) {
	var loop = ns.args[0] ?? true;
	await gameloop(ns);
	while (loop) {
		await gameloop(ns);
		await ns.asleep(1000);
	}
}

/** @param {import(".").NS} ns **/
export async function getGameStateLevel(ns) {
	var level = parseInt(await ns.read(gameStateFile));
	if (level < 2 && ns.getPlayer().money >= 440000) {
		ns.tprintf("!!! Progressed to Game State Level 2: Purchasing servers");
		level = 2;
		await ns.write(gameStateFile, level, "w");
	}
	else if (level < 3) {
		var servers = ns.getPurchasedServers();
		if (servers.length == ns.getPurchasedServerLimit()) {
			ns.tprintf("!!! Progressed to Game State Level 3: All servers purchased, start purchasing nodes");
			level = 3;
			await ns.write(gameStateFile, level, "w");
		}
	}
	else if (level < 4) {
		if (allNodesUpgraded(ns, 10, 10)) {
			ns.tprintf("!!! Progressed to Game State Level 4: All nodes upgraded, start upgrading purchased servers");
			level = 4;
			await ns.write(gameStateFile, level, "w");
		}
	}
	else if (level == 4 && ns.getPlayer().money >= 500000000) {
		ns.tprintf("!!! Progressed to Game State Level 5: 1b $");
		level = 5;
		await ns.write(gameStateFile, level, "w");
	}
	else if (level == 5 && allServersUpgraded(ns, 4096)) {
		ns.tprintf("!!! Progressed to Game State Level 6: All servers upgraded, next node upgrades");
		level = 6;
		await ns.write(gameStateFile, level, "w");
	}
	else if (level == 6 && allNodesUpgraded(ns, 20, 200)) {
		ns.tprintf("!!! Progressed to Game State Level 7: More server upgrades...");
		level = 7;
		await ns.write(gameStateFile, level, "w");
	}

	//ns.tprintf("getGameStateLevel: %u", level);
	return level;
}

/** @param {import(".").NS} ns **/
export async function gameloop(ns) {
	const previousLevel = gameStateLevel;
	gameStateLevel = await getGameStateLevel(ns);
	const progressedGameStateLevel = (previousLevel == undefined && gameStateLevel != undefined) || (previousLevel < gameStateLevel);

	if (gameStateLevel == 1) {
		//tryBuyPortBusters(ns);
		await exploreAndRootServers(ns, "home", "home")
		
		if (progressedGameStateLevel) {
			if (!ns.scan().includes("darkweb") && ns.getPlayer().hacking >= 50) {
				ns.alert("!!! Buy TOR router");
			}
			if (ns.scan().includes("darkweb") && !ns.fileExists("BruteSSH.exe") && ns.getPlayer().hacking >= 50) {
				ns.alert("!!! Buy BruteSSH.exe");
			}
		}
	}
	else if (gameStateLevel == 2) {
		//tryBuyPortBusters(ns);
		await exploreAndRootServers(ns, "home", "home")
		await tryPurchaseServer(ns);
	}
	else if (gameStateLevel == 3) {
		//tryBuyPortBusters(ns);
		await exploreAndRootServers(ns, "home", "home")
		tryPurchaseNode(ns, 10);
		tryUpgradeNodes(ns, 10, 64);

		if (progressedGameStateLevel) {
			if (ns.scan().includes("darkweb") && !ns.fileExists("FTPCrack.exe") && ns.getPlayer().money >= 1500000) {
				ns.alert("!!! Buy port busters on darkweb");
			}
		}
	}
	else if (gameStateLevel == 4) {
		//tryBuyPortBusters(ns);
		await exploreAndRootServers(ns, "home", "home")
		tryReplaceServer(ns, 512);
	}
	else if (gameStateLevel == 5) {
		//tryBuyPortBusters(ns);
		await exploreAndRootServers(ns, "home", "home")
		tryReplaceServer(ns, 4096);
	}
	else if (gameStateLevel == 6) {
		//tryBuyPortBusters(ns);
		await exploreAndRootServers(ns, "home", "home")
		tryPurchaseNode(ns, 20);
		tryUpgradeNodes(ns, 200);
	}
	else if (gameStateLevel == 7) {
		await exploreAndRootServers(ns, "home", "home")
		tryReplaceServer(ns, 65536);
	}
}