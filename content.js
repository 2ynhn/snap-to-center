class MediaScrollNavigator {
  constructor() {
      this.settings = {
          minWidth: 200,
          minHeight: 200,
          minCount: 3,
          autoRun: false
      };
      this.mediaElements = [];
      this.isActive = false;
      this.currentIndex = -1;
      this.updateInterval = null;
      this.lastScrollTime = 0;
      this.userScrolled = false;
      
      this.init();
  }

  init() {
      this.loadSettings().then(() => {
          if (this.settings.autoRun) {
              this.activate();
          }
      });
      
      // 키보드 이벤트 리스너
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      
      // 스크롤 감지
      document.addEventListener('scroll', this.handleScroll.bind(this));
      document.addEventListener('wheel', this.handleUserScroll.bind(this));
      document.addEventListener('keydown', this.handleArrowKeys.bind(this));
      
      // 메시지 리스너 (팝업에서 설정 변경 알림)
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (request.action === 'updateSettings') {
              this.settings = request.settings;
              this.checkAndActivate();
          }
      });
  }

  async loadSettings() {
      return new Promise((resolve) => {
          chrome.storage.sync.get(this.settings, (result) => {
              this.settings = result;
              resolve();
          });
      });
  }

  activate() {
      this.updateMediaElements();
      if (this.mediaElements.length >= this.settings.minCount) {
          this.isActive = true;
          this.startUpdateInterval();
          console.log(`미디어 스크롤 활성화: ${this.mediaElements.length}개 미디어 감지`);
      } else {
          this.deactivate();
      }
  }

  deactivate() {
      this.isActive = false;
      this.stopUpdateInterval();
      this.currentIndex = -1;
      console.log('미디어 스크롤 비활성화');
  }

  checkAndActivate() {
      this.updateMediaElements();
      if (this.mediaElements.length >= this.settings.minCount) {
          if (!this.isActive) {
              this.activate();
          }
      } else {
          this.deactivate();
      }
  }

  startUpdateInterval() {
      this.stopUpdateInterval();
      this.updateInterval = setInterval(() => {
          this.updateMediaElements();
          if (this.mediaElements.length < this.settings.minCount) {
              this.deactivate();
          }
      }, 3000);
  }

  stopUpdateInterval() {
      if (this.updateInterval) {
          clearInterval(this.updateInterval);
          this.updateInterval = null;
      }
  }

  updateMediaElements() {
      const elements = [];
      const imgs = document.querySelectorAll('img');
      const videos = document.querySelectorAll('video');
      
      [...imgs, ...videos].forEach(el => {
          // 숨겨진 요소 제외
          if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
          
          const rect = el.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(el);
          
          // display:none이나 visibility:hidden 제외
          if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return;
          
          // 실제 크기나 CSS 크기 중 하나라도 조건 만족하면 포함
          const actualWidth = el.naturalWidth || el.videoWidth || rect.width;
          const actualHeight = el.naturalHeight || el.videoHeight || rect.height;
          const cssWidth = rect.width;
          const cssHeight = rect.height;
          
          if ((actualWidth >= this.settings.minWidth && actualHeight >= this.settings.minHeight) ||
              (cssWidth >= this.settings.minWidth && cssHeight >= this.settings.minHeight)) {
              elements.push({
                  element: el,
                  top: rect.top + window.scrollY,
                  width: Math.max(actualWidth, cssWidth),
                  height: Math.max(actualHeight, cssHeight)
              });
          }
      });
      
      // Y 좌표 순으로 정렬
      elements.sort((a, b) => a.top - b.top);
      this.mediaElements = elements;
  }

  handleKeyDown(e) {
      // 입력 요소에 포커스가 있으면 무시
      const activeElement = document.activeElement;
      if (activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'BUTTON' ||
          activeElement.tagName === 'A' ||
          activeElement.isContentEditable
      )) {
          return;
      }

      if (!this.isActive) {
          return; // 기본 동작 허용
      }

      if (e.key === 'PageDown') {
          e.preventDefault();
          this.scrollToNext();
      } else if (e.key === 'PageUp') {
          e.preventDefault();
          this.scrollToPrevious();
      }
  }

  handleScroll() {
      this.lastScrollTime = Date.now();
  }

  handleUserScroll(e) {
      if (e.deltaY !== 0) {
          this.userScrolled = true;
          setTimeout(() => {
              this.userScrolled = false;
          }, 100);
      }
  }

  handleArrowKeys(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          this.userScrolled = true;
          setTimeout(() => {
              this.userScrolled = false;
          }, 100);
      }
  }

  getCurrentVisibleMedia() {
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + window.innerHeight;
      
      // 현재 화면에 보이는 미디어들을 찾기
      const visibleMedias = [];
      
      this.mediaElements.forEach((media, index) => {
          const mediaTop = media.top;
          const mediaBottom = mediaTop + media.height;
          
          // 화면에 보이는 미디어인지 확인 (일부라도 보이면 포함)
          if (mediaBottom > viewportTop && mediaTop < viewportBottom) {
              // 화면에 보이는 영역 비율 계산
              const visibleTop = Math.max(mediaTop, viewportTop);
              const visibleBottom = Math.min(mediaBottom, viewportBottom);
              const visibleHeight = visibleBottom - visibleTop;
              const visibilityRatio = visibleHeight / media.height;
              
              visibleMedias.push({
                  index: index,
                  visibilityRatio: visibilityRatio,
                  top: mediaTop
              });
          }
      });
      
      if (visibleMedias.length === 0) {
          return -1;
      }
      
      // 가장 많이 보이는 미디어를 우선으로, 같다면 위쪽에 있는 것을 선택
      visibleMedias.sort((a, b) => {
          if (Math.abs(a.visibilityRatio - b.visibilityRatio) < 0.1) {
              return a.top - b.top; // 비슷한 가시성이면 위쪽 우선
          }
          return b.visibilityRatio - a.visibilityRatio; // 더 많이 보이는 것 우선
      });
      
      return visibleMedias[0].index;
  }

  scrollToNext() {
      if (this.mediaElements.length === 0) return;
      
      let targetIndex;
      const currentVisible = this.getCurrentVisibleMedia();
      
      if (currentVisible === -1) {
          // 현재 보이는 미디어가 없으면 첫 번째 미디어로
          targetIndex = 0;
      } else {
          // 현재 보이는 미디어의 다음 미디어로
          targetIndex = currentVisible + 1;
      }
      
      if (targetIndex >= this.mediaElements.length) {
          return; // 마지막 미디어에 도달했으면 아무것도 하지 않음
      }
      
      this.currentIndex = targetIndex;
      this.scrollToMedia(targetIndex);
  }

  scrollToPrevious() {
      if (this.mediaElements.length === 0) return;
      
      let targetIndex;
      const currentVisible = this.getCurrentVisibleMedia();
      
      if (currentVisible === -1) {
          // 현재 보이는 미디어가 없으면 마지막 미디어로
          targetIndex = this.mediaElements.length - 1;
      } else {
          // 현재 보이는 미디어의 이전 미디어로
          targetIndex = currentVisible - 1;
      }
      
      if (targetIndex < 0) {
          return; // 첫 번째 미디어에 도달했으면 아무것도 하지 않음
      }
      
      this.currentIndex = targetIndex;
      this.scrollToMedia(targetIndex);
  }

  scrollToMedia(index) {
      if (index < 0 || index >= this.mediaElements.length) return;
      
      const media = this.mediaElements[index];
      const targetScrollY = media.top - 20; // 약간 여백을 두고 표시
      
      window.scrollTo({
          top: Math.max(0, targetScrollY),
          behavior: 'smooth'
      });
      
      // 스크롤 후 사용자 스크롤 플래그 리셋
      setTimeout(() => {
          this.userScrolled = false;
      }, 500);
  }
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
      new MediaScrollNavigator();
  });
} else {
  new MediaScrollNavigator();
}