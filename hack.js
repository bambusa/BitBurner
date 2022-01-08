/** @param {NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	var stole = await hackServer(ns, target);
	if (stole > 0) {
		console.log(ns.getServer().hostname+": Successful hack of "+target+"; stole "+ns.nFormat(stole, '0.a')+"$");
	}
	if (stole > 500000) {
		ns.tprint(ns.getServer().hostname+": Successful hack of "+target+"; stole "+ns.nFormat(stole, '0.a')+"$");
	}
}

/** @param {NS} ns **/
async function hackServer(ns, target) {
	return await ns.hack(target);
}