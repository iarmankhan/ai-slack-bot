import { z } from "zod";
import { tool } from "ai";

export const getWeatherTool = (updateStatus?: (status: string) => void) =>
  tool({
    description: "Get the current weather at a location",
    parameters: z.object({
      latitude: z.number(),
      longitude: z.number(),
      city: z.string(),
    }),
    execute: async ({ latitude, longitude, city }) => {
      updateStatus?.(`is getting weather for ${city}...`);

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,relativehumidity_2m&timezone=auto`
      );

      const weatherData = await response.json();
      return {
        temperature: weatherData.current.temperature_2m,
        weatherCode: weatherData.current.weathercode,
        humidity: weatherData.current.relativehumidity_2m,
        city,
      };
    },
  });
