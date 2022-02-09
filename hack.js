/** @param {import("index").NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	var predictedStart = ns.args[1];
	var predictedEnd = ns.args[2];

	var start = Date.now();
	if (predictedStart != start) {
		console.log("predictedStart "+predictedStart+" differs from actual start "+start+" by "+(start-predictedStart)+" ms");
	}

	var stole = await hackServer(ns, target);

	var end = Date.now();
	if (predictedEnd != end) {
		console.log("predictedEnd "+predictedEnd+" differs from actual end "+end+" by "+(end-predictedEnd)+" ms");
	}
	
	console.log(ns.getServer().hostname+": Successful hack of "+target+"; stole "+ns.nFormat(stole, '0.a')+"$");
	logBatchError(ns, target, stole);
	// if (stole > 500000) {
	// 	console.log(ns.getServer().hostname+": Successful hack of "+target+"; stole "+ns.nFormat(stole, '0.a')+"$");
	// }
	// else if (stole > 0) {
	// 	console.log(ns.getServer().hostname+": Successful hack of "+target+"; stole "+ns.nFormat(stole, '0.a')+"$");
	// }
}

/** @param {import("index").NS} ns **/
function logBatchError(ns, target, stole) {
	var server = ns.getServer(target);
	// if (server.hackDifficulty > server.minDifficulty) {
		// console.log("Hacked " + target + " at security level " + server.hackDifficulty + " instead of min " + server.minDifficulty);
	// }
	if (server.moneyAvailable+stole < server.moneyMax) {
		console.log("Hacked " + target + " at money available " + server.moneyAvailable + " instead of max " + server.moneyMax);
	}
}

/** @param {import("index").NS} ns **/
async function hackServer(ns, target) {
	return await ns.hack(target);
}