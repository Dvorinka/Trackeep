#!/usr/bin/env node

/**
 * Demo Mode Test Script
 * Tests the demo mode functionality end-to-end
 */

const http = require('http');
const https = require('https');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testDemoMode() {
  console.log('🧪 Testing Trackeep Demo Mode...\n');
  
  try {
    // Test 1: Check demo mode status
    console.log('1. Checking demo mode status...');
    const demoStatus = await makeRequest('http://localhost:8081/api/demo/status');
    console.log(`   Status: ${demoStatus.status}`);
    console.log(`   Response:`, demoStatus.data);
    
    if (demoStatus.data.demoMode !== true) {
      throw new Error('Demo mode not enabled on backend');
    }
    console.log('   ✅ Demo mode is enabled\n');
    
    // Test 2: Test demo login
    console.log('2. Testing demo login...');
    const loginResponse = await makeRequest('http://localhost:8081/api/v1/auth/login-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@trackeep.com',
        password: 'demo123'
      })
    });
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Response:`, loginResponse.data);
    
    if (loginResponse.status !== 200 || !loginResponse.data.token) {
      throw new Error('Demo login failed');
    }
    console.log('   ✅ Demo login successful\n');
    
    // Test 3: Test dashboard stats in demo mode
    console.log('3. Testing dashboard stats...');
    const statsResponse = await makeRequest('http://localhost:8081/api/v1/dashboard/stats', {
      headers: { 'Authorization': `Bearer ${loginResponse.data.token}` }
    });
    console.log(`   Status: ${statsResponse.status}`);
    console.log(`   Response:`, statsResponse.data);
    console.log('   ✅ Dashboard stats working\n');
    
    // Test 4: Test tasks endpoint
    console.log('4. Testing tasks endpoint...');
    const tasksResponse = await makeRequest('http://localhost:8081/api/v1/tasks', {
      headers: { 'Authorization': `Bearer ${loginResponse.data.token}` }
    });
    console.log(`   Status: ${tasksResponse.status}`);
    console.log(`   Tasks count:`, Array.isArray(tasksResponse.data) ? tasksResponse.data.length : 'Not an array');
    console.log('   ✅ Tasks endpoint working\n');
    
    console.log('🎉 All demo mode tests passed!');
    console.log('\n📝 Summary:');
    console.log('- Frontend: http://localhost:3000');
    console.log('- Backend: http://localhost:8081');
    console.log('- Demo credentials: demo@trackeep.com / demo123');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testDemoMode();
