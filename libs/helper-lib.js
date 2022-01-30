export function sortFirstColumn(a,b) {
    return a[0]-b[0];
}

export function sortByBatchMoneyPerSecond(a, b) {
    return a.batchMoneyPerSecond - b.batchMoneyPerSecond;
}

/** 
 * @param{number[]} candidates 
 */
export function getMaxValue(candidates) {
    var maxValue = 0;
    if (candidates != undefined) {
        for (var candidate of candidates) {
            if (candidate != undefined && candidate > maxValue)
                maxValue = candidate;
        }
    }
    return maxValue;
}

export function formatDate(ms) {
    var date = new Date(ms);
    let formatted_date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return formatted_date;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}