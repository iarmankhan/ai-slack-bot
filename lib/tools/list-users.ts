import { tool } from "ai";
import { listUsers } from "../slack-utils";
import { z } from "zod";

export const listUsersTool = (updateStatus?: (status: string) => void) =>
  tool({
    description:
      "List Slack users, optionally filtered by name. Use this when you need to find a user ID or verify a user exists.",
    parameters: z.object({
      nameFilter: z
        .string()
        .optional()
        .describe("Optional name filter to search for specific users"),
    }),
    execute: async ({ nameFilter }) => {
      updateStatus?.(
        `is listing users${nameFilter ? ` matching "${nameFilter}"` : ""}...`
      );

      const users = await listUsers(nameFilter);

      return {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          real_name: user.real_name,
          is_bot: user.is_bot,
        })),
        total: users.length,
      };
    },
  });
