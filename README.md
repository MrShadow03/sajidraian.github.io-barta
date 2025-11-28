# BARTA - Real-time Chat Application

A modern, feature-rich chat application with user registration, authentication, and real-time messaging using JSON file database.

## Features

- ✨ User registration with photo upload
- 🔐 Secure login/logout system
- 💬 Real-time messaging with polling
- 👥 Online/offline status indicators
- 🎨 Light/Dark theme support
- 🔊 Sound effects for interactions
- 📱 Responsive design
- ⌨️ Keyboard navigation support
- ♿ Accessibility features (ARIA labels)

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start the server:**
```bash
npm start
```

The server will start on `http://localhost:3000`

3. **Open the application:**
Open `http://localhost:3000/index.html` in your browser

## Usage

1. **Register a new account:**
   - Click "Get Started" on the home page
   - Enter username and password (minimum 6 characters)
   - Optionally upload a profile photo
   - Click "Register"

2. **Login:**
   - Enter your username and password
   - Click "Login"

3. **Start chatting:**
   - Select a user from the sidebar
   - Type your message and press Enter or click send
   - Messages appear in real-time using polling (every 2 seconds)

4. **Online status:**
   - Green dot = User is online
   - Gray dot = User is offline
   - User list updates every 3 seconds

## Technical Details

### Backend (server.js)
- Express.js server
- REST API endpoints
- JSON file storage (database/)
- Session management with heartbeat
- Photo upload with Multer
- CORS enabled

### Frontend
- Vanilla JavaScript
- Web Audio API for sounds
- LocalStorage for session persistence
- Polling for real-time updates
- Line Awesome icons

### Database Structure
- `database/users.json` - User accounts
- `database/messages.json` - Chat messages
- `database/sessions.json` - Active sessions
- `uploads/` - User profile photos

## API Endpoints

- `POST /api/register` - Register new user
- `POST /api/login` - Authenticate user
- `POST /api/logout` - End session
- `POST /api/heartbeat` - Keep session alive
- `GET /api/users` - Get all users with online status
- `POST /api/messages` - Send message
- `GET /api/messages/:userId1/:userId2` - Get conversation
- `POST /api/messages/read` - Mark messages as read

## Development

For development with auto-reload:
```bash
npm install -g nodemon
npm run dev
```

## Security Notes

⚠️ **This is a demo application. For production use:**
- Hash passwords (use bcrypt)
- Implement proper authentication tokens (JWT)
- Add rate limiting
- Validate and sanitize all inputs
- Use HTTPS
- Implement proper session management
- Add database backups

## Credits

Built with:
- Express.js
- Multer
- Line Awesome Icons
- Figtree Font
Our 2nd Semester Project Based Learning-2 where we built a project named "Barta"
