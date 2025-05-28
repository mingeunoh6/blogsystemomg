import { google } from "googleapis";
import { error, json } from "@sveltejs/kit";
import { GOOGLE_CONFIG } from "$lib/utils/secret";
import type { RequestEvent } from "@sveltejs/kit";
import fs from "fs";
import path from "path";
import os from "os";

// Google API 설정 (서비스 계정 사용)
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: GOOGLE_CONFIG.type,
    project_id: GOOGLE_CONFIG.project_id,
    private_key: GOOGLE_CONFIG.private_key,
    client_email: GOOGLE_CONFIG.client_email,
    client_id: GOOGLE_CONFIG.client_id,
  },
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({
  version: "v3",
  auth: auth,
});

// 9자리 UUID 생성 함수
function generateUUID(length = 9): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

// KST 날짜 및 시간 가져오기
function getKSTDateTime() {
  const now = new Date();
  // UTC 기준 KST는 +9시간
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  // 날짜 포맷: YYMMDD
  const year = kstDate.getUTCFullYear().toString().slice(2);
  const month = (kstDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = kstDate.getUTCDate().toString().padStart(2, "0");
  const fullDateStr = `${year}${month}${day}`;

  return { fullDateStr };
}

// 이미지를 Google Drive에 업로드하는 함수
async function uploadImageToDrive(
  fileName: string,
  filePath: string,
  mimeType: string
) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: ["1ufdVeVSG9r_bgeU3ewEkWSCwGEwR5eeg"], // 지정된 이미지 폴더 ID
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

    return response.data;
  } catch (err) {
    console.error("Google Drive 이미지 업로드 오류:", err);
    throw err;
  }
}

// POST 요청 처리 - 이미지 업로드
export async function POST({ request, url }: RequestEvent) {
  let tempFilePath = "";

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return error(400, {
        message: "이미지 파일이 제공되지 않았습니다.",
      });
    }

    // 파일 정보 확인
    const mimeType = imageFile.type;
    if (!mimeType.startsWith("image/")) {
      return error(400, {
        message: "유효한 이미지 파일이 아닙니다.",
      });
    }

    // 파일 확장자 추출
    const fileExtension = mimeType.split("/")[1];

    // UUID 생성
    const uuid = generateUUID();

    // 날짜 가져오기
    const { fullDateStr } = getKSTDateTime();

    // 파일 이름 생성 (UUID_날짜.확장자)
    const fileName = `${uuid}_${fullDateStr}.${fileExtension}`;

    // 파일 데이터를 Buffer로 변환
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 임시 파일 생성
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, fileName);

    // 버퍼 데이터를 임시 파일에 쓰기
    fs.writeFileSync(tempFilePath, buffer);

    // Google Drive에 업로드
    const uploadResult = await uploadImageToDrive(
      fileName,
      tempFilePath,
      mimeType
    );

    // 프록시 URL 생성 (상대 경로로 변환)
    const origin = url.origin;
    const proxyUrl = `${origin}/api/blog/image/proxy?id=${uploadResult.id}`;

    // 성공 응답 반환
    return json({
      success: true,
      message: "이미지가 성공적으로 업로드되었습니다.",
      file: uploadResult,
      fileUrl: proxyUrl,
      uuid: uuid,
      fileId: uploadResult.id,
    });
  } catch (err) {
    console.error("이미지 업로드 서버 에러:", err);
    return error(500, {
      message: "이미지 업로드 중 오류가 발생했습니다.",
    });
  } finally {
    // 임시 파일 삭제
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error("임시 파일 삭제 실패:", e);
      }
    }
  }
}
