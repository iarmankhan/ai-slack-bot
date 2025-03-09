import { WebClient } from "@slack/web-api";
import { CoreMessage } from "ai";
import crypto from "crypto";

const signingSecret = process.env.SLACK_SIGNING_SECRET!;

export const client = new WebClient(process.env.SLACK_BOT_TOKEN);

// See https://api.slack.com/authentication/verifying-requests-from-slack
export async function isValidSlackRequest({
  request,
  rawBody,
}: {
  request: Request;
  rawBody: string;
}) {
  // console.log('Validating Slack request')
  const timestamp = request.headers.get("X-Slack-Request-Timestamp");
  const slackSignature = request.headers.get("X-Slack-Signature");
  // console.log(timestamp, slackSignature)

  if (!timestamp || !slackSignature) {
    console.log("Missing timestamp or signature");
    return false;
  }

  // Prevent replay attacks on the order of 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 60 * 5) {
    console.log("Timestamp out of range");
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(base)
    .digest("hex");
  const computedSignature = `v0=${hmac}`;

  // Prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(slackSignature)
  );
}

export const verifyRequest = async ({
  requestType,
  request,
  rawBody,
}: {
  requestType: string;
  request: Request;
  rawBody: string;
}) => {
  const validRequest = await isValidSlackRequest({ request, rawBody });
  if (!validRequest || requestType !== "event_callback") {
    return new Response("Invalid request", { status: 400 });
  }
};

export const updateStatusUtil = (channel: string, thread_ts: string) => {
  return async (status: string) => {
    await client.assistant.threads.setStatus({
      channel_id: channel,
      thread_ts: thread_ts,
      status: status,
    });
  };
};

export async function getThread(
  channel_id: string,
  thread_ts: string,
  botUserId: string
): Promise<CoreMessage[]> {
  const { messages } = await client.conversations.replies({
    channel: channel_id,
    ts: thread_ts,
    limit: 50,
  });

  if (!messages) throw new Error("No messages found in thread");

  // First convert all messages to CoreMessage format
  const allMessages = messages
    .map((message) => {
      const isBot = !!message.bot_id;
      if (!message.text) return null;

      let content = message.text;
      if (!isBot && content.includes(`<@${botUserId}>`)) {
        content = content.replace(`<@${botUserId}> `, "");
      }

      return {
        role: isBot ? "assistant" : "user",
        content: content,
      } as CoreMessage;
    })
    .filter((msg): msg is CoreMessage => msg !== null);

  // Find the index of the last user message
  const lastUserMessageIndex = allMessages
    .map((msg, index) => ({ role: msg.role, index }))
    .filter((item) => item.role === "user")
    .pop()?.index;

  if (lastUserMessageIndex === undefined) {
    // If no user messages found, return empty array or handle as needed
    return [];
  }

  // Only return messages up to and including the last user message
  return allMessages.slice(0, lastUserMessageIndex + 1);
}

export const getBotId = async () => {
  const { user_id: botUserId } = await client.auth.test();

  if (!botUserId) {
    throw new Error("botUserId is undefined");
  }
  return botUserId;
};

export const getChannelMessages = async (
  channelId: string,
  limit: number = 10
) => {
  const { messages } = await client.conversations.history({
    channel: channelId,
    limit: limit,
  });
  return messages;
};

export interface Channel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
}

interface User {
  id: string;
  name: string;
  real_name?: string;
  is_bot: boolean;
}

export async function listChannels(nameFilter?: string): Promise<Channel[]> {
  try {
    const results: Channel[] = [];
    let cursor: string | undefined;

    do {
      const response = await client.conversations.list({
        cursor,
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 100,
      });

      const channels =
        response.channels?.map((channel) => ({
          id: channel.id!,
          name: channel.name!,
          is_private: channel.is_private || false,
          is_archived: channel.is_archived || false,
        })) || [];

      results.push(...channels);
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    if (nameFilter) {
      const normalizedFilter = nameFilter.toLowerCase();
      return results.filter((channel) =>
        channel.name.toLowerCase().includes(normalizedFilter)
      );
    }

    return results;
  } catch (error) {
    console.error("Error listing channels:", error);
    throw error;
  }
}

export async function listUsers(nameFilter?: string): Promise<User[]> {
  try {
    const results: User[] = [];
    let cursor: string | undefined;

    do {
      const response = await client.users.list({
        cursor,
        limit: 100,
      });

      const users =
        response.members?.map((user) => ({
          id: user.id!,
          name: user.name!,
          real_name: user.real_name,
          is_bot: user.is_bot || false,
        })) || [];

      results.push(...users);
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    if (nameFilter) {
      const normalizedFilter = nameFilter.toLowerCase();
      return results.filter(
        (user) =>
          user.name.toLowerCase().includes(normalizedFilter) ||
          user.real_name?.toLowerCase().includes(normalizedFilter)
      );
    }

    return results;
  } catch (error) {
    console.error("Error listing users:", error);
    throw error;
  }
}
