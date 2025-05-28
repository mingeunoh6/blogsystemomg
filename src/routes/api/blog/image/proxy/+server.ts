import { error } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import fs from "fs";
import path from "path";
import os from "os";

// 이미지 프록시 엔드포인트
export async function GET({ url, fetch: origFetch }: RequestEvent) {
  const imageId = url.searchParams.get("id");

  if (!imageId) {
    return error(400, {
      message: "이미지 ID가 제공되지 않았습니다.",
    });
  }

  try {
    // 개발 환경에서만 SSL 인증서 검증 비활성화
    // 주의: 이 방법은 프로덕션 환경에서 사용하면 안됩니다
    const isDevEnvironment = process.env.NODE_ENV === "development";

    // 이미지를 직접 로컬에 캐시하는 접근 방식 사용
    const cacheDir = path.join(os.tmpdir(), "image-cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFilePath = path.join(cacheDir, `${imageId}.cache`);
    const cacheMetaPath = path.join(cacheDir, `${imageId}.meta`);

    // 캐시된 이미지가 있는지 확인
    if (fs.existsSync(cacheFilePath) && fs.existsSync(cacheMetaPath)) {
      const contentType = fs.readFileSync(cacheMetaPath, "utf-8");
      const imageBuffer = fs.readFileSync(cacheFilePath);

      return new Response(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000", // 1년 캐싱
          "Access-Control-Allow-Origin": "*", // CORS 허용
        },
      });
    }

    // 개발 환경에서 SSL 검증 비활성화
    if (isDevEnvironment) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    // 서버에서 서버로 요청 (SvelteKit에서 제공하는 fetch 사용)
    // Google Drive 이미지 URL 생성 - 리다이렉션을 위해 더 직접적인 URL 사용
    const googleDriveUrl = `https://drive.google.com/uc?export=view&id=${imageId}`;

    const response = await fetch(googleDriveUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`이미지 가져오기 실패: ${response.statusText}`);
    }

    // 원본 이미지의 Content-Type 가져오기
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // 이미지와 콘텐츠 타입을 캐시에 저장
    fs.writeFileSync(cacheFilePath, imageBuffer);
    fs.writeFileSync(cacheMetaPath, contentType);

    // SSL 검증을 다시 활성화 (개발 환경인 경우)
    if (isDevEnvironment) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    }

    // 이미지 데이터 반환
    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // 1년 캐싱
        "Access-Control-Allow-Origin": "*", // CORS 허용
      },
    });
  } catch (err) {
    console.error("이미지 프록시 오류:", err);
    return error(500, {
      message: "이미지를 가져오는 중 오류가 발생했습니다.",
    });
  }
}
