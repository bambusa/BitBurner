/** @param {import("..").NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	await weakenServer(ns, target);
}

/** @param {import("..").NS} ns **/
export async function weakenServer(ns, target) {
	await ns.weaken(target);
}