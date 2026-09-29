# Real-Time Messaging Platform (MERN + Socket.IO)

A full-stack, production-ready real-time messaging application built with the **MERN** stack (MongoDB, Express, React, Node.js) and **Socket.IO**. Designed with a focus on robust backend architecture, scalable RESTful APIs, JWT authentication, and event-driven real-time communication.

---

## 🚀 Features

- **Authentication & Security:**
  - User registration and login with bcrypt password hashing (salt rounds: 10).
  - Stateless JWT authentication via `Authorization: Bearer <token>` headers.
  - Socket.IO connection authentication via JWT handshake middleware.
  - Input validation and sanitized responses (passwords never exposed).
- **Users Management:**
  - Search/filter users in real time.
  - User profile lookup, avatar customization, and bio/status updates.
  - Username availability checking.
- **1:1 Conversations:**
  - Dynamic creation and retrieval of 1:1 conversation channels.
  - Sidebar conversation listing sorted by latest activity with last message preview and unread counters.
- **Messages & Media:**
  - Send and receive text messages instantly.
  - Media/image attachments using `multer` stored locally in `server/uploads/` and served statically.
  - Paginated chat history (`?page=1&limit=30`).
  - Read receipts (`sent` ➔ `delivered` ➔ `seen`) with visual single/double check ticks.
  - Message deletion ("Delete for me" or "Delete for everyone").
- **Real-Time Capabilities (Socket.IO):**
  - Online/offline presence indicators (supports multiple simultaneous device tabs per user).
  - Live typing indicator (`... is typing`).
  - Instant message delivery with acknowledgments.
  - Delivery and seen receipts dispatched in real-time.
- **Minimalist React Frontend:**
  - Fast Vite-powered React client with custom plain CSS (no heavy UI frameworks).
  - Responsive layout (sidebar conversation list + active chat window).
  - Status indicators (green online dot, grey offline dot, last seen timestamp).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js (v18+ / v24+), Express.js 4.x, MongoDB (Mongoose 8.x), Socket.IO 4.x, JSON Web Tokens (jsonwebtoken), bcryptjs, Multer, Cors, Dotenv |
| **Frontend** | React 19, Vite, Plain Vanilla CSS, Axios, Socket.IO Client |
| **Database** | Local MongoDB (`mongodb://127.0.0.1:27017/chatapp`) |

---

## 📁 Repository Structure

```text
RealTimeMessaging/
├── package.json               # Root scripts for running server & client
├── .gitignore                 # Root gitignore (ignores node_modules, .env, uploads)
├── README.md                  # Complete project documentation & API guide
├── server/
│   ├── config/
│   │   └── db.js              # MongoDB Mongoose connection
│   ├── controllers/
│   │   ├── authController.js         # Register, Login, Me, Logout
│   │   ├── userController.js         # Search users, Profile, Status
│   │   ├── conversationController.js # 1:1 Conversations
│   │   └── messageController.js      # Message send, History, Upload, Seen, Delete
│   ├── middleware/
│   │   ├── auth.js            # JWT Bearer verification
│   │   ├── errorHandler.js    # Central error handler & 404
│   │   └── upload.js          # Multer storage configuration
│   ├── models/
│   │   ├── User.js            # User schema & password hashing
│   │   ├── Conversation.js    # Conversation schema & unread counts
│   │   └── Message.js         # Message schema & delivery/seen status
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth
│   │   ├── userRoutes.js      # /api/users
│   │   ├── conversationRoutes.js # /api/conversations
│   │   └── messageRoutes.js   # /api/messages
│   ├── socket/
│   │   └── socketHandler.js   # Socket.IO auth, presence, typing, messaging
│   ├── tests/
│   │   ├── apiTest.js         # Automated end-to-end REST test script
│   │   └── socketTest.js      # Automated real-time Socket.IO test script
│   ├── uploads/
│   │   └── .gitkeep           # Local media uploads directory
│   ├── .env.example           # Environment template
│   ├── .env                   # Local environment file
│   ├── package.json           # Backend dependencies & scripts
│   └── server.js              # Express app & HTTP/Socket server entry point
└── client/
    ├── src/
    │   ├── api/
    │   │   └── api.js         # Axios instance with interceptors
    │   ├── components/
    │   │   ├── Navbar.jsx        # Header with user avatar & logout
    │   │   ├── Sidebar.jsx       # Search, chat list, users list, online dots
    │   │   ├── ChatWindow.jsx    # Messages history, media, typing, input
    │   │   └── ProfileModal.jsx  # Edit profile & bio modal
    │   ├── context/
    │   │   ├── AuthContext.jsx   # Authentication state management
    │   │   └── SocketContext.jsx # Socket.IO connection & presence state
    │   ├── pages/
    │   │   ├── LoginPage.jsx     # Login view
    │   │   ├── RegisterPage.jsx  # Registration view
    │   │   └── ChatPage.jsx      # Main messaging dashboard
    │   ├── App.jsx            # Conditional auth router
    │   ├── main.jsx           # App entry with context providers
    │   └── index.css          # Modern dark-theme CSS design system
    ├── index.html             # HTML entry point
    ├── vite.config.js         # Vite dev server & proxy settings
    └── package.json           # Frontend dependencies
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `server/` directory (you can copy from `server/.env.example`):

```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/chatapp
JWT_SECRET=supersecretjwtkey_change_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🏃 Setup & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed and running locally on default port `27017` (or MongoDB Atlas URI if preferred).

### 1. Install Dependencies
From the repository root directory, run:
```bash
npm run install:all
```
*(Or navigate into `server` and `client` individually and run `npm install` in each).*

### Option A: Running from the Project Root (Recommended)
Open two terminal windows in the project root (`RealTimeMessaging`):

**Terminal 1 (Backend):**
```bash
npm run server
```

**Terminal 2 (Frontend):**
```bash
npm run client
```

---

### Option B: Running from Subdirectories
If you navigate directly into the folders:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

### 4. Run Automated Tests
Verify all API endpoints and real-time Socket.IO flows with the built-in test suites:
```bash
# Test all 11+ REST API endpoints
npm run server:test:api

# Test real-time Socket.IO connection, typing events, and message receipts
npm run server:test:socket
```

---

## 📡 REST API Reference

All endpoints are prefixed with `/api`. Protected routes require the `Authorization: Bearer <token>` header.

### 1. Health Check
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns API health status |

### 2. Authentication (`/api/auth`)
| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | `{ username, email, password, bio?, avatar? }` | Register a new user |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | Authenticate user & get token |
| `GET` | `/api/auth/me` | Protected | None | Get current authenticated user profile |
| `POST` | `/api/auth/logout` | Protected | None | Logout and set user offline |

### 3. Users (`/api/users`)
| Method | Endpoint | Auth | Query / Params | Description |
|---|---|---|---|---|
| `GET` | `/api/users` | Protected | `?search=term` | List/search all users (excluding requester) |
| `GET` | `/api/users/:id` | Protected | `:id` | Get user details by ID |
| `GET` | `/api/users/check/:username` | Public | `:username` | Check if username is available |
| `PUT` | `/api/users/profile` | Protected | `{ username?, bio?, avatar? }` | Update user profile |
| `PUT` | `/api/users/status` | Protected | `{ isOnline }` | Update user online/offline status |

### 4. Conversations (`/api/conversations`)
| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `POST` | `/api/conversations` | Protected | `{ recipientId }` | Create or fetch existing 1:1 conversation |
| `GET` | `/api/conversations` | Protected | None | List user's conversations with last message & unread count |
| `GET` | `/api/conversations/:id` | Protected | `:id` | Get single conversation details |
| `DELETE` | `/api/conversations/:id` | Protected | `:id` | Delete conversation and all its messages |

### 5. Messages (`/api/messages`)
| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `POST` | `/api/messages` | Protected | `{ conversationId, text?, mediaUrl?, mediaType? }` | Send a text or media message |
| `POST` | `/api/messages/upload` | Protected | `FormData` with `file` | Upload image media via Multer (returns URL) |
| `GET` | `/api/messages/:conversationId`| Protected | `:conversationId?page=1&limit=30` | Get paginated message history |
| `PUT` | `/api/messages/read/:conversationId` | Protected | `:conversationId` | Mark all unread messages in conversation as read |
| `PUT` | `/api/messages/:id/status` | Protected | `:id`, `{ status: 'delivered' \| 'seen' }` | Update single message delivery status |
| `DELETE` | `/api/messages/:id` | Protected | `:id?forEveryone=true\|false` | Delete message (for self or everyone) |
| `GET` | `/api/messages/unread/total` | Protected | None | Get total unread messages count for user |

---

## ⚡ Socket.IO Events Reference

Socket connection requires JWT authentication:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: '<YOUR_JWT_TOKEN>' }
});
```

### Client ➔ Server Events

| Event | Payload | Description |
|---|---|---|
| `join_conversation` | `{ conversationId }` | Joins a conversation room |
| `leave_conversation`| `{ conversationId }` | Leaves a conversation room |
| `typing_start` | `{ conversationId, recipientId }` | Notifies recipient that user is typing |
| `typing_stop` | `{ conversationId, recipientId }` | Notifies recipient that user stopped typing |
| `send_message` | `{ conversationId, recipientId, text, mediaUrl?, mediaType? }` | Dispatches message via socket |
| `mark_delivered` | `{ messageIds, senderId }` | Marks messages as delivered |
| `mark_seen` | `{ conversationId, senderId }` | Marks conversation messages as seen |

### Server ➔ Client Events

| Event | Payload | Description |
|---|---|---|
| `online_users_list` | `[userId1, userId2, ...]` | Sent on connection with active online user IDs |
| `user_status_change`| `{ userId, isOnline, lastSeen }` | Broadcast whenever a user connects or disconnects |
| `receive_message` | `MessageObject` | Emitted when receiving a message in real-time |
| `messages_delivered`| `{ messageIds, deliveredAt }` | Receipt confirming message was delivered |
| `messages_seen` | `{ conversationId, seenBy, seenAt }` | Receipt confirming messages were seen by recipient |
| `user_typing` | `{ conversationId, userId, username }`| Recipient receives typing indicator |
| `user_stop_typing` | `{ conversationId, userId }` | Recipient stops typing indicator |

---

## 🐙 Pushing to GitHub

To push this repository to GitHub:

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `RealTimeMessaging`).
2. Add your GitHub remote URL and push:

```bash
git add .
git commit -m "Initial commit: Full-stack MERN real-time messaging platform with Socket.IO"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/RealTimeMessaging.git
git push -u origin main
```
