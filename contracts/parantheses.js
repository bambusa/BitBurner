/** @param {import(".").NS} ns **/
export async function main(ns) {
	var data = ")aa((a(a)((a(())()a)";
	var result = sanitizeParantheses(ns, data);
	ns.tprint(result);
}

export function sanitizeParantheses(ns, input) {
	var solutions = new Set();

	// Returns true and adds to solutions set if a string contains valid parentheses, false otherwise
	var checkValidity = (str) => {
		var nestLevel = 0;
		for (var c of str) {
			if (c == "(") nestLevel++;
			else if (c == ")") nestLevel--;
			if (nestLevel < 0) return false;
		}

		if (nestLevel == 0) solutions.add(str);
		return nestLevel == 0;
	};
  
	// Does a breadth first search to check all nodes at the target depth
	var getNodesAtDepth = (str, targetDepth, curDepth = 0) => {
		if (curDepth == targetDepth)
			checkValidity(str);
		else
			for (var i = 0; i < str.length; i++)
				if (str[i] == "(" || str[i] == ")")
					getNodesAtDepth(str.slice(0, i) + str.slice(i + 1), targetDepth, curDepth + 1);
	}
	
	// Start from the top level and expand down until we find at least one solution
	var targetDepth = 0;
	while (solutions.size == 0 && targetDepth < input.length - 1) {
		getNodesAtDepth(input, targetDepth++);
	}
	
	// If no solutions were found, return [""]
	if (solutions.size == 0) solutions.add("");
	ns.tprint("Solution"+solutions);
	return `[${[...solutions].join(", ")}]`;
}

/** @param {import(".").NS} ns
 * @param {string} data
 * Sanitize Parentheses in Expression **/
export function sanitizeParanthesesOld(ns, data) {
	for (var i = 0; i < data.length - 1; i++) {
		var candidates = [];
		removeParanthesis(ns, data, i + 1, 0, candidates);
		ns.tprint("Candidates: " + candidates);

		var validated = [];
		for (var candidate of candidates) {
			if (validateParanthesis(candidate)) {
				validated.push(candidate);
			}
		}
		ns.tprint("Validated: " + validated);
		if (validated.length > 0) return validated;
	}

	ns.tprint("Could not find a valid solution");
	return [""];
}

/** @param {import(".").NS} ns
 * @param {string} data **/
function removeParanthesis(ns, data, removeAmount, index, candidates) {
	console.log("removeParanthesis " + data + " " + removeAmount + " " + index);
	if (removeAmount > 0) {
		var manipulatedString = "";
		if (index == 0) {
			manipulatedString = data.slice(index + 1, data.length);
			ns.tprint("Removed " + index + ": " + manipulatedString);
		}
		else if (index == data.length - 1) {
			manipulatedString = data.slice(0, index);
			ns.tprint("Removed " + index + ": " + manipulatedString);
		}
		else {
			manipulatedString = data.slice(0, index) + data.slice(index + 1, data.length);
			ns.tprint("Removed " + index + ": " + manipulatedString);
		}

		if (!candidates.includes(manipulatedString)) {
			candidates.push(manipulatedString);

			if (removeAmount > 1) removeParanthesis(ns, manipulatedString, removeAmount - 1, 0, candidates);
			if (index < data.length - 1) removeParanthesis(ns, data, removeAmount, index + 1, candidates);
		}
	}
}

/** @param {import(".").NS} ns
 * @param {string} candidate **/
function validateParanthesis(candidate) {
	var state = 0;
	for (var i = 0; i < candidate.length; i++) {
		var character = candidate[i];
		if (character == "(") state++;
		else if (character == ")") state--;
		if (state < 0) return false;
	}
	return state == 0;
}