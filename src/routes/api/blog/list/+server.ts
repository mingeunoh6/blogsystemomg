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
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({
  version: "v4",
  auth: auth,
});

// 스프레드시트에서 데이터 가져오기
async function getSheetData() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
    });

    const rows = response.data.values || [];

    // 첫 번째 행은 헤더로 간주하고 제외
    const headers = rows[0] || [];
    const data = rows.slice(1).map((row) => {
      // 각 행을 객체로 변환
      const item: Record<string, string> = {};
      headers.forEach((header, index) => {
        item[header.toLowerCase()] = row[index] || "";
      });

      // 헤더가 없더라도 기본 필드 보장
      return {
        id: row[0] || "",
        date: row[1] || "",
        time: row[2] || "",
        author: row[3] || "",
        title: row[4] || "",
        link: row[5] || "",
      };
    });

    return data;
  } catch (err) {
    console.error("스프레드시트 데이터 로드 오류:", err);
    throw err;
  }
}

// GET 요청 처리
export async function GET({ request }: RequestEvent) {
  try {
    const articles = await getSheetData();

    return json({
      success: true,
      data: articles,
    });
  } catch (err) {
    console.error("서버 에러:", err);
    return error(500, {
      message: "데이터를 가져오는 중 오류가 발생했습니다.",
    });
  }
}
