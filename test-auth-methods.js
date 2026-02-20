require('dotenv').config();

const API_TOKEN = process.env.HOMEDESIGNS_API_TOKEN;
const API_URL = 'https://homedesigns.ai/api/v2';

console.log('Testing different authentication methods...\n');
console.log('Token (first 30 chars):', API_TOKEN.substring(0, 30) + '...\n');

async function testAuthMethod(name, headers, params = '') {
  console.log(`Testing ${name}...`);
  try {
    const url = `${API_URL}/user_info${params}`;
    const response = await fetch(url, { method: 'GET', headers });
    
    const text = await response.text();
    console.log(`  Status: ${response.status}`);
    
    if (response.ok) {
      console.log(`  ✅ SUCCESS with ${name}!`);
      const data = JSON.parse(text);
      console.log('  Response:', JSON.stringify(data, null, 2).substring(0, 300));
      return true;
    } else {
      console.log(`  ❌ Failed: ${text.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const methods = [
    { name: 'x-api-key header', headers: { 'x-api-key': API_TOKEN } },
    { name: 'X-API-Key header (caps)', headers: { 'X-API-Key': API_TOKEN } },
    { name: 'api-key header', headers: { 'api-key': API_TOKEN } },
    { name: 'Authorization: Bearer', headers: { 'Authorization': `Bearer ${API_TOKEN}` } },
    { name: 'Authorization: Token', headers: { 'Authorization': `Token ${API_TOKEN}` } },
    { name: 'Authorization (raw)', headers: { 'Authorization': API_TOKEN } },
    { name: 'access-token header', headers: { 'access-token': API_TOKEN } },
    { name: 'token header', headers: { 'token': API_TOKEN } },
  ];
  
  for (const method of methods) {
    await testAuthMethod(method.name, method.headers);
    console.log('');
  }
  
  // Try query parameter
  console.log('Testing query parameter...');
  await testAuthMethod('api_key query param', {}, `?api_key=${API_TOKEN}`);
  console.log('');
  await testAuthMethod('token query param', {}, `?token=${API_TOKEN}`);
}

runTests();

