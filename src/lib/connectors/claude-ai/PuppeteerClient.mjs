import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Configure puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

/**
 * PuppeteerClient - A stealth-enabled HTTP client for Claude.ai
 * Bypasses Cloudflare detection using realistic browser automation
 */
export class PuppeteerClient {
  constructor(options = {}) {
    this.defaultTimeout = options.timeout || 30000;
    this.headless = options.headless !== false; // Default to headless
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.viewport = options.viewport || { width: 1366, height: 768 };

    // Browser instance management
    this._browser = null;
    this._page = null;
  }

  /**
   * Initialize browser instance
   * @private
   */
  async _initBrowser() {
    if (this._browser && this._page) {
      return;
    }

    this._browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this._page = await this._browser.newPage();

    // Set realistic browser properties
    await this._page.setUserAgent(this.userAgent);
    await this._page.setViewport(this.viewport);

    // Add common browser properties to avoid detection
    await this._page.evaluateOnNewDocument(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override the navigator.plugins property
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override the navigator.languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Add chrome runtime object
      window.chrome = {
        runtime: {},
      };
    });
  }

  /**
   * Make a GET request to a URL with stealth protection
   * @param {string} url - The URL to fetch
   * @param {Object} options - Request options
   * @param {Object} options.headers - Additional headers
   * @param {number} options.timeout - Request timeout
   * @returns {Object} Response data
   */
  async get(url, options = {}) {
    return this._makeRequest('GET', url, options);
  }

  /**
   * Make a POST request to a URL with stealth protection
   * @param {string} url - The URL to fetch
   * @param {Object} options - Request options
   * @param {Object} options.headers - Additional headers
   * @param {Object|string} options.body - Request body
   * @param {number} options.timeout - Request timeout
   * @returns {Object} Response data
   */
  async post(url, options = {}) {
    return this._makeRequest('POST', url, options);
  }

  /**
   * Make an HTTP request using Puppeteer
   * @private
   */
  async _makeRequest(method, url, options = {}) {
    await this._initBrowser();

    const {
      headers = {},
      body = null,
      timeout = this.defaultTimeout,
      parseResponse = 'auto' // 'json', 'text', 'auto'
    } = options;

    try {
      // Set additional headers if provided
      if (Object.keys(headers).length > 0) {
        await this._page.setExtraHTTPHeaders(headers);
      }

      let response;

      if (method === 'GET') {
        // For GET requests, navigate to the URL
        response = await this._page.goto(url, {
          waitUntil: 'networkidle0',
          timeout
        });
      } else {
        // For POST requests, use page.evaluate to make the fetch call
        const result = await this._page.evaluate(async (url, method, headers, body) => {
          const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
          });

          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            text: await response.text(),
            headers: Object.fromEntries(response.headers.entries())
          };
        }, url, method, headers, body);

        // Convert the result to a format similar to Puppeteer's response
        response = {
          ok: () => result.ok,
          status: () => result.status,
          statusText: () => result.statusText,
          text: () => Promise.resolve(result.text),
          json: () => Promise.resolve(JSON.parse(result.text))
        };
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // Parse response based on parseResponse option
      let responseData;

      if (parseResponse === 'json') {
        responseData = await this._extractJsonResponse(response);
      } else if (parseResponse === 'text') {
        responseData = await response.text();
      } else {
        // Auto-detect response type
        try {
          responseData = await this._extractJsonResponse(response);
        } catch (jsonError) {
          responseData = await response.text();
        }
      }

      return {
        ok: response.ok(),
        status: response.status(),
        statusText: response.statusText(),
        data: responseData,
        headers: response.headers ? response.headers() : {}
      };

    } catch (error) {
      throw new Error(`Puppeteer request failed: ${error.message}`);
    }
  }

  /**
   * Extract JSON from response, handling different response formats
   * @private
   */
  async _extractJsonResponse(response) {
    try {
      // Try direct JSON parsing first
      return await response.json();
    } catch (directJsonError) {
      // If that fails, get the text content and try various extraction methods
      const responseText = await (response.text ? response.text() : this._page.content());

      // Try to extract JSON from <pre> tags (common in API responses)
      const preMatch = responseText.match(/<pre[^>]*>(.*?)<\/pre>/s);
      if (preMatch) {
        try {
          return JSON.parse(preMatch[1]);
        } catch (preParseError) {
          // Continue to other methods
        }
      }

      // Try to extract JSON from page body text content
      try {
        const bodyText = await this._page.evaluate(() => document.body.textContent);
        return JSON.parse(bodyText);
      } catch (bodyParseError) {
        // Continue to other methods
      }

      // Try parsing the raw response text
      try {
        return JSON.parse(responseText);
      } catch (rawParseError) {
        throw new Error('Failed to parse response as JSON');
      }
    }
  }

  /**
   * Navigate to a URL and wait for it to load
   * Useful for interactive authentication flows
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   */
  async navigate(url, options = {}) {
    await this._initBrowser();

    const { waitUntil = 'networkidle0', timeout = this.defaultTimeout } = options;

    return this._page.goto(url, { waitUntil, timeout });
  }

  /**
   * Get the current page instance for manual interaction
   * Useful for interactive authentication
   */
  async getPage() {
    await this._initBrowser();
    return this._page;
  }

  /**
   * Get all cookies from the current session
   */
  async getCookies(domain = null) {
    await this._initBrowser();

    const cookies = await this._page.context().cookies();

    if (domain) {
      return cookies.filter(cookie =>
        cookie.domain.includes(domain) || domain.includes(cookie.domain)
      );
    }

    return cookies;
  }

  /**
   * Set cookies for the session
   */
  async setCookies(cookies) {
    await this._initBrowser();
    return this._page.context().addCookies(cookies);
  }

  /**
   * Close the browser instance
   */
  async close() {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
      this._page = null;
    }
  }

  /**
   * Keep the browser open for interactive use
   * Useful for authentication flows
   */
  async keepAlive() {
    await this._initBrowser();
    this.headless = false;

    console.log('🌐 Browser opened for interactive use. Call close() when done.');

    return {
      page: this._page,
      browser: this._browser,
      close: () => this.close()
    };
  }

  /**
   * Wait for user interaction (useful for authentication flows)
   * @param {string} message - Message to display to user
   * @param {function} condition - Function that returns true when ready to continue
   */
  async waitForUser(message, condition) {
    await this._initBrowser();

    console.log(`🤖 ${message}`);
    console.log('   Press any key to continue when ready...');

    // Wait for condition or user input
    return new Promise((resolve) => {
      const checkCondition = async () => {
        try {
          if (condition && await condition(this._page)) {
            resolve();
            return;
          }
        } catch (error) {
          // Condition check failed, continue waiting
        }

        setTimeout(checkCondition, 1000);
      };

      checkCondition();

      // Also allow manual continuation
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }
}

/**
 * Create a configured PuppeteerClient instance for Claude.ai
 * @param {Object} options - Configuration options
 * @returns {PuppeteerClient} Configured client instance
 */
export function createClaudeClient(options = {}) {
  return new PuppeteerClient({
    timeout: 30000,
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    ...options
  });
}