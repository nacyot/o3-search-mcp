#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { z } from "zod";

// Create server instance
const server = new McpServer({
  name: "o3-search-mcp",
  version: "0.0.1",
});

// Parse custom headers from environment variable
let customHeaders: Record<string, string> = {};
if (process.env.CUSTOM_HEADERS) {
  try {
    customHeaders = JSON.parse(process.env.CUSTOM_HEADERS);
  } catch (error) {
    console.error("Error parsing CUSTOM_HEADERS:", error);
    console.error("CUSTOM_HEADERS should be a valid JSON string");
  }
}

// Configuration from environment variables
const config = {
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "3"),
  timeout: parseInt(process.env.OPENAI_API_TIMEOUT || "60000"),
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  model: process.env.OPENAI_MODEL || "o3",
  searchContextSize: (process.env.SEARCH_CONTEXT_SIZE || "medium") as
    | "low"
    | "medium"
    | "high",
  reasoningEffort: (process.env.REASONING_EFFORT || "medium") as
    | "low"
    | "medium"
    | "high",
  customHeaders,
};

// Initialize OpenAI client with retry and timeout configuration
const openai = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
  maxRetries: config.maxRetries,
  timeout: config.timeout,
  defaultHeaders: config.customHeaders,
});

// Define the o3-search tool
server.tool(
  "o3-search",
  `An AI agent with advanced web search capabilities. Useful for finding the latest information, troubleshooting errors, and discussing ideas or design challenges. Supports natural language queries.`,
  {
    input: z
      .string()
      .describe(
        "Ask questions, search for information, or consult about complex problems in English.",
      ),
  },
  async ({ input }) => {
    try {
      const response = await openai.responses.create({
        model: config.model,
        input,
        tools: [
          {
            type: "web_search_preview",
            search_context_size: config.searchContextSize,
          },
        ],
        tool_choice: "auto",
        parallel_tool_calls: true,
        reasoning: { effort: config.reasoningEffort },
      });

      return {
        content: [
          {
            type: "text",
            text: response.output_text || "No response text available.",
          },
        ],
      };
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
