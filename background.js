chrome.action.onClicked.addListener(function(tab) {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchImageAsBase64') {
    fetch(request.url, {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      cache: 'no-store'
    })
      .then(response => {
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ success: true, dataUrl: reader.result });
        reader.onerror = () => sendResponse({ success: false, error: 'Failed to read blob.' });
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'solveCaptcha') {
    const { url, options } = request.data;
    fetch(url, options)
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(errorData.error?.message || JSON.stringify(errorData));
          });
        }
        return response.json();
      })
      .then(data => sendResponse({ success: true, data: data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'fetchModels') {
    const { apiKey, proxyUrl } = request.data;
    const baseUrl = proxyUrl ? proxyUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
    const url = `${baseUrl}/v1beta/models?key=${apiKey}`;

    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(chrome.i18n.getMessage("errorConnection") || 'Invalid API Key or Network Error.');
        return response.json();
      })
      .then(data => {
        const models = data.models
          .filter(m => m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
        sendResponse({ success: true, models: models });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});