export class ServerInfo {
    /** @param {import("..").Server} server */
    constructor(server, serverType) {
        this.server = server;
        this.serverType = serverType;
        this.created = Date.now();
    }

    /** @type{import("..").Server} */
    server;
    /** @type{string} */
    serverType;
    /** @type{boolean} */
    serverAtMinSecurity;
    /** @type{boolean} */
    serverAtMaxMoney;
    // /** @type{boolean} */
    //isHacked;
    /** @type{number} */
    hackAmount;
    /** @type{number} */
    hackTime;
    /** @type{number} */
    hackSecurityRise;
    /** @type{number} */
    hackPotential;
    // /** @type{number} */
    //growThreadsToMax;
    /** @type{number} */
    growThreadsToDouble;
    // /** @type{number} */
    //growTime;
    /** @type{number} */
    growSecurityRise;
    /** @type{number} */
    weakenAmount;
    // /** @type{number} */
    //weakenTime;
    // /** @type{number} */
    //updateHackedServersAt;
    /** @type{number} */
    predictedSecurity;
    /** @type{number} */
    fullBatchTime;
    /** @type{number} */
    batchMoneyPerSecond;
    /** @type{number} */
    freeRam;
    /** @type{number} */
    created;
}