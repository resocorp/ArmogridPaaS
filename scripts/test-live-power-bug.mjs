/**
 * Test script to verify the live power bug:
 * Checks if userToken vs adminToken returns different meter counts per project,
 * specifically for "RUBEZ VILLA IFITE AWKA".
 */

import crypto from 'crypto';

const BASE_URL = 'http://46.101.88.194';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'MQptQ8JT_V:KeLr';
const USER_USERNAME = 'flat9';
const USER_PASSWORD = 'flat9';
const RUBEZ_USERNAME = '09065650255';
const RUBEZ_PASSWORD = '09065650255';

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

async function apiCall(endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['token'] = token;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function login(username, password, type = 1) {
  const resp = await apiCall('/basic/prepayment/app/appUserLogin', {
    username,
    password: md5(password),
    type,
  });
  // Token may be directly in data (string) or in data.token
  if (resp.success === '1' && resp.data) {
    return typeof resp.data === 'string' ? resp.data : resp.data.token;
  }
  throw new Error(`Login failed for ${username}: ${JSON.stringify(resp)}`);
}

async function getProjectList(token) {
  const resp = await apiCall('/basic/prepayment/app/appProjectList', {
    keyword: '',
    pageSize: 100,
    pageIndex: 1,
  }, token);
  return resp;
}

async function getProjectMeterList(projectId, token) {
  const resp = await apiCall('/basic/prepayment/app/appProjectMeterList', {
    keyword: '',
    projectId,
    energyId: '1',
    pageSize: 100,
    pageIndex: 1,
  }, token);
  return resp;
}

async function getMeterInfo(roomNo, token) {
  const resp = await apiCall('/basic/prepayment/app/getMeterInfo', {
    roomNo,
  }, token);
  return resp;
}

async function main() {
  console.log('=== platformuser-rubez Credential Test ===\n');

  // Step 1: Login with admin + new rubez user
  console.log('1. Logging in...');
  let adminToken, rubezToken;
  try {
    adminToken = await login(ADMIN_USERNAME, ADMIN_PASSWORD, 0);
    console.log(`   ✓ Admin token obtained: ${adminToken.substring(0, 20)}...`);
  } catch (e) {
    console.error(`   ✗ Admin login failed: ${e.message}`);
    process.exit(1);
  }
  try {
    rubezToken = await login(RUBEZ_USERNAME, RUBEZ_PASSWORD, 1);
    console.log(`   ✓ Rubez user token obtained: ${rubezToken.substring(0, 20)}...`);
  } catch (e) {
    console.error(`   ✗ Rubez user login FAILED: ${e.message}`);
    console.log('\n   → Credentials rejected by IoT platform. Cannot proceed.');
    process.exit(1);
  }

  // Step 2: Get all projects via admin
  console.log('\n2. Fetching projects via admin token...');
  const projectsResp = await getProjectList(adminToken);
  const projects = projectsResp.data?.list || [];
  for (const p of projects) console.log(`   - [${p.id}] ${p.projectName}`);

  const rubezProject = projects.find(p => p.projectName?.toUpperCase().includes('RUBEZ'));
  const resocorpProject = projects.find(p => p.projectName?.toUpperCase().includes('RESOCORP'));

  // Step 3: Test getMeterInfo on RUBEZ meters with rubez user token
  console.log('\n3. Testing getMeterInfo on RUBEZ VILLA meters with rubez user token...');
  if (rubezProject) {
    const metersResp = await getProjectMeterList(String(rubezProject.id), adminToken);
    const meters = metersResp.data?.list || [];
    const onlineMeters = meters.filter(m => m.unConnect === 0 || m.unConnect === '0');
    console.log(`   Found ${meters.length} total meters, ${onlineMeters.length} online in RUBEZ VILLA`);

    // Test first 3 online meters
    const testMeters = onlineMeters.slice(0, 3);
    if (testMeters.length === 0) {
      console.log('   No online meters to test getMeterInfo on.');
    }
    for (const m of testMeters) {
      const roomNo = m.roomNo || m.meterName || m.meterSn || '';
      const resp = await getMeterInfo(roomNo, rubezToken);
      if (resp.success === '1' && resp.data) {
        console.log(`   ✓ roomNo="${roomNo}" → power=${resp.data.p} kW, balance=${resp.data.balance}`);
      } else {
        console.log(`   ✗ roomNo="${roomNo}" → FAILED: ${resp.errorMsg || resp.msg || JSON.stringify(resp)}`);
      }
    }
  } else {
    console.log('   RUBEZ project not found.');
  }

  // Step 4: Check if rubez user token can also access RESOCORP meters (cross-project test)
  console.log('\n4. Cross-project test: can rubez token access RESOCORP ESTATE meters?');
  if (resocorpProject) {
    const metersResp = await getProjectMeterList(String(resocorpProject.id), adminToken);
    const meters = metersResp.data?.list || [];
    const onlineMeter = meters.find(m => m.unConnect === 0 || m.unConnect === '0');
    if (onlineMeter) {
      const roomNo = onlineMeter.roomNo || onlineMeter.meterName || onlineMeter.meterSn || '';
      const resp = await getMeterInfo(roomNo, rubezToken);
      if (resp.success === '1' && resp.data) {
        console.log(`   ✓ roomNo="${roomNo}" accessible with rubez token → power=${resp.data.p} kW`);
        console.log('   → rubez token has CROSS-PROJECT access (one token for all projects possible)');
      } else {
        console.log(`   ✗ roomNo="${roomNo}" NOT accessible with rubez token: ${resp.errorMsg || resp.msg}`);
        console.log('   → rubez token is PROJECT-SCOPED (per-project tokens needed)');
      }
    } else {
      console.log('   No online RESOCORP meters to test.');
    }
  } else {
    console.log('   RESOCORP project not found.');
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
