// 기본 설정값
const defaultSettings = {
  minWidth: 200,
  minHeight: 200,
  minCount: 3,
  autoRun: false
};

// 설정 로드
function loadSettings() {
  chrome.storage.sync.get(defaultSettings, (result) => {
      document.getElementById('minWidth').value = result.minWidth;
      document.getElementById('minHeight').value = result.minHeight;
      document.getElementById('minCount').value = result.minCount;
      document.getElementById('autoRun').checked = result.autoRun;
  });
}

// 설정 저장
function saveSettings() {
  const settings = {
      minWidth: parseInt(document.getElementById('minWidth').value) || defaultSettings.minWidth,
      minHeight: parseInt(document.getElementById('minHeight').value) || defaultSettings.minHeight,
      minCount: parseInt(document.getElementById('minCount').value) || defaultSettings.minCount,
      autoRun: document.getElementById('autoRun').checked
  };

  chrome.storage.sync.set(settings, () => {
      showStatus('설정이 저장되었습니다!', 'success');
      
      // 현재 활성 탭에 설정 변경 알림
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateSettings',
              settings: settings
          });
      });
  });
}

// 설정 초기화
function resetSettings() {
  chrome.storage.sync.set(defaultSettings, () => {
      loadSettings();
      showStatus('설정이 초기화되었습니다!', 'success');
      
      // 현재 활성 탭에 설정 변경 알림
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateSettings',
              settings: defaultSettings
          });
      });
  });
}

// 상태 메시지 표시
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
      statusDiv.style.display = 'none';
  }, 3000);
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
  
  // Enter 키로 저장
  document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          saveSettings();
      }
  });
});