# 📊 Project Plan: Facebook Competitor Analysis Tool

## 🔧 Tech Stack Overview

| Layer        | Technology           | Purpose                                      |
|--------------|----------------------|----------------------------------------------|
| Frontend     | Angular (CLI 17)     | Input form, progress dashboard, results UI   |
| Backend      | Node.js + Express.js | Workflow orchestration, API proxy to Apify   |
| Scraper      | Apify Actor          | Executes Puppeteer-based ad scraping         |
| Hosting      | Render (backend), Apify (scraper) | Scalable, serverless deployment      |

---

## 📁 Project Structure

```
/app-root
│
├── frontend/                 ← Angular 17 app
│   └── src/app/competitor-analysis/
│       ├── input-form.component.ts
│       ├── progress.component.ts
│       └── results.component.ts
│
├── backend/                  ← Express.js app
│   ├── routes/analysis.js    ← API to start + poll Apify scraper
│   ├── server.js
│   └── .env
│
├── apify-actors/             ← Apify actor code (optional customization)
│   └── main.js
```

---

## 🧠 System Flow

1. User enters 3 Facebook page URLs via Angular form
2. Angular calls backend (`POST /api/start-analysis`)
3. Express backend triggers Apify actor to scrape ads
4. Apify scrapes, stores JSON results in dataset
5. Angular polls backend for status → gets dataset results
6. Results displayed in dashboard with comparison and exports

---

## ✅ Features & Workflow Breakdown

### 1. 🔹 Input Form
- Angular form: `/competitor-analysis`
- Validates 3 Facebook page URLs
- Calls backend: `POST /api/start-analysis`

### 2. 🔹 Backend Workflow Controller

**Express Routes:**
- `POST /api/start-analysis`: triggers Apify actor via REST API
- `GET /api/status/:runId`: polls Apify for progress
- `GET /api/results/:datasetId`: fetches scraped ad data as JSON

Handles:
- Triggering Apify
- Tracking `runId`, `datasetId`
- Managing retries and errors

### 3. 🔹 Apify Actor

- Uses Puppeteer to scrape Facebook Ad Library
- Input: array of Facebook URLs
- Output: JSON array of ad objects
- Optional: use public actor like `ad-library-scraper` or custom actor

Example output:

```json
[
  {
    "pageName": "Nike",
    "adText": "New arrivals!",
    "spend": "$500+",
    "cta": "Shop Now"
  }
]
```

### 4. 🔹 Progress Dashboard

- Angular `/progress/:workflowId`
- Polls Express API every 2s
- Shows visual step tracker: Queued → Scraping → Analyzing → Complete
- Cancel button support

### 5. 🔹 Results Display

- Angular `/results/:workflowId`
- Shows ad comparisons, performance scores
- Export to JSON / CSV / PDF (optional Phase 2)
- "Start New Analysis" button

---

## 🧪 Development Milestones

| Phase | Feature                                      | Status |
|-------|----------------------------------------------|--------|
| 1     | Angular form + validation                    | ⬜     |
| 2     | Express API: `/start-analysis`               | ⬜     |
| 3     | Apify Actor setup & test                     | ⬜     |
| 4     | Progress page (polling + status)             | ⬜     |
| 5     | Results page + charting                      | ⬜     |
| 6     | Integration testing (end-to-end)             | ⬜     |
| 7     | Render & Apify deployment                    | ⬜     |

---

## 🛠️ Backend `.env` Settings (Render)

```
APIFY_TOKEN=your_apify_token
ACTOR_ID=your_actor_id
```

---

## 🌐 API Examples

### `POST /api/start-analysis`

**Request Body:**

```json
{
  "pageUrls": [
    "https://facebook.com/nike",
    "https://facebook.com/adidas",
    "https://facebook.com/underarmour"
  ]
}
```

**Response:**

```json
{
  "runId": "abc123",
  "datasetId": "xyz456"
}
```

---

## 🚀 Deployment

### Render (Backend)
- Node.js service
- Add `.env` and `build`/`start` scripts
- Use Axios to call Apify API

### Apify (Scraper)
- Deploy actor via Apify CLI or UI
- Handle input: `pageUrls[]`
- Output via dataset (`Apify.pushData()`)

### Local Development
- `ng serve` for Angular
- `nodemon` for backend
- Add CORS middleware in Express

---

## 📈 Future Enhancements

| Feature                    | Phase |
|----------------------------|--------|
| AI-generated strategy tips | 2      |
| Export to PDF              | 2      |
| Historical tracking        | 3      |
| Scheduled re-analysis      | 3      |

---

## ✅ Success Metrics

- 🟢 Clean Angular UI with validation
- 🟢 Backend API proxy works without Puppeteer
- 🟢 Scraping logic is scalable (Apify-hosted)
- 🟢 JSON output available with performance insights
- 🟢 Workflow reproducible and extensible

---

## 🧠 Summary

- Angular handles the UI + results
- Express orchestrates the workflow via API
- Apify runs Puppeteer/Playwright safely in the cloud
- System is fast, modular, and easy to scale