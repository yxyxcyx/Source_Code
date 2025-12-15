# Administrator Guide - Alliance Bank Chatbot System

---

## Table of Contents

1. [User Token Limit Management](#1-user-token-limit-management)
2. [Model Pricing Configuration](#2-model-pricing-configuration)
3. [Exchange Rate Configuration](#3-exchange-rate-configuration)
4. [Database Maintenance](#4-database-maintenance)
5. [Monitoring & Reports](#5-monitoring--reports)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. User Token Limit Management

### Understanding Token Limits

**What are tokens?**
- Tokens are pieces of text that the AI model processes
- Approximately: 1 token ≈ 0.75 words
- Example: "Hello, how are you?" ≈ 5 tokens

**Why limit tokens?**
- Prevent spam and abuse
- Control costs
- Ensure fair usage across all employees

**Default Limits:**
```
Daily Limit:   100,000 tokens per user
Monthly Limit: 1,000,000 tokens per user

Average conversation: ~1,500 tokens
Daily limit = ~67 conversations
Monthly limit = ~667 conversations
```

---

### Method 1: Using API (Recommended) ⭐

**Prerequisites:**
- Backend server must be running on port 9090
- You need terminal/command prompt access

#### Step 1: Check Current Limits

**View all users with custom limits:**
```bash
curl http://localhost:9090/api/limits
```

**Check specific user's status:**
```bash
curl http://localhost:9090/api/limits/user/john.doe
```

**Example Response:**
```json
{
  "success": true,
  "username": "john.doe",
  "status": {
    "allowed": true,
    "limits": {
      "daily": 100000,
      "monthly": 1000000
    },
    "usage": {
      "daily": 45230,
      "monthly": 234567
    },
    "remaining": {
      "daily": 54770,
      "monthly": 765433
    }
  }
}
```

#### Step 2: Set Custom Limits for a User

**Example: Increase limits for IT Support Manager**

```bash
curl -X POST http://localhost:9090/api/limits/user/john.doe \
  -H "Content-Type: application/json" \
  -d '{
    "dailyLimit": 200000,
    "monthlyLimit": 2000000
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Limits updated for user john.doe",
  "limits": {
    "daily": 200000,
    "monthly": 2000000
  }
}
```

#### Step 3: Verify Changes

```bash
curl http://localhost:9090/api/limits/user/john.doe
```

Should now show the new limits (200K daily, 2M monthly).

#### Step 4: Revert to Default Limits

**To remove custom limits and use defaults:**

```bash
curl -X DELETE http://localhost:9090/api/limits/user/john.doe
```

**Success Response:**
```json
{
  "success": true,
  "message": "Custom limits deleted for user john.doe, reverted to default limits"
}
```

---

### Method 2: Direct Database Access

**Prerequisites:**
- SQLite3 installed
- Access to `/data/offline_express.db`

#### Step 1: Open Database

```bash
cd /Users/chiayuxuan/Documents/alliance-bank-project
sqlite3 data/offline_express.db
```

#### Step 2: View Current Custom Limits

```sql
SELECT 
  username,
  daily_token_limit,
  monthly_token_limit,
  updated_at
FROM USER_LIMITS
ORDER BY username;
```

#### Step 3: Set Custom Limits

**Add or update user limits:**

```sql
INSERT INTO USER_LIMITS (username, daily_token_limit, monthly_token_limit, updated_at)
VALUES ('john.doe', 200000, 2000000, CURRENT_TIMESTAMP)
ON CONFLICT(username) DO UPDATE SET
  daily_token_limit = 200000,
  monthly_token_limit = 2000000,
  updated_at = CURRENT_TIMESTAMP;
```

#### Step 4: Delete Custom Limits

**Revert user to default limits:**

```sql
DELETE FROM USER_LIMITS WHERE username = 'john.doe';
```

#### Step 5: Exit Database

```sql
.quit
```

---

### Method 3: Change Global Default Limits

**⚠️ WARNING: This affects ALL users who don't have custom limits!**

#### Step 1: Open the UserLimit Model File

```bash
cd /Users/chiayuxuan/Documents/alliance-bank-project/offline_express
nano models/UserLimit.js
```

Or use any text editor (VS Code, TextEdit, etc.)

#### Step 2: Find the `getDefaultLimits` Function

Look for this section (around line 48):

```javascript
static getDefaultLimits() {
  return {
    dailyLimit: 100000,    // 100K tokens per day
    monthlyLimit: 1000000  // 1M tokens per month
  };
}
```

#### Step 3: Modify the Values

**Example: Increase default limits**

```javascript
static getDefaultLimits() {
  return {
    dailyLimit: 150000,    // Changed to 150K tokens per day
    monthlyLimit: 1500000  // Changed to 1.5M tokens per month
  };
}
```

#### Step 4: Save the File

- **nano:** Press `Ctrl+X`, then `Y`, then `Enter`
- **VS Code:** Press `Cmd+S` (Mac) or `Ctrl+S` (Windows)

#### Step 5: Restart the Backend Server

```bash
# Stop the server (Ctrl+C in the terminal running it)
# Then restart:
cd /Users/chiayuxuan/Documents/alliance-bank-project/offline_express
npm start
```

#### Step 6: Verify Changes

```bash
curl http://localhost:9090/api/limits
```

Should show the new default limits.

---

### Recommended Limit Configurations

| User Type | Daily Limit | Monthly Limit | Reasoning |
|-----------|-------------|---------------|-----------|
| **Regular Employee** | 100,000 | 1,000,000 | Default - Normal usage |
| **IT Support Staff** | 200,000 | 2,000,000 | Higher usage for troubleshooting |
| **Department Manager** | 150,000 | 1,500,000 | Moderate increase |
| **System Tester** | 500,000 | 5,000,000 | Testing and validation |
| **Restricted User** | 50,000 | 500,000 | Limited access |

---

## 2. Model Pricing Configuration

### Understanding Pricing

**⚠️ IMPORTANT:** Azure OpenAI pricing is **NOT real-time**. You must update prices manually when Azure changes them.

**Current Pricing (as of November 2024):**

| Model | Prompt (Input) | Completion (Output) |
|-------|----------------|---------------------|
| gpt-4o | $2.50 per 1M tokens | $10.00 per 1M tokens |
| gpt-4o-mini | $0.15 per 1M tokens | $0.60 per 1M tokens |
| gpt-4-turbo | $10.00 per 1M tokens | $30.00 per 1M tokens |
| gpt-35-turbo | $0.50 per 1M tokens | $1.50 per 1M tokens |

**Source:** https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/

---

### How to Update Model Pricing

#### Step 1: Check Azure's Official Pricing

1. Visit: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
2. Find your model's pricing
3. Note down the **per 1 million tokens** price

**Example from Azure Portal:**
```
gpt-4o-mini:
- Prompt Tokens: $0.15 per 1,000,000 tokens
- Completion Tokens: $0.60 per 1,000,000 tokens
```

#### Step 2: Convert to Per 1,000 Tokens

**Formula:**
```
Price per 1K tokens = (Price per 1M tokens) / 1,000
```

**Example:**
```
Prompt: $0.15 per 1M = $0.15 / 1,000 = $0.00015 per 1K
Completion: $0.60 per 1M = $0.60 / 1,000 = $0.0006 per 1K
```

#### Step 3: Open the Pricing Configuration File

```bash
cd /Users/chiayuxuan/Documents/alliance-bank-project/offline_express
nano config/pricing.js
```

Or use any text editor.

#### Step 4: Update the PRICING Object

Find the model you want to update (around line 7-65):

**Before:**
```javascript
'gpt-4o-mini': {
  prompt: 0.00015,   // $0.15 per 1M tokens = $0.00015 per 1K tokens
  completion: 0.0006 // $0.60 per 1M tokens = $0.0006 per 1K tokens
},
```

**After (if Azure changed pricing to $0.20/$0.80 per 1M):**
```javascript
'gpt-4o-mini': {
  prompt: 0.0002,    // $0.20 per 1M tokens = $0.0002 per 1K tokens
  completion: 0.0008 // $0.80 per 1M tokens = $0.0008 per 1K tokens
},
```

#### Step 5: Add Comment with Update Date

**Best Practice:**
```javascript
'gpt-4o-mini': {
  prompt: 0.0002,    // Updated Nov 6, 2025: $0.20 per 1M
  completion: 0.0008 // Updated Nov 6, 2025: $0.80 per 1M
},
```

#### Step 6: Update the Header Comment

Find the header (around line 1-5):

```javascript
// Azure OpenAI Pricing Configuration
// Prices are in USD per 1,000 tokens
// Source: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
// Last Updated: November 2024  ← Change this date!
```

Change to:
```javascript
// Last Updated: November 6, 2025
```

#### Step 7: Save and Restart Server

**Save the file:**
- **nano:** `Ctrl+X`, `Y`, `Enter`
- **VS Code:** `Cmd+S` or `Ctrl+S`

**Restart backend:**
```bash
# Stop server (Ctrl+C)
cd /Users/chiayuxuan/Documents/alliance-bank-project/offline_express
npm start
```

#### Step 8: Verify Pricing

**Test calculation:**
```bash
node -e "const pricing = require('./offline_express/config/pricing'); console.log('gpt-4o-mini:', JSON.stringify(pricing.getModelPricing('gpt-4o-mini')));"
```

Should show your new pricing.

---

### Adding a New Model

If Azure releases a new model (e.g., `gpt-5`):

#### Step 1: Get Pricing from Azure

Visit Azure pricing page and note the prices.

#### Step 2: Add to PRICING Object

Open `config/pricing.js` and add:

```javascript
const PRICING = {
  // ... existing models ...
  
  // New model (add here)
  'gpt-5': {
    prompt: 0.005,     // $5.00 per 1M tokens = $0.005 per 1K
    completion: 0.015  // $15.00 per 1M tokens = $0.015 per 1K
  },
  
  // ... rest of models ...
};
```

#### Step 3: Add to Model Matching Logic

Find the `getModelPricing` function (around line 72) and add:

```javascript
if (lowerModelName.includes('gpt-5')) {
  return PRICING['gpt-5'];
}
```

**⚠️ IMPORTANT:** Add it in the correct order (most specific first):
```javascript
// Check most specific first
if (lowerModelName.includes('gpt-5-turbo')) {
  return PRICING['gpt-5-turbo'];
}

if (lowerModelName.includes('gpt-5')) {
  return PRICING['gpt-5'];
}

if (lowerModelName.includes('gpt-4o-mini')) {
  return PRICING['gpt-4o-mini'];
}
// ... etc
```

#### Step 4: Save and Restart

Same as Step 7 above.

---

### Pricing Update Checklist

- [ ] Check Azure's official pricing page
- [ ] Convert prices from per 1M to per 1K tokens
- [ ] Update `PRICING` object in `config/pricing.js`
- [ ] Add comment with update date
- [ ] Update header "Last Updated" date
- [ ] Save file
- [ ] Restart backend server
- [ ] Verify with test calculation
- [ ] Monitor dashboard for correct costs

---

## 3. Exchange Rate Configuration

### Understanding Exchange Rates

**Current Setup:**
- Fetches real-time USD to MYR rates
- Updates every 1 hour (cached)
- Uses free API: exchangerate-api.com
- Fallback rate: 4.50 MYR per USD

---

### Changing the Fallback Rate

If the API fails, the system uses a fallback rate.

#### Step 1: Open Currency Service

```bash
cd /Users/chiayuxuan/Documents/alliance-bank-project/offline_express
nano services/currencyService.js
```

#### Step 2: Find Fallback Rate

Look for this section (around line 42):

```javascript
// Fallback to approximate rate (as of Nov 2024: ~4.50 MYR per USD)
const fallbackRate = 4.50;
```

#### Step 3: Update the Rate

Change to current approximate rate:

```javascript
// Fallback to approximate rate (as of Nov 2025: ~4.60 MYR per USD)
const fallbackRate = 4.60;  // ← Update this
```

#### Step 4: Save and Restart

Same process as before.

---

### Changing Cache Duration

Default: 1 hour (3,600,000 milliseconds)

#### Step 1: Open Currency Service

```bash
nano services/currencyService.js
```

#### Step 2: Find Cache Duration

Look for (around line 8):

```javascript
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
```

#### Step 3: Modify Duration

**Examples:**

**30 minutes:**
```javascript
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
```

**2 hours:**
```javascript
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
```

**24 hours:**
```javascript
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

#### Step 4: Save and Restart

---

### Using a Different Exchange Rate API

If you want to use a different API (e.g., paid service):

#### Step 1: Get API Key

Sign up for your chosen service and get an API key.

#### Step 2: Open Currency Service

```bash
nano services/currencyService.js
```

#### Step 3: Replace API Call

Find this section (around line 21):

```javascript
// Using exchangerate-api.com (free, no API key required for basic usage)
const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
  timeout: 5000
});

if (response.data && response.data.rates && response.data.rates.MYR) {
  const rate = response.data.rates.MYR;
  // ...
}
```

**Example: Using exchangeratesapi.io (requires API key):**

```javascript
// Using exchangeratesapi.io (paid service)
const API_KEY = 'your-api-key-here'; // ⚠️ Store securely!
const response = await axios.get(`https://api.exchangeratesapi.io/v1/latest?access_key=${API_KEY}&base=USD&symbols=MYR`, {
  timeout: 5000
});

if (response.data && response.data.rates && response.data.rates.MYR) {
  const rate = response.data.rates.MYR;
  // ...
}
```

#### Step 4: Save and Restart

---

## 4. Database Maintenance

### Viewing Token Usage Data

#### Check Total Usage

```bash
sqlite3 data/offline_express.db
```

```sql
-- Total tokens and cost
SELECT 
  COUNT(*) as total_requests,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost) as total_cost
FROM TOKEN_USAGE;
```

#### Check Usage by Model

```sql
SELECT 
  model,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  SUM(total_cost) as cost
FROM TOKEN_USAGE
GROUP BY model
ORDER BY cost DESC;
```

#### Check Usage by User

```sql
SELECT 
  username,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  SUM(total_cost) as cost
FROM TOKEN_USAGE
GROUP BY username
ORDER BY cost DESC
LIMIT 10;
```

#### Check Today's Usage

```sql
SELECT 
  username,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  SUM(total_cost) as cost
FROM TOKEN_USAGE
WHERE DATE(timestamp) = DATE('now')
GROUP BY username
ORDER BY tokens DESC;
```

---

### Backing Up the Database

**⚠️ IMPORTANT:** Always backup before making changes!

#### Create Backup

```bash
cd /Users/chiayuxuan/Documents/alliance-bank-project
cp data/offline_express.db data/offline_express_backup_$(date +%Y%m%d_%H%M%S).db
```

#### Verify Backup

```bash
ls -lh data/offline_express_backup_*.db
```

#### Restore from Backup

```bash
# Stop the server first!
cp data/offline_express_backup_20251106_143000.db data/offline_express.db
# Restart server
```

---

### Cleaning Old Data

**⚠️ WARNING:** This permanently deletes data!

#### Delete Records Older Than 90 Days

```bash
sqlite3 data/offline_express.db
```

```sql
-- Check how many records will be deleted
SELECT COUNT(*) 
FROM TOKEN_USAGE 
WHERE timestamp < datetime('now', '-90 days');

-- Delete old records
DELETE FROM TOKEN_USAGE 
WHERE timestamp < datetime('now', '-90 days');

-- Verify
SELECT COUNT(*) FROM TOKEN_USAGE;

.quit
```

#### Optimize Database (Reclaim Space)

```bash
sqlite3 data/offline_express.db "VACUUM;"
```

---

## 5. Monitoring & Reports

### Dashboard Access

**URL:** http://localhost:9090/dashboard/cost-dashboard.html

**Features:**
- Total usage summary
- Cost breakdown by model
- Cost breakdown by user
- Daily statistics
- Dual currency (USD + MYR)

---

### Generating Custom Reports

#### Monthly Cost Report

```bash
sqlite3 data/offline_express.db
```

```sql
SELECT 
  strftime('%Y-%m', timestamp) as month,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  ROUND(SUM(total_cost), 4) as cost_usd,
  ROUND(SUM(total_cost) * 4.50, 2) as cost_myr
FROM TOKEN_USAGE
GROUP BY month
ORDER BY month DESC;
```

#### Department Usage Report

```sql
SELECT 
  department,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  ROUND(SUM(total_cost), 4) as cost_usd
FROM TOKEN_USAGE
WHERE department IS NOT NULL
GROUP BY department
ORDER BY cost_usd DESC;
```

#### Users Approaching Limits

```sql
SELECT 
  u.username,
  SUM(t.total_tokens) as daily_usage,
  COALESCE(l.daily_token_limit, 100000) as daily_limit,
  COALESCE(l.daily_token_limit, 100000) - SUM(t.total_tokens) as remaining
FROM TOKEN_USAGE t
LEFT JOIN USER_LIMITS l ON t.username = l.username
WHERE DATE(t.timestamp) = DATE('now')
GROUP BY t.username
HAVING remaining < 20000
ORDER BY remaining ASC;
```

---

### Export Data to CSV

#### Export All Usage Data

```bash
sqlite3 -header -csv data/offline_express.db "SELECT * FROM TOKEN_USAGE;" > usage_export.csv
```

#### Export Monthly Summary

```bash
sqlite3 -header -csv data/offline_express.db "
SELECT 
  strftime('%Y-%m', timestamp) as month,
  model,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  SUM(total_cost) as cost
FROM TOKEN_USAGE
GROUP BY month, model
ORDER BY month DESC, cost DESC;
" > monthly_summary.csv
```

---

## 6. Troubleshooting

### Issue: API Endpoints Return "Cannot GET"

**Symptom:**
```
curl http://localhost:9090/api/limits/user/test.user
→ Cannot GET /api/limits/user/test.user
```

**Solution:**
```bash
# Restart the backend server
cd /Users/chiayuxuan/Documents/alliance-bank-project/offline_express
npm start
```

**Verify server is running:**
```bash
curl http://localhost:9090/api/hello
# Should return: {"hello":"world"}
```

---

### Issue: Exchange Rate Not Updating

**Symptom:** Dashboard shows old exchange rate

**Solution 1: Clear Cache**

Restart the backend server (cache clears on restart).

**Solution 2: Check API**

```bash
curl https://api.exchangerate-api.com/v4/latest/USD
```

Should return JSON with rates. If it fails, the API might be down.

---

### Issue: Pricing Seems Wrong

**Symptom:** Dashboard costs don't match Azure Portal

**Solution:**

1. **Check pricing configuration:**
```bash
node -e "const pricing = require('./offline_express/config/pricing'); console.log(JSON.stringify(pricing.getModelPricing('gpt-4o-mini'), null, 2));"
```

2. **Verify model names in database:**
```bash
sqlite3 data/offline_express.db "SELECT DISTINCT model FROM TOKEN_USAGE;"
```

3. **Recalculate costs:**
```bash
cd offline_express
node scripts/fix-pricing.js
```

---

### Issue: User Limit Not Working

**Symptom:** User can exceed limits

**Cause:** Limit enforcement is not yet integrated into the chat API.

**Current Status:** 
- Limit tracking: ✅ Working
- Limit API: ✅ Working
- Limit enforcement: ⚠️ Needs integration

**To enforce limits**, you need to add a check in the Azure OpenAI controller before processing requests.

---

### Issue: Database Locked

**Symptom:** "database is locked" error

**Solution:**

1. **Check for running processes:**
```bash
lsof data/offline_express.db
```

2. **Stop all servers:**
```bash
# Stop backend (Ctrl+C)
# Stop frontend (Ctrl+C)
```

3. **Restart:**
```bash
cd offline_express
npm start
```

---

## Quick Reference Commands

### User Limits

```bash
# View all limits
curl http://localhost:9090/api/limits

# Check user status
curl http://localhost:9090/api/limits/user/USERNAME

# Set custom limit
curl -X POST http://localhost:9090/api/limits/user/USERNAME \
  -H "Content-Type: application/json" \
  -d '{"dailyLimit": 200000, "monthlyLimit": 2000000}'

# Delete custom limit
curl -X DELETE http://localhost:9090/api/limits/user/USERNAME
```

### Database Queries

```bash
# Open database
sqlite3 data/offline_express.db

# View usage
SELECT * FROM TOKEN_USAGE ORDER BY timestamp DESC LIMIT 10;

# View limits
SELECT * FROM USER_LIMITS;

# Exit
.quit
```

### Server Management

```bash
# Start backend
cd offline_express && npm start

# Start frontend
cd alliance-bank-chatbot && npm start

# Check if running
curl http://localhost:9090/api/hello
```

---

## Support & Contacts

**For Technical Issues:**
- Check logs in `offline_express/logs/`
- Contact: Colin / Yu Xuan

**For Pricing Updates:**
- Monitor: https://azure.microsoft.com/pricing/
- Update: `offline_express/config/pricing.js`

**For Database Issues:**
- Backup location: `data/offline_express_backup_*.db`
- Recovery: Restore from latest backup

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025