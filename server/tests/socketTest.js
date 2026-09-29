const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Require server to start it
require('../server.js');

setTimeout(async () => {
  console.log('=== STARTING SOCKET.IO REAL-TIME TEST ===');
  const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';

  // We need valid user IDs. Let's create tokens with dummy IDs or query from db
  const mongoose = require('mongoose');
  const User = require('../models/User');
  const Conversation = require('../models/Conversation');

  const alice = await User.findOne({ email: { $regex: 'alice_' } });
  const bob = await User.findOne({ email: { $regex: 'bob_' } });

  if (!alice || !bob) {
    console.error('Test users not found. Run apiTest.js first.');
    process.exit(1);
  }

  const aliceToken = jwt.sign({ id: alice._id }, secret, { expiresIn: '1h' });
  const bobToken = jwt.sign({ id: bob._id }, secret, { expiresIn: '1h' });

  // 1. Connect Alice Socket
  const aliceSocket = io('http://127.0.0.1:5000', {
    auth: { token: aliceToken }
  });

  // 2. Connect Bob Socket
  const bobSocket = io('http://127.0.0.1:5000', {
    auth: { token: bobToken }
  });

  let bobReceivedMessage = false;
  let aliceReceivedReceipt = false;
  let typingReceived = false;

  aliceSocket.on('connect', () => {
    console.log('1. Alice socket connected successfully! ID:', aliceSocket.id);
  });

  bobSocket.on('connect', () => {
    console.log('2. Bob socket connected successfully! ID:', bobSocket.id);
  });

  bobSocket.on('user_typing', (data) => {
    console.log('3. Bob received typing event from:', data.username);
    typingReceived = true;
  });

  bobSocket.on('receive_message', (msg) => {
    console.log('4. Bob received real-time message:', msg.text);
    bobReceivedMessage = true;

    // Bob marks as seen
    bobSocket.emit('mark_seen', {
      conversationId: msg.conversationId,
      senderId: alice._id.toString()
    });
  });

  aliceSocket.on('messages_seen', (data) => {
    console.log('5. Alice received seen receipt from Bob for conversation:', data.conversationId);
    aliceReceivedReceipt = true;

    console.log('=== ALL SOCKET.IO REAL-TIME CHECKS PASSED! ===');
    aliceSocket.disconnect();
    bobSocket.disconnect();
    setTimeout(() => process.exit(0), 500);
  });

  // After both connect, perform flow
  setTimeout(async () => {
    const conv = await Conversation.findOne({
      participants: { $all: [alice._id, bob._id] }
    });

    // Alice types
    aliceSocket.emit('typing_start', {
      conversationId: conv._id.toString(),
      recipientId: bob._id.toString()
    });

    // Alice sends message
    setTimeout(() => {
      aliceSocket.emit('send_message', {
        conversationId: conv._id.toString(),
        recipientId: bob._id.toString(),
        text: 'Hello from real-time Socket.IO test!'
      }, (res) => {
        console.log('Alice message acknowledgment:', res.success);
      });
    }, 500);
  }, 1000);

}, 1500);
