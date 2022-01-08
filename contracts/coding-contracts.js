import { findHackableServers } from "server-lib.js";
import { algorithmicStockTraderII, algorithmicStockTraderIII } from "/contracts/algorithmic-stock-trader.js";
import { arrayJumpingGame } from "/contracts/array.js";
import { sanitizeParantheses } from "/contracts/parantheses";
import { minSumPath } from "/contracts/triangle.js";

export var foundContractsFile = "/contracts/found-contracts.txt";
export var doneContractsFile = "/contracts/done-contracts.txt";
var contractTypes = ["Algorithmic Stock Trader I", "Algorithmic Stock Trader II", "Algorithmic Stock Trader III", "Array Jumping Game", "Sanitize Parentheses in Expression", "Minimum Path Sum in a Triangle"];
var contractFunctions = [undefined, algorithmicStockTraderII, algorithmicStockTraderIII, arrayJumpingGame, sanitizeParantheses, minSumPath];

/** @param {import(".").NS} ns **/
export async function main(ns) {
	var mode = ns.args[0];
	if (mode == undefined) {
		await findContracts(ns, "home", "home");
	}
	else if (mode == "read") {
		await readContracts(ns, ns.args[1]);
	}
	else if (mode == "attempt") {
		await attemptContract(ns, ns.args[1]);
	}
}

/** @param {import(".").NS} ns **/
export async function readContracts(ns, index) {
	var file = "" + await ns.read(foundContractsFile);
	var split = file.split("; ");
	if (index == undefined) {
		if (split[0] != undefined) {
			ns.tprint(split.length + " contracts found");
		}
		else {
			ns.tprint("No contracts found");
		}
	}
	else {
		var found = split[index];
		if (found != undefined) {
			var contract = found.split(":");

			var contractType = ns.codingcontract.getContractType(contract[0], contract[1]);
			console.log(found + ": " + contractType);
			ns.tprint(found + ": " + contractType);
			var description = ns.codingcontract.getDescription(contract[0], contract[1]);
			console.log(description);
			ns.tprint(description);
			var data = ns.codingcontract.getData(contract[0], contract[1]);
			console.log(data);
			ns.tprint(data);
		}
		else {
			ns.tprint("Index not found");
		}

	}
}

/** @param {import(".").NS} ns **/
export async function attemptContract(ns, index) {
	var file = "" + await ns.read(foundContractsFile);
	var split = file.split("; ");
	if (index == undefined) {
		if (split[0] != undefined) {
			ns.tprint(split.length + " contracts found");
		}
		else {
			ns.tprint("No contracts found");
		}
	}
	else {
		var found = split[index];
		if (found != undefined) {
			var contract = found.split(":");

			var contractType = ns.codingcontract.getContractType(contract[0], contract[1]);
			console.log(found + ": " + contractType);
			ns.tprint(found + ": " + contractType);
			var description = ns.codingcontract.getDescription(contract[0], contract[1]);
			console.log(description);
			ns.tprint(description);
			var data = ns.codingcontract.getData(contract[0], contract[1]);
			console.log(data);
			ns.tprint(data);

			for (var i = 0; i < contractTypes.length; i++) {
				if (contractTypes[i] == contractType) {
					var result = contractFunctions[i](ns, data);
					var success = ns.codingcontract.attempt(result, contract[0], contract[1], { returnReward: true });
					console.log("Successful attempt: " + success);
					ns.tprint(success);

					if (success != undefined) {
						split.splice(index, 1);
						await ns.write(foundContractsFile, split.join("; "), "w");
						await ns.write(doneContractsFile, contract, "a");
					}
					return;
				}
			}
			ns.tprint("Logic not found");
		}
		else {
			ns.tprint("Index not found");
		}

	}
}

/** @param {import(".").NS} ns **/
export async function findContracts(ns, home, origin) {
	var hostnames = await findHackableServers(ns, home, origin);
	for (var hostname of hostnames) {
		var files = ns.ls(hostname, "cct");
		for (var file of files) {
			if (file != "") {
				var identifier = file + ":" + hostname;
				//ns.tprint("Found "+identifier);
				var foundContracts = "" + await ns.read(foundContractsFile);
				var found = foundContracts.split("; ");
				var doneContracts = "" + await ns.read(doneContractsFile);
				var done = doneContracts.split("; ");
				if (!found.includes(identifier) && !done.includes(identifier)) {
					ns.tprint("Added new contract " + identifier);
					await ns.write(foundContractsFile, identifier + "; ", "a");
				}
			}
		}
		await findContracts(ns, hostname, home);
	}
}