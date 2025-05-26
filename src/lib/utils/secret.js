/**
 * Google Drive API 서비스 계정 설정
 */

export const GOOGLE_CONFIG = {
    type: "service_account",
    project_id: "otrai-461007",
    // 보안을 위해 중요 정보는 실제 배포 시 환경 변수로 관리해야 합니다
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6dyt8by14eNp+\nJLZgUzKippiisJL2rwTIEnyq7skwi2HhgoUnWXP7bdo0iNXulWRIZv3hJXpHr8V3\ntvwXxXWegGbJeXiGDQioHULlOz0iqcvn9UZKL2FxyoWltgF7Fj/yC9/GepN8qJ+L\nW/GWza/sx+6RNiTltU274KtngZq6Qa6x3AV6YCWJ0ADg2gim5ZhWNo92WR1JE5b8\nJZe8TequlxEWwyGswpRrp8a8IgzCk93hEmNFVmrsSlWifnMx9RqRhYzRfAvHvqUe\njrtlN1XeuIJWnNChxtYadocM/mkZYueaCdYfJC5hPlmC9pIvIZ9dL+gM7MsLISt7\nh0jrnPOzAgMBAAECggEAKXv+2EHR33YfwiW/z4FjCA3BcpyPLcO1cB+wzcSvTRYN\nckL8BcuggqUngT2aPujMtVD4lcElSdKgv6gdwNok910AwT09o7E9pk1QRzidOtuE\n6nfGqhWNe+f/QOVTwgMqudqLcBhwPLE1Qad0gcUEKU031eWyYsqp3y02ZSJP/rTh\nxdIyDFHM77J68WpIv3xa4XkR7PWa6zBMqhkYyAys+jcVMNurdX4Sbxb4i5bXtbVr\nv6ZhRqJECE1JaQLC2Hhx2v+Fy4X8l2DEpN30hrYEOeas5J0bYdsgb39+PVynmb+z\nOVGjZCZdervkR3dsyj0Pzr6doAvmQxXvl0a8iKaOsQKBgQDqul/dg2O87XecrHl1\nF0dlNpnlOVFow5cdskJj3TOMMwDKR1YWcBSujHJP/A2gqWltFB4hRDRkVwFwjTae\nUykLWXdw6gBXdZ3YtmGSPRRF02k8yYQmmmAYs0uKrKyudDC1QD2ecbW0msfyXABf\nn/h8peCZok0fNyRGD1vzLx99IwKBgQDLXR5HA+t8v9twimxszDLxK8fDG717bWtp\nCDDYSbkOGMVwL55FJfNHSbcrQotRVue2nhcjMv78hXoqs/SMkon3cCUzdQLIUkei\nvXqOla2+RUlyNn41jULUSYphpI8hBqLSLZt//hiLyabIbt/cDvB+YSESBiG98qhe\nzc+Hb3IAMQKBgQCdwXDYoYuQ2FCBffGLXn/faFj6FBHAxWN00++Gyo3wdf7b9CHJ\npr5fqYjSdOZ7yiBO7Sxq0zobDdar3FyO//kf5Zs+yiY8oZHaqojdDivn2fRqpE0q\n3KolL6tfojnUbcamqmw/ZtDmdvhWzLp7ijopHBrdZpVKm3bHl18HC+6v3QKBgDf4\nL94RqR0TXJyzrDWhWZ/gkcEUAGlY6wfkNjVAzQqhLK28nU2grT0Af8YLMXa4eVtc\nVTfd0CnFvqLEFlkd95S/K63m1VY2tvqGNZXKgh/sx9MERmYMs8jjWI+ZD79iKSu5\nW6O1ViIa5KkjQr846V2O8+AXCfBSOZ6l/CjlNjXxAoGBAN1WPDmQO89t8QNDLJF4\nv8QzICoxlA4Yr1xM664Z7IEmXCrmlpsmAD/RLJS2/KIhAHiYK7f9AhKvIT6/hJL3\nFo5Ztc+nlkNOLyJxVOq8TYBXbp/4sYLr6/BhLNWIn+3xSrPGzGRbq1Yb78jIfZsR\nWUTtiHsmqz5kuUcWeynhr/zq\n-----END PRIVATE KEY-----\n", // 실제 배포 시 환경 변수로 관리
    client_email: "otrai-293@otrai-461007.iam.gserviceaccount.com",
    client_id: "110274356733509334052",
    folder_id: "1WmmlGQb7l9p1suG1fJSIrc28o4anknyN", // 구글 드라이브 폴더 ID
};

/**
 * 참고: 서비스 계정 사용 시 필요한 설정
 *
 * 1. Google Cloud Console에서 서비스 계정 생성
 * 2. 서비스 계정에 필요한 권한 부여 (Drive API 접근 권한)
 * 3. 키 파일 생성 (JSON)
 * 4. 폴더 공유 설정: 업로드할 Google Drive 폴더를 서비스 계정 이메일(client_email)과 공유해야 함
 */