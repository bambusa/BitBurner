/** @param {NS} ns **/
export function tryBuyPortBusters(ns) {
	if (!ns.scan().includes("darkweb")) {
		ns.tprintf("!!! Buy TOR router")
	}
	else {
		if (!ns.fileExists("BruteSSH.exe")) {
			if (ns.purchaseProgram("BruteSSH.exe")) {
				ns.tprintf("Bought BruteSSH.exe");
			}
		}
		else if (!ns.fileExists("FTPCrack.exe")) {
			if (ns.purchaseProgram("FTPCrack.exe")) {
				ns.tprintf("Bought FTPCrack.exe");
			}
		}
		else if (!ns.fileExists("relaySMTP.exe")) {
			if (ns.purchaseProgram("relaySMTP.exe")) {
				ns.tprintf("Bought relaySMTP.exe");
			}
		}
		else if (!ns.fileExists("AutoLink.exe")) {
			if (ns.purchaseProgram("AutoLink.exe")) {
				ns.tprintf("Bought AutoLink.exe");
			}
		}
		else if (!ns.fileExists("DeepscanV1.exe")) {
			if (ns.purchaseProgram("DeepscanV1.exe")) {
				ns.tprintf("Bought DeepscanV1.exe");
			}
		}
		else if (!ns.fileExists("DeepscanV2.exe")) {
			if (ns.purchaseProgram("DeepscanV2.exe")) {
				ns.tprintf("Bought DeepscanV2.exe");
			}
		}
	}
}