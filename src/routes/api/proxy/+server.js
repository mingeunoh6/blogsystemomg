import { json } from "@sveltejs/kit";

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ url, fetch }) {
    // 대상 URL 가져오기
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
        return json({ error: "URL 파라미터가 필요합니다" }, { status: 400 });
    }

    console.log("프록시 요청:", targetUrl);

    try {
        // Node.js 환경에서 실행될 때 SSL 검증 비활성화 (개발 환경 전용)
        if (typeof process !== "undefined" && process.env) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }

        // 외부 URL에 요청
        const response = await fetch(targetUrl);

        // 요청 상태 확인
        if (!response.ok) {
            console.error("프록시 요청 실패:", response.status, response.statusText);
            return json({ error: `요청 실패: ${response.status}`, url: targetUrl }, { status: response.status });
        }

        // 원본 콘텐츠 가져오기
        const content = await response.text();

        // 응답 반환
        return json({
            url: targetUrl,
            content: content,
        });
    } catch (error) {
        console.error("프록시 요청 오류:", error);
        return json({
            error: "요청 처리 중 오류 발생",
            message: error.message,
            url: targetUrl,
        }, { status: 500 });
    } finally {
        // SSL 검증 다시 활성화
        if (typeof process !== "undefined" && process.env) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
        }
    }
}