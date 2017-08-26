import { CronJob } from "cron";
import * as moment from "moment-timezone";
import nodeCleanup = require("node-cleanup");
import { ChatRegistry } from "./chat/chat-registry";
import { DankTimeScheduler } from "./dank-time-scheduler/dank-time-scheduler";
import { TelegramBotCommand } from "./telegram-bot-command/telegram-bot-command";
import { TelegramBotCommands } from "./telegram-bot-command/telegram-bot-commands";
import { TelegramClientImpl } from "./telegram-client/telegram-client-impl";
import * as fileIO from "./util/file-io";

// Global variables.
const config = fileIO.loadConfigFromFile();
const chatRegistry = new ChatRegistry(fileIO.loadChatsFromFile());
const releaseLog = fileIO.loadReleaseLogFromFile();
const tgClient = new TelegramClientImpl();
tgClient.initialize(config.apiKey);
const scheduler = new DankTimeScheduler(tgClient);
const commands = new TelegramBotCommands(tgClient, chatRegistry, scheduler, releaseLog, "1.3.0");

// Register available Telegram bot commands, after retrieving the bot name.
tgClient.retrieveBotName().then(() => {
  tgClient.registerCommand(new TelegramBotCommand("addtime",
    "adds a dank time. format: [hour] [minute] [points] [text1] [text2] etc.",
    commands, commands.addTime, true));
  tgClient.registerCommand(new TelegramBotCommand("danktimes", "shows the user-specified dank times",
    commands, commands.dankTimes));
  tgClient.registerCommand(new TelegramBotCommand("help", "shows the available commands",
    commands, commands.help));
  tgClient.registerCommand(new TelegramBotCommand("leaderboard", "shows the leaderboard",
    commands, commands.leaderBoard));
  tgClient.registerCommand(new TelegramBotCommand("releases", "shows the release log",
    commands, commands.getReleaseLog));
  tgClient.registerCommand(new TelegramBotCommand("removetime", "removes a dank time. format: [hour] [minute]",
    commands, commands.removeTime, true));
  tgClient.registerCommand(new TelegramBotCommand("reset", "resets the scores",
    commands, commands.resetChat, true, true));
  tgClient.registerCommand(new TelegramBotCommand("set", "sets the value of a setting",
    commands, commands.set));
  tgClient.registerCommand(new TelegramBotCommand("settings", "shows the current settings",
    commands, commands.chatSettings));
  tgClient.setOnAnyText((msg) => {
    if (msg.migrate_to_chat_id) {
      // If the chat was migrated, then update the registry.
      chatRegistry.setChatId(msg.chat.id, msg.migrate_to_chat_id);
    } else if (msg.text) {
      // Else, just let the appropriate chat process the message.
      return chatRegistry.getOrCreateChat(msg.chat.id)
        .processMessage(msg.from.id, msg.from.username || "anonymous", msg.text, msg.date);
    }
    return "";
  });
});

// Schedule to persist chats map to file every X minutes.
setInterval(() => {
  fileIO.saveChatsToFile(chatRegistry.chats);
  console.info("Persisted data to file.");
}, config.persistenceRate * 60 * 1000);

// Schedule to persist chats map to file on program exit.
nodeCleanup((exitCode, signal) => {
  console.info("Persisting data to file before exiting...");
  fileIO.saveChatsToFile(chatRegistry.chats);
  return true;
});

// Generate new random dank times and chedule everything.
chatRegistry.chats.forEach((chat) => {
  chat.generateRandomDankTimes();
  scheduler.scheduleAllOfChat(chat);
});

// Generates random dank times daily for all chats and schedules notifications for them at every 00:00:00.
// Also, punishes players that have not scored in the past 24 hours.
const dailyUpdate = new CronJob("0 0 0 * * *", () => {
  console.info("Generating random dank times for all chats and punishing"
    + " users that haven't scored in the past 24 hours!");
  const now = moment().unix();
  chatRegistry.chats.forEach((chat) => {
    if (chat.settings.tryGet("running")) {

      // Unschedule
      scheduler.unscheduleRandomDankTimesOfChat(chat);
      scheduler.unscheduleAutoLeaderboardsOfChat(chat);

      // Generate random dank times
      chat.generateRandomDankTimes();

      // Reschedule
      scheduler.scheduleRandomDankTimesOfChat(chat);
      scheduler.scheduleAutoLeaderboardsOfChat(chat);

      // Your punishment must be more severe!
      chat.hardcoreModeCheck(now);
    }
  });
}, undefined, true);

// Send a release log message to all chats, assuming there are release logs.
if (config.sendWhatsNewMsg && releaseLog.length > 0) {

  // Prepare message.
  let message = `<b>--- What's new in version ${releaseLog[0].version} ? ---</b>\n\n`;
  releaseLog[0].changes.forEach((change) => {
    message += `- ${change}\n`;
  });

  // Send it to all chats.
  chatRegistry.chats.forEach((chat) => {
    tgClient.sendMessage(chat.id, message);
  });

  // Update config so the what's new message is not sent on subsequent bot startups.
  config.sendWhatsNewMsg = false;
  fileIO.saveConfigToFile(config);
}

// Inform server.
console.info("Bot is now running!");
