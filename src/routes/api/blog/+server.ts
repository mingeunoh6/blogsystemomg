import { google } from "googleapis";
import { error, json } from "@sveltejs/kit";
import { GOOGLE_CONFIG } from "$lib/utils/secret";
import type { RequestEvent } from "@sveltejs/kit";

// 스프레드시트 ID
const SPREADSHEET_ID = "1qqCq42rQd9zyAQ-EpQxnwMBPu095MKfsUGRg8EL9oak";
const SHEET_NAME = "BLOG";

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

const sheets = google.sheets({
  version: "v4",
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
  const dateStr = `${year}${month}${day}`;

  // 시간 포맷: HH:MM:SS
  const hours = kstDate.getUTCHours().toString().padStart(2, "0");
  const minutes = kstDate.getUTCMinutes().toString().padStart(2, "0");
  const seconds = kstDate.getUTCSeconds().toString().padStart(2, "0");
  const timeStr = `${hours}:${minutes}:${seconds}`;

  return { dateStr, timeStr, fullDateStr: `${year}${month}${day}` };
}

// JSON 파일을 Google Drive에 업로드하는 함수
async function uploadJsonToDrive(fileName: string, jsonContent: any) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [GOOGLE_CONFIG.folder_id], // 지정된 폴더에 업로드
    };

    const media = {
      mimeType: "application/json",
      body: JSON.stringify(jsonContent, null, 2),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id,name,webViewLink",
    });

    return response.data;
  } catch (err) {
    console.error("Google Drive 업로드 오류:", err);
    throw err;
  }
}

// 스프레드시트에 데이터 추가
async function addRowToSpreadsheet(rowData: string[]) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowData],
      },
    });

    console.log("스프레드시트에 데이터가 추가되었습니다.");
  } catch (err) {
    console.error("스프레드시트 업데이트 오류:", err);
    throw err;
  }
}

// POST 요청 처리
export async function POST({ request }: RequestEvent) {
  try {
    const data = await request.json();

    // UUID 생성
    const uuid = generateUUID();

    // 날짜 및 시간 가져오기
    const { dateStr, timeStr, fullDateStr } = getKSTDateTime();

    // 파일 이름 생성 (UUID_날짜)
    const fileName = `${uuid}_${fullDateStr}.json`;

    // Google Drive에 업로드
    const uploadResult = await uploadJsonToDrive(fileName, data);

    // 스프레드시트에 데이터 추가
    await addRowToSpreadsheet([
      uuid, // ID
      dateStr, // 날짜
      timeStr, // 시간(KST)
      "OTR", // 작성자
      data.title, // 제목
      uploadResult.webViewLink, // 본문 데이터 링크
    ]);

    // 성공 응답 반환
    return json({
      success: true,
      message:
        "JSON 파일이 Google Drive에 업로드되었고, 스프레드시트에 기록되었습니다.",
      file: uploadResult,
      uuid: uuid,
    });
  } catch (err) {
    console.error("서버 에러:", err);
    return error(500, {
      message: "파일 업로드 중 오류가 발생했습니다.",
    });
  }
}
