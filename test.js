/** @param {import(".").NS} ns */
export async function main(ns) {
    var runningJobs = {};
    runningJobs["target"] = [];
    newFunction(runningJobs);
    console.log(runningJobs);
}

function newFunction(runningJobs) {
    for (var i = 0; i < 2; i++) {
        newFunction_1(runningJobs, i);
    }
}
function newFunction_1(runningJobs, i) {
    runningJobs["target"].push(i);
}

