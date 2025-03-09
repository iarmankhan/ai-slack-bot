import { tool } from "ai";
import { listChannels } from "../slack-utils";
import { z } from "zod";

export const listChannelsTool = (updateStatus?: (status: string) => void) =>
  tool({
    description:
      "List Slack channels, optionally filtered by name. Use this when you need to find a channel ID or verify a channel exists.",
    parameters: z.object({
      nameFilter: z
        .string()
        .optional()
        .describe("Optional name filter to search for specific channels"),
    }),
    execute: async ({ nameFilter }) => {
      updateStatus?.(
        `is listing channels${nameFilter ? ` matching "${nameFilter}"` : ""}...`
      );
      const channels = await listChannels(nameFilter);
      return {
        channels: channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          is_private: channel.is_private,
        })),
        total: channels.length,
      };
    },
  });
