import * as moment from "moment-timezone";
import { ChatSettings } from "../chat-setting/chat-settings";
import { DankTime } from "../dank-time/dank-time";
import { Leaderboard } from "../leaderboard/leaderboard";
import { User } from "../user/user";
import * as util from "../util/util";
import { BasicChat } from "./basic-chat";

export class Chat {

  /**
   * Returns a new Chat parsed from a literal.
   */
  public static fromJSON(literal: BasicChat): Chat {
    const dankTimes = new Array<DankTime>();
    literal.dankTimes.forEach((dankTime) => dankTimes.push(DankTime.fromJSON(dankTime)));
    const users = new Map();
    literal.users.forEach((user) => users.set(user.id, User.fromJSON(user)));
    return new Chat(literal.id, literal.lastHour, literal.lastMinute, users, dankTimes, [],
      new ChatSettings(literal.settings));
  }

  public awaitingResetConfirmation = -1;
  public readonly settings: ChatSettings;
  private myId: number;
  private myLastHour: number;
  private myLastMinute: number;
  private myLastLeaderboard?: Leaderboard = undefined;

  /**
   * Creates a new Chat object.
   * @param id The chat's unique Telegram id.
   * @param lastHour The hour of the last valid dank time being proclaimed.
   * @param lastMinute The minute of the last valid dank time being proclaimed.
   * @param users A map with the users, indexed by user id's.
   * @param dankTimes The dank times known in this chat.
   * @param randomDankTimes The daily randomly generated dank times in this chat.
   * @param settings The chat's settings.
   */
  constructor(id: number,
              lastHour = 0,
              lastMinute = 0,
              private readonly users = new Map<number, User>(),
              public readonly dankTimes = new Array<DankTime>(),
              public randomDankTimes = new Array<DankTime>(),
              settings?: ChatSettings) {
    this.id = id;
    this.lastHour = lastHour;
    this.lastMinute = lastMinute;
    this.settings = settings ? settings : new ChatSettings(this);
  }

  public set id(id: number) {
    if (id % 1 !== 0) {
      throw new RangeError("The id must be a whole number!");
    }
    this.myId = id;
  }

  public get id(): number {
    return this.myId;
  }

  public set lastHour(lastHour: number) {
    if (lastHour < 0 || lastHour > 23 || lastHour % 1 !== 0) {
      throw new RangeError("The hour must be a whole number between 0 and 23!");
    }
    this.myLastHour = lastHour;
  }

  public get lastHour(): number {
    return this.myLastHour;
  }

  public set lastMinute(lastMinute: number) {
    if (lastMinute < 0 || lastMinute > 59 || lastMinute % 1 !== 0) {
      throw new RangeError("The minute must be a whole number between 0 and 59!");
    }
    this.myLastMinute = lastMinute;
  }

  public get lastMinute(): number {
    return this.myLastMinute;
  }

  /**
   * Adds a new normal dank time to this chat, replacing any dank time that has
   * the same hour and minute.
   */
  public addDankTime(dankTime: DankTime): void {
    const existing = this.getDankTime(dankTime.hour, dankTime.minute);
    if (existing) {
      this.dankTimes.splice(this.dankTimes.indexOf(existing), 1);
    }
    this.dankTimes.push(dankTime);
    this.dankTimes.sort(DankTime.compare);
  }

  /**
   * Adds a user to this chat.
   */
  public addUser(user: User): void {
    this.users.set(user.id, user);
  }

  /**
   * Gets an array of the users, sorted by scores.
   */
  public sortedUsers(): User[] {
    const usersArr = new Array<User>();
    this.users.forEach((user) => usersArr.push(user));
    usersArr.sort(User.compare);
    return usersArr;
  }

  /**
   * Generates new random dank times for this chat, clearing old ones.
   */
  public generateRandomDankTimes(): DankTime[] {
    this.randomDankTimes = new Array<DankTime>();
    for (let i = 0; i < this.settings.tryGet("randomtimefrequency"); i++) {
      const now = moment().tz(this.settings.tryGet("timezone"));
      now.add(now.hours() + Math.floor(Math.random() * 23), "hours");
      now.minutes(Math.floor(Math.random() * 59));
      const text = util.padNumber(now.hours()) + util.padNumber(now.minutes());
      this.randomDankTimes.push(new DankTime(now.hours(), now.minutes(), [text],
        this.settings.tryGet("randomtimepoints")));
    }
    return this.randomDankTimes;
  }

  /**
   * Used by JSON.stringify. Returns a literal representation of this.
   */
  public toJSON(): BasicChat {
    return {
      dankTimes: this.dankTimes,
      id: this.myId,
      lastHour: this.myLastHour,
      lastMinute: this.myLastMinute,
      settings: this.settings.toJSON(),
      users: this.sortedUsers(),
    };
  }

  /**
   * Processes a message, awarding or punishing points etc. where applicable.
   * @returns A reply, or nothing if no reply is suitable/needed.
   */
  public processMessage(userId: number, userName: string, msgText: string, msgUnixTime: number): string {

    // Ignore the message if it was sent more than 1 minute ago.
    const now = moment().tz(this.settings.tryGet("timezone"));
    if (now.unix() - msgUnixTime >= 60) {
      return "";
    }
    msgText = util.cleanText(msgText);

    // If we are awaiting reset confirmation...
    if (this.awaitingResetConfirmation === userId) {
      this.awaitingResetConfirmation = -1;
      if (msgText.toUpperCase() === "YES") {
        const message = "Leaderboard has been reset!\n\n" + this.generateLeaderboard(true);
        this.users.forEach((user0) => user0.resetScore());
        return message;
      }
    }

    // If this chat isn't running, don't check anything else.
    if (!this.settings.tryGet("running")) {
      return "";
    }

    // Gather dank times from the sent text, returning if none was found.
    const dankTimesByText = this.getDankTimesByText(msgText);
    if (dankTimesByText.length < 1) {
      return "";
    }

    // Get the player, creating him if he doesn't exist yet.
    if (!this.users.has(userId)) {
      this.users.set(userId, new User(userId, userName));
    }
    const user = this.users.get(userId) as User;

    // Update user name if needed.
    if (user.name !== userName) {
      user.name = userName;
    }

    let subtractBy = 0;
    for (const dankTime of dankTimesByText) {
      if (now.hours() === dankTime.hour && now.minutes() === dankTime.minute) {

        // If cache needs resetting, do so and award DOUBLE points to the calling user.
        if (this.lastHour !== dankTime.hour || this.myLastMinute !== dankTime.minute) {
          this.users.forEach((user0) => user0.called = false);
          this.lastHour = dankTime.hour;
          this.lastMinute = dankTime.minute;
          user.addToScore(Math.round(dankTime.points * this.settings.tryGet("modifier")));
          user.called = true;
          if (this.settings.tryGet("firstnotifications")) {
            return user.name + " was the first to score!";
          }
        } else if (user.called) { // Else if user already called this time, remove points.
          user.addToScore(-dankTime.points);
        } else {  // Else, award point.
          user.addToScore(dankTime.points);
          user.called = true;
        }
        return "";
      } else if (dankTime.points > subtractBy) {
        subtractBy = dankTime.points;
      }
    }
    // If no match was found, punish the user.
    user.addToScore(-subtractBy);
    return "";
  }

  /**
   * Resets the scores of all the users.
   */
  public resetScores(): void {
    this.users.forEach((user) => user.resetScore());
  }

  /**
   * Removes the dank time with the specified hour and minute.
   * @returns Whether a dank time was found and removed.
   */
  public removeDankTime(hour: number, minute: number): boolean {
    const dankTime = this.getDankTime(hour, minute);
    if (dankTime) {
      this.dankTimes.splice(this.dankTimes.indexOf(dankTime));
      return true;
    }
    return false;
  }

  /**
   * Returns whether the leaderboard has changed since the last time this.generateLeaderboard(...) was generated.
   */
  public leaderboardChanged(): boolean {
    for (const user of this.users) {
      if (user[1].lastScoreChange !== 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates the leaderboard of this chat.
   * @param final If true, prints 'FINAL LEADERBOARD' instead of 'LEADERBOARD'.
   */
  public generateLeaderboard(final = false): string {

    // Construct string to return.
    const oldLeaderboard = this.myLastLeaderboard;
    this.myLastLeaderboard = new Leaderboard(Array.from(this.users.values()));
    let leaderboard = "<b>--- " + (final ? "FINAL " : "") + "LEADERBOARD ---</b>\n";
    leaderboard += this.myLastLeaderboard.toString(oldLeaderboard);

    // Reset last score change values of all users.
    const userIterator = this.users.values();
    let user = userIterator.next();
    while (!user.done) {
      user.value.resetLastScoreChange();
      user = userIterator.next();
    }
    return leaderboard;
  }

  /**
   * Gets the normal dank time that has the specified hour and minute.
   * @returns The dank time or null if none has the specified hour and minute.
   */
  public getDankTime(hour: number, minute: number): DankTime | null {
    for (const dankTime of this.dankTimes) {
      if (dankTime.hour === hour && dankTime.minute === minute) {
        return dankTime;
      }
    }
    return null;
  }

  public hardcoreModeCheck(timestamp: number) {
    if (this.settings.tryGet("hardcoremode")) {
      const day = 24 * 60 * 60;
      const punishBy = 10;
      this.users.forEach((user) => {
        if (timestamp - user.lastScoreTimestamp >= day && user.score - punishBy >= 0) {
          user.addToScore(-punishBy);
        }
      });
    }
  }

  /**
   * Gets both normal and random dank times that have the specified text.
   */
  private getDankTimesByText(text: string): DankTime[] {
    const found = [];
    for (const dankTime of this.dankTimes.concat(this.randomDankTimes)) {
      if (dankTime.hasText(text)) {
        found.push(dankTime);
      }
    }
    return found;
  }
}
