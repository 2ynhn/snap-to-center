class ImageNavigator {
  constructor() {
    this.isActive = false;
    this.images = [];
    this.currentIndex = -1;
    this.settings = { width: 200, height: 200, count: 3 };
    this.userScrolled = false;
    this.lastScrollPosition = 0;
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }
  
  // 조건에 맞는 이미지 찾기
  findValidImages() {
    const allImages = document.querySelectorAll('img');
    const validImages = [];
    
    allImages.forEach(img => {
      // 이미지가 로드되었고 보이는 상태인지 확인
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const rect = img.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(img);
        
        // display: none이나 visibility: hidden인 이미지 제외
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          return;
        }
        
        // 실제 렌더링된 크기가 조건을 만족하는지 확인
        const width = Math.max(img.naturalWidth, rect.width);
        const height = Math.max(img.naturalHeight, rect.height);
        
        if (width >= this.settings.width && height >= this.settings.height) {
          validImages.push({
            element: img,
            top: rect.top + window.scrollY,
            width: width,
            height: height
          });
        }
      }
    });
    
    // Y 좌표 기준으로 정렬
    return validImages.sort((a, b) => a.top - b.top);
  }
  
  // 현재 화면에 보이는 이미지 중 가장 가까운 이미지 찾기
  findCurrentImageIndex() {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const centerY = scrollTop + windowHeight / 2;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    
    this.images.forEach((img, index) => {
      const imgCenterY = img.top + img.height / 2;
      const distance = Math.abs(imgCenterY - centerY);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }
  
  // 이미지로 스크롤
  scrollToImage(index) {
    if (index < 0 || index >= this.images.length) {
      return;
    }
    
    const img = this.images[index];
    const windowHeight = window.innerHeight;
    const targetY = img.top - (windowHeight - img.height) / 2;
    
    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: 'smooth'
    });
    
    this.currentIndex = index;
    this.userScrolled = false;
    this.lastScrollPosition = window.scrollY;
  }
  
  // 키보드 이벤트 처리
  handleKeyDown(event) {
    if (!this.isActive || this.images.length === 0) {
      return;
    }
    
    // 입력 요소에 포커스가 있으면 무시
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.tagName === 'BUTTON' ||
      activeElement.tagName === 'A' ||
      activeElement.isContentEditable
    )) {
      return;
    }
    
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      
      // 사용자가 스크롤했으면 현재 위치 기준으로 다시 계산
      if (this.userScrolled) {
        this.currentIndex = this.findCurrentImageIndex();
        this.userScrolled = false;
      }
      
      const nextIndex = this.currentIndex + 1;
      if (nextIndex < this.images.length) {
        this.scrollToImage(nextIndex);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      
      // 사용자가 스크롤했으면 현재 위치 기준으로 다시 계산
      if (this.userScrolled) {
        this.currentIndex = this.findCurrentImageIndex();
        this.userScrolled = false;
      }
      
      const prevIndex = this.currentIndex - 1;
      if (prevIndex >= 0) {
        this.scrollToImage(prevIndex);
      }
    }
  }
  
  // 스크롤 이벤트 처리
  handleScroll() {
    if (!this.isActive) return;
    
    const currentScrollPosition = window.scrollY;
    const scrollDifference = Math.abs(currentScrollPosition - this.lastScrollPosition);
    
    // 스크롤 차이가 50px 이상이면 사용자가 직접 스크롤한 것으로 판단
    if (scrollDifference > 50) {
      this.userScrolled = true;
    }
  }
  
  // 마우스 휠 이벤트 처리
  handleWheel() {
    if (!this.isActive) return;
    this.userScrolled = true;
  }
  
  // 페이지 업/다운 키 처리
  handlePageNavigation(event) {
    if (!this.isActive) return;
    
    if (event.key === 'PageDown' || event.key === 'PageUp' || 
        event.key === 'Home' || event.key === 'End') {
      this.userScrolled = true;
    }
  }
  
  // 탐색 시작
  start(settings) {
    this.settings = { ...this.settings, ...settings };
    this.images = this.findValidImages();
    
    if (this.images.length < this.settings.count) {
      return {
        success: false,
        message: `조건에 맞는 이미지가 ${this.images.length}개만 발견되었습니다. (최소 ${this.settings.count}개 필요)`
      };
    }
    
    this.isActive = true;
    this.currentIndex = this.findCurrentImageIndex();
    this.lastScrollPosition = window.scrollY;
    
    // 이벤트 리스너 추가
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keydown', (e) => this.handlePageNavigation(e));
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    
    return {
      success: true,
      imageCount: this.images.length
    };
  }
  
  // 탐색 중지
  stop() {
    this.isActive = false;
    this.currentIndex = -1;
    this.userScrolled = false;
    
    // 이벤트 리스너 제거
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('wheel', this.handleWheel);
    
    return { success: true };
  }
  
  // 상태 토글
  toggle(settings) {
    if (this.isActive) {
      return this.stop();
    } else {
      return this.start(settings);
    }
  }
  
  // 현재 상태 반환
  getStatus() {
    return {
      isActive: this.isActive,
      imageCount: this.images.length
    };
  }
}

// 전역 네비게이터 인스턴스
const navigator = new ImageNavigator();

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleNavigation') {
    const result = navigator.toggle(request.settings);
    sendResponse({
      isActive: navigator.isActive,
      imageCount: navigator.images.length,
      message: result.success ? undefined : result.message
    });
  } else if (request.action === 'getStatus') {
    sendResponse(navigator.getStatus());
  }
  
  return true;
});

// 페이지 로드시 자동 실행
chrome.storage.sync.get(['autoRun', 'width', 'height', 'count'], (result) => {
  if (result.autoRun) {
    // DOM이 완전히 로드된 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          navigator.start({
            width: result.width || 200,
            height: result.height || 200,
            count: result.count || 3
          });
        }, 1000); // 이미지 로딩을 위한 추가 대기
      });
    } else {
      setTimeout(() => {
        navigator.start({
          width: result.width || 200,
          height: result.height || 200,
          count: result.count || 3
        });
      }, 1000);
    }
  }
});