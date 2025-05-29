/**
 * 뉴스 데이터를 가져오는 함수
 * @param {string} company - 검색할 회사 이름
 * @param {string} [dateFrom] - 검색 시작 날짜 (선택적)
 * @param {string} [dateTo] - 검색 종료 날짜 (선택적, 기본값은 시작 날짜와 동일)
 * @param {number} [pageSize=10] - 페이지당 결과 수
 * @returns {Promise<Object>} 뉴스 데이터
 */
export async function getWorldNews(
    company,
    dateFrom,
    dateTo = dateFrom,
    pageSize = 10
) {
    try {
        // 기본 URL 생성 (상대 경로 사용)
        const baseUrl = "api/news";

        // URL 파라미터 구성
        const params = new URLSearchParams({
            company_name: company,
            page_size: String(pageSize),
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
        console.log("API 요청 URL:", apiUrl);

        // 요청 수행
        const response = await fetch(apiUrl);
        console.log("API 응답 상태:", response.status);

        // 응답 확인 및 처리
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API 오류 응답:", errorText);
            throw new Error(`API 요청 실패: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("뉴스 데이터 수신:", data);
        return data;
    } catch (error) {
        console.error("뉴스 API 호출 오류:", error);
        throw error;
    }
}