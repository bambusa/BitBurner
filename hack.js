/** @param {import("index").NS} ns **/
export async function main(ns) {
	var target = ns.args[0];

	var stole = await hackServer(ns, target);
	logBatchError(ns, target);
	if (stole > 0) {
		console.log(ns.getServer().hostname+": Successful hack of "+target+"; stole "+ns.nFormat(stole, '0.a')+"$");
	}
	if (stole > 500000) {
		console.log(ns.getServer().hostname+": Successful hack of "+target+"; stole "+ns.nFormat(stole, '0.a')+"$");
	}
}

/** @param {import("index").NS} ns **/
function logBatchError(ns, target) {
	var server = ns.getServer(target);
	if (server.hackDifficulty > server.minDifficulty) {
		console.log("Hacked " + target + " at security level " + server.hackDifficulty + " instead of min " + server.minDifficulty);
	}
	if (server.moneyAvailable < server.moneyMax) {
		console.log("Hacked " + target + " at money available " + server.moneyAvailable + " instead of max " + server.moneyMax);
	}
}

/** @param {import("..").NS} ns **/
async function hackServer(ns, target) {
	return await ns.hack(target);
}