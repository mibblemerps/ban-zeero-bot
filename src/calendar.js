export class Calendar {
    constructor() {
        /**
         * @type {Event[]}
         */
        this.events = [];
    }
}

export class Event {
    /**
     *
     * @param {string} name
     * @param {Date} date
     */
    constructor(name, date) {
        this.name = name;
        this.date = date;
    }
}

