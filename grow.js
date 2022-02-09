/** @param {import(".").NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	var predictedStart = ns.args[1];
	var predictedEnd = ns.args[2];

	var start = Date.now();
	if (predictedStart != start) {
		console.log("predictedStart "+predictedStart+" differs from actual start "+start+" by "+(start-predictedStart)+" ms");
	}

	await growServer(ns, target);

	var end = Date.now();
	if (predictedEnd != end) {
		console.log("predictedEnd "+predictedEnd+" differs from actual end "+end+" by "+(end-predictedEnd)+" ms");
	}
}

/** @param {import(".").NS} ns **/
async function growServer(ns, target) {
	await ns.grow(target);
}