/* Copyright(C) 2017-2023, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * index.ts: homebridge-cloudflared-tunnel plugin registration.
 */
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { API } from 'homebridge';
import { CloudflaredTunnelPlatform } from './platform.js';

// Register our platform with homebridge.
export default (api: API): void => {

  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, CloudflaredTunnelPlatform);
};