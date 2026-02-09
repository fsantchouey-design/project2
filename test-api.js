/**
 * Test script for HomeDesigns.AI API
 * Run: node test-api.js
 */

require('dotenv').config();

const API_URL = process.env.HOMEDESIGNS_API_URL || 'https://homedesigns.ai/api/v2';
const API_TOKEN = process.env.HOMEDESIGNS_API_TOKEN;

console.log('Testing HomeDesigns.AI API Integration\n');
console.log('=====================================');
console.log('API URL:', API_URL);
console.log('Token (first 20 chars):', API_TOKEN ? API_TOKEN.substring(0, 20) + '...' : 'NOT SET');
console.log('=====================================\n');

async function testCreditsCheck() {
  console.log('1. Testing User Info / Credits...');
  try {
    const response = await fetch(`${API_URL}/user_info`, {
      headers: {
        'x-api-key': API_TOKEN
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('   ❌ User info check failed:', response.status);
      console.log('   Error:', errorText.substring(0, 200));
      return false;
    }

    const data = await response.json();
    console.log('   ✅ User info check successful!');
    console.log('   Name:', data.Data?.[0]?.customer?.name || 'N/A');
    console.log('   Email:', data.Data?.[0]?.customer?.Email || 'N/A');
    console.log('   Plan:', data.Data?.[0]?.Subscription?.Plan_Name || 'N/A');
    console.log('   Total Credits:', data.Data?.[0]?.Subscription?.Total_Credit || 'N/A');
    console.log('   Used Credits:', data.Data?.[0]?.Subscription?.Used_Credit || 'N/A');
    console.log('   Left Credits:', data.Data?.[0]?.Subscription?.Left_Credit || 'N/A');
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function testDesignGeneration() {
  console.log('\n2. Testing Design Generation (using sample image)...');
  
  const FormData = require('form-data');
  const https = require('https');
  
  // Using a publicly accessible sample room image
  const sampleImageUrl = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800';
  
  try {
    console.log('   Downloading test image...');
    const imageResponse = await fetch(sampleImageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    console.log('   Creating form data...');
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('design_type', 'Interior');
    formData.append('ai_intervention', 'Mid');
    formData.append('no_design', '1');
    formData.append('design_style', 'Modern');
    formData.append('room_type', 'Living Room');
    
    console.log('   Sending POST request to', `${API_URL}/beautiful_redesign`);
    console.log('   Parameters: Interior, Modern, Living Room, Mid intervention');
    
    const response = await fetch(`${API_URL}/beautiful_redesign`, {
      method: 'POST',
      headers: {
        'x-api-key': API_TOKEN,
        ...formData.getHeaders()
      },
      body: formData
    });

    const responseText = await response.text();
    console.log('\n   Response status:', response.status);
    
    if (!response.ok) {
      console.log('   ❌ Generation request failed:', responseText.substring(0, 500));
      return false;
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log('   ❌ Could not parse response as JSON:', responseText.substring(0, 200));
      return false;
    }

    console.log('   ✅ Generation request queued!');
    console.log('   Queue ID:', data.queue_id);
    
    if (data.queue_id) {
      console.log('\n   Checking status (will poll for up to 60 seconds)...');
      
      // Poll status
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`${API_URL}/beautiful_redesign/status_check/${data.queue_id}`, {
          headers: { 'x-api-key': API_TOKEN }
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`   [${i+1}] Status:`, statusData.status);
          
          if (statusData.status === 'SUCCESS') {
            console.log('\n   ✅ Generation complete!');
            console.log('   🎨 Generated Image URL:', statusData.generated_images?.[0] || statusData.output_url);
            return true;
          } else if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
            console.log('   ❌ Generation failed:', statusData.message);
            return false;
          }
        }
      }
      
      console.log('   ⚠️  Timeout waiting for generation');
      return false;
    }
    
    return false;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function listAvailableEndpoints() {
  console.log('\n3. Checking API documentation endpoint...');
  try {
    const response = await fetch(`${API_URL}/v1`);
    console.log('   Status:', response.status);
    if (response.ok) {
      const text = await response.text();
      console.log('   Response:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('   Note:', error.message);
  }
}

async function runTests() {
  if (!API_TOKEN) {
    console.log('❌ ERROR: HOMEDESIGNS_API_TOKEN is not set in .env file');
    console.log('Please make sure your .env file contains the token.');
    return;
  }

  const creditsOk = await testCreditsCheck();
  
  // Try generation test even if credits check failed (might be different endpoint)
  console.log('\n⚠️  Note: Design generation will use credits from your account.');
  console.log('   Testing actual generation...\n');
  
  await testDesignGeneration();
  
  await listAvailableEndpoints();
  
  console.log('\n=====================================');
  console.log('Test complete!');
  console.log('=====================================');
}

runTests();

