# TeleDash - Unified Messaging Platform

A WhatsApp-style interface for managing all your communication channels in one place. Start with Telegram and expand to WhatsApp, SMS, Email, and more.

## Features

- Real-time messaging with WebSocket support
- WhatsApp-like UI design
- Support for multiple channels (starting with Telegram)
- Message history and conversation management
- Media support (photos, documents, voice messages)
- Fully responsive design

## Technology Stack

### Backend
- Node.js + Express
- Telegram Bot API
- Supabase (PostgreSQL + Realtime)

### Frontend
- React + TypeScript
- Tailwind CSS
- Supabase Client (WebSocket)

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **A Telegram Bot Token** - Already have: `7700088792:AAH724gnfhyxN7-GTulyhp4IhYpmaP12cA8`
3. **A Supabase Account** - [Sign up here](https://supabase.com)

## Setup Instructions

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose a name (e.g., "teledash")
4. Choose a database password (save this!)
5. Select the region closest to you
6. Click "Create new project" (wait ~2 minutes)

7. Once created, go to **SQL Editor** (left sidebar)
8. Click "New query"
9. Copy the entire contents of `database/schema.sql` and paste it
10. Click "Run" to create all tables

11. Go to **Settings** → **API** (left sidebar)
12. Copy the following:
   - **Project URL** (starts with `https://...supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### Step 2: Set Up Backend

1. Open a terminal and navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file by copying the example:
```bash
copy .env.example .env
```

4. Edit the `.env` file with your credentials:
```env
TELEGRAM_BOT_TOKEN=7700088792:AAH724gnfhyxN7-GTulyhp4IhYpmaP12cA8
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

Replace `your-project` and `your-anon-key-here` with the values from Supabase.

5. Start the backend server:
```bash
npm start
```

You should see:
```
🚀 Server running on port 3000
```

### Step 3: Set Up ngrok (for Telegram Webhook)

Telegram needs an HTTPS URL to send updates to your server. During development, we use ngrok to create a secure tunnel.

1. Open a **new terminal window** (keep the backend running)

2. Install and run ngrok:
```bash
npx ngrok http 3000
```

3. You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Set the Telegram webhook by opening this URL in your browser (replace `YOUR_NGROK_URL`):
```
http://localhost:3000/api/webhook/set
```

Or use this command in a new terminal:
```bash
curl -X POST http://localhost:3000/api/webhook/set -H "Content-Type: application/json" -d "{\"url\":\"https://abc123.ngrok.io\"}"
```

You should see: `✅ Telegram webhook set successfully`

### Step 4: Set Up Frontend

1. Open a **new terminal window** and navigate to frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
copy .env.example .env
```

4. Edit the `.env` file with your Supabase credentials:
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_API_URL=http://localhost:3000
```

5. Start the frontend:
```bash
npm start
```

The app will open in your browser at `http://localhost:3000` (or port 3001 if 3000 is taken)

### Step 5: Test It Out!

1. Open Telegram and search for your bot (use the bot username from BotFather)
2. Send a message to your bot: "Hello TeleDash!"
3. Watch it appear **instantly** in your dashboard!
4. Reply from the dashboard
5. Check your Telegram app - you should receive the reply!

## Project Structure

```
teleDash/
├── backend/                 # Node.js backend
│   ├── routes/             # API routes
│   │   ├── webhook.js      # Telegram webhook handler
│   │   ├── messages.js     # Send/receive messages
│   │   └── conversations.js # Conversation management
│   ├── utils/              # Utility functions
│   │   └── processMessage.js # Message processing logic
│   ├── server.js           # Express server
│   ├── telegram.js         # Telegram bot client
│   ├── supabase.js         # Supabase client
│   └── package.json
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useConversations.ts
│   │   │   └── useMessages.ts
│   │   ├── lib/           # Libraries
│   │   │   └── supabase.ts
│   │   ├── types/         # TypeScript types
│   │   ├── App.tsx        # Main app component
│   │   └── index.tsx      # Entry point
│   └── package.json
│
└── database/              # Database schema
    └── schema.sql         # Supabase SQL schema
```

## How It Works

### Real-Time Architecture

```
[Telegram] → [Webhook] → [Backend] → [Supabase DB]
                                           ↓
                                    [Realtime Event]
                                           ↓
                                    [Frontend Updates]
```

1. **User sends message on Telegram** → Telegram API sends webhook to backend
2. **Backend receives webhook** → Processes message and stores in Supabase
3. **Supabase triggers realtime event** → Notifies all connected frontends
4. **Frontend receives event** → Updates UI automatically (no refresh needed!)

### Sending Messages

```
[Frontend] → [POST /api/messages/send] → [Backend] → [Telegram API]
                                             ↓
                                      [Store in Supabase]
                                             ↓
                                      [Realtime Update]
```

## API Endpoints

### Backend API

- `GET /` - Health check
- `POST /api/telegram/webhook` - Telegram webhook endpoint
- `GET /api/conversations` - Get all conversations
- `GET /api/conversations/:id` - Get specific conversation
- `GET /api/messages/:conversation_id` - Get messages for a conversation
- `POST /api/messages/send` - Send a message
- `PATCH /api/messages/mark-read/:conversation_id` - Mark conversation as read
- `POST /api/webhook/set` - Set Telegram webhook URL
- `POST /api/webhook/delete` - Delete Telegram webhook

## Troubleshooting

### Messages not appearing in real-time

1. Check that ngrok is running
2. Verify webhook is set: Check backend logs for "✅ Telegram webhook set successfully"
3. Check Supabase connection: Open browser DevTools → Network tab → look for WebSocket connection
4. Restart the frontend to reconnect to Supabase

### "Failed to send message" error

1. Check that backend is running on port 3000
2. Check `.env` file has correct Telegram token
3. Check browser console for errors
4. Try sending a test message via Postman to `http://localhost:3000/api/messages/send`

### Supabase connection errors

1. Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
2. Check Supabase dashboard → Settings → API
3. Make sure you ran the schema.sql file
4. Check Supabase project is not paused (free tier pauses after 7 days inactivity)

## Development Tips

### Viewing Logs

**Backend logs:**
- Terminal where you ran `npm start` in backend folder
- Shows all incoming webhooks and database operations

**Frontend logs:**
- Browser DevTools → Console
- Shows realtime subscriptions and component renders

**Supabase logs:**
- Supabase Dashboard → Database → Logs
- Shows all SQL queries and errors

### Testing Realtime

1. Open two browser windows side by side
2. Send a message from one
3. Watch it appear in the other instantly!

### Restarting Everything

If things get weird, restart in this order:

1. Kill ngrok (Ctrl+C)
2. Kill backend (Ctrl+C)
3. Kill frontend (Ctrl+C)
4. Start backend: `cd backend && npm start`
5. Start ngrok: `npx ngrok http 3000`
6. Set webhook again
7. Start frontend: `cd frontend && npm start`

## Next Steps

### Phase 1: Core Features (You are here!)
- [x] Real-time messaging with Telegram
- [x] WhatsApp-like UI
- [ ] Deploy to production (Vercel + Railway)

### Phase 2: Enhanced Features
- [ ] Contact management (tags, notes)
- [ ] Message search
- [ ] Quick replies/templates
- [ ] File uploads
- [ ] Admin authentication

### Phase 3: Multi-Channel
- [ ] WhatsApp Business API integration
- [ ] SMS support (via Twilio)
- [ ] Email support
- [ ] Facebook Messenger

## Cost Breakdown

### Current Setup (Development)
- **Supabase:** $0 (free tier)
- **Backend:** $0 (local or Render free tier)
- **Frontend:** $0 (local or Vercel free tier)
- **ngrok:** $0 (free tier)
- **Total:** $0/month

### Production (Recommended)
- **Supabase:** $0-25/month (free tier sufficient for 1000s of messages)
- **Backend:** $5/month (Railway or DigitalOcean)
- **Frontend:** $0/month (Vercel/Netlify free tier)
- **Domain:** $12/year (optional)
- **Total:** ~$5-32/month

## Support

If you encounter issues:

1. Check this README carefully
2. Look at backend terminal for error messages
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
5. Make sure Supabase schema was created successfully

## License

MIT License - Feel free to use this for personal or commercial projects!

---

**Built with ❤️ using React, Node.js, and Supabase**
