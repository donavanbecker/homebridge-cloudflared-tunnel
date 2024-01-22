/* Copyright(C) 2017-2023, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * protect-platform.ts: homebridge-cloudflared-tunnel platform class.
 */
import { API, DynamicPlatformPlugin, Logging, PlatformAccessory } from 'homebridge';
import { CloudflaredTunnelPlatformConfig } from './settings.js';
import { startTunnel, TunnelOptions } from 'untun';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class CloudflaredTunnelPlatform implements DynamicPlatformPlugin {
  public accessories: PlatformAccessory[];
  public readonly api: API;
  public readonly log: Logging;

  version = process.env.npm_package_version || '1.0.0';
  Logging?: string;
  debugMode!: boolean;
  platformLogging?: string;
  config!: CloudflaredTunnelPlatformConfig;

  constructor(
    log: Logging,
    config: CloudflaredTunnelPlatformConfig,
    api: API,
  ) {
    // this.logs();
    //this.debugLog(`Finished initializing platform: ${config.name}`);

    this.accessories = [];
    this.api = api;
    this.log = log;
    // only load if configured
    if (!config) {
      return;
    }

    // Plugin options into our config variables.
    this.config = {
      platform: 'CloudflaredTunnelPlatform',
      name: config.name as string,
      url: config.url as string,
      port: config.port as number,
      hostname: config.hostname as string,
      protocol: config.protocol as 'http' | 'https' | undefined, // Updated type
      verifyTLS: config.verifyTLS as boolean,
      logging: config.logging as string,
      acceptCloudflareNotice: config.acceptCloudflareNotice as boolean,
    };


    // verify the config
    (async () => {
      try {
        await this.verifyConfig();
        //this.debugLog('Config OK');
      } catch (e: any) {
        //this.errorLog(JSON.stringify(e.message));
        //this.debugLog(JSON.stringify(e));
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
        //this.log.info(`Tunnel Status: ${JSON.stringify(tunnel?.close())}`);
      } catch (e: any) {
        this.log.error('Failed to Start Tunnel');
        //this.errorLog(`Failed to Discover Devices ${JSON.stringify(e.message)}`);
        //this.debugLog(JSON.stringify(e));
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
    this.log.info(JSON.stringify(this.config));
    //The local server URL to tunnel.
    const options: TunnelOptions = {
      url: this.config.url,
      protocol: this.config.protocol,
      hostname: this.config.hostname,
      port: this.config.port,
      verifyTLS: this.config.verifyTLS,
      acceptCloudflareNotice: this.config.acceptCloudflareNotice,
    };
    this.log.warn(`Starting Tunnel with Options: ${JSON.stringify(options)}`);
    const autoTunnel = await startTunnel(options);
    //this.log.info(`Tunnel Status: ${JSON.stringify(autoTunnel?.close())}`);
    this.log.info(`Tunnel URL: ${JSON.stringify(autoTunnel?.getURL())}`);
    if (autoTunnel) {
      const tunnelURL = await autoTunnel.getURL();
      this.log.info(`Tunnel URL: ${JSON.stringify(tunnelURL)}`);
    }
  }
}