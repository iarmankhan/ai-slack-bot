import { tool } from "ai";
import { z } from "zod";
import { getChannelMessages } from "../slack-utils";

export const getChannelMessagesTool = (
  updateStatus?: (status: string) => void
) =>
  tool({
    description:
      "Get messages from a channel by channel ID. Optionally specify a limit to the number of messages returned. Use this when you need to get a list of messages from a channel.",
    parameters: z.object({
      channelId: z.string(),
      limit: z.number().optional().default(50),
    }),
    execute: async ({ channelId, limit = 50 }) => {
      updateStatus?.(`Getting ${limit} messages from channel ${channelId}`);

      const messages = await getChannelMessages(channelId, limit);
      return messages?.map((message) => {
        return {
          content: message.text,
          user: message.user,
        };
      });
    },
  });
