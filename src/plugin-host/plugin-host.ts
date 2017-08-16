import { AbstractPlugin } from "./plugin/plugin";

/**
 * Class exposing the Plugin Host concept.
 * Plugins are managed by a Plugin Host, which controls
 * messaging to, from and between plugins. It also
 * keeps track of the general state of a plugin.
 */
export class PluginHost
{
  /**
   * Collection of plugins currently running.
   */
  public readonly Plugins: AbstractPlugin[];

  /**
   * Create a new Plugin Host.
   * The Plugin Host will not by itself try and
   * find compatible plugins. Instead, it requests
   * a list of plugins to be provided.
   * @param _plugins List of plugins this PluginHost should manage.
   */
  constructor(_plugins: AbstractPlugin[]) 
  {
    this.Plugins = _plugins;
    //TODO: Track this shit
    this.Plugins.forEach(plugin => plugin.Enabled = true);
  }

  /**
   * Handle external text input. Return zero or more messages.
   * @param _input Text input.
   */
  public HandleInput(_input: string): string[]
  {
    return (<string[]>[])
      .concat(this.processPreHooks(_input))
      .concat(this.processPostHooks(_input));
  }

  // Process pre-messaging.
  processPreHooks(_input: string): string[]
  {
    return this.Plugins.map(plugin => (plugin.Enabled) ? plugin.PreMessageProcess(_input) : "").filter(output => !!output);
  }

  // Process post-messaging
  processPostHooks(_input: string): string[]
  {
    return this.Plugins.map(plugin => (plugin.Enabled) ? plugin.PostMessageProcess(_input) : "").filter(output => !!output);
  }
}