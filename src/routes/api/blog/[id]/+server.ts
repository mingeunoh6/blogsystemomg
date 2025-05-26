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
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
});

const sheets = google.sheets({
  version: "v4",
  auth: auth,
});

const drive = google.drive({
  version: "v3",
  auth: auth,
});

// 스프레드시트에서 특정 ID의 글 데이터 가져오기
async function getArticleById(id: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
    });

    const rows = response.data.values || [];

    // 첫 번째 행은 헤더로 간주
    const headers = rows[0] || [];

    // ID와 일치하는 행 찾기
    const articleRow = rows.slice(1).find((row) => row[0] === id);

    if (!articleRow) {
      return null;
    }

    // 글 데이터 구성
    const article = {
      id: articleRow[0] || "",
      date: articleRow[1] || "",
      time: articleRow[2] || "",
      author: articleRow[3] || "",
      title: articleRow[4] || "",
      link: articleRow[5] || "",
      content: null, // JSON 파일 내용은 별도로 가져옴
    };

    return article;
  } catch (err) {
    console.error("스프레드시트 데이터 로드 오류:", err);
    throw err;
  }
}

// 구글 드라이브에서 JSON 파일 내용 가져오기
async function getJsonContent(driveUrl: string) {
  try {
    // 드라이브 URL에서 파일 ID 추출
    const fileIdMatch = driveUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
      throw new Error("유효한 드라이브 URL이 아닙니다.");
    }

    const fileId = fileIdMatch[0];

    // 파일 내용 가져오기
    const response = await drive.files.get({
      fileId: fileId,
      alt: "media",
    });

    return response.data;
  } catch (err) {
    console.error("드라이브 파일 로드 오류:", err);
    throw err;
  }
}

// GET 요청 처리
export async function GET({ params }: RequestEvent) {
  try {
    const id = params.id;

    if (!id) {
      return error(400, {
        message: "ID가 필요합니다.",
      });
    }

    const article = await getArticleById(id);

    if (!article) {
      return error(404, {
        message: "글을 찾을 수 없습니다.",
      });
    }

    // JSON 파일 내용 가져오기
    if (article.link) {
      try {
        article.content = await getJsonContent(article.link);
      } catch (err) {
        console.error("JSON 파일 로드 오류:", err);
        // JSON 로드 실패해도 다른 정보는 반환
      }
    }

    return json({
      success: true,
      data: article,
    });
  } catch (err) {
    console.error("서버 에러:", err);
    return error(500, {
      message: "데이터를 가져오는 중 오류가 발생했습니다.",
    });
  }
}
