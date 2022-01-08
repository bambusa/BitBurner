export function main(ns) {
	var data = [102, 23, 105, 13, 130, 199, 139, 56, 100];
 	algorithmicStockTraderIII(ns, data);
}

/** @param {import(".").NS} ns
 * @param {number[]} data
 * Algorithmic Stock Trader II
 * var data = [102, 23, 105, 13, 130, 199, 139, 56, 100];
 * algorithmicStockTraderII(ns, data); **/
export function algorithmicStockTraderII(ns, data) {
	var lastValue;
	var highestOffer;
	var lowestOffer;
	var earned = 0;

	for (var i = data.length - 1; i >= 0; i--) {
		var value = parseInt(data[i]);

		if (lastValue != undefined && highestOffer != undefined && lowestOffer != undefined) {
			if (lastValue < value) {
				ns.tprint("bought " + lowestOffer + " sold " + highestOffer + " earned " + (highestOffer - lowestOffer));
				earned += highestOffer - lowestOffer;
				highestOffer = undefined;
				lowestOffer = undefined;
			}
		}

		if (highestOffer == undefined || value > highestOffer) {
			highestOffer = value;
		}
		else if (lowestOffer == undefined || value < lowestOffer) {
			lowestOffer = value;
		}
		lastValue = value;
	}

	ns.tprint("earned sum "+earned);
	return earned;
}

/** @param {import(".").NS} ns
 * @param {number[]} data
 * Algorithmic Stock Trader III
 * var data = [102, 23, 105, 13, 130, 199, 139, 56, 100];
 * algorithmicStockTraderIII(ns, data); **/
export function algorithmicStockTraderIII(ns, data) {
	var lastValue;
	var highestOffer;
	var lowestOffer;
	var possibilities = [];

	for (var i = data.length - 1; i >= 0; i--) {
		var value = parseInt(data[i]);

		if (lastValue != undefined && highestOffer != undefined && lowestOffer != undefined) {
			if (lastValue < value) {
				ns.tprint("bought " + lowestOffer + " sold " + highestOffer + " earned " + (highestOffer - lowestOffer));
				possibilities.push(highestOffer - lowestOffer);
				highestOffer = undefined;
				lowestOffer = undefined;
			}
		}

		if (highestOffer == undefined || value > highestOffer) {
			highestOffer = value;
		}
		else if (lowestOffer == undefined || value < lowestOffer) {
			lowestOffer = value;
		}
		lastValue = value;
	}

	var earned = 0;
	possibilities = possibilities.sort(function(a, b){return b-a});
	for (var i = 0; i < 2; i++) {
		if (possibilities.length > i) {
			earned += possibilities[i];
		}
	}

	ns.tprint("earned sum "+earned);
	return earned;
}