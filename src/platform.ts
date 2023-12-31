/* Copyright(C) 2017-2023, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * protect-platform.ts: homebridge-cloudflared-tunnel platform class.
 */
import { API, DynamicPlatformPlugin, Logging, PlatformAccessory } from 'homebridge';
import { CloudflaredTunnelPlatformConfig } from './settings.js';
import { startTunnel, startTunnelAuto, Tunnel, TunnelOptions } from 'ctun';
import { setTimeout } from 'timers/promises';

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

  constructor(log: Logging, config: CloudflaredTunnelPlatformConfig, api: API) {
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
      url: config.url as string,
      port: config.port as number,
      hostname: config.hostname as string,
      protocol: config.protocol as 'http' | 'https' | undefined, // Updated type
      verifyTLS: config.verifyTLS as boolean,
      logging: config.logging as string,
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
    if (!this.config.url && !this.config.hostname) {
      throw new Error('Missing required config: url');
    }
    if (!this.config.port && !this.config.hostname && !this.config.url && !this.config.protocol && !this.config.url) {
      throw new Error('Missing one of the following configs: port, hostname, url, protocol, please check your config.json');
    }
    if (this.config.url && this.config.hostname) {
      // this.debugLog(`URL: ${this.config.url}`);
      //this.debugLog(`Hostname: ${this.config.hostname}`);
      throw new Error('Cannot have both url and hostname in config. Please remove one.');
    }
    if (!this.config.logging) {
      this.config.logging = 'standard';
    }
    if (!this.config.hostname) {
      this.config.hostname = 'localhost';
    }
    if (!this.config.port) {
      this.config.port = 8581;
    }
    if (!this.config.protocol) {
      this.config.protocol = 'http';
    }
    if (!this.config.verifyTLS) {
      this.config.verifyTLS = false;
    }
    if (!this.config.startTunnelAuto) {
      this.config.startTunnelAuto = false;
    }
  }

  async createTunnel() {
    this.log.info(JSON.stringify(this.config));
    //The local server URL to tunnel.
    const options: TunnelOptions = {
      url: this.config.url,
      port: this.config.port,
      hostname: this.config.hostname,
      protocol: this.config.protocol,
      verifyTLS: this.config.verifyTLS,
    };
    this.log.warn(`Starting Tunnel with Options: ${JSON.stringify(options)}`);
    let tunnel: Tunnel | undefined;
    if (this.config.startTunnelAuto) {
      this.log.info('Starting Tunnel in Auto Install Mode');
      tunnel = await startTunnelAuto(options);
    } else {
      this.log.info('Starting Tunnel in Manual Install Mode');
      tunnel = await startTunnel(options);
    }
    this.log.info('Waiting 5 minute for tunnel to install and start');
    await setTimeout(300000); // 5 minute in milliseconds
    this.log.info(`Tunnel URL: ${JSON.stringify(tunnel?.getURL())}`);
  }

  /*logs() {
    this.debugMode = process.argv.includes('-D') || process.argv.includes('--debug');
    if (this.config?.logging === 'debug' || this.config?.logging === 'standard' || this.config?.logging === 'none') {
      this.platformLogging = this.config!.logging;
      this.debugWarnLog(`Using Config Logging: ${this.platformLogging}`);
    } else if (this.debugMode) {
      this.platformLogging = 'debugMode';
      this.debugWarnLog(`Using ${this.platformLogging} Logging`);
    } else {
      this.platformLogging = 'standard';
      this.debugWarnLog(`Using ${this.platformLogging} Logging`);
    }
  }

  /**
   * If device level logging is turned on, log to log.warn
   * Otherwise send debug logs to log.debug
   */
  /* infoLog(...log: any[]): void {
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
   }*/
}