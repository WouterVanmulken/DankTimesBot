import { assert } from "chai";
import "mocha";
import { Chat } from "../chat/chat";
import { ChatSetting } from "./chat-setting";
import { ChatSettingTemplate } from "./chat-setting-template";
import { ChatSettingTemplates } from "./chat-setting-templates";
import { ChatSettings } from "./chat-settings";
import * as coercers from "./coercers";
import { Validation } from "./validation";

function testValidator(newValue: number, oldValue: number): Validation {
  if (newValue > 6) {
    return { success: true, message: "successMessage" };
  }
  return { success: false, message: "errorMessage" };
}

const settingName = "newsetting";
const templates = [new ChatSettingTemplate(settingName, "newdescription", 10, coercers.toWholeNumber, testValidator)];

describe("ChatSettings.constructor", () => {

  const chat = new Chat(0);

  it("Should instantiate an instance with default values if no literal supplied.", () => {
    const settings = new ChatSettings(chat, templates);
    let newsetting = settings.settings.get(settingName);
    assert.isFalse(newsetting === undefined);
    newsetting = newsetting as ChatSetting<any>;
    assert.equal(newsetting.value, templates[0].defaultValue);
  });

  it("Should instantiate an instance with default values if empty literal supplied.", () => {
    const settings = new ChatSettings(chat, templates, {});
    let newsetting = settings.settings.get(settingName);
    assert.isFalse(newsetting === undefined);
    newsetting = newsetting as ChatSetting<any>;
    assert.equal(newsetting.value, templates[0].defaultValue);
  });

  it("Should instantiate an instance with the values in the literal", () => {
    const settings = new ChatSettings(chat, templates, { newsetting: 20 });
    let newsetting = settings.settings.get(settingName);
    assert.isFalse(newsetting === undefined);
    newsetting = newsetting as ChatSetting<any>;
    assert.equal(newsetting.value, 20);
  });

  it("Should instantiate an instance with default values if the literal values are invalid", () => {
    const settings = new ChatSettings(chat, templates, { newsetting: "twenty" });
    let newsetting = settings.settings.get(settingName);
    assert.isFalse(newsetting === undefined);
    newsetting = newsetting as ChatSetting<any>;
    assert.equal(newsetting.value, templates[0].defaultValue);
  });
});

describe("ChatSettings.trySet", () => {

  const chat = new Chat(0);

  it("Should fail if the setting is unknown.", () => {
    const settings = new ChatSettings(chat, templates);
    const validation = settings.trySetFromString("randomgibberish", "20");
    assert.isFalse(validation.success);
    assert.equal((settings.settings.get(settingName) as ChatSetting<any>).value, templates[0].defaultValue);
  });

  it("Should fail if the type of the setting does not equal the supplied value's type", () => {
    const settings = new ChatSettings(chat, templates);
    const validation = settings.trySetFromString(settingName, "twenty");
    assert.isFalse(validation.success);
    assert.equal((settings.settings.get(settingName) as ChatSetting<any>).value, templates[0].defaultValue);
  });

  it("Should fail if the setting is supplied an invalid value", () => {
    const settings = new ChatSettings(chat, templates);
    const validation = settings.trySetFromString(settingName, "5");
    assert.isFalse(validation.success);
    assert.equal((settings.settings.get(settingName) as ChatSetting<any>).value, templates[0].defaultValue);
  });

  it("Should succeed if the setting is found and the supplied value is wholly valid", () => {
    const settings = new ChatSettings(chat, templates);
    const validation = settings.trySetFromString(settingName, "8");
    assert.isTrue(validation.success);
    assert.equal((settings.settings.get(settingName) as ChatSetting<any>).value, 8);
  });
});

describe("ChatSettings.toJSON", () => {

  const chat = new Chat(0);

  it("Should correctly print all .", () => {
    const settings = new ChatSettings(chat, templates);
    const obj = settings.toJSON();
    assert.isTrue(obj[settingName] !== undefined);
    assert.equal(obj[settingName], (settings.settings.get(settingName) as ChatSetting<any>).value);
  });
});
