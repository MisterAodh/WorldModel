# World Tracker - Geopolitical Intelligence Workspace

A powerful platform for tracking and analyzing geopolitical intelligence with AI-assisted insights, interactive mapping, and comprehensive data management.

## Features

### 🗺️ Interactive World Map
- Click countries to view detailed information
- Color-coded by economic, social, or political sentiment
- Hover tooltips for quick country identification
- Real-time visual encoding of qualitative data

### 📊 Comprehensive Data Management
- **Qualitative Tags**: Economic, social, and political sentiment analysis (positive/neutral/negative)
- **Quantitative Metrics**: Population, migration rates, violence statistics, and more
- **Industry Data**: GDP share breakdown by industry sector
- **Article Tracking**: Link news articles to multiple countries with AI-generated summaries
- **Notes**: Freeform commentary and analysis per country/region

### 🤖 AI Assistant
- Context-aware chat interface always visible
- Web search integration for current information
- Automatic proposal of sentiment tags and data updates
- Manual approval workflow for all AI suggestions
- Citations and confidence scores for transparency

### 🌍 Region Management
- Create logical groupings of countries (e.g., "Gulf States", "My Watchlist")
- View aggregated metrics across regions
- Apply tags and analysis at region level
- Future support for geometric country splits

### 📰 Article Management
- Add articles by URL with automatic content extraction
- AI-generated summaries using Claude
- Link articles to multiple countries
- View all articles related to a country or region

## Architecture

### Backend
- **Node.js + Express** with TypeScript
- **PostgreSQL** database with Prisma ORM
- **Claude API** for chat and summarization
- **Tavily API** for web search integration
- RESTful API architecture

### Frontend
- **React + Vite** with TypeScript
- **Tailwind CSS** for modern, responsive UI
- **Mapbox GL JS** for interactive mapping
- **Zustand** for state management

## Quick Start

For detailed setup, see below. For quick start:

```bash
# 1. Copy and configure environment variables
cp env.example .env
# Edit .env with your API keys

# 2. Install dependencies
npm install

# 3. Setup database
cd backend && npx prisma db push && npm run db:seed && cd ..

# 4. Start the application
npm run dev
```

That's it! `npm run dev` will:
- Check for `.env` file
- Auto-start PostgreSQL if not running
- Launch frontend and backend servers

Open http://localhost:3000 in your browser!

## Detailed Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Claude API key (get from https://console.anthropic.com/)
- Mapbox API token (get from https://account.mapbox.com/)
- (Optional) Tavily API key for web search (get from https://tavily.com/)

### 1. Clone and Install

```bash
cd world_tracker
npm install
```

### 2. Configure Environment Variables

Copy `env.example` to `.env` in the **root directory** and fill in your values:
```bash
cp env.example .env
```

Then edit `.env` with your actual credentials:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/world_tracker"

# Claude AI (Required for chat and article summaries)
CLAUDE_API_KEY="sk-ant-your-claude-key"

# Tavily (Required for web search)
TAVILY_API_KEY="tvly-your-tavily-key"

# Mapbox (Required for map display)
VITE_MAPBOX_TOKEN="pk.your-mapbox-token"

# API URL (usually no need to change)
VITE_API_URL="http://localhost:3001"
```

**Note:** The frontend and backend now share a single `.env` file at the project root.

### 3. Database Setup

```bash
# Push Prisma schema to database
cd backend
npx prisma db push

# Seed with country data
npm run db:seed
```

### 4. Start Development Servers

From the root directory:
```bash
npm run dev
```

This automatically:
- ✅ Checks for `.env` file
- ✅ Starts PostgreSQL (if not running)
- ✅ Launches backend on http://localhost:3001
- ✅ Launches frontend on http://localhost:3000

The app is now running at **http://localhost:3000**!

## API Documentation

### Countries

**GET /api/countries**
- List all countries

**GET /api/countries/:id**
- Get country details with tags, metrics, industries, articles, and notes

### Regions

**GET /api/regions**
- List all regions with member countries

**GET /api/regions/:id**
- Get region details with aggregated data

**POST /api/regions**
- Create new region
- Body: `{ name: string, type?: string, countryIds: string[] }`

**POST /api/regions/:id/members**
- Add country to region
- Body: `{ countryId: string }`

**DELETE /api/regions/:id/members/:countryId**
- Remove country from region

### Tags

**GET /api/tags/:scopeType/:scopeId**
- Get qualitative tags for country or region
- Returns all tags and latest per category

**POST /api/tags**
- Create new qualitative tag
- Body: `{ scopeType: string, scopeId: string, category: string, value: number, note?: string }`
- category: ECONOMIC | SOCIAL | POLITICAL
- value: -1 (negative) | 0 (neutral) | 1 (positive)

### Metrics

**GET /api/metrics/:countryId**
- Get all metrics for a country

**POST /api/metrics**
- Create or update metrics
- Body: `{ countryId: string, year: number, population?: number, immigrationRate?: number, ... }`

### Industries

**GET /api/industries/:countryId/:year**
- Get industries for country and year

**POST /api/industries**
- Create or update industry
- Body: `{ countryId: string, year: number, industryName: string, gdpSharePercent: number }`

### Articles

**GET /api/articles?countryId=X&regionId=Y**
- Get articles, optionally filtered

**POST /api/articles**
- Add article by URL (fetches content, generates summary)
- Body: `{ url: string, countryIds?: string[] }`

**POST /api/articles/:articleId/countries**
- Link article to country
- Body: `{ countryId: string }`

**DELETE /api/articles/:articleId/countries/:countryId**
- Unlink article from country

### AI Suggestions

**GET /api/suggestions/:scopeType/:scopeId?status=PENDING**
- Get AI suggestions for scope

**POST /api/suggestions/:id/approve**
- Approve suggestion (writes to main tables)

**POST /api/suggestions/:id/reject**
- Reject suggestion

### Chat

**POST /api/chat**
- Send message to AI assistant
- Body: `{ message: string, contextType?: string, contextId?: string, conversationHistory?: Array }`
- Returns: `{ message: string, contextUsed: object }`

### Notes

**GET /api/notes/:scopeType/:scopeId**
- Get notes for scope

**POST /api/notes**
- Create or update note
- Body: `{ id?: string, scopeType: string, scopeId: string, content: string }`

## Usage Guide

### Basic Workflow

1. **Select a Country**: Click on any country on the map
2. **View Overview**: See sentiment tags, key metrics, and top industries
3. **Add Data**: Use the Data tab to add/edit metrics and industries
4. **Link Articles**: Add relevant news articles in the Articles tab
5. **AI Analysis**: Ask the AI assistant to analyze current conditions
6. **Review Suggestions**: Approve or reject AI-proposed updates in the Suggestions tab

### AI-Assisted Labeling

1. Select a country
2. In the chat, type: "Scan current news and propose economic, social, and political tags"
3. AI will use web search to find recent news
4. Structured suggestions appear in the Suggestions tab
5. Review sources and approve/reject each suggestion
6. Approved suggestions are written to the database

### Region Management

1. Click "Create Region" button in the sidebar (when no country is selected)
2. Name your region (e.g., "Gulf States")
3. Select member countries
4. Click "Create Region"
5. Select the region to view aggregated metrics

### Map Color Encoding

- Use the dimension selector to color the map by:
  - Economic sentiment
  - Social sentiment
  - Political sentiment
- Legend shows color meanings (green=positive, yellow=neutral, red=negative, gray=no data)

## Database Schema

### Key Tables

- **countries**: ISO country data
- **regions**: User-defined groupings
- **region_memberships**: Country-region relationships
- **qualitative_tags**: Sentiment tags (audit trail)
- **country_metrics**: Structural statistics
- **industry_shares**: GDP breakdown
- **articles**: News content
- **article_country_links**: Article-country relationships
- **notes**: Freeform commentary
- **ai_suggestions**: Pending AI-proposed changes

## Development

### Database Management

```bash
# View data in Prisma Studio
npm run db:studio

# Reset database (warning: deletes all data)
cd backend
npx prisma db push --force-reset
npm run db:seed
```

### Build for Production

```bash
# Build both frontend and backend
npm run build

# Run backend in production
cd backend
npm start
```

## Tech Stack

### Backend
- Express.js - Web framework
- Prisma - ORM and database toolkit
- Claude (Anthropic) - AI chat and summarization
- Tavily - Web search integration
- Cheerio - HTML parsing for article extraction
- Zod - Schema validation

### Frontend
- React 18 - UI framework
- Vite - Build tool
- TypeScript - Type safety
- Tailwind CSS - Styling
- Mapbox GL JS - Interactive maps
- Zustand - State management
- Axios - HTTP client
- Lucide React - Icons
- Framer Motion - Animations

## Future Enhancements

- [ ] Geometric region splits (divide countries with custom lines)
- [ ] Multi-user workspaces with authentication
- [ ] Historical data tracking and trends
- [ ] Export reports and visualizations
- [ ] Bulk import from data sources
- [ ] Advanced filtering and search
- [ ] Custom metric definitions
- [ ] Webhook integrations
- [ ] Mobile responsive improvements

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.
