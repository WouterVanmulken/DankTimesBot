import { Chat } from "../chat/chat";
import { ChatSettingTemplate } from "./chat-setting-template";
import { Validation } from "./validation";

/** Describes a setting of a chat, based on a setting template. */
export class ChatSetting<T> {

  /** This setting's value for a chat. */
  private myValue: T;

  /**
   * Constructs a new setting based on a template and with the supplied value.
   * @param forChat The chat this setting is for.
   * @param template The template to base this on.
   * @param value A starting value, or the template's default value if undefined.
   * @throws Error if the starting value fails coercion (if it's a string) or validation.
   */
  constructor(private readonly forChat: Chat, public readonly template: ChatSettingTemplate<T>, value?: T | string) {
    if (value !== undefined) {
      if (typeof value === "string") {
        const coerced = this.template.coercer(value);
        if (coerced === undefined) {
          throw new Error(`This setting requires a value of type '${typeof this.myValue}'!`);
        }
        this.value = coerced;
      } else {
        this.value = value;
      }
    } else {
      this.myValue = this.template.defaultValue;
    }
  }

  /**
   * Does the same as the setter below, but with two differences:
   * - It takes a string parameter and attempts to parse this to this setting's type using the template's coercer;
   * - Instead of throwing an Error if the new value is invalid, it simply returns the Validation object.
   */
  public trySetFromString(value: string): Validation {
    const coerced = this.template.coercer(value);
    if (coerced === undefined) {
      return { success: false, message: `This setting requires a value of type '${typeof this.myValue}'!` };
    }
    const validation = this.template.validator(coerced, this.myValue);
    if (validation.success) {
      this.myValue = coerced;
    }
    if (this.template.consequence) {
      this.template.consequence(this.myValue, this.forChat);
    }
    return validation;
  }

  /**
   * Sets this setting's value.
   * @throws Error if the new value failed validation.
   */
  public set value(value: T) {
    const validation = this.template.validator(value, this.myValue);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    this.myValue = value;
    if (this.template.consequence) {
      this.template.consequence(this.myValue, this.forChat);
    }
  }

  /**
   * Gets this setting's value.
   */
  public get value(): T {
    return this.myValue;
  }
}
