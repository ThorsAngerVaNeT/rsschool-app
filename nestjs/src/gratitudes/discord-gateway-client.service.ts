import { Injectable } from '@nestjs/common';
import { WebSocket, type Data } from 'ws';
import {
  GatewayOpcodes,
  GatewayDispatchEvents,
  GatewayReceivePayload,
  GatewayGuildCreateDispatchData,
} from 'discord-api-types/v10';
import { Payloads } from './discord-gateway-payloads';
import { EventEmitter } from 'events';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

@Injectable()
export class DiscordGatewayClientService {
  public client: WebSocket;

  private readonly baseUrl = 'wss://gateway.discord.gg';

  private version = 10;

  private format = 'json';

  private currentUrl = this.baseUrl;

  private token = process.env.DISCORD_BOT_TOKEN;

  private interval: NodeJS.Timer;

  private sessionId: string;

  private seq: number;

  private unavailableGuildsCount = 0;

  private guilds: Map<string, GatewayGuildCreateDispatchData> = new Map();

  private clientEmitter = new EventEmitter();

  public init(): Promise<void> {
    return new Promise((resolve): void => {
      if (!this.token) {
        throw new Error('Specify DISCORD_BOT_TOKEN environment variable');
      }

      const { token } = this;

      if (this.client && this.client.readyState !== 3) {
        this.client.close();
      }

      this.client = new WebSocket(`${this.baseUrl}?v=${this.version}&encoding=${this.format}`);

      this.client.on('open', () => {
        if (this.currentUrl !== this.baseUrl) {
          this.client.send(Payloads[GatewayOpcodes.Resume](token, this.sessionId, this.seq));
        }

        this.client.on('message', (data: Data) => {
          const message = this.unpackMessage(data);
          if (!message) {
            return;
          }

          const { op, d, t, s } = message;

          switch (op) {
            case GatewayOpcodes.Hello:
              this.setHeartbeat(d.heartbeat_interval);
              if (this.currentUrl === this.baseUrl) {
                this.client.send(Payloads[GatewayOpcodes.Identify](token));
              }
              break;

            case GatewayOpcodes.Dispatch:
              this.seq = s;
              break;
          }

          switch (t) {
            case GatewayDispatchEvents.Ready:
              this.currentUrl = d.resume_gateway_url;
              this.sessionId = d.session_id;
              this.unavailableGuildsCount = d.guilds.length;
              break;

            case GatewayDispatchEvents.GuildCreate:
              this.guilds.set(d.id, d);
              if (this.unavailableGuildsCount === this.guilds.size) {
                this.clientEmitter.emit(`guildsPopulated`);
              }
              break;

            default:
              break;
          }
        });

        this.client.on('close', () => {
          setTimeout(() => this.init(), 5000);
        });

        this.client.on('terminate', () => {
          clearInterval(this.interval);
        });
      });
      resolve();
    });
  }

  private unpackMessage(data: Data): GatewayReceivePayload | null {
    try {
      return JSON.parse(data as string) as GatewayReceivePayload;
    } catch {
      return null;
    }
  }

  private setHeartbeat(ms: number): void {
    this.interval = setInterval(() => {
      this.client.send(Payloads[GatewayOpcodes.Heartbeat]());
    }, ms);
  }

  public async getGuilds() {
    return this.guilds.size && this.guilds.size === this.unavailableGuildsCount
      ? Object.fromEntries(this.guilds)
      : new Promise(resolve => {
          this.clientEmitter.once('guildsPopulated', () => {
            resolve(Object.fromEntries(this.guilds));
          });
        });
  }
}
