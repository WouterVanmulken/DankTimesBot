import { PluginEventArguments } from "../plugin-events/plugin-event-arguments";
import { PLUGIN_EVENT } from "../plugin-events/plugin-event-types";
import { UserScoreChangedPluginEventArguments } from "../plugin-events/event-arguments/user-score-changed-plugin-event-arguments";
import { PrePostMessagePluginEventArguments } from "../plugin-events/event-arguments/pre-post-message-plugin-event-arguments";
import { LeaderboardResetPluginEventArguments } from "../plugin-events/event-arguments/leaderboard-reset-plugin-event-arguments";
import { TimerTickPluginEventArguments } from "../plugin-events/event-arguments/timer-tick-plugin-event-arguments";

/**
 * Class defining the interface every plugin should adhere to.
 */
export abstract class AbstractPlugin 
{
  /**
   * Semantic identifier of this plugin. 
   */
  public Name: string;
  /**
   * Version of this plugin.
   */
  public Version: string;
  /**
   * Boolean indicating the status of this plugin.
   * Disabled plugins will not receive messages
   * from its Plugin Host.
   */
  public Enabled: boolean;
  /**
   * Internal plugin state.
   */
  protected Data: any;
  /**
   * Event triggers. Plugins can hook functions to certain Plugin Events.
   * These plugin events are defined in the PLUGIN_EVENT enumeration.
   */
  private pluginEventTriggers: Map<PLUGIN_EVENT, (data: any) => any>;

  /**
   * Create a new Plugin instance.
   * @param _name Semantic name of this plugin.
   * @param _version Version of this plugin.
   * @param _data Any optional data that might require to be stored
   *              for this plugin.
   */
  constructor(_name: string, _version: string, _data: any) 
  {
    this.Name = _name;
    this.Version = _version;
    this.Data = _data;
    this.pluginEventTriggers = new Map<PLUGIN_EVENT, (data: any) => any>();
  };

  /* Function overload list */
  protected subscribeToPluginEvent(_event: PLUGIN_EVENT.PLUGIN_EVENT_PRE_MESSAGE, _eventFn: (_data: PrePostMessagePluginEventArguments) => any): void;
  protected subscribeToPluginEvent(_event: PLUGIN_EVENT.PLUGIN_EVENT_POST_MESSAGE, _eventFn: (_data: PrePostMessagePluginEventArguments) => any): void;
  protected subscribeToPluginEvent(_event: PLUGIN_EVENT.PLUGIN_EVENT_USER_CHANGED_SCORE, _eventFn: (_data: UserScoreChangedPluginEventArguments) => any): void;
  protected subscribeToPluginEvent(_event: PLUGIN_EVENT.PLUGIN_EVENT_LEADERBOARD_RESET, _eventFn: (_data: LeaderboardResetPluginEventArguments) => any): void;
  protected subscribeToPluginEvent(_event: PLUGIN_EVENT.PLUGIN_EVENT_TIMER_TICK, _eventFn: (_data: TimerTickPluginEventArguments) => any): void;
  /**
   * Subscribe to a certain PLUGIN_EVENT.
   * @param _event Plugin event to describe to.
   * @param _eventFn Function to execute when a certain event is triggered.
   */
  protected subscribeToPluginEvent(_event: PLUGIN_EVENT, _eventFn: (_data: any) => any): void
  {
    this.pluginEventTriggers.set(_event, _eventFn);
  }

  /**
   * Trigger a certain PLUGIN_EVENT on this plugin.
   * @param _event PLUGIN_EVENT to trigger.
   */
  public Trigger(_event: PLUGIN_EVENT, _data: PluginEventArguments): string
  {
    let output: string = "";

    if (!this.Enabled) return output;

    if (this.pluginEventTriggers.has(_event))
    {
      output = (<(data: any) => any>this.pluginEventTriggers.get(_event))(_data);
    }

    return output;
  }
}