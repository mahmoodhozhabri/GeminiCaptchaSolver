let settings = {};
let debounceTimeout;

function sendScreenReaderAlert(message) {
  let alertBox = document.getElementById('captcha-solver-alert');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.id = 'captcha-solver-alert';
    alertBox.setAttribute('role', 'alert');
    alertBox.style.cssText = 'position: absolute; width: 1px; height: 1px; overflow: hidden; left: -9999px;';
    document.body.appendChild(alertBox);
  }
  alertBox.textContent = message;
}

function imageToData(url) {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const header = parts[0];
    const base64 = parts[1].trim();
    const mimeMatch = header.match(/:(.*?);/);
    let mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    if (!mimeType.startsWith('image/')) {
      if (mimeType.toLowerCase().includes('jpg') || mimeType.toLowerCase().includes('jpeg')) {
        mimeType = 'image/jpeg';
      } else if (mimeType.toLowerCase().includes('png')) {
        mimeType = 'image/png';
      } else if (mimeType.toLowerCase().includes('gif')) {
        mimeType = 'image/gif';
      } else {
        mimeType = 'image/jpeg';
      }
    }

    return Promise.resolve({ base64, mimeType });
  }

  const uniqueUrl = url + (url.includes('?') ? '&' : '?') + new Date().getTime();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'fetchImageAsBase64', url: uniqueUrl }, response => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (response && response.success) {
        const parts = response.dataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64 = parts[1].trim();
        resolve({ base64, mimeType });
      } else {
        reject(new Error(response.error || chrome.i18n.getMessage("errorFetchingImage")));
      }
    });
  });
}

async function solveWithGemini(imageData) {
  if (!settings.geminiApiKey || !settings.geminiModel) {
    throw new Error(chrome.i18n.getMessage("errorNotConfigured"));
  }

  const useProxy = settings.proxyUrl && settings.proxyUrl.trim() !== '';
  const baseUrl = useProxy ? settings.proxyUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
  let finalUrl = `${baseUrl}/v1beta/models/${settings.geminiModel}:generateContent`;

  const headers = { 'Content-Type': 'application/json' };

  if (useProxy) {
    headers['X-API-Key'] = settings.geminiApiKey;
  } else {
    finalUrl += `?key=${settings.geminiApiKey}`;
  }
  
  let promptText = "Read the text in this image. Respond with only the text characters.";
  const isNumericCaptcha = window.location.hostname.includes('sso.my.gov.ir');

  if (isNumericCaptcha) {
      promptText = "Read the 5 Persian digits in this image. Respond with only the 5 corresponding English digits. Do not include any other characters or spaces.";
  }

  const body = {
    'contents': [{'parts': [{'text': promptText}, {'inline_data': {'mime_type': imageData.mimeType, 'data': imageData.base64}}]}]
  };

  const fetchOptions = {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'solveCaptcha', data: { url: finalUrl, options: fetchOptions } },
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response && response.success) {
          const data = response.data;
          if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            let resultText = data.candidates[0].content.parts[0].text.trim().replace(/\s/g, '');
            
            if (isNumericCaptcha) {
                resultText = resultText.replace(/[^0-9]/g, '');
            }
            
            resolve(resultText);

          } else {
            reject(new Error(chrome.i18n.getMessage("errorInvalidResponse")));
          }
        } else {
          reject(new Error(response.error || chrome.i18n.getMessage("errorUnknown")));
        }
      }
    );
  });
}

async function processCaptcha(img, input) {
  if (img.dataset.captchaStatus === 'processing' || img.src === img.dataset.lastProcessedSrc) {
    return;
  }
  img.dataset.captchaStatus = 'processing';

  try {
    sendScreenReaderAlert(chrome.i18n.getMessage("statusSolving"));
    const imageData = await imageToData(img.src);
    const textResult = await solveWithGemini(imageData);

    if (textResult) {
      input.value = textResult;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      sendScreenReaderAlert(chrome.i18n.getMessage("alertSolved") + " " + textResult);

      img.dataset.lastProcessedSrc = img.src;
      img.dataset.captchaStatus = 'solved';
    } else {
      throw new Error(chrome.i18n.getMessage("errorEmpty"));
    }
  } catch (error) {
    sendScreenReaderAlert(chrome.i18n.getMessage("errorPrefix") + " " + error.message);
    img.removeAttribute('data-captcha-status');
    img.removeAttribute('data-last-processed-src');
  }
}

const imageSelectors = 'img[id*="captcha" i]:not([id*="refresh" i]):not([id*="audio" i]), img[src*="captcha" i], img[alt*="captcha" i], img.captcha[title*="کد امنیتی"]';
const inputSelectors = 'input#inputcaptcha, input[id*="captcha" i]:not([type="hidden"]), input[name*="captcha" i]:not([type="hidden"]), input[id="j_captcha_response"], input[placeholder*="امنیتی"], input[placeholder*="تصویر"], input.captcha_value';

function findAndSolveCaptcha() {
    const captchaImages = document.querySelectorAll(imageSelectors);
    for (const img of captchaImages) {
        if (!img.offsetParent || img.naturalWidth < 20 || img.dataset.captchaStatus === 'processing') continue;
        if (img.src === img.dataset.lastProcessedSrc) continue;

        let input = null;
        const parentForm = img.closest('form');
        const searchContext = parentForm || img.closest('div, section, body');

        if (searchContext) {
           input = searchContext.querySelector(inputSelectors);
        }
        if (!input) {
            input = document.querySelector(inputSelectors);
        }

        if (input) {
            processCaptcha(img, input);
        }
    }
}

const handleDOMChanges = (mutationsList) => {
    let shouldRunFinder = false;
    for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src' && mutation.target.matches(imageSelectors)) {
            const element = mutation.target;
            element.removeAttribute('data-captcha-status');
            element.removeAttribute('data-last-processed-src');
            shouldRunFinder = true;
        }
        else if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldRunFinder = true;
        }
    }
    if (shouldRunFinder) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(findAndSolveCaptcha, 500);
    }
};

const observer = new MutationObserver(handleDOMChanges);

chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'proxyUrl'], (items) => {
  settings = items;
  if (settings.geminiApiKey && settings.geminiModel) {
    if (document.readyState === 'complete') {
        findAndSolveCaptcha();
    } else {
        window.addEventListener('load', findAndSolveCaptcha);
    }
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });
  }
});