import { NextRequest, NextResponse } from 'next/server';
import { getSmsConfig, formatPhoneNumber } from '@/lib/sms';

/**
 * Debug endpoint to test GoIP SMS server connectivity step by step
 */
export async function POST(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  };
  
  let sessionCookie: string | null = null;
  
  try {
    const { phone, message } = await request.json();
    
    // Step 1: Get configuration
    results.steps.push({ step: 'Get SMS Config', status: 'running' });
    const config = await getSmsConfig();
    results.config = {
      serverUrl: config.serverUrl,
      username: config.username,
      password: config.password ? '***configured***' : 'NOT SET',
      goipProvider: config.goipProvider,
      goipLine: config.goipLine,
      enabled: config.enabled,
    };
    results.steps[0].status = 'done';
    
    if (!config.enabled) {
      results.error = 'SMS is disabled';
      return NextResponse.json(results);
    }
    
    const baseUrl = config.serverUrl.replace(/\/index\.php.*$/, '').replace(/\/$/, '');
    const formattedPhone = formatPhoneNumber(phone || '08012345678');
    results.formattedPhone = formattedPhone;
    results.baseUrl = baseUrl;
    
    // Step 2: Test server connectivity
    results.steps.push({ step: 'Test Server Connectivity', status: 'running' });
    try {
      const pingResponse = await fetch(config.serverUrl, { method: 'GET' });
      results.steps[1].status = 'done';
      results.steps[1].httpStatus = pingResponse.status;
      results.steps[1].ok = pingResponse.ok;
    } catch (e: any) {
      results.steps[1].status = 'failed';
      results.steps[1].error = e.message;
    }
    
    // Step 3: Try login
    results.steps.push({ step: 'Test Login', status: 'running' });
    const loginUrl = `${baseUrl}/dologin.php`;
    results.steps[2].url = loginUrl;
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', config.username);
      formData.append('password', config.password);
      formData.append('lan', '3');
      
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        redirect: 'manual',
      });
      
      results.steps[2].httpStatus = loginResponse.status;
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      results.steps[2].setCookie = setCookieHeader;
      results.steps[2].location = loginResponse.headers.get('location');
      
      // Extract session cookie
      if (setCookieHeader) {
        const match = setCookieHeader.match(/PHPSESSID=([^;]+)/i);
        if (match) {
          sessionCookie = `PHPSESSID=${match[1]}`;
          results.steps[2].extractedCookie = sessionCookie;
        }
      }
      
      const loginBody = await loginResponse.text();
      results.steps[2].bodyPreview = loginBody.substring(0, 500);
      results.steps[2].containsLoginForm = loginBody.includes('Administrator Logon');
      results.steps[2].containsSMS = loginBody.toLowerCase().includes('sms');
      
      if (sessionCookie || 
          (loginResponse.status >= 300 && loginResponse.status < 400) ||
          !loginBody.includes('Administrator Logon')) {
        results.steps[2].status = 'done';
        results.steps[2].loginSuccess = true;
      } else {
        results.steps[2].status = 'failed';
        results.steps[2].loginSuccess = false;
        results.steps[2].reason = 'Login returned login page again - credentials may be wrong';
      }
    } catch (e: any) {
      results.steps[2].status = 'failed';
      results.steps[2].error = e.message;
    }
    
    // Step 3.5: Explore the authenticated interface
    if (sessionCookie) {
      results.steps.push({ step: 'Explore Authenticated Interface', status: 'running', pages: [] });
      
      const pagesToExplore = [
        { name: 'Main Index', url: `${baseUrl}/index.php` },
        { name: 'SMS Module', url: `${baseUrl}/index.php?m=sms` },
        { name: 'SMS Send', url: `${baseUrl}/index.php?m=sms&a=send` },
        { name: 'SMS Index', url: `${baseUrl}/index.php/sms` },
        { name: 'SMS Send Direct', url: `${baseUrl}/index.php/sms/send` },
        { name: 'Send SMS Page', url: `${baseUrl}/index.php/send_sms` },
      ];
      
      for (const page of pagesToExplore) {
        try {
          const response = await fetch(page.url, {
            method: 'GET',
            headers: {
              'Cookie': sessionCookie,
            },
          });
          const body = await response.text();
          
          // Look for form elements and SMS-related content
          const hasForm = body.includes('<form');
          const hasPhoneField = body.includes('phone') || body.includes('telnum') || body.includes('mobile');
          const hasMessageField = body.includes('message') || body.includes('smscontent') || body.includes('sms');
          const hasGoipSelect = body.includes('goip') || body.includes('line');
          const isLoginPage = body.includes('Administrator Logon');
          
          results.steps[3].pages.push({
            name: page.name,
            url: page.url,
            status: response.status,
            isLoginPage,
            hasForm,
            hasPhoneField,
            hasMessageField,
            hasGoipSelect,
            isSmsPage: hasForm && (hasPhoneField || hasMessageField) && !isLoginPage,
            bodyPreview: body.substring(0, 500),
          });
        } catch (e: any) {
          results.steps[3].pages.push({
            name: page.name,
            url: page.url,
            error: e.message,
          });
        }
      }
      
      results.steps[3].status = 'done';
      
      // Find the SMS page
      const smsPage = results.steps[3].pages.find((p: any) => p.isSmsPage);
      if (smsPage) {
        results.smsPageFound = smsPage.url;
      }
    }
    
    // Step 4: Try direct HTTP API endpoints
    results.steps.push({ step: 'Test HTTP API Endpoints', status: 'running', endpoints: [] });
    
    const testEndpoints = [
      { 
        name: 'send.html GET', 
        url: `${baseUrl}/send.html?u=${encodeURIComponent(config.username)}&p=${encodeURIComponent(config.password)}&l=${encodeURIComponent(config.goipLine)}&n=${encodeURIComponent(formattedPhone.replace('+', ''))}&m=${encodeURIComponent(message || 'Test')}`,
        method: 'GET'
      },
      {
        name: 'sms_send.php POST',
        url: `${baseUrl}/sms_send.php`,
        method: 'POST',
        body: `u=${encodeURIComponent(config.username)}&p=${encodeURIComponent(config.password)}&l=${encodeURIComponent(config.goipLine)}&n=${encodeURIComponent(formattedPhone.replace('+', ''))}&m=${encodeURIComponent(message || 'Test')}`
      },
      {
        name: 'index.php/sms/send POST',
        url: `${baseUrl}/index.php/sms/send`,
        method: 'POST',
        body: `goip=${encodeURIComponent(config.goipLine)}&provider=${encodeURIComponent(config.goipProvider)}&phone=${encodeURIComponent(formattedPhone)}&message=${encodeURIComponent(message || 'Test')}`
      },
    ];
    
    for (const endpoint of testEndpoints) {
      const endpointResult: any = {
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
      };
      
      try {
        const options: RequestInit = { method: endpoint.method };
        if (endpoint.body) {
          options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          options.body = endpoint.body;
        }
        
        const response = await fetch(endpoint.url, options);
        const body = await response.text();
        
        endpointResult.httpStatus = response.status;
        endpointResult.bodyPreview = body.substring(0, 300);
        endpointResult.containsLoginPage = body.includes('Administrator Logon');
        endpointResult.containsSuccess = body.toLowerCase().includes('success') || 
                                          body.toLowerCase().includes('sending') ||
                                          body.includes('Sending');
        endpointResult.success = !endpointResult.containsLoginPage && endpointResult.containsSuccess;
      } catch (e: any) {
        endpointResult.error = e.message;
      }
      
      results.steps[3].endpoints.push(endpointResult);
    }
    
    results.steps[3].status = 'done';
    
    // Summary
    const successEndpoint = results.steps[3].endpoints.find((e: any) => e.success);
    if (successEndpoint) {
      results.recommendation = `Use ${successEndpoint.name} endpoint for SMS sending`;
      results.workingEndpoint = successEndpoint.name;
    } else if (results.steps[2].loginSuccess) {
      results.recommendation = 'Login works but SMS endpoints not responding. Check GoIP line/provider settings or try session-based sending.';
    } else {
      results.recommendation = 'Login failed. Check username/password or server URL.';
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    results.error = error.message;
    return NextResponse.json(results, { status: 500 });
  }
}
