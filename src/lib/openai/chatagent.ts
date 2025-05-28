// chatagent.ts - Blog generation using OpenAI Responses API with Reasoning models

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

// 기존 chat.ts에서 가져온 타입 정의
export type Article = {
  title: string;
  blocks: Array<
    | { id: string; type: "title"; content: string; level: number }
    | { id: string; type: "body"; content: string }
    | { id: string; type: "image"; imageUrl: string | null }
  >;
};

// Initialize OpenAI client with environment variable for API key
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || "YOUR_API_KEY_HERE", // Use environment variable
  dangerouslyAllowBrowser: true,
});

// 블록 ID 생성 함수
function generateBlockId(): string {
  return Array.from({ length: 6 }, () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join("");
}

// 날짜 포맷 함수
function getFormattedDate(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2); // Get last 2 digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Reasoning 모델을 사용한 블로그 생성 및 저장 함수
 * OpenAI의 Responses API를 활용하여 에이전틱하게 작업 수행
 */
export async function reasoningArticleAgent(input: string): Promise<{
  message: string;
  article: Article | null;
  fileName: string | null;
  logs: string[];
  error?: string;
}> {
  console.log("Starting reasoningArticleAgent with input:", input);

  // 진행 로그를 저장할 배열
  const logs: string[] = [];
  logs.push("Reasoning 모델을 통한 블로그 작성 시작");

  try {
    // Responses API 호출
    const response = await openai.responses.create({
      model: "o4-mini", // 추론에 특화된 모델
      reasoning: {
        effort: "medium", // 중간 정도의 추론 노력
        summary: "auto", // 추론 과정 요약 활성화
      },
      input: [
        {
          role: "system",
          content: `당신은 블로그 아티클을 생성하고 Google Drive에 저장하는 AI 비서입니다.
사용자의 요청을 분석하고, 다음의 과정을 순차적으로 모두 완료해야 합니다:

1. generateBlogArticle 함수를 호출하여 블로그 글을 생성합니다.
2. 글이 생성되면 반드시 saveToGoogleDrive 함수를 호출하여 Google Drive에 저장합니다.
3. 각 단계의 결과를 확인하고 최종 응답을 사용자에게 제공합니다.

모든 단계가 완료될 때까지 필요한 함수를 순차적으로 호출하세요.`,
        },
        { role: "user", content: input },
      ],
      tools: [
        {
          type: "function",
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
            additionalProperties: false,
          },
          strict: true,
        },
        {
          type: "function",
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
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      max_output_tokens: 25000, // 충분한 토큰 할당
    });

    // 추론 과정 로그 추가
    if (response.reasoning) {
      logs.push("=== AI 추론 과정 요약 ===");
      for (const summary of response.reasoning.summary || []) {
        logs.push(summary);
      }
      logs.push("=== 추론 과정 요약 끝 ===");
    }

    // 디버그용 로그
    console.log("Response:", response);

    let generatedArticle: Article | null = null;
    let fileName: string | null = null;
    let finalMessage = response.output_text || "";

    // 함수 호출 처리
    if (response.output) {
      for (const item of response.output) {
        // 함수 호출 아이템 처리
        if (item.type === "function_call") {
          logs.push(`함수 호출: ${item.name} (${item.arguments})`);

          // generateBlogArticle 함수 호출 처리
          if (item.name === "generateBlogArticle") {
            logs.push("블로그 아티클 생성 중...");
            const args = JSON.parse(item.arguments);

            // 실제 블로그 생성 로직 (아래는 샘플 구현)
            const article = await generateBlogContent(args.topic);
            generatedArticle = article.article;
            fileName = article.fileName;

            if (generatedArticle) {
              logs.push(
                `아티클 생성 완료: "${generatedArticle.title}" (${generatedArticle.blocks.length}개 블록)`
              );
            } else {
              logs.push("아티클 생성 실패");
            }
          }

          // saveToGoogleDrive 함수 호출 처리
          else if (item.name === "saveToGoogleDrive" && generatedArticle) {
            logs.push("Google Drive에 저장 중...");
            try {
              const args = JSON.parse(item.arguments);

              // 실제 저장 로직
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
            } catch (err) {
              logs.push("Google Drive 저장 중 오류 발생");
              console.error("Save error:", err);
            }
          }
        }
      }
    }

    logs.push("작업 완료");

    return {
      message: finalMessage,
      article: generatedArticle,
      fileName,
      logs,
    };
  } catch (err: any) {
    console.error("Reasoning API error:", err);
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

/**
 * 블로그 내용 생성 함수 (샘플 구현)
 * 실제로는 OpenAI API를 사용하여 블로그 내용을 생성하지만,
 * 여기서는 Responses API에서 호출될 함수로서의 역할만 수행
 */
async function generateBlogContent(
  topic: string
): Promise<{ article: Article | null; fileName: string | null }> {
  try {
    // 기존 chat.ts의 returnJSONtypeArticle과 유사한 로직을 사용
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a blog content generation system that creates structured content.
          
Your task is to create a well-formatted blog article with the following structure:
- A main title for the article
- Multiple blocks of content, each being one of:
  1. Title blocks (with level 1-4, 1 being the largest heading)
  2. Body blocks with text content
  3. Image blocks (where you should suggest image descriptions, but not actual URLs)

Each block must have a 6-character random alphanumeric ID and the correct block type.

Title blocks must include a "level" property (1-4) indicating heading size.
Body blocks include HTML content that can include formatting tags like <b>, <i>, <div>, <br>, etc.
Image blocks should have the imageUrl property set to null, along with a description comment.

Your response MUST be a valid JSON object with this exact structure:
{
  "title": "Main Article Title",
  "blocks": [
    {
      "id": "abc123", 
      "type": "title", 
      "content": "Example Title", 
      "level": 1
    },
    {
      "id": "def456", 
      "type": "body", 
      "content": "Example body text with <b>formatting</b>"
    },
    {
      "id": "ghi789", 
      "type": "image", 
      "imageUrl": null
    }
  ]
}

IMPORTANT: Ensure your response is valid JSON. No trailing commas, no unescaped quotes in strings, and proper formatting.

RESPOND ONLY WITH VALID JSON in exactly this format with no explanation.`,
        },
        { role: "user", content: topic },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;

    if (!content) {
      console.error("No content returned from OpenAI");
      throw new Error("No content returned from OpenAI");
    }

    console.log("Raw response from OpenAI:", content.substring(0, 500) + "...");

    // JSON 파싱
    try {
      const articleData = JSON.parse(content);

      // 상세한 검증
      if (!articleData.title || typeof articleData.title !== "string") {
        console.error("Invalid title structure:", articleData.title);
        throw new Error(
          "Invalid article structure: title is missing or not a string"
        );
      }

      if (!Array.isArray(articleData.blocks)) {
        console.error("Invalid blocks structure:", articleData.blocks);
        throw new Error("Invalid article structure: blocks is not an array");
      }

      // 각 블록 유효성 검사
      for (let i = 0; i < articleData.blocks.length; i++) {
        const block = articleData.blocks[i];

        if (!block.id || typeof block.id !== "string") {
          console.error(`Invalid block ID at index ${i}:`, block);
          throw new Error(
            `Invalid block structure: missing or invalid ID at index ${i}`
          );
        }

        if (!block.type || !["title", "body", "image"].includes(block.type)) {
          console.error(`Invalid block type at index ${i}:`, block);
          throw new Error(
            `Invalid block structure: missing or invalid type at index ${i}`
          );
        }

        if (block.type === "title") {
          if (
            !block.content ||
            typeof block.content !== "string" ||
            !block.level
          ) {
            console.error(`Invalid title block at index ${i}:`, block);
            throw new Error(`Invalid title block structure at index ${i}`);
          }
        } else if (block.type === "body") {
          if (!block.content || typeof block.content !== "string") {
            console.error(`Invalid body block at index ${i}:`, block);
            throw new Error(`Invalid body block structure at index ${i}`);
          }
        }
      }

      // 파일명 생성
      const fileId = generateBlockId();
      const dateStr = getFormattedDate();
      const fileName = `${fileId}_${dateStr}.json`;

      return {
        article: articleData,
        fileName,
      };
    } catch (parseError: any) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw content that failed to parse:", content);
      return { article: null, fileName: null };
    }
  } catch (err: any) {
    console.error("Blog generation error:", err);
    return { article: null, fileName: null };
  }
}
