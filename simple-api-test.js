require('dotenv').config();

const API_TOKEN = process.env.HOMEDESIGNS_API_TOKEN;
const API_URL = process.env.HOMEDESIGNS_API_URL || 'https://homedesigns.ai/api/v2';

console.log('Testing HomeDesigns.AI API with token...\n');
console.log('API URL:', API_URL);
console.log('Token:', API_TOKEN.substring(0, 30) + '...\n');

async function testUserInfo() {
  console.log('Testing GET /user_info endpoint...');
  
  try {
    const response = await fetch(`${API_URL}/user_info`, {
      method: 'GET',
      headers: {
        'x-api-key': API_TOKEN
      }
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ API IS WORKING!');
      console.log('User:', data.Data?.[0]?.customer?.name);
      console.log('Credits Left:', data.Data?.[0]?.Subscription?.Left_Credit);
      return true;
    } else {
      console.log('\n❌ Authentication failed');
      return false;
    }
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    return false;
  }
}

testUserInfo();


