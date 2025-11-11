# Quick Setup Guide

## 🚀 Getting Started

### Step 1: Populate Environment Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/world_tracker?schema=public"
OPENAI_API_KEY="YOUR_OPENAI_KEY_HERE"  # Get from https://platform.openai.com/api-keys
PORT=3001
NODE_ENV=development
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3001
VITE_MAPBOX_TOKEN="YOUR_MAPBOX_TOKEN_HERE"  # Get from https://account.mapbox.com/
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Setup Database

Make sure PostgreSQL is running, then:

```bash
cd backend
npx prisma db push
npm run db:seed
cd ..
```

### Step 4: Start the Application

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 3000).

### Step 5: Open Your Browser

Navigate to: http://localhost:3000

## 🎯 First Steps

1. **Explore the Map**: Click on any country to view details
2. **Add Sentiment Tags**: Use the three-button selectors for economic/social/political sentiment
3. **Try the AI Assistant**: Ask "Tell me about the economic situation in this country"
4. **Add an Article**: Paste a news URL in the Articles tab
5. **Create a Region**: Group countries together for analysis

## 🔑 Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it in `backend/.env`

### Mapbox Token
1. Go to https://account.mapbox.com/
2. Sign in or create an account
3. Copy your default public token (starts with `pk.`)
4. Paste it in `frontend/.env`

## 💡 Tips

- The UI uses a modern dark theme with beautiful gradients
- All AI suggestions require manual approval - nothing is written automatically
- Articles are automatically summarized using OpenAI
- Tags are stored with an audit trail - you can see the history
- Regions can aggregate data from multiple countries

## 🐛 Troubleshooting

**Backend won't start?**
- Check that PostgreSQL is running
- Verify your DATABASE_URL is correct
- Make sure OPENAI_API_KEY is set

**Frontend shows empty map?**
- Verify your VITE_MAPBOX_TOKEN is set correctly
- Check browser console for errors
- Ensure backend is running on port 3001

**Database errors?**
- Run `npx prisma db push` again
- Check PostgreSQL connection
- Try resetting: `npx prisma db push --force-reset` then `npm run db:seed`

## 📚 Learn More

See the main README.md for:
- Complete API documentation
- Detailed feature descriptions
- Architecture overview
- Advanced usage patterns

