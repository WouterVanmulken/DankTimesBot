'use strict';

// Imports.
const time      = require('time')(Date);            // NodeJS library for working with timezones.
const DankTime  = require('./dank-time.js');
const User      = require('./user.js');


// TODO: users, dankTimes, randomDankTimes


/**
 * Creates a new Chat object.
 * @param {number} id The chat's unique Telegram id.
 * @param {string} timezone The timezone the users are in.
 * @param {boolean} running Whether this bot is running for this chat.
 * @param {number} numberOfRandomTimes The number of randomly generated dank times to generate each day.
 * @param {number} pointsPerRandomTime The number of points each randomly generated dank time is worth.
 * @param {number} lastHour The hour of the last valid dank time being proclaimed.
 * @param {number} lastMinute The minute of the last valid dank time being proclaimed.
 * @param {User[]} users A map with the users, indexed by user id's.
 * @param {DankTime[]} dankTimes The dank times known in this chat.
 * @param {DankTime[]} randomDankTimes The daily randomly generated dank times in this chat.
 */
function Chat(id, timezone = 'Europe/Amsterdam', running = false, numberOfRandomTimes = 1, pointsPerRandomTime = 10,
    lastHour = 0, lastMinute = 0, users = new Map(), dankTimes = [], randomDankTimes = []) {

    /**
     * Sets the timezone the users are in.
     * @param {string} newtimezone
     */
    this.setTimezone = function(newtimezone) {
        try {
            const date = new Date();
            date.setTimezone(newtimezone);
        } catch (err) {
            throw RangeError('Invalid timezone! Examples: \'Europe/Amsterdam\', \'UTC\'.');
        }
        timezone = newtimezone;
    };

    /**
     * Sets whether this bot is running for this chat.
     * @param {boolean} newrunning
     */
    this.setRunning = function(newrunning) {
        if (typeof newrunning !== 'boolean') {
            throw TypeError('The running state must be a boolean!');
        }
        running = newrunning;
    };

    /**
     * Sets the number of randomly generated dank times to generate each day.
     * @param {number} newnumberOfRandomTimes
     */
    this.setNumberOfRandomTimes = function(newnumberOfRandomTimes) {
        if (typeof newnumberOfRandomTimes !== 'number' || newnumberOfRandomTimes < 0 || newnumberOfRandomTimes % 1 !== 0) {
            throw TypeError('The number of times must be a whole number greater or equal to 0!');
        }
        numberOfRandomTimes = newnumberOfRandomTimes;
    };

    /**
     * Sets the number of points each randomly generated dank time is worth.
     * @param {number} newpointsPerRandomTime
     */
    this.setPointsPerRandomTime = function(newpointsPerRandomTime) {
        if (typeof newpointsPerRandomTime !== 'number' || newpointsPerRandomTime < 1 || newpointsPerRandomTime % 1 !== 0) {
            throw TypeError('The points must be a whole number greater than 0!');
        }
        pointsPerRandomTime = newpointsPerRandomTime;
    };

    /**
     * Sets the hour of the last valid dank time being proclaimed.
     * @param {number} newlastHour
     */
    this.setLastHour = function(newlastHour) {
        if (typeof newlastHour !== 'number' || newlastHour < 0 || newlastHour > 23 || newlastHour % 1 !== 0) {
            throw TypeError('The hour must be a whole number between 0 and 23!');
        }
        lastHour = newlastHour;
    };

    /**
     * Sets the minute of the last valid dank time being proclaimed.
     * @param {number} newlastMinute
     */
    this.setLastMinute = function(newlastMinute) {
        if (typeof newlastMinute !== 'number' || newlastMinute < 0 || newlastMinute > 59 || newlastMinute % 1 !== 0) {
            throw TypeError('The minute must be a whole number between 0 and 59!');
        }
        lastMinute = newlastMinute;
    };

    // 'Constructor'  
    if (typeof id !== 'number' || id % 1 !== 0) {
        throw TypeError('The id must be a whole number!');
    }
    setTimezone(timezone);
    setRunning(running);
    setNumberOfRandomTimes(numberOfRandomTimes);
    setPointsPerRandomTime(pointsPerRandomTime);
    setLastHour(lastHour);
    setLastMinute(lastMinute);

    /**
     * Adds a new normal dank time to this chat, replacing any dank time that has
     * the same hour and minute.
     * @param {DankTime} dankTime
     */
    this.addDankTime = function(dankTime) {
        const existing = getDankTime(dankTime.getHour(), dankTime.getMinute());
        if (existing) {
            dankTimes.splice(dankTimes.indexOf(existing), 1);
        }
        dankTimes.push(dankTime);
    };

    /**
     * Gets the timezone the users are in.
     * @returns {string}
     */
    this.getTimezone = function() {
        return timezone;
    };

    /**
     * Gets whether this bot is running for this chat.
     * @returns {boolean}
     */
    this.isRunning = function() {
        return running;
    }

    /**
     * Gets the number of randomly generated dank times to generate each day.
     * @returns {number}
     */
    this.getNumberOfRandomTimes = function() {
        return numberOfRandomTimes;
    }

    /**
     * Gets the number of points each randomly generated dank time is worth.
     * @returns {number}
     */
    this.getPointsPerRandomTime = function() {
        return pointsPerRandomTime;
    }

    /**
     * Gets the hour of the last valid dank time being proclaimed.
     * @returns {number}
     */
    this.getLastHour = function() {
        return lastHour;
    }

    /**
     * Gets the minute of the last valid dank time being proclaimed.
     * @returns {number}
     */
    this.getLastMinute = function() {
        return lastMinute;
    }

    /**
     * Gets the normal dank time that has the specified hour and minute.
     * @param {number} hour 
     * @param {number} minute 
     * @returns {DankTime} or undefined if none has the specified hour and minute.
     */
    function getDankTime(hour, minute) {
        for (let dankTime of dankTimes) {
            if (dankTime.getHour() === hour && dankTime.getMinute() === minute) {
                return dankTime;
            }
        }
    };

    /**
     * Gets both normal and random dank times that have the specified text.
     * @param {string} text 
     * @returns {DankTime[]}
     */
    function getDankTimesByText(text) {
        const found = [];
        for (let dankTime of dankTimes.concat(randomDankTimes)) {
            if (dankTime.getTexts().indexOf(text) > -1) {
                found.push(dankTime);
            }
        }
        return found;
    };
}

// Exports.
module.exports = Chat;