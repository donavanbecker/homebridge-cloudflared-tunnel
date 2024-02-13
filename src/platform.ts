/* Copyright(C) 2023-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * platform.ts: homebridge-cloudflared-tunnel.
 */
import { API, DynamicPlatformPlugin, HAP, Logging, PlatformAccessory } from 'homebridge';
import { startTunnel, TunnelOptions } from 'untun';
import { readFileSync } from 'fs';

import { CloudflaredTunnelPlatformConfig } from './settings.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class CloudflaredTunnelPlatform implements DynamicPlatformPlugin {
  public accessories: PlatformAccessory[];
  public readonly api: API;
  public readonly log: Logging;
  protected readonly hap: HAP;
  public config!: CloudflaredTunnelPlatformConfig;

  platformConfig!: CloudflaredTunnelPlatformConfig;
  platformLogging!: CloudflaredTunnelPlatformConfig['logging'];
  debugMode!: boolean;

  constructor(
    log: Logging,
    config: CloudflaredTunnelPlatformConfig,
    api: API,
  ) {
    this.accessories = [];
    this.api = api;
    this.hap = this.api.hap;
    this.log = log;
    // only load if configured
    if (!config) {
      return;
    }

    // Plugin options into our config variables.
    this.config = {
      platform: 'CloudflaredTunnel',
      name: config.name as string,
      url: config.url as string,
      port: config.port as number,
      hostname: config.hostname as string,
      protocol: config.protocol as 'http' | 'https' | undefined,
      verifyTLS: config.verifyTLS as boolean,
      logging: config.logging as string,
      acceptCloudflareNotice: config.acceptCloudflareNotice as boolean,
    };
    this.platformConfigOptions();
    this.platformLogs();
    this.debugLog(`Finished initializing platform: ${config.name}`);

    // verify the config
    (async () => {
      try {
        await this.verifyConfig();
        this.debugLog('Config OK');
      } catch (e: any) {
        this.errorLog(`Verify Config, Error Message: ${e.message}, Submit Bugs Here: https://bit.ly/homebridge-cloudflared-tunnel-bug-report`);
        this.debugErrorLog(`Verify Config, Error: ${e}`);
        return;
      }
    })();

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      try {
        await this.createTunnel();
      } catch (e: any) {
        this.errorLog(`Failed to Start Tunnel, Error Message: ${JSON.stringify(e.message)}`);
        this.debugErrorLog(JSON.stringify(e));
      }
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    //this.infoLog(`Loading accessory from cache: ${accessory.displayName}`);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Verify the config passed to the plugin is valid
   */
  async verifyConfig() {
    if (!this.config.url && (!this.config.protocol && !this.config.hostname && !this.config.port)) {
      throw new Error('Missing required config: url or {protocol}://{hostname}:{port}, please check your config.json');
    }
    if (this.config.url && this.config.hostname) {
      throw new Error('Cannot have both url and hostname in config. Please remove one.');
    }
    if (!this.config.logging) {
      this.config.logging = 'standard';
    }
    if (!this.config.acceptCloudflareNotice) {
      this.config.acceptCloudflareNotice = false;
    }
  }

  async createTunnel() {
    this.debugLog(JSON.stringify(this.config));
    //The local server URL to tunnel.
    const options: TunnelOptions = {
      url: this.config.url,
      protocol: this.config.protocol,
      hostname: this.config.hostname,
      port: this.config.port,
      verifyTLS: this.config.verifyTLS,
      acceptCloudflareNotice: this.config.acceptCloudflareNotice,
    };
    this.debugWarnLog(`Starting Tunnel with Options: ${JSON.stringify(options)}`);
    const autoTunnel = await startTunnel(options);
    if (autoTunnel) {
      const tunnelURL = await autoTunnel.getURL();
      this.infoLog(`Tunnel URL: ${JSON.stringify(tunnelURL)}`);
    }
  }

  async platformConfigOptions() {
    const platformConfig: CloudflaredTunnelPlatformConfig = {
      platform: '',
    };
    if (this.config.logging) {
      platformConfig.logging = this.config.logging;
    }
    if (this.config.refreshRate) {
      platformConfig.refreshRate = this.config.refreshRate;
    }
    if (Object.entries(platformConfig).length !== 0) {
      this.debugLog(`Platform Config: ${JSON.stringify(platformConfig)}`);
    }
    this.platformConfig = platformConfig;
  }

  async platformLogs() {
    this.debugMode = process.argv.includes('-D') || process.argv.includes('--debug');
    this.platformLogging = this.config.options?.logging ?? 'standard';
    if (this.config.options?.logging === 'debug' || this.config.options?.logging === 'standard' || this.config.options?.logging === 'none') {
      this.platformLogging = this.config.options.logging;
      if (this.platformLogging?.includes('debug')) {
        this.debugWarnLog(`Using Config Logging: ${this.platformLogging}`);
      }
    } else if (this.debugMode) {
      this.platformLogging = 'debugMode';
      if (this.platformLogging?.includes('debug')) {
        this.debugWarnLog(`Using ${this.platformLogging} Logging`);
      }
    } else {
      this.platformLogging = 'standard';
      if (this.platformLogging?.includes('debug')) {
        this.debugWarnLog(`Using ${this.platformLogging} Logging`);
      }
    }
    if (this.debugMode) {
      this.platformLogging = 'debugMode';
    }
  }

  async getVersion() {
    const json = JSON.parse(
      readFileSync(
        new URL('../package.json', import.meta.url),
        'utf-8',
      ),
    );
    this.debugLog(`Plugin Version: ${json.version}`);
    return json.version;
  }

  /**
   * If device level logging is turned on, log to log.warn
   * Otherwise send debug logs to log.debug
   */
  infoLog(...log: any[]): void {
    if (this.enablingPlatfromLogging()) {
      this.log.info(String(...log));
    }
  }

  warnLog(...log: any[]): void {
    if (this.enablingPlatfromLogging()) {
      this.log.warn(String(...log));
    }
  }

  debugWarnLog(...log: any[]): void {
    if (this.enablingPlatfromLogging()) {
      if (this.platformLogging?.includes('debug')) {
        this.log.warn('[DEBUG]', String(...log));
      }
    }
  }

  errorLog(...log: any[]): void {
    if (this.enablingPlatfromLogging()) {
      this.log.error(String(...log));
    }
  }

  debugErrorLog(...log: any[]): void {
    if (this.enablingPlatfromLogging()) {
      if (this.platformLogging?.includes('debug')) {
        this.log.error('[DEBUG]', String(...log));
      }
    }
  }

  debugLog(...log: any[]): void {
    if (this.enablingPlatfromLogging()) {
      if (this.platformLogging === 'debugMode') {
        this.log.debug(String(...log));
      } else if (this.platformLogging === 'debug') {
        this.log.info('[DEBUG]', String(...log));
      }
    }
  }

  enablingPlatfromLogging(): boolean {
    return this.platformLogging?.includes('debug') || this.platformLogging === 'standard';
  }
}