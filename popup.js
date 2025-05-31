// 설정값 로드
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get({
    width: 200,
    height: 200,
    count: 3,
    autoRun: false,
    alignment: 'center'
  }, function(items) {
    document.getElementById('width').value = items.width;
    document.getElementById('height').value = items.height;
    document.getElementById('count').value = items.count;
    document.getElementById('autoRun').checked = items.autoRun;
    
    // 라디오 버튼 설정
    const alignmentRadio = document.querySelector(`input[name="alignment"][value="${items.alignment}"]`);
    if (alignmentRadio) {
      alignmentRadio.checked = true;
    }
  });
  
  // 현재 탭의 상태 확인
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
      if (chrome.runtime.lastError) {
        document.getElementById('status').textContent = '페이지를 새로고침해주세요';
        return;
      }
      
      if (response && response.isActive) {
        document.getElementById('status').textContent = `탐색 활성화됨 (${response.imageCount}개 이미지)`;
        document.getElementById('status').className = 'status active';
        document.getElementById('startNavigation').textContent = 'Page 탐색 중지';
      }
    });
  });
});

// 설정값 저장
function saveSettings() {
  const settings = {
    width: parseInt(document.getElementById('width').value),
    height: parseInt(document.getElementById('height').value),
    count: parseInt(document.getElementById('count').value),
    autoRun: document.getElementById('autoRun').checked,
    alignment: document.querySelector('input[name="alignment"]:checked').value
  };
  
  chrome.storage.sync.set(settings);
  return settings;
}

// 입력값 변경시 자동 저장
['width', 'height', 'count'].forEach(id => {
  document.getElementById(id).addEventListener('change', saveSettings);
});

document.getElementById('autoRun').addEventListener('change', saveSettings);

// 라디오 버튼 변경시 자동 저장
document.querySelectorAll('input[name="alignment"]').forEach(radio => {
  radio.addEventListener('change', saveSettings);
});

// 탐색 시작/중지 버튼
document.getElementById('startNavigation').addEventListener('click', function() {
  const settings = saveSettings();
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'toggleNavigation',
      settings: settings
    }, function(response) {
      if (chrome.runtime.lastError) {
        document.getElementById('status').textContent = '페이지를 새로고침해주세요';
        return;
      }
      
      const statusEl = document.getElementById('status');
      const buttonEl = document.getElementById('startNavigation');
      
      if (response && response.isActive) {
        statusEl.textContent = `탐색 활성화됨 (${response.imageCount}개 이미지)`;
        statusEl.className = 'status active';
        buttonEl.textContent = 'Page 탐색 중지';
      } else {
        statusEl.textContent = response?.message || '탐색이 중지되었습니다';
        statusEl.className = 'status';
        buttonEl.textContent = 'Page로 이미지 탐색';
      }
    });
  });
});