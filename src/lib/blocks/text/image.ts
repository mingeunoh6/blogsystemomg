import { Block } from "./Block";

export default class ImageBlock extends Block {
  private imageUrl: string | null = null;
  private imageElement: HTMLImageElement | null = null;
  private uploadButton: HTMLButtonElement | null = null;
  private imageContainer: HTMLDivElement | null = null;

  constructor(
    parent: HTMLElement,
    imageUrl: string | null = null,
    readOnly: boolean = false
  ) {
    super(parent, "image", readOnly);
    this.imageUrl = imageUrl;
    this.init();
  }

  init() {
    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "image-block-wrapper";
    this.parent.appendChild(wrapper);

    // Create image container with 16:9 aspect ratio
    this.imageContainer = document.createElement("div");
    this.imageContainer.className = "image-container";
    this.imageContainer.style.width = "100%";
    this.imageContainer.style.position = "relative";
    this.imageContainer.style.paddingBottom = "56.25%"; // 16:9 aspect ratio
    this.imageContainer.style.backgroundColor = "#f5f5f5";
    this.imageContainer.style.border = this.readOnly
      ? "none"
      : "1px dashed #aaa";
    this.imageContainer.style.borderRadius = "4px";
    this.imageContainer.style.overflow = "hidden";

    // 이미지 컨테이너에서 contextmenu 이벤트 가로채기
    if (!this.readOnly) {
      this.imageContainer.addEventListener(
        "contextmenu",
        this.handleContextMenu.bind(this)
      );
    }

    wrapper.appendChild(this.imageContainer);

    // Create the element but don't add styles yet
    this.element = document.createElement("div");

    // Add the element to the wrapper
    wrapper.appendChild(this.element);

    // Setup element with Block's context menu functionality
    // This will set the element's class, ID, and add event listeners
    super.setupElement("image-block-content", {
      display: "none", // 메타데이터 div는 숨김
    });

    // If we have an image URL, display the image
    if (this.imageUrl) {
      this.displayImage(this.imageUrl);
    } else if (!this.readOnly) {
      // Otherwise, create upload button (only in edit mode)
      this.createUploadButton();
    }
  }

  // 컨텍스트 메뉴 이벤트 핸들러
  private handleContextMenu(e: MouseEvent) {
    e.preventDefault(); // 브라우저 기본 컨텍스트 메뉴 방지

    // Block 클래스의 showContextMenu 메소드 호출
    this.showContextMenu(e);
  }

  private createUploadButton() {
    this.uploadButton = document.createElement("button");
    this.uploadButton.className = "upload-image-button";
    this.uploadButton.innerHTML = "이미지 업로드";
    this.uploadButton.style.position = "absolute";
    this.uploadButton.style.top = "50%";
    this.uploadButton.style.left = "50%";
    this.uploadButton.style.transform = "translate(-50%, -50%)";
    this.uploadButton.style.padding = "10px 15px";
    this.uploadButton.style.backgroundColor = "#fff";
    this.uploadButton.style.border = "1px solid #ddd";
    this.uploadButton.style.borderRadius = "4px";
    this.uploadButton.style.cursor = "pointer";
    this.uploadButton.style.fontSize = "14px";
    this.uploadButton.style.zIndex = "1";

    this.uploadButton.addEventListener(
      "click",
      this.handleUploadClick.bind(this)
    );

    if (this.imageContainer) {
      this.imageContainer.appendChild(this.uploadButton);
    }
  }

  private handleUploadClick() {
    // Create a file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    // Handle file selection
    fileInput.addEventListener("change", async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const file = files[0];

      try {
        // Create FormData for upload
        const formData = new FormData();
        formData.append("image", file);

        // Show loading state
        if (this.uploadButton) {
          this.uploadButton.innerHTML = "업로드 중...";
          this.uploadButton.disabled = true;
        }

        // Upload image to Google Drive via our server endpoint
        const response = await fetch("/api/blog/image", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.fileUrl) {
          // Set the image URL and display the image
          this.imageUrl = result.fileUrl;
          this.displayImage(result.fileUrl);
        } else {
          alert("이미지 업로드 실패: " + (result.message || "알 수 없는 오류"));
          // Reset upload button
          if (this.uploadButton) {
            this.uploadButton.innerHTML = "이미지 업로드";
            this.uploadButton.disabled = false;
          }
        }
      } catch (err) {
        console.error("이미지 업로드 오류:", err);
        alert("이미지 업로드 중 오류가 발생했습니다.");
        // Reset upload button
        if (this.uploadButton) {
          this.uploadButton.innerHTML = "이미지 업로드";
          this.uploadButton.disabled = false;
        }
      }

      // Remove the file input
      document.body.removeChild(fileInput);
    });

    // Append to document and trigger click
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  private displayImage(url: string) {
    if (!this.imageContainer) return;

    // Remove upload button if it exists
    if (this.uploadButton) {
      this.uploadButton.remove();
      this.uploadButton = null;
    }

    // Create or update image element
    if (!this.imageElement) {
      this.imageElement = document.createElement("img");
      this.imageElement.className = "blog-image";
      this.imageElement.style.position = "absolute";
      this.imageElement.style.top = "0";
      this.imageElement.style.left = "0";
      this.imageElement.style.width = "100%";
      this.imageElement.style.height = "100%";
      this.imageElement.style.objectFit = "contain";
      this.imageElement.alt = "Blog post image";

      // 이미지 요소에서도 contextmenu 이벤트 가로채기
      if (!this.readOnly) {
        this.imageElement.addEventListener(
          "contextmenu",
          this.handleContextMenu.bind(this)
        );
      }

      // 이미지 로딩 오류 처리
      this.imageElement.onerror = () => {
        console.error("이미지 로딩 실패:", url);

        // 이미지 로드 실패 시 대체 텍스트 표시
        if (this.imageContainer) {
          const errorMessage = document.createElement("div");
          errorMessage.style.position = "absolute";
          errorMessage.style.top = "50%";
          errorMessage.style.left = "50%";
          errorMessage.style.transform = "translate(-50%, -50%)";
          errorMessage.style.color = "#f44336";
          errorMessage.style.textAlign = "center";
          errorMessage.innerHTML =
            "이미지를 불러올 수 없습니다.<br>다시 시도해주세요.";

          this.imageContainer.appendChild(errorMessage);

          // 이미지 요소는 숨김
          if (this.imageElement) {
            this.imageElement.style.display = "none";
          }
        }
      };

      this.imageContainer.appendChild(this.imageElement);
    }

    // 원본 URL 저장
    this.imageUrl = url;

    // 이미지 로딩 시작 표시
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "image-loading";
    loadingIndicator.style.position = "absolute";
    loadingIndicator.style.top = "50%";
    loadingIndicator.style.left = "50%";
    loadingIndicator.style.transform = "translate(-50%, -50%)";
    loadingIndicator.style.color = "#666";
    loadingIndicator.textContent = "이미지 로딩 중...";
    this.imageContainer.appendChild(loadingIndicator);

    // 이미지 로드 완료 시 로딩 표시 제거
    this.imageElement.onload = () => {
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }

      // 이미지 표시
      if (this.imageElement) {
        this.imageElement.style.display = "block";
      }
    };

    // 구글 드라이브 URL 처리
    let imageUrl = url;

    // 이미 프록시 URL인 경우 변환하지 않음
    if (url.includes("/api/blog/image/proxy")) {
      imageUrl = url;
    }
    // 구글 드라이브 파일 링크 패턴 확인
    else {
      const googleDrivePattern = /drive\.google\.com\/file\/d\/([^/]+)/;
      const match = url.match(googleDrivePattern);

      if (match && match[1]) {
        // 파일 ID 추출
        const fileId = match[1];
        console.log("Google Drive 파일 ID 감지:", fileId);

        // 프록시 URL로 변환 (상대 경로 사용)
        imageUrl = `/api/blog/image/proxy?id=${fileId}`;

        // 개발 환경에서는 전체 URL로 변환 (필요한 경우 주석 해제)
        // const host = window.location.origin;
        // imageUrl = `${host}/api/blog/image/proxy?id=${fileId}`;

        console.log("변환된 이미지 URL:", imageUrl);
      }
    }

    // 이미지 소스 설정
    this.imageElement.src = imageUrl;

    // If in edit mode, add a change image button
    if (!this.readOnly) {
      const changeButton = document.createElement("button");
      changeButton.className = "change-image-button";
      changeButton.innerHTML = "이미지 변경";
      changeButton.style.position = "absolute";
      changeButton.style.bottom = "10px";
      changeButton.style.right = "10px";
      changeButton.style.padding = "5px 10px";
      changeButton.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
      changeButton.style.color = "#fff";
      changeButton.style.border = "none";
      changeButton.style.borderRadius = "4px";
      changeButton.style.cursor = "pointer";
      changeButton.style.fontSize = "12px";
      changeButton.style.zIndex = "1";

      // 변경 버튼에도 contextmenu 이벤트 가로채기 추가
      changeButton.addEventListener(
        "contextmenu",
        this.handleContextMenu.bind(this)
      );

      changeButton.addEventListener("click", this.handleUploadClick.bind(this));
      this.imageContainer.appendChild(changeButton);
    }
  }

  toJSON() {
    return {
      id: this.element.id,
      type: this.type,
      imageUrl: this.imageUrl,
    };
  }
}
