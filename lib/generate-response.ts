import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { CoreMessage, generateText } from "ai";
import { getChannelMessagesTool } from "./tools/get-channel-messages";
import { getWeatherTool } from "./tools/get-weather";
import { listChannelsTool } from "./tools/list-channels";
import { listUsersTool } from "./tools/list-users";
import { getWebSearchTool } from "./tools/search-web";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
});

export const generateResponse = async (
  messages: CoreMessage[],
  updateStatus?: (status: string) => void
) => {
  const { text } = await generateText({
    model: bedrock("anthropic.claude-3-5-sonnet-20240620-v1:0"),
    system: `You are a Slack bot assistant. Keep your responses concise and to the point.
    - Do not tag users.
    - Mention users by their name not their ID.
    - Mention channels by their name not their ID.
    - Current date is: ${new Date().toISOString().split("T")[0]}
    `,
    messages,
    maxSteps: 10,
    tools: {
      getWeather: getWeatherTool(updateStatus),
      searchWeb: getWebSearchTool(updateStatus),
      getChannelMessages: getChannelMessagesTool(updateStatus),
      listChannels: listChannelsTool(updateStatus),
      listUsers: listUsersTool(updateStatus),
    },
  });

  // Convert markdown to Slack mrkdwn format
  return text.replace(/\[(.*?)\]\((.*?)\)/g, "<$2|$1>").replace(/\*\*/g, "*");
};
