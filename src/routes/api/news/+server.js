import { json } from "@sveltejs/kit";

// API 키 상수 정의
const API_KEY = "066aa6d29a0d4915b37066d6bb41b117";

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ url, request }) {
    console.log("API 요청 받음:", url.toString());
    console.log("요청 헤더:", Object.fromEntries(request.headers.entries()));

    // URL 쿼리 파라미터에서 회사 이름과 날짜 가져오기
    const companyName = url.searchParams.get("company_name") || "";
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to") || dateFrom;
    const pageSize = url.searchParams.get("page_size") || "10";

    console.log("검색 회사:", companyName);
    console.log("검색 날짜(시작):", dateFrom);
    console.log("검색 날짜(끝):", dateTo);
    console.log("검색 페이지 크기:", pageSize);

    // 실제 외부 API 호출 코드
    // 기본 URL 생성
    const baseUrl = "https://api-v2.deepsearch.com/v1/articles";

    // URL 파라미터 구성
    const params = new URLSearchParams({
        // URL 파라미터로 API 키 전달
        keyword: companyName,
        page_size: pageSize,
        page: "1",
        api_key: API_KEY,
    });

    // 날짜가 제공된 경우 추가
    if (dateFrom) {
        params.append("date_from", dateFrom);
    }
    if (dateTo) {
        params.append("date_to", dateTo);
    }

    // 전체 URL 구성
    const apiUrl = `${baseUrl}?${params.toString()}`;
    console.log("외부 API 호출 URL:", apiUrl);

    try {
        // SSL 인증서 검증 비활성화 (주의: 보안상 취약점이 될 수 있습니다)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        // 외부 API 요청 수행 - Authorization 헤더 추가
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${API_KEY}`, // Bearer 토큰으로 API 키 전달
                Accept: "application/json",
            },
        });

        // SSL 검증을 다시 활성화
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";

        // 응답 상태 로그
        console.log("API 응답 상태 코드:", response.status);
        console.log(
            "API 응답 헤더:",
            Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
            console.error("외부 API 응답 실패:", response.status);
            let errorText;
            try {
                errorText = await response.text();
                console.error("에러 응답:", errorText);
            } catch (textErr) {
                errorText = "응답 텍스트를 읽을 수 없음";
                console.error("응답 텍스트 읽기 오류:", textErr);
            }

            return json({
                error: `API 요청 실패: ${response.status}`,
                details: errorText,
            }, {
                status: response.status,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                },
            });
        }

        // 응답 데이터 처리
        const data = await response.json();
        console.log("외부 API 응답 성공", data);

        return json({
            data: data.data,
        });
    } catch (error) {
        // SSL 검증을 다시 활성화 (에러 발생 시에도)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";

        console.error("뉴스 API 요청 오류:", error);
        return json({
            error: "서버 오류가 발생했습니다",
            details: error instanceof Error ? error.message : String(error),
            stack: process.env.NODE_ENV === "development" ?
                error instanceof Error ?
                error.stack :
                undefined :
                undefined,
        }, {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
            },
        });
    }
}

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export function OPTIONS() {
    return json({}, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}