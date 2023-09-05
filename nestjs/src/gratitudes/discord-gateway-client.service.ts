import { Injectable } from '@nestjs/common';
import { WebSocket, type Data } from 'ws';
import {
  GatewayOpcodes,
  GatewayDispatchEvents,
  GatewayReceivePayload,
  GatewayGuildCreateDispatchData,
  APIGuildMember,
  APIUser,
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

  private initialized = false;

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
                this.initialized = true;
                resolve();
              }
              break;

            case GatewayDispatchEvents.GuildMembersChunk:
              this.clientEmitter.emit(`guildMembers-${d.guild_id}`, d.members);
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
    return Object.fromEntries(this.guilds);
  }

  private fetchMembers(guildId: string) {
    this.client.send(Payloads[GatewayOpcodes.RequestGuildMembers](guildId));
  }

  public async getMembers() {
    if (!this.initialized) {
      await this.init();
    }
    const guildsIds = Array.from(this.guilds.keys());
    console.log('guildsIds: ', guildsIds);
    const promises = guildsIds.map(
      id =>
        new Promise((resolve: (value: APIGuildMember[]) => void) => {
          console.log('id: ', id);
          this.fetchMembers(id);
          this.clientEmitter.once(`guildMembers-${id}`, resolve);
        }),
    );

    const guildsMembers = await Promise.all(promises);
    const result = guildsMembers.reduce((accumulator, members, index) => {
      const guildId = `${guildsIds[index]}`;
      accumulator[guildId] = members;
      return accumulator;
    }, {} as Record<string, APIGuildMember[]>);

    return result;
  }

  public async getActivists() {
    const guildsMembers = await this.getMembers();
    const guildsRoles = Array.from(this.guilds.values()).reduce((accumulator, guild) => {
      const roleId = guild.roles.find(role => role.name.includes('activist'))?.id;
      if (roleId) {
        accumulator.set(guild.id, roleId);
      }
      return accumulator;
    }, new Map<string, string>());

    const activists = Object.entries(guildsMembers).reduce((accumulator, [guildId, members]) => {
      const roleId = guildsRoles.get(guildId);
      if (roleId) {
        members
          .filter(member => member.roles.includes(roleId))
          .map(({ user }) => user)
          .filter(Boolean)
          .forEach(user => {
            if (!accumulator[user.id]) {
              accumulator[user.id] = user;
            }
          });
      }

      return accumulator;
    }, {} as Record<string, APIUser>);

    return activists;
  }
}
