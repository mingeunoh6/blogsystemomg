//chat.ts

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getWorldNews } from "$lib/utils/NEWS/newsUtils";

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

const ImageBlock = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/, "6자리 알파벳/숫자 조합이어야 합니다"),
  type: z.literal("image"),
  imageUrl: z.string().nullable(),
});

// Use discriminated union for the different block types
const Block = z.discriminatedUnion("type", [TitleBlock, BodyBlock, ImageBlock]);

// Define the complete article schema
const ArticleSchema = z.object({
  title: z.string(),
  blocks: z.array(Block),
});

// Type for the article structure
export type Article = z.infer<typeof ArticleSchema>;

// 뉴스 API 결과 타입 정의
interface NewsItem {
  news_url: string;
  news_publisher: string;
  news_title: string;
  news_author: string;
  news_date: string;
  news_summary: string;
  news_thumbnail: string;
}

interface CrawledArticle {
  url: string;
  text?: string;
  error?: string;
}

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
- At least 3–5 major sections, each with a title block (level 2–3) and 2 or more body blocks
- Each body block should contain 150–300 words (roughly 1000–2000 characters)
- Total article length should exceed 1000 words (ideally 1500+ words)
- Include image blocks where appropriate (with imageUrl set to null)

Each block must have a 6-character random alphanumeric ID and the correct block type.

Title blocks must include a "level" property (1-4) indicating heading size.
Body blocks include HTML content that can include formatting tags like <b>, <i>, <div>, <br>, etc.
Image blocks should have the imageUrl property set to null, along with a description comment.

IMPORTANT CITATION RULES:
- Always cite sources when using news content
- Use the format "[Source: Publication Name, URL]" after quotes or information
- For direct quotes, use quotation marks and include the source
- For paraphrased content, still cite the source at the end of the information
- When summarizing multiple news sources, cite all of them

IMPORTANT: Ensure your response is valid JSON. No trailing commas, no unescaped quotes in strings, and proper formatting.

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
      "content": "Text content with <b>formatting</b> and proper citations [Source: Publication Name, URL]"
    },
    {
      "id": "LmNp5q",
      "type": "image",
      "imageUrl": null
    }
  ]
}`,
        },
        { role: "user", content: input },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    console.log("Raw response from OpenAI:", content.substring(0, 500) + "...");

    // JSON 파싱 시도 - try/catch로 감싸서 오류 처리 강화
    let articleData;
    try {
      articleData = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);

      // 오류 위치 찾기
      if (parseError instanceof SyntaxError) {
        const errorMessage = parseError.message;
        const positionMatch = errorMessage.match(/position (\d+)/);
        if (positionMatch && positionMatch[1]) {
          const errorPosition = parseInt(positionMatch[1]);
          const errorContext = content.substring(
            Math.max(0, errorPosition - 50),
            Math.min(content.length, errorPosition + 50)
          );
          console.error(`Error context: "${errorContext}"`);
        }
      }

      // 기본 구조로 응답
      return { article: null, fileName: null };
    }

    // Zod 스키마 검증
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

export async function autoArticleOriginal(input: string) {
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

export async function autoArticleSecond(input: string) {
  console.log("Starting autoArticle with input:", input);

  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that can generate blog articles and save them to Google Drive.",
    },
    { role: "user", content: input },
  ];

  let generatedArticle: Article | null = null;
  let fileName: string | null = null;

  // 반복적으로 tool_call 발생시마다 처리
  while (true) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
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

    const message = response.choices[0].message;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      // 최종 응답 도달 (tool_call 없이 종료됨)
      return {
        message: message.content,
        article: generatedArticle,
        fileName,
      };
    }

    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      console.log("함수호출", functionName, args);

      let functionResult;

      if (functionName === "generateBlogArticle") {
        const result = await returnJSONtypeArticle(args.topic);
        generatedArticle = result.article;
        fileName = result.fileName;
        functionResult = {
          success: !!result.article,
          article: result.article,
          fileName: result.fileName,
        };
      } else if (functionName === "saveToGoogleDrive" && generatedArticle) {
        try {
          const response = await fetch("/api/blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: generatedArticle.title,
              blocks: generatedArticle.blocks,
            }),
          });

          const result = await response.json();
          functionResult = {
            success: result.success,
            message: result.success ? "Saved successfully" : "Failed to save",
            link: result.file?.webViewLink,
          };
        } catch (err) {
          functionResult = {
            success: false,
            message: "Error during save",
          };
        }
      } else {
        functionResult = {
          success: false,
          message: "Unhandled function or missing article",
        };
      }

      // tool 응답 추가
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult),
      });
    }
  }
}

// Update the genImage function to properly handle the response
async function generateImage(prompt: string): Promise<string | null> {
  try {
    console.log("Generating image with prompt:", prompt);

    // Use relative URL to avoid cross-origin issues
    const apiUrl = "/api/blog/fal";
    console.log("Calling FAL API endpoint:", apiUrl);

    // Check if the FAL API is available by making a simple fetch request
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      console.log("FAL API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Image generation failed (${response.status}):`,
          errorText
        );

        // Check if we got a direct image URL even though the download failed
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.imageUrl) {
            console.log(
              "Server couldn't download the image but provided URL:",
              errorData.imageUrl
            );
            // Return the direct FAL image URL since Google Drive upload failed
            return errorData.imageUrl;
          }
        } catch (e) {
          // Not JSON or no imageUrl property
          console.log("No direct image URL in error response");
        }

        return null;
      }

      const result = await response.json();
      console.log("Image generation result:", result);

      if (result.success && result.file && result.file.webViewLink) {
        console.log("Successfully generated image:", result.file.webViewLink);
        return result.file.webViewLink;
      } else if (
        result.image &&
        result.image.images &&
        result.image.images[0] &&
        result.image.images[0].url
      ) {
        // If Google Drive upload failed but we have the image URL directly from FAL
        console.log("Using direct FAL image URL:", result.image.images[0].url);
        return result.image.images[0].url;
      } else {
        console.error("Image generation response error:", result);
        return null;
      }
    } catch (fetchError) {
      console.error("Network error when calling FAL API:", fetchError);

      // Try an alternative approach using XMLHttpRequest as a fallback
      console.log("Trying fallback XMLHttpRequest approach...");
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", apiUrl, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log("XHR success:", result);
              if (result.success && result.file && result.file.webViewLink) {
                resolve(result.file.webViewLink);
              } else if (
                result.image &&
                result.image.images &&
                result.image.images[0] &&
                result.image.images[0].url
              ) {
                // Fallback to direct image URL
                resolve(result.image.images[0].url);
              } else {
                console.error("XHR response error:", result);
                resolve(null);
              }
            } catch (parseError) {
              console.error("XHR parse error:", parseError);
              resolve(null);
            }
          } else {
            console.error(
              "XHR failed:",
              xhr.status,
              xhr.statusText,
              xhr.responseText
            );
            // Try to extract direct image URL from error response
            try {
              const errorData = JSON.parse(xhr.responseText);
              if (errorData.imageUrl) {
                resolve(errorData.imageUrl);
                return;
              }
            } catch (e) {}
            resolve(null);
          }
        };
        xhr.onerror = function () {
          console.error("XHR network error");
          resolve(null);
        };
        xhr.send(JSON.stringify({ prompt: prompt }));
      });
    }
  } catch (err) {
    console.error("Error in image generation function:", err);
    return null;
  }
}

export async function autoArticle(input: string): Promise<{
  message: string;
  article: Article | null;
  fileName: string | null;
  logs: string[];
  error?: string;
}> {
  console.log("Starting autoArticle with input:", input);

  // 진행 로그를 저장할 배열
  const logs: string[] = [];
  logs.push("AI 분석 시작: 입력받은 주제에 대한 블로그 글 작성을 준비합니다.");

  try {
    const messages: any[] = [
      {
        role: "system",
        content: `당신은 블로그 아티클을 생성하고 Google Drive에 저장하는 AI 비서입니다.
사용자의 요청을 분석하고, 다음의 과정을 순차적으로 모두 완료해야 합니다:

0. 블로그 글에 최신 뉴스 내용을 담아야겠다고 판단되면, getNews 함수를 호출해 여러 뉴스 데이터를 수집한 다음, 각 뉴스의 URL을 순서대로 readMultipleUrls 함수를 통해 모두 크롤링하세요. 뉴스는 최소 3개 이상 수집 및 반영해야 합니다.
   
1. generateBlogArticle 함수를 호출하여 블로그 글을 생성합니다. 최신 뉴스 데이터가 수집되었고 해당 URL의 본문 텍스트도 있는 경우, 반드시 해당 뉴스 내용을 참고하여 블로그 각 섹션에 요약하거나 인용 형태로 반영하세요. 뉴스 요약과 크롤링 결과는 정보를 소개하거나 분석하는 형태로 통합하세요.
   - 뉴스 본문을 요약하여 블로그 글의 각 섹션에서 관련된 뉴스 정보로 활용하세요.
   - 반드시 각 뉴스 정보와 인용문 바로 뒤에 "[출처: 언론사명, URL]" 형식으로 출처를 명확하게 표기하세요.
   - 직접 인용할 경우 인용 부호를 사용하고 출처를 반드시 명시하세요. (예: "인용문" [출처: 언론사명, URL])
   - 간접 인용이나 정보 활용 시에도 정보의 출처를 문장 끝에 표기하세요. (예: 이런 내용이다. [출처: 언론사명])
   - 여러 뉴스를 종합할 때는 각 출처를 모두 표기하세요. (예: 여러 전문가들은 이런 견해를 보인다. [출처: A신문, B신문])
   - 이미지 블록 아래에도 관련 뉴스 출처를 표기하는 본문 블록을 추가하세요.

2. 생성된 블로그 글에 이미지가 필요하다고 판단되면, generateImage 함수를 호출하여 적절한 이미지를 생성합니다.
   - 이미지가 필요한 각 섹션마다 이미지를 위한 상세한 프롬프트를 작성하세요.
   - 이미지 생성 후 받은 링크를 해당 이미지 블록의 imageUrl 필드에 업데이트하세요.
3. 글이 생성되면 반드시 saveToGoogleDrive 함수를 호출하여 Google Drive에 저장합니다.
4. 각 단계의 결과를 확인하고 최종 응답을 사용자에게 제공합니다.

모든 단계가 완료될 때까지 필요한 함수를 순차적으로 호출하세요. 하나의 함수 호출 후 작업을 중단하지 말고, 모든 과정이 완료될 때까지 계속 진행하세요.`,
      },
      { role: "user", content: input },
    ];

    let news: NewsItem[] = [];
    let crawlingText: CrawledArticle[] = [];
    let generatedArticle: Article | null = null;
    let fileName: string | null = null;
    let isWorkflowComplete = false;
    let finalMessage = "";

    // 첫 번째 API 호출: 블로그 아티클 생성 요청
    logs.push("AI에게 블로그 아티클 생성 요청 중...");

    while (!isWorkflowComplete) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "getNews",
              description:
                "Search world news using news api with specific keyword and return news datas",
              parameters: {
                type: "object",
                properties: {
                  keyword: {
                    type: "string",
                    description: "The keyword or subject for news search",
                  },
                },
                required: ["keyword"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "readMultipleUrls",
              description:
                "Web crawl multiple news URLs and return their content",
              parameters: {
                type: "object",
                properties: {
                  urls: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of news URLs to crawl",
                  },
                },
                required: ["urls"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "readUrl",
              description:
                "Web Crawling with given url and return text of the url content ",
              parameters: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    description: "The url to process the crawling",
                  },
                },
                required: ["url"],
              },
            },
          },
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
              name: "generateImage",
              description:
                "Generate an image using AI based on a text prompt and returns a Google Drive link",
              parameters: {
                type: "object",
                properties: {
                  prompt: {
                    type: "string",
                    description:
                      "Detailed description of the image to generate",
                  },
                  blockId: {
                    type: "string",
                    description:
                      "The ID of the image block to update with the generated image URL",
                  },
                },
                required: ["prompt", "blockId"],
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

      // 응답 메시지 처리
      const message = response.choices[0].message;
      messages.push(message); // 대화 내역에 추가

      // 함수 호출 없이 텍스트 응답만 있는 경우 - 워크플로우 완료로 간주
      if (!message.tool_calls || message.tool_calls.length === 0) {
        logs.push("AI가 모든 작업을 완료했습니다.");
        finalMessage = message.content || "응답 없음";
        isWorkflowComplete = true;
        continue;
      }

      // 함수 호출 처리
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        logs.push(`함수 호출: ${functionName} (${JSON.stringify(args)})`);
        console.log("함수호출", functionName, args);

        let functionResult;

        if (functionName === "generateBlogArticle") {
          logs.push("블로그 아티클 생성 중...");

          // 뉴스 데이터와 크롤링 내용을 주제와 함께 전달
          let fullTopic = args.topic;

          // 뉴스 데이터가 있는 경우, 이를 주제에 포함
          if (news && news.length > 0) {
            fullTopic += "\n\n===== 관련 뉴스 데이터 =====\n";
            news.forEach((item, index) => {
              fullTopic += `\n[뉴스 #${index + 1}]\n`;
              fullTopic += `제목: ${item.news_title}\n`;
              fullTopic += `출처: ${item.news_publisher}\n`;
              fullTopic += `날짜: ${item.news_date}\n`;
              fullTopic += `URL: ${item.news_url}\n`;
              if (item.news_summary) {
                fullTopic += `요약: ${item.news_summary}\n`;
              }
            });
          }

          // 크롤링 내용이 있는 경우, 이를 주제에 포함
          if (crawlingText && crawlingText.length > 0) {
            fullTopic += "\n\n===== 뉴스 본문 내용 =====\n";
            // 타입 체크를 추가하여 text 속성이 있는 항목만 처리
            crawlingText.forEach((item: any, index) => {
              if (item && item.text && typeof item.text === "string") {
                fullTopic += `\n[뉴스 본문 #${index + 1}] (${
                  item.url || "출처 없음"
                })\n`;
                // 텍스트가 너무 길면 잘라내기 (OpenAI 토큰 제한 고려)
                const maxLength = 2000;
                const trimmedText =
                  item.text.length > maxLength
                    ? item.text.substring(0, maxLength) + "... (내용 계속)"
                    : item.text;
                fullTopic += trimmedText + "\n";
              }
            });

            fullTopic += "\n\n===== 블로그 작성 지침 =====\n";
            fullTopic +=
              "위 뉴스 내용을 참고하여 블로그 글을 작성하세요. 뉴스의 핵심 내용과 인사이트를 블로그 글에 녹여내고, 반드시 출처도 표기하세요.\n\n";
            fullTopic += "출처 표기 규칙:\n";
            fullTopic += '1. 직접 인용 시: "인용문" [출처: 언론사명, URL]\n';
            fullTopic += "2. 간접 인용 시: 내용 요약 [출처: 언론사명]\n";
            fullTopic +=
              "3. 여러 출처 종합 시: 종합된 내용 [출처: A신문, B신문]\n";
            fullTopic +=
              "4. 이미지 관련 정보 인용 시 이미지 아래에 출처 블록 추가\n";
            fullTopic += "5. 모든 뉴스 정보는 반드시 출처를 표기해야 합니다.\n";
          }

          // 수정된 주제로 블로그 아티클 생성
          const result = await returnJSONtypeArticle(fullTopic);
          generatedArticle = result.article;
          fileName = result.fileName;

          if (generatedArticle) {
            logs.push(
              `아티클 생성 완료: "${generatedArticle.title}" (${generatedArticle.blocks.length}개 블록)`
            );
          } else {
            logs.push("아티클 생성 실패");
          }

          functionResult = {
            success: !!result.article,
            article: generatedArticle,
            fileName: result.fileName,
          };
        } else if (functionName === "getNews") {
          logs.push("2주이내 최신 뉴스 검색중...");
          const result = await getNews(args.keyword);

          news = [];

          if (result && result.data && Array.isArray(result.data)) {
            for (let i = 0; i < result.data.length; i++) {
              logs.push(`뉴스 수집중...${i}/${result.data.length}`);
              let newsData: NewsItem = {
                news_url: result.data[i].content_url || "",
                news_publisher: result.data[i].publisher || "",
                news_title: result.data[i].title || "",
                news_author: result.data[i].author || "",
                news_date: result.data[i].published_at || "",
                news_summary: result.data[i].summary || "",
                news_thumbnail: result.data[i].thumbnail_url || "",
              };
              news.push(newsData);
            }
          }

          logs.push("뉴스 수집 완료");

          functionResult = {
            success: true,
            news: news,
          };
        } else if (functionName === "readUrl") {
          logs.push("뉴스 기사 훑는 중...");
          try {
            const result = await readUrl(args.url);

            // 문자열 결과를 객체 배열로 변환하여 저장
            crawlingText = [
              {
                url: args.url,
                text: result,
              },
            ];

            logs.push("뉴스 기사 확인 완료");

            functionResult = {
              success: true,
              newsCrawlingDetail: crawlingText,
              summary: await summarizeCrawledText(
                crawlingText as { url: string; text: string }[]
              ),
            };
          } catch (error) {
            logs.push("뉴스 기사 크롤링 실패");
            functionResult = {
              success: false,
              error: String(error),
            };
          }
        } else if (functionName === "readMultipleUrls") {
          logs.push("뉴스 기사 훑는 중...");
          try {
            const result = await readMultipleUrls(args.urls);

            crawlingText = result.crawledArticles;

            logs.push("뉴스 기사 확인 완료");

            // 크롤링된 항목 중 텍스트가 있는 항목만 필터링
            const validArticles = result.crawledArticles.filter(
              (item): item is { url: string; text: string } =>
                !!item.text && typeof item.text === "string"
            );

            functionResult = {
              success: result.success,
              newsCrawlingDetail: crawlingText,
              summary: await summarizeCrawledText(validArticles),
            };
          } catch (error) {
            logs.push("뉴스 기사 크롤링 실패");
            functionResult = {
              success: false,
              error: String(error),
            };
          }
        } else if (functionName === "generateImage" && generatedArticle) {
          // 이미지 생성 처리
          logs.push(`이미지 생성 중: "${args.prompt}"`);

          // 지정된 blockId 이미지 블록 찾기
          const blockIndex = generatedArticle.blocks.findIndex(
            (block) => block.id === args.blockId && block.type === "image"
          );

          if (blockIndex === -1) {
            logs.push(
              `오류: 지정된 blockId "${args.blockId}"에 해당하는 이미지 블록을 찾을 수 없습니다.`
            );
            functionResult = {
              success: false,
              message: "Image block not found",
            };
          } else {
            // FAL API를 사용하여 이미지 생성
            const imageUrl = await generateImage(args.prompt);

            if (imageUrl) {
              // 이미지 블록 업데이트
              (generatedArticle.blocks[blockIndex] as any).imageUrl = imageUrl;
              logs.push(`이미지 생성 성공: ${imageUrl}`);

              functionResult = {
                success: true,
                imageUrl: imageUrl,
                blockId: args.blockId,
              };
            } else {
              logs.push("이미지 생성 실패");
              functionResult = {
                success: false,
                message: "Failed to generate image",
              };
            }
          }
        } else if (functionName === "saveToGoogleDrive" && generatedArticle) {
          logs.push("Google Drive에 저장 중...");
          try {
            // 실제 저장을 위해 generatedArticle을 JSON 문자열로 변환
            const articleContent = JSON.stringify(generatedArticle);

            const response = await fetch("/api/blog", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: args.title || generatedArticle.title,
                blocks: generatedArticle.blocks,
              }),
            });

            const result = await response.json();
            logs.push(
              result.success
                ? `Google Drive 저장 성공: ${result.file?.webViewLink}`
                : "Google Drive 저장 실패"
            );

            functionResult = {
              success: result.success,
              message: result.success ? "Saved successfully" : "Failed to save",
              link: result.file?.webViewLink,
              uuid: result.uuid,
            };
          } catch (err) {
            logs.push("Google Drive 저장 중 오류 발생");
            functionResult = {
              success: false,
              message: "Error during save",
            };
          }
        } else {
          logs.push("알 수 없는 함수 호출 또는 필요한 데이터 없음");
          functionResult = {
            success: false,
            message: "Unhandled function or missing article",
          };
        }

        // tool 응답 추가
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        });
      }
    }

    // 작업 완료 로그
    logs.push("모든 작업이 완료되었습니다.");

    return {
      message: finalMessage,
      article: generatedArticle,
      fileName,
      logs,
    };
  } catch (err: any) {
    console.error("Function calling error:", err);
    logs.push(`오류 발생: ${err.message}`);
    return {
      message: "오류가 발생했습니다",
      article: null,
      fileName: null,
      logs,
      error: err.message,
    };
  }
}

async function getNews(keyword: string): Promise<{ data: any[] }> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD 형식
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const todaybefore2weeks = twoWeeksAgo.toISOString().split("T")[0];
    console.log("뉴스 데이터 요청 시작");

    // 뉴스 데이터 요청
    const response = (await getWorldNews(
      keyword,
      todaybefore2weeks,
      today,
      3
    )) as any;
    console.log("뉴스 데이터 요청 완료:", response);

    // 뉴스 API가 제대로 응답하지 않은 경우 빈 배열 반환
    if (!response || !response.data) {
      return { data: [] };
    }

    return response;
  } catch (error: any) {
    console.error("뉴스 데이터 요청 실패:", error);
    // 오류 발생 시 빈 데이터 반환
    return { data: [] };
  }
}

async function readUrl(url: string) {
  try {
    // 프록시 API를 통해 URL 콘텐츠 가져오기
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

    console.log("프록시를 통해 URL 요청:", url);
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = (await response.json()) as {
      error?: string;
      content: string;
    };

    if (result.error) {
      throw new Error(`프록시 오류: ${result.error}`);
    }

    const html = result.content;

    // Create a DOM parser to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove script and style elements
    const scripts = doc.getElementsByTagName("script");
    const styles = doc.getElementsByTagName("style");
    while (scripts.length > 0) scripts[0].remove();
    while (styles.length > 0) styles[0].remove();

    // Get main content - try common content containers first
    let content =
      doc.querySelector("article") ||
      doc.querySelector("main") ||
      doc.querySelector("div") ||
      doc.querySelector(".content") ||
      doc.querySelector("#content");

    // If no specific content container found, get body text
    if (!content) {
      content = doc.body;
    }

    // Get text content and clean it up
    let text = content.textContent || "";
    text = text.replace(/\s+/g, " ").trim(); // Remove extra whitespace

    return text;
  } catch (error) {
    console.error("Error crawling URL:", error);
    throw error;
  }
}

async function readMultipleUrls(urls: string[]) {
  const results = [];

  for (const url of urls) {
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${url}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`Error in content: ${result.error}`);
      }

      const html = result.content;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Clean DOM
      doc
        .querySelectorAll("script, style, noscript")
        .forEach((el) => el.remove());

      let content =
        doc.querySelector("article") ||
        doc.querySelector("main") ||
        doc.querySelector(".content") ||
        doc.body;

      const text = content?.textContent?.replace(/\s+/g, " ").trim() || "";

      results.push({
        url,
        text: text.slice(0, 5000), // 길이 제한 (OpenAI 컨텍스트 대비)
      });
    } catch (err) {
      console.error("readMultipleUrls error:", err);
      results.push({
        url,
        error: (err as Error).message,
      });
    }
  }

  return {
    success: true,
    crawledArticles: results,
  };
}

async function summarizeCrawledText(
  articles: { url: string; text: string }[]
): Promise<string> {
  const summaries = [];

  for (const { url, text } of articles) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant. Please summarize the following news article in under 100 words in a tone suitable for a blog post. Include a one-line title and mention it's from: ${url}`,
          },
          {
            role: "user",
            content: text.slice(0, 3000),
          },
        ],
      });

      summaries.push(response.choices[0].message.content || "");
    } catch (err) {
      console.error("summarizeCrawledText error:", err);
    }
  }

  return summaries.join("\n\n");
}