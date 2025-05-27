//chat.ts

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

// Initialize OpenAI client with environment variable for API key
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || "YOUR_API_KEY_HERE", // Use environment variable
  dangerouslyAllowBrowser: true,
});

// Define Zod schemas for our block-based editor
const TitleBlock = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/, "6자리 알파벳/숫자 조합이어야 합니다"),
  type: z.literal("title"),
  content: z.string(),
  level: z.number().int().min(1).max(4),
});

const BodyBlock = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/, "6자리 알파벳/숫자 조합이어야 합니다"),
  type: z.literal("body"),
  content: z.string(),
});

// Use discriminated union for the different block types
const Block = z.discriminatedUnion("type", [TitleBlock, BodyBlock]);

// Define the complete article schema
const ArticleSchema = z.object({
  title: z.string(),
  blocks: z.array(Block),
});

// Type for the article structure
export type Article = z.infer<typeof ArticleSchema>;

/**
 * Simple function to get GPT response
 */
export async function askGPT(input: string) {
  console.log("gpt", input);

  try {
    const request = openai.chat.completions.create({
      model: "gpt-4o-mini",
      store: true,
      messages: [{ role: "user", content: input }],
    });

    let answer = (await request).choices[0].message;
    return answer;
  } catch (err: any) {
    console.error("OpenAI error:", err);
    if (err.response) console.error(await err.response.json());
    return null;
  }
}

/**
 * Generate a random 6-character ID (similar to the editor's generateUUID function)
 */
function generateBlockId(): string {
  return Array.from({ length: 6 }, () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join("");
}

/**
 * Get formatted date for filename (format: YYMMDD)
 */
function getFormattedDate(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2); // Get last 2 digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

// Define tools for function calling
const tools = [
  {
    type: "function",
    name: "generate_blog_article",
    description:
      "Generate a blog article with the specified content and structure",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The topic or subject for the blog article",
        },
      },
      required: ["topic"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "save_to_google_drive",
    description:
      "Save the generated article to Google Drive and update the spreadsheet",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the blog article",
        },
        content: {
          type: "string",
          description:
            "The JSON stringified content of the article containing blocks",
        },
      },
      required: ["title", "content"],
      additionalProperties: false,
    },
    strict: true,
  },
];

/**
 * Request GPT to generate a blog article with the correct block structure
 */
export async function returnJSONtypeArticle(
  input: string
): Promise<{ article: Article | null; fileName: string | null }> {
  console.log("Generating article for prompt:", input);

  try {
    // 표준 chat completions API 사용
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 더 널리 사용 가능한 모델
      messages: [
        {
          role: "system",
          content: `You are a blog content generation system that creates structured content.
          
Your task is to create a well-formatted blog article with the following structure:
- A main title for the article
- Multiple blocks of content, each being either:
  1. Title blocks (with level 1-4, 1 being the largest heading)
  2. Body blocks with text content

Each block must have a 6-character random alphanumeric ID, HTML content that can include formatting 
tags like <b>, <i>, <div>, <br>, etc., and the correct block type.

Title blocks must include a "level" property (1-4) indicating heading size.

RESPOND ONLY WITH VALID JSON in exactly this format with no explanation:
{
  "title": "Article Title",
  "blocks": [
    {
      "id": "AbCd3f",
      "type": "title", 
      "content": "Section Title",
      "level": 1
    },
    {
      "id": "GhIj4k",
      "type": "body",
      "content": "Text content with <b>formatting</b>"
    }
  ]
}`,
        },
        { role: "user", content: input },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    // JSON 파싱 및 스키마 검증
    const articleData = JSON.parse(content);
    const validationResult = ArticleSchema.safeParse(articleData);

    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return { article: null, fileName: null };
    }

    const articleContent = validationResult.data;
    console.log("Generated article:", articleContent);

    // 파일명 생성
    const fileId = generateBlockId();
    const dateStr = getFormattedDate();
    const fileName = `${fileId}_${dateStr}.json`;

    return { article: articleContent, fileName };
  } catch (err: any) {
    console.error("💥 OpenAI Error:", err);
    if (err.response) {
      try {
        const body = await err.response.json();
        console.error("💥 OpenAI Error Body:", body);
      } catch (parseErr) {
        console.error("💥 Error parsing response body:", parseErr);
      }
    }
    return { article: null, fileName: null };
  }
}

/**
 * Generate article and optionally save to Google Drive using function calling
 */
export async function generateAndSaveArticle(
  input: string,
  autoSave: boolean = false
): Promise<{
  article: Article | null;
  fileName: string | null;
  uploadResult?: {
    success: boolean;
    message: string;
    uuid?: string;
    link?: string;
  };
}> {
  try {
    console.log("Using function calling to generate article:", input);

    // First, generate the article content
    const { article, fileName } = await returnJSONtypeArticle(input);

    if (!article || !fileName) {
      return { article: null, fileName: null };
    }

    // If autoSave is enabled, upload to Google Drive
    if (autoSave) {
      try {
        // API 호출하여 Google Drive에 저장
        const response = await fetch("/api/blog", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: article.title,
            blocks: article.blocks,
          }),
        });

        const result = await response.json();

        if (result.success) {
          return {
            article,
            fileName,
            uploadResult: {
              success: true,
              message: "Google Drive에 업로드되었습니다.",
              uuid: result.uuid,
              link: result.file.webViewLink,
            },
          };
        } else {
          return {
            article,
            fileName,
            uploadResult: {
              success: false,
              message: result.message || "업로드 실패",
            },
          };
        }
      } catch (err) {
        console.error("Upload error:", err);
        return {
          article,
          fileName,
          uploadResult: {
            success: false,
            message: "업로드 중 오류가 발생했습니다.",
          },
        };
      }
    }

    return { article, fileName };
  } catch (err: any) {
    console.error("Function calling error:", err);
    return { article: null, fileName: null };
  }
}

/**
 * Create a downloadable JSON file from generated article content
 */
export function downloadArticleJSON(article: Article, fileName: string): void {
  // Create a Blob with the JSON content
  const jsonContent = JSON.stringify(article, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });

  // Create a download link and trigger it
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

export async function autoArticle(input: string) {
  console.log("Starting autoArticle with input:", input);

  try {
    // Initial call with tools
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that can generate blog articles and save them to Google Drive.",
        },
        { role: "user", content: input },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generateBlogArticle",
            description:
              "Generate a blog article with the specified content and structure",
            parameters: {
              type: "object",
              properties: {
                topic: {
                  type: "string",
                  description: "The topic or subject for the blog article",
                },
              },
              required: ["topic"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "saveToGoogleDrive",
            description:
              "Save the generated article to Google Drive and update the spreadsheet",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The title of the blog article",
                },
                articleContent: {
                  type: "string",
                  description: "JSON stringified content of the article",
                },
              },
              required: ["title", "articleContent"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    // Check if there's a function call
    const message = response.choices[0].message;
    console.log("Initial response:", message);

    // If no function call, return the response
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { message: message.content };
    }

    // Prepare for conversation tracking
    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant that can generate blog articles and save them to Google Drive.",
      },
      { role: "user", content: input },
      message, // Include the assistant's message with tool_calls
    ];

    // Handle each tool call
    let generatedArticle = null;
    let fileName = null;

    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`Function called: ${functionName} with args:`, functionArgs);

      let functionResult;
      // Execute the actual function
      if (functionName === "generateBlogArticle") {
        const result = await returnJSONtypeArticle(functionArgs.topic);
        generatedArticle = result.article;
        fileName = result.fileName;
        functionResult = {
          success: !!result.article,
          article: result.article,
          fileName: result.fileName,
        };
      } else if (functionName === "saveToGoogleDrive" && generatedArticle) {
        // Save to Google Drive
        try {
          const response = await fetch("/api/blog", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: generatedArticle.title,
              blocks: generatedArticle.blocks,
            }),
          });

          const result = await response.json();
          functionResult = {
            success: result.success,
            message: result.success
              ? "Successfully saved to Google Drive"
              : "Failed to save",
            uuid: result.uuid,
            link: result.file?.webViewLink,
          };
        } catch (err) {
          console.error("Error saving to Google Drive:", err);
          functionResult = {
            success: false,
            message: "Error occurred while saving to Google Drive",
          };
        }
      } else {
        functionResult = {
          success: false,
          message: "Unknown function or missing required data",
        };
      }

      // Add the function result to messages - CORRECT FORMAT FOR TOOL RESPONSES
      messages.push({
        role: "tool", // Must use 'tool' role, not 'function'
        tool_call_id: toolCall.id, // Must include the tool_call_id to match the request
        content: JSON.stringify(functionResult),
      });
    }

    // Get the final response with function results
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
    });

    console.log("Final response:", secondResponse.choices[0].message);

    return {
      message: secondResponse.choices[0].message.content,
      article: generatedArticle,
      fileName: fileName,
    };
  } catch (err: any) {
    console.error("Error in autoArticle:", err);
    return { error: err.message };
  }
}
