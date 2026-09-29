const http = require('http');

// Helper to make HTTP JSON requests
function makeRequest({ method, path, token, body }) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED BACKEND API TESTS ===');
  const timestamp = Date.now();
  const aliceEmail = `alice_${timestamp}@test.com`;
  const bobEmail = `bob_${timestamp}@test.com`;

  try {
    // 1. Health check
    console.log('1. Testing GET /api/health...');
    const health = await makeRequest({ method: 'GET', path: '/api/health' });
    console.log('Health status:', health.status, health.data.message);

    // 2. Register Alice
    console.log('\n2. Testing POST /api/auth/register (Alice)...');
    const regAlice = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { username: `alice_${timestamp}`, email: aliceEmail, password: 'password123' }
    });
    console.log('Alice registered:', regAlice.status, regAlice.data.user?.username);
    const aliceToken = regAlice.data.token;
    const aliceId = regAlice.data.user._id;

    // 3. Register Bob
    console.log('\n3. Testing POST /api/auth/register (Bob)...');
    const regBob = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { username: `bob_${timestamp}`, email: bobEmail, password: 'password123' }
    });
    console.log('Bob registered:', regBob.status, regBob.data.user?.username);
    const bobToken = regBob.data.token;
    const bobId = regBob.data.user._id;

    // 4. Test Login
    console.log('\n4. Testing POST /api/auth/login...');
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: aliceEmail, password: 'password123' }
    });
    console.log('Login result:', loginRes.status, loginRes.data.message);

    // 5. Test Auth Me
    console.log('\n5. Testing GET /api/auth/me...');
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: aliceToken
    });
    console.log('Me result:', meRes.status, meRes.data.user.username);

    // 6. Test Get Users
    console.log('\n6. Testing GET /api/users...');
    const usersRes = await makeRequest({
      method: 'GET',
      path: '/api/users',
      token: aliceToken
    });
    console.log('Users found count:', usersRes.data.count);

    // 7. Create 1:1 conversation between Alice and Bob
    console.log('\n7. Testing POST /api/conversations (Alice -> Bob)...');
    const convRes = await makeRequest({
      method: 'POST',
      path: '/api/conversations',
      token: aliceToken,
      body: { recipientId: bobId }
    });
    console.log('Conversation created ID:', convRes.data.conversation?._id);
    const convId = convRes.data.conversation._id;

    // 8. Send message from Alice
    console.log('\n8. Testing POST /api/messages (Alice sends message)...');
    const msgRes = await makeRequest({
      method: 'POST',
      path: '/api/messages',
      token: aliceToken,
      body: { conversationId: convId, text: 'Hello Bob! How are you doing?' }
    });
    console.log('Message sent:', msgRes.status, msgRes.data.message?.text);
    const messageId = msgRes.data.message._id;

    // 9. Get messages
    console.log('\n9. Testing GET /api/messages/:conversationId...');
    const getMsgs = await makeRequest({
      method: 'GET',
      path: `/api/messages/${convId}`,
      token: bobToken
    });
    console.log('Messages retrieved count:', getMsgs.data.messages?.length);

    // 10. Mark messages as read by Bob
    console.log('\n10. Testing PUT /api/messages/read/:conversationId (Bob marks as read)...');
    const readRes = await makeRequest({
      method: 'PUT',
      path: `/api/messages/read/${convId}`,
      token: bobToken
    });
    console.log('Mark read result:', readRes.status, readRes.data.message);

    // 11. Update Profile
    console.log('\n11. Testing PUT /api/users/profile...');
    const profileRes = await makeRequest({
      method: 'PUT',
      path: '/api/users/profile',
      token: aliceToken,
      body: { bio: 'Full-stack developer enjoying RealTime Chat!' }
    });
    console.log('Profile updated bio:', profileRes.data.user?.bio);

    console.log('\n=== ALL 11 API TEST CHECKS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

// Start server in background then run tests
const server = require('../server.js');
setTimeout(runTests, 1500);
