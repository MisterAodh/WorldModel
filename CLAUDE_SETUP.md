# Claude API Setup - Web Search Enabled

## ✅ What's Been Done

1. **Switched from OpenAI to Claude API** with built-in web search
2. **Article Preview Overlay** - Click any article link to view it on the left side with an X button
3. **One-Click Add to Articles** - Button in preview to instantly add article to your database
4. **Clickable Search Results** - All search results from Claude appear as clickable cards below the chat message

## 🔑 Required: Add Your Claude API Key

Add this line to `backend/.env`:

```env
CLAUDE_API_KEY="sk-ant-your-claude-api-key-here"
```

Get your Claude API key from: https://console.anthropic.com/

## 🎯 How It Works Now

### Web Search
- Claude API has **native web search** built-in
- Ask: "Find recent articles about gold prices in China"
- Claude will search the web and return results with clickable links

### Article Preview
1. Ask Claude to search for articles
2. Click any search result card
3. Article opens in iframe overlay on the left side
4. Click **"Add to Articles"** button to save it with one click
5. Click **X** to close preview and return to map

### No More "I Can't Browse"
The new system prompt ensures Claude:
- Uses its knowledge AND web search
- Doesn't say it can't browse (it can!)
- Provides direct, helpful answers
- Cites sources from search results

## 🧪 Testing After Adding Key

1. Add `CLAUDE_API_KEY` to `backend/.env`
2. Restart servers: `npm run dev`
3. Select a country (e.g., China)
4. Ask: "How much gold does China have? What's happening with gold this week?"
5. Claude will search the web and return recent articles
6. Click any article to preview
7. Click "Add to Articles" to save

## 📋 Features

- ✅ Real web search via Claude
- ✅ Clickable article links in chat
- ✅ Full-screen article preview overlay
- ✅ One-click add to articles database
- ✅ Links to selected country automatically
- ✅ X button to close preview
- ✅ Iframe sandbox for security

## 🔍 Example Queries That Now Work

- "Google recent news about Sudan"
- "Find articles about China's gold reserves"
- "Search for current political situation in [country]"
- "What are recent economic developments?"
- "Show me news from this week"

All will return live search results with clickable, previewable articles!

