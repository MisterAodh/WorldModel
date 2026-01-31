# World Tracker - Geopolitical Intelligence Workspace

A powerful multi-user platform for tracking and analyzing geopolitical intelligence with AI-assisted insights, interactive mapping, and comprehensive data management.

## 🆕 Latest Updates (January 2026)

### Multi-User Social Platform
- **User Accounts**: Sign up and sign in with Clerk authentication
- **Follow System**: Follow other analysts to see their analysis on your map
- **Network Analysis View**: Toggle between "My Analysis" and "Network" views
- **User Profiles**: Public profiles with bio, followers, and world data
- **User Search**: Find and discover other analysts to follow

### Messaging & Sharing
- **Direct Messages**: Chat with other users
- **Article Sharing**: Forward articles with analysis through messages
- **Unread Notifications**: Badge shows unread message count

### Credits & Billing
- **Token Tracking**: All AI operations tracked and billed
- **Credit System**: $5 free credits on signup
- **Stripe Integration**: Purchase $10 credit packages
- **Usage Dashboard**: View detailed API usage history

### Deep Data Aggregation
- **95+ Metrics**: Automated collection using Claude AI with web search
- **Parallel Processing**: Metrics collected in batches for speed
- **Real-time Progress**: Watch aggregation in real-time with logs
- **AI Score Generation**: Auto-generate Economic, Social, Political, and Ideological scores

## Features

### 🗺️ Interactive World Map
- Click countries to view detailed information
- Color-coded by economic, social, or political sentiment (red/green scale)
- Hover tooltips for quick country identification
- Real-time visual encoding of qualitative data

### 📊 Comprehensive Data Management
- **Qualitative Tags**: Economic, social, political, and ideological sentiment analysis (-5 to +5 scale)
- **Deep Data Aggregation**: 95+ metrics auto-collected by AI
- **Industry Data**: GDP share breakdown by industry sector
- **Article Tracking**: Link news articles with AI-generated summaries
- **Notes**: Freeform commentary and analysis per country/region

### 🤖 AI Assistant
- Context-aware chat with web search integration
- Automatic proposal of sentiment tags and data updates
- Source citations with clickable links
- Billed per-token with transparent pricing

### 👥 Social Features
- Follow other analysts
- View network's analysis on your map
- Direct messaging with article sharing
- Public user profiles and search

### 💳 Credits System
- $5 free credits on signup
- Pay-as-you-go for AI features
- Purchase $10 credit packages via Stripe
- Detailed usage tracking and history

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vercel)                     │
│  React + Vite + Clerk Auth + Mapbox GL + Tailwind           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Railway/Render)                 │
│  Express + Prisma + Clerk SDK + Stripe + Claude API         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  Users, Follows, Messages, Articles, Tags, Metrics, etc.    │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Clone and install dependencies
npm install

# 2. Set up environment variables (see Environment Variables section)

# 3. Setup database
cd backend && npx prisma db push && npm run db:seed && cd ..

# 4. Start the application
npm run dev
```

Open http://localhost:5173 in your browser!

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/world_tracker"

# Clerk Authentication
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# Claude AI (Required for chat and data aggregation)
CLAUDE_API_KEY="sk-ant-..."

# Stripe Payments (Required for purchasing credits)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Mapbox (Required for map display)
VITE_MAPBOX_TOKEN="pk.eyJ1..."

# Frontend API URL (for production)
VITE_API_URL="http://localhost:3001"

# Backend CORS URL (for production)
FRONTEND_URL="http://localhost:5173"
```

### Getting API Keys

1. **Clerk**: Sign up at https://clerk.com and create an application
2. **Claude**: Get API key from https://console.anthropic.com
3. **Stripe**: Get keys from https://dashboard.stripe.com/test/apikeys
4. **Mapbox**: Get token from https://account.mapbox.com

## Deployment (Railway)

### Full Railway Deployment

Deploy the entire application (frontend + backend + database) on Railway:

#### 1. Create Railway Project

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login
```

#### 2. Set Up PostgreSQL Database

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Create a new project
3. Click **+ New** → **Database** → **Add PostgreSQL**
4. Railway will auto-create `DATABASE_URL` for you

#### 3. Deploy Backend

1. Click **+ New** → **GitHub Repo**
2. Select your repository
3. Set **Root Directory**: `backend`
4. Add these environment variables:
   - `CLERK_SECRET_KEY` - Your Clerk secret key
   - `CLAUDE_API_KEY` - Your Anthropic API key
   - `STRIPE_SECRET_KEY` - Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
   - `FRONTEND_URL` - Your frontend Railway URL (add after frontend deploys)
5. Click Deploy - Railway will auto-detect `railway.json`

The backend will automatically:
- Install dependencies
- Generate Prisma client
- Build TypeScript
- Run database migrations on start

#### 4. Deploy Frontend

1. Click **+ New** → **GitHub Repo**
2. Select the same repository
3. Set **Root Directory**: `frontend`
4. Add these environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
   - `VITE_MAPBOX_TOKEN` - Your Mapbox access token
   - `VITE_API_URL` - Your backend Railway URL (e.g., `https://backend-xxxx.railway.app`)
5. Click Deploy

#### 5. Update CORS

After both services deploy, update the backend's `FRONTEND_URL` environment variable to your frontend's Railway URL.

#### 6. Configure Custom Domain (Optional)

1. Go to your frontend service settings
2. Click **Settings** → **Networking** → **Generate Domain** or **Add Custom Domain**
3. For `atlascast.org`:
   - Add `atlascast.org` as a custom domain
   - Update your DNS records as instructed by Railway

### Environment Variables Summary

**Backend Service:**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-provided by Railway PostgreSQL |
| `CLERK_SECRET_KEY` | From Clerk dashboard |
| `CLAUDE_API_KEY` | From Anthropic console |
| `STRIPE_SECRET_KEY` | From Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhooks |
| `FRONTEND_URL` | Your frontend Railway/custom URL |

**Frontend Service:**
| Variable | Description |
|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | From Clerk dashboard |
| `VITE_MAPBOX_TOKEN` | From Mapbox account |
| `VITE_API_URL` | Your backend Railway URL |

### Database Migration

Migrations run automatically on deploy via `railway.json`. For manual operations:

```bash
# Connect to Railway and run commands
railway run npx prisma db push
railway run npm run db:seed
```

## API Documentation

### Authentication
All authenticated routes require a Bearer token from Clerk:
```
Authorization: Bearer <clerk-jwt-token>
```

### User Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users/me` | GET | Required | Get current user profile |
| `/api/users/me` | PATCH | Required | Update profile |
| `/api/users/search?q=` | GET | Optional | Search users |
| `/api/users/:id` | GET | Optional | Get public profile |
| `/api/users/:id/world` | GET | Optional | Get user's world data |

### Follow Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/follows` | POST | Required | Follow a user |
| `/api/follows/:userId` | DELETE | Required | Unfollow a user |
| `/api/follows/followers` | GET | Required | List my followers |
| `/api/follows/following` | GET | Required | List who I follow |
| `/api/follows/network/:countryId` | GET | Required | Get network data for country |

### Message Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/messages` | GET | Required | Get conversations |
| `/api/messages/:userId` | GET | Required | Get messages with user |
| `/api/messages` | POST | Required | Send message |
| `/api/messages/unread/count` | GET | Required | Get unread count |

### Billing Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/billing/balance` | GET | Required | Get credit balance |
| `/api/billing/usage` | GET | Required | Get usage history |
| `/api/billing/checkout` | POST | Required | Create Stripe checkout |
| `/api/billing/webhook` | POST | - | Stripe webhook |

### Data Routes (with optional user scoping)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/countries` | GET | - | List all countries |
| `/api/countries/:id` | GET | Optional | Get country details |
| `/api/tags/:scopeType/:scopeId` | GET | Optional | Get tags |
| `/api/tags` | POST | Optional | Create tag |
| `/api/articles` | GET/POST | Optional | Manage articles |
| `/api/notes/:scopeType/:scopeId` | GET | Optional | Get notes |
| `/api/aggregation-jobs` | POST | Optional | Start aggregation |
| `/api/chat` | POST | Optional | AI chat |

## Database Schema

### User & Social Models
- **users**: User profiles linked to Clerk
- **follows**: Follower relationships
- **messages**: Direct messages with article sharing
- **token_usage**: API usage tracking
- **credit_purchases**: Stripe purchase history

### Data Models
- **countries**: ISO country data
- **qualitative_tags**: Sentiment scores with user ownership
- **articles**: News articles with user ownership
- **notes**: User notes per country
- **country_metric_data**: Deep aggregation data
- **metric_definitions**: 95+ metric types

## Tech Stack

### Backend
- Express.js with TypeScript
- Prisma ORM + PostgreSQL
- Clerk SDK for auth
- Stripe for payments
- Claude API for AI features

### Frontend
- React 18 + Vite + TypeScript
- Clerk React for auth UI
- Mapbox GL JS for maps
- Tailwind CSS + Bloomberg-style theme
- Zustand for state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.
