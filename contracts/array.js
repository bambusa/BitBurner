/** @param {import(".").NS} ns **/
export async function main(ns) {
	var data = [0,9,0,0,2,0,9,4,5,1,0,2,8];
	arrayJumpingGame(ns, data);
}

var arrayJumpingGameAnswer = false;

/** @param {import(".").NS} ns 
 * @param {number[]} data
 * Array Jumping Game **/
export function arrayJumpingGame(ns, data) {
	var targetIndex = data.length-1;
	var position = 0;
	var donePositions = [position];
	var jumps = data[position];
	arrayJumpingGameAnswer = false;
	tryJump(ns, targetIndex, position, donePositions, jumps, targetIndex, data);
	
	ns.tprint("Array Jumping Game: answer is "+arrayJumpingGameAnswer);
	if (arrayJumpingGameAnswer == true) return 1;
	return 0;
}

function tryJump(ns, targetIndex, position, donePositions, jumps, maxPosition, data) {
	var positiveJump = position + jumps;
	if (positiveJump >= 0 && positiveJump <= maxPosition && !donePositions.includes(positiveJump)) {
		if (positiveJump == targetIndex) {
			ns.tprint("Array Jumping Game: Reached target");
			arrayJumpingGameAnswer = true;
		}
		else {
			ns.tprint("Jumped forwards to "+positiveJump+": "+data[positiveJump]);
			tryJump(ns, targetIndex, positiveJump, donePositions, data[positiveJump], maxPosition, data);
		}
	}
	var negativeJump = position - jumps;
	if (negativeJump >= 0 && negativeJump <= maxPosition && !donePositions.includes(negativeJump)) {
		if (negativeJump == targetIndex) {
			ns.tprint("Array Jumping Game: Reached target");
			arrayJumpingGameAnswer = true;
		}
		else {
			ns.tprint("Jumped backwards to "+negativeJump+": "+data[negativeJump]);
			tryJump(ns, targetIndex, negativeJump, donePositions, data[negativeJump], maxPosition, data);
		}
	}
}