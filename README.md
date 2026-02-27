# Gemini Captcha Solver



Gemini Captcha Solver is an intelligent browser extension designed to automatically identify and resolve image-based captchas using Google Gemini AI. This project was primarily developed to enhance web accessibility for users with visual impairments, ensuring a seamless experience when interacting with complex web forms.



## Key Features

- **High Accuracy:** Leverages Google's latest Gemini models to interpret and solve alphanumeric captchas.

- **Proxy Support:** Integrated proxy settings to ensure reliable API connectivity in regions with restricted access to Google services.

- **Accessibility Focused:** Fully compatible with Screen Readers (NVDA, JAWS) via ARIA alerts and status notifications.

- **Privacy Centric:** All API keys and configuration data are stored locally within the user's browser storage.



---



## Installation and Usage



### 1. Get a Gemini API Key

You must first obtain an API key from Google AI Studio. This key is required for the extension to communicate with the AI model.



### 2. Manual Installation

1. Go to the **Releases** section of this repository and download the latest release package.2. Extract the ZIP file to a folder on your computer.

3. Open Google Chrome and navigate to `chrome://extensions`.

4. Find the **Developer mode** toggle and enable it.

5. Locate and activate the **Load unpacked** button, then select the extracted folder.



### 3. Configuration

1. In your list of extensions, find **Gemini Captcha Solver** and press Enter to open the settings.

2. Paste your Gemini API Key into the designated field.

3. (Optional) Enter a Proxy URL if you are accessing the API from a restricted network.

4. Activate the **Fetch Models** button and select a modern model from the dropdown (e.g., gemini-3.0-flash). Note that lightweight models like **gemma-3-27b** are also supported and perform well for captcha solving.

5. Locate and activate the **Save Settings** button.



Once configured, the extension will automatically detect captcha images on any webpage and attempt to populate the corresponding input field.



---



## Technical Overview

The extension is built using Manifest V3 and utilizes a decoupled architecture:

- **Background Service Worker:** Handles API requests and proxy logic to bypass CORS limitations.

- **Content Scripts:** Monitors the DOM for new captcha elements using MutationObservers.

- **Internationalization:** Uses the standard chrome.i18n framework for multi-language support.



---



## Contributing

Contributions are welcome. If you have improvements for the detection logic or wish to add new language translations:

1. Fork the repository.

2. Create a new feature branch.

3. Commit your changes.

4. Open a Pull Request.



## License

This project is released under the MIT License. See the LICENSE file for details.

