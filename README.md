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
- AI-generated summaries using OpenAI
- Link articles to multiple countries
- View all articles related to a country or region

## Architecture

### Backend
- **Node.js + Express** with TypeScript
- **PostgreSQL** database with Prisma ORM
- **OpenAI API** for chat and summarization
- RESTful API architecture

### Frontend
- **React + Vite** with TypeScript
- **Tailwind CSS** for modern, responsive UI
- **Mapbox GL JS** for interactive mapping
- **Zustand** for state management

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- OpenAI API key
- Mapbox API token

### 1. Clone and Install

```bash
cd world_tracker
npm install
```

### 2. Configure Environment Variables

Create `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/world_tracker?schema=public"
CLAUDE_API_KEY="sk-ant-your-claude-key"
TAVILY_API_KEY="tvly-your-tavily-key" # REQUIRED for web search in chat
PORT=3001
NODE_ENV=development
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_MAPBOX_TOKEN=pk.your-mapbox-token
```

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

This will start:
- Backend API on http://localhost:3001
- Frontend on http://localhost:3000

Or run them separately:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

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
- OpenAI - AI chat and summarization
- Cheerio - HTML parsing
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
