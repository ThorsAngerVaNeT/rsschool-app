import { GatewayOpcodes, GatewayIntentBits } from 'discord-api-types/v10';

export const Payloads = {
  [GatewayOpcodes.Heartbeat]() {
    return JSON.stringify({
      op: GatewayOpcodes.Heartbeat,
      d: null,
    });
  },
  [GatewayOpcodes.Identify](token: string) {
    return JSON.stringify({
      op: GatewayOpcodes.Identify,
      d: {
        token,
        properties: {
          os: 'linux',
          browser: 'discord',
          device: 'discord',
        },
        compress: false,
        intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMembers,
      },
    });
  },
  [GatewayOpcodes.RequestGuildMembers](guild_id: string, query = '', limit = 0) {
    return JSON.stringify({
      op: GatewayOpcodes.RequestGuildMembers,
      d: {
        guild_id,
        query,
        limit,
      },
    });
  },
  [GatewayOpcodes.Resume](token: string, sessionId: string, seq: number) {
    return JSON.stringify({
      op: GatewayOpcodes.Resume,
      d: {
        token,
        sessionId,
        seq,
      },
    });
  },
} as const;
