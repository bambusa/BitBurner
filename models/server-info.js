export class ServerInfo {
    /** @param {import("..").Server} server */
    constructor(server) {
        this.server = server;
    }

    /** @type{import("..").Server} */
    server;
    /** @type{boolean} */
    serverAtMinSecurity;
    /** @type{boolean} */
    serverAtMaxMoney;
    /** @type{boolean} */
    isHacked;
    /** @type{number} */
    hackTime;
    /** @type{number} */
    hackSecurityRise;
    /** @type{number} */
    growThreadsToMax;
    /** @type{number} */
    growThreadsToDouble;
    /** @type{number} */
    growTime;
    /** @type{number} */
    growSecurityRise;
    /** @type{number} */
    weakenAmount;
    /** @type{number} */
    weakenTime;
    /** @type{number} */
    updateHackedServersAt;
}