const axios = require("axios");
const crypto = require("crypto");

class SeabankAPI {
  constructor(deviceId = null) {
    this.baseUrl = "https://api.seabank.co.id/gateway/v1";
    this.deviceId = deviceId || this.generateDeviceId();
    this.userAgent = this.generateUserAgent();
    this.cookies = {};
    this.sessionToken = null;
  }

  generateDeviceId() {
    // Generate device fingerprint ala Seabank
    const randomId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    return crypto.createHash('sha256').update(`${randomId}:${timestamp}`).digest('hex').substring(0, 32);
  }

  generateUserAgent() {
    const brands = ['SM-G998B', 'SM-S908E', 'V2134', 'RMX3360', 'M2101K6G'];
    const androidVersions = ['11', '12', '13', '14'];
    const randomBrand = brands[Math.floor(Math.random() * brands.length)];
    const randomAndroid = androidVersions[Math.floor(Math.random() * androidVersions.length)];
    
    return `Mozilla/5.0 (Linux; Android ${randomAndroid}; ${randomBrand}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36 Seabank/3.2.1`;
  }

  getHeaders(additional = {}) {
    return {
      'User-Agent': this.userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'X-Device-ID': this.deviceId,
      'X-Platform': 'android',
      'X-App-Version': '3.2.1',
      'Origin': 'https://m.seabank.co.id',
      'Referer': 'https://m.seabank.co.id/',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'Cookie': this.formatCookies(),
      ...additional
    };
  }

  formatCookies() {
    return Object.entries(this.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  updateCookies(setCookieHeader) {
    if (!setCookieHeader) return;
    
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    cookies.forEach(cookie => {
      const [fullCookie] = cookie.split(';');
      const [key, value] = fullCookie.split('=');
      if (key && value) {
        this.cookies[key] = value;
      }
    });
  }

  async generateSession() {
    try {
      // Step 1: Initialize session
      const initResponse = await axios.post(
        `${this.baseUrl}/session/init`,
        { deviceId: this.deviceId, platform: 'android' },
        { headers: this.getHeaders() }
      );
      
      this.updateCookies(initResponse.headers['set-cookie']);
      
      return {
        success: true,
        sessionId: initResponse.data?.data?.sessionId,
        cookies: this.cookies
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async login(msisdn, pin) {
    try {
      // Generate session dulu
      await this.generateSession();
      
      const payload = {
        msisdn: msisdn,
        pin: crypto.createHash('sha256').update(pin).digest('hex'),
        deviceId: this.deviceId,
        loginType: 'PASSWORD',
        rememberMe: true
      };

      const response = await axios.post(
        `${this.baseUrl}/authenticate/login`,
        payload,
        { headers: this.getHeaders() }
      );

      this.updateCookies(response.headers['set-cookie']);
      
      if (response.data?.data?.accessToken) {
        this.sessionToken = response.data.data.accessToken;
      }

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  async getAccountInfo() {
    if (!this.sessionToken) {
      throw new Error('Session expired, please login first');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/account/info`,
        { 
          headers: this.getHeaders({
            'Authorization': `Bearer ${this.sessionToken}`
          })
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  async getTransactionHistory(startDate, endDate, limit = 50) {
    if (!this.sessionToken) {
      throw new Error('Session expired, please login first');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/history`,
        {
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: endDate || new Date().toISOString().split('T')[0],
          limit: limit,
          offset: 0
        },
        { 
          headers: this.getHeaders({
            'Authorization': `Bearer ${this.sessionToken}`
          })
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}

// ==================== EXPRESS ROUTE HANDLER ====================
module.exports = {
  name: "Seabank API",
  desc: "API untuk akses Seabank",
  category: "Banking",
  path: "/api/seabank/:action",
  
  async run(req, res) {
    try {
      const { action } = req.params;
      const { apikey, msisdn, pin, startDate, endDate, limit } = req.query;

      // API Key validation
      if (!apikey || !global.apikey?.includes(apikey)) {
        return res.status(401).json({
          success: false,
          error: "Invalid API key"
        });
      }

      const seabank = new SeabankAPI();

      switch(action) {
        case 'session':
          const session = await seabank.generateSession();
          return res.json(session);

        case 'login':
          if (!msisdn || !pin) {
            return res.status(400).json({
              success: false,
              error: "MSISDN and PIN required"
            });
          }
          
          const loginResult = await seabank.login(msisdn, pin);
          return res.json({
            success: true,
            data: loginResult,
            cookies: seabank.cookies // Kasi liat cookies kalo perlu
          });

        case 'account':
          const accountInfo = await seabank.getAccountInfo();
          return res.json({
            success: true,
            data: accountInfo
          });

        case 'transactions':
          const transactions = await seabank.getTransactionHistory(startDate, endDate, limit);
          return res.json({
            success: true,
            data: transactions
          });

        default:
          return res.status(404).json({
            success: false,
            error: "Action not found"
          });
      }

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};