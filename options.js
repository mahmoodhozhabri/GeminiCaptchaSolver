function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = chrome.i18n.getMessage(key);
    if (translation) {
      element.textContent = translation;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = chrome.i18n.getMessage(key);
    if (translation) {
      element.placeholder = translation;
    }
  });
}

function fetchModels() {
  const apiKey = document.getElementById('api-key').value;
  const proxyUrl = document.getElementById('proxy-url').value;
  const status = document.getElementById('status');
  const modelSelect = document.getElementById('model');

  if (!apiKey) {
    status.textContent = chrome.i18n.getMessage("errorApiKeyRequired");
    status.className = '';
    return;
  }

  status.textContent = chrome.i18n.getMessage("statusFetching");
  status.className = '';

  chrome.runtime.sendMessage({
    action: 'fetchModels',
    data: { apiKey, proxyUrl }
  }, response => {
    if (response && response.success) {
      modelSelect.innerHTML = '';
      response.models.forEach(modelName => {
        const option = document.createElement('option');
        option.value = modelName;
        option.textContent = modelName;
        modelSelect.appendChild(option);
      });
      status.textContent = chrome.i18n.getMessage("statusModelUpdated");
      status.className = 'success';
    } else {
      status.textContent = chrome.i18n.getMessage("errorPrefix") + (response.error || chrome.i18n.getMessage("errorConnection"));
      status.className = '';
    }
  });
}

function save_options() {
  const apiKey = document.getElementById('api-key').value;
  const model = document.getElementById('model').value;
  const proxyUrl = document.getElementById('proxy-url').value;

  chrome.storage.sync.set({
    geminiApiKey: apiKey,
    geminiModel: model,
    proxyUrl: proxyUrl
  }, function() {
    const status = document.getElementById('status');
    status.textContent = chrome.i18n.getMessage("statusSaved");
    status.className = 'success';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

function restore_options() {
  applyTranslations();
  
  chrome.storage.sync.get({
    geminiApiKey: '',
    geminiModel: '',
    proxyUrl: ''
  }, function(items) {
    document.getElementById('api-key').value = items.geminiApiKey;
    document.getElementById('proxy-url').value = items.proxyUrl;
    
    if (items.geminiApiKey) {
      loadAndSetModel(items.geminiApiKey, items.proxyUrl, items.geminiModel);
    }
  });
}

function loadAndSetModel(apiKey, proxyUrl, selectedModel) {
  chrome.runtime.sendMessage({
    action: 'fetchModels',
    data: { apiKey, proxyUrl }
  }, response => {
    if (response && response.success) {
      const modelSelect = document.getElementById('model');
      modelSelect.innerHTML = '';
      response.models.forEach(modelName => {
        const option = document.createElement('option');
        option.value = modelName;
        option.textContent = modelName;
        if (modelName === selectedModel) option.selected = true;
        modelSelect.appendChild(option);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('fetch-models').addEventListener('click', fetchModels);