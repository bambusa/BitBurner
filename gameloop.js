import {gameStateFile} from "smart-networking.js";
import {foundContractsFile, doneContractsFile} from "/contracts/coding-contracts.js";

/** @param {import(".").NS} ns */
export async function main(ns) {
	ns.tprint("Initial start-up of all gameloop scripts");
	await ns.write(gameStateFile, 1, "w");
	await ns.write(foundContractsFile, "", "w");
	await ns.write(doneContractsFile, "", "w");
	ns.run("smart-networking.js");
	ns.run("smart-hacking.js");
}