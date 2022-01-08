/** @param {import("..").NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	await growServer(ns, target);
}

/** @param {import("..").NS} ns **/
async function growServer(ns, target) {
	await ns.grow(target);
}