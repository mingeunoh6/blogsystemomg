import { fal } from "@fal-ai/client";
import { google } from "googleapis";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { GOOGLE_CONFIG } from "$lib/utils/secret";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";

// 개발 환경에서 SSL 인증서 검증 비활성화 (FAL API 요청을 위함)
// 주의: 프로덕션 환경에서는 보안상 취약점이 될 수 있습니다
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 기본 https 에이전트 설정 (SSL 인증서 검증 무시)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// 더 자세한 로깅을 위한 헬퍼 함수
function logError(message: string, err: any) {
  console.error(`${message}:`, err);
  if (err.response) {
    try {
      console.error(`응답 상태: ${err.response.status}`);
      console.error(`응답 텍스트:`, err.response.statusText);
    } catch (logErr) {
      console.error("응답 로깅 실패:", logErr);
    }
  }
  return err;
}

// FAL API 키 확인 및 초기화
let falApiKey: string | undefined;
try {
  falApiKey = import.meta.env.VITE_FAL_API_KEY;
  if (!falApiKey) {
    console.error("⚠️ FAL API 키가 설정되지 않았습니다!");
  } else {
    // SSL 인증서 검증 오류를 우회하기 위한 환경 변수 설정
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    // FAL 클라이언트 설정
    fal.config({
      credentials: falApiKey,
    });
    console.log("✅ FAL API 초기화 성공");
  }
} catch (err) {
  console.error("❌ FAL API 초기화 실패:", err);
}

// Google API 설정 (서비스 계정 사용)
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: GOOGLE_CONFIG.type,
    project_id: GOOGLE_CONFIG.project_id,
    private_key: GOOGLE_CONFIG.private_key,
    client_email: GOOGLE_CONFIG.client_email,
    client_id: GOOGLE_CONFIG.client_id,
  },
  scopes: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const drive = google.drive({
  version: "v3",
  auth: auth,
});

// 이미지를 Google Drive에 업로드하는 함수
async function uploadImageToDrive(
  fileName: string,
  filePath: string,
  mimeType: string
): Promise<any> {
  try {
    console.log(`Google Drive 업로드 시작: ${fileName}`);
    const fileMetadata = {
      name: fileName,
      parents: ["1VI0xMe00k52k4VuYwPwAQZMiZ2V52JiV"], // 지정된 이미지 폴더 ID
    };

    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id,name,webViewLink,webContentLink",
    });

    console.log("Google Drive 업로드 성공:", response.data);
    return response.data;
  } catch (err) {
    throw logError("Google Drive 이미지 업로드 오류", err);
  }
}

// URL에서 이미지 다운로드하여 임시 파일로 저장하는 함수 (node-fetch 대신 http/https 모듈 사용)
async function downloadImage(
  url: string,
  tempFilePath: string
): Promise<boolean> {
  console.log(`이미지 다운로드 시작: ${url}`);
  
  return new Promise((resolve, reject) => {
    // URL 객체를 생성하여 http 또는 https 모듈 선택
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    // https의 경우 SSL 검증 비활성화
    const options: https.RequestOptions = {
      rejectUnauthorized: false // SSL 인증서 검증 비활성화
    };
    
    const request = protocol.get(url, options, (response) => {
      // 리다이렉션 처리
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          console.log(`리다이렉션 발생: ${response.headers.location}`);
          downloadImage(response.headers.location, tempFilePath)
            .then(resolve)
            .catch(reject);
          return;
        }
      }
      
      // 오류 응답 처리
      if (response.statusCode !== 200) {
        return reject(new Error(`Download failed with status ${response.statusCode}`));
      }
      
      // 파일에 응답 데이터 쓰기
      const fileStream = fs.createWriteStream(tempFilePath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`이미지 다운로드 완료: ${tempFilePath}`);
        resolve(true);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(tempFilePath, () => {}); // 실패한 파일 삭제 시도
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    // 타임아웃 설정
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

// KST 날짜 및 시간 가져오기
function getKSTDateTime(): {
  dateStr: string;
  timeStr: string;
  fullDateStr: string;
} {
  const now = new Date();
  // UTC 기준 KST는 +9시간
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  // 날짜 포맷: YYMMDD
  const year = kstDate.getUTCFullYear().toString().slice(2);
  const month = (kstDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = kstDate.getUTCDate().toString().padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // 시간 포맷: HH_MM_SS
  const hours = kstDate.getUTCHours().toString().padStart(2, "0");
  const minutes = kstDate.getUTCMinutes().toString().padStart(2, "0");
  const seconds = kstDate.getUTCSeconds().toString().padStart(2, "0");
  const timeStr = `${hours}_${minutes}_${seconds}`;

  return { dateStr, timeStr, fullDateStr: `${year}${month}${day}` };
}

// 9자리 UUID 생성 함수
function generateUUID(length = 9): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

// FAL API에 요청하기 위한 전역 fetch 함수 재정의
const originalFetch = global.fetch;
global.fetch = async (url, options = {}) => {
  console.log(`보안 fetch 호출: ${url}`);
  const secureOptions = {
    ...options,
    agent: url.toString().startsWith("https:") ? httpsAgent : undefined,
  };

  // 최대 3번 재시도
  let lastError: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Fetch 시도 ${attempt}/3: ${url}`);
      const response = await originalFetch(url, secureOptions);
      return response;
    } catch (err: any) {
      console.warn(`Fetch 실패 (시도 ${attempt}/3):`, err.message);
      lastError = err;
      // 마지막 시도가 아니면 잠시 대기 후 재시도
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // 점점 더 오래 대기
      }
    }
  }

  // 모든 시도 실패 시 마지막 에러 던지기
  throw lastError;
};

export async function POST(request: RequestEvent) {
  console.log("FAL 이미지 생성 요청 받음");
  try {
    const body = await request.request.json();
    const prompt = body.prompt;

    console.log("이미지 프롬프트:", prompt);

    if (!prompt) {
      return json(
        { success: false, message: "프롬프트가 필요합니다." },
        { status: 400 }
      );
    }

    // API 키 확인 로깅
    if (!falApiKey) {
      return json(
        { success: false, message: "FAL API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // FAL AI 이미지 생성 API 호출 (queue API 사용)
    console.log("FAL AI API 호출 시작");
    try {
      console.log("Using FAL API key:", falApiKey ? "✓ Key is set" : "✗ Key is missing");
      
      // 1. 요청 제출하기
      const { request_id } = await fal.queue.submit("fal-ai/imagen4/preview", {
        input: {
          prompt: prompt,
          aspect_ratio: "16:9", // 이미지 비율 설정 (옵션)
          num_images: 1
        },
      });
      
      console.log(`Request submitted with ID: ${request_id}`);
      
      // 2. 결과가 준비될 때까지 상태 확인
      let result;
      let attempts = 0;
      const maxAttempts = 30; // 최대 시도 횟수
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`상태 확인 중 (시도 ${attempts}/${maxAttempts})...`);
        
        // 상태 확인
        const status = await fal.queue.status("fal-ai/imagen4/preview", {
          requestId: request_id,
          logs: true,
        });
        
        console.log(`현재 상태: ${status.status}`);
        
        if (status.status === "COMPLETED") {
          // 3. 결과 가져오기
          result = await fal.queue.result("fal-ai/imagen4/preview", {
            requestId: request_id
          });
          console.log("결과 수신 완료!");
          break;
        }
        
        // 상태가 완료되지 않았으면 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!result) {
        throw new Error("요청 타임아웃 또는 처리 실패");
      }
      
      console.log("FAL AI 응답 결과:", result.data);

      // 이미지 URL 확인
      if (
        !result.data.images ||
        !result.data.images[0] ||
        !result.data.images[0].url
      ) {
        console.error("이미지 URL을 찾을 수 없음:", result.data);
        return json(
          { success: false, message: "이미지 생성 실패: URL을 찾을 수 없음" },
          { status: 500 }
        );
      }

      const imageUrl = result.data.images[0].url;
      console.log("생성된 이미지 URL:", imageUrl);

      // 임시 파일 경로 생성
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `temp_image_${Date.now()}.png`);
      console.log("임시 파일 경로:", tempFilePath);

      // 이미지 다운로드 (node-fetch 대신 native http/https 모듈 사용)
      try {
        await downloadImage(imageUrl, tempFilePath);
      } catch (downloadErr: any) {
        console.error("이미지 다운로드 실패:", downloadErr);
        return json(
          { 
            success: false, 
            message: `이미지 다운로드 실패: ${downloadErr.message}`,
            imageUrl: imageUrl // 클라이언트에게 직접 URL 제공
          },
          { status: 500 }
        );
      }

      // 날짜 및 시간 정보 가져오기
      const { dateStr, timeStr } = getKSTDateTime();

      // 파일 이름 생성
      const fileName = `fal_imgae_${dateStr}_${timeStr}.png`;
      console.log("생성된 파일명:", fileName);

      // Google Drive에 업로드
      const uploadResult = await uploadImageToDrive(
        fileName,
        tempFilePath,
        "image/png"
      );

      // 임시 파일 삭제
      try {
        fs.unlinkSync(tempFilePath);
        console.log("임시 파일 삭제 완료");
      } catch (unlinkErr) {
        console.error("임시 파일 삭제 실패:", unlinkErr);
        // 계속 진행 (치명적인 오류 아님)
      }

      // 프록시 URL 생성 (Google Drive ID 사용)
      const proxyUrl = `/api/blog/image/proxy?id=${uploadResult.id}`;
      
      // 개발 환경에서는 전체 URL 생성을 고려할 수 있음
      // const host = request.url.origin;
      // const proxyUrl = `${host}/api/blog/image/proxy?id=${uploadResult.id}`;

      return json({
        success: true,
        message: "이미지가 Google Drive에 저장되었습니다.",
        image: result.data,
        file: uploadResult,
        fileUrl: proxyUrl,  // 프록시 URL을 반환
      });
    } catch (falError: any) {
      console.error("FAL API 호출 실패:", falError);
      return json(
        {
          success: false,
          message: `FAL API 오류: ${falError.message}`,
          details: falError.stack
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    const errorMsg = err.message || "알 수 없는 오류";
    console.error("FAL AI 이미지 처리 오류:", errorMsg);
    console.error("스택 트레이스:", err.stack);
    
    return json(
      {
        success: false,
        message: `오류가 발생했습니다: ${errorMsg}`,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
