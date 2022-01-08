/** @param {NS} ns **/
export async function main(ns) {
	var data = [[2], [3, 9], [1, 6, 7]];
	var result = minSumPath(ns, data);
}
					
/** @param {NS} ns **/
export function minSumPath(ns, data)
{
	// For storing the result
	// in a 1-D array, and
	// simultaneously updating
	// the result.
	let memo = [];
	let n = data.length - 1;

	// For the bottom row
	for(let i = 0; i < data[n].length; i++)
		memo[i] = data[n][i];

	// Calculation of the
	// remaining rows, in
	// bottom up manner.
	for(let i = data.length - 2; i >= 0; i--)
		for(let j = 0;
				j < data[i].length; j++)
			memo[j] = data[i][j] +
					Math.min(memo[j],
							memo[j + 1]);

	// Return the
	// top element
	ns.tprint("Solution: "+memo[0]);
	return memo[0];
}