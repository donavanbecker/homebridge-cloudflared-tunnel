import { PlatformConfig } from 'homebridge';
/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'CloudflaredTunnel';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-cloudflared-tunnel';

//Config
export interface CloudflaredTunnelPlatformConfig extends PlatformConfig {
  url?: string;
  port?: number;
  hostname?: string;
  protocol?: string;
  verifyTLS?: boolean;
  logging?: string;
}
