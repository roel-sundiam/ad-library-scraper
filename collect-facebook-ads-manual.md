# Manual Facebook Ad Library Collection Guide

If the automated scrapers aren't working, you can manually collect real Facebook ad data for your client demo.

## 🎯 **Step-by-Step Manual Collection**

### **1. Visit Facebook Ad Library**
Go to: https://www.facebook.com/ads/library

### **2. Search for Each Competitor**
- Search: "Nike"
- Search: "Adidas" 
- Search: "Puma"

### **3. For Each Ad, Collect:**
```json
{
  "advertiser_name": "Nike",
  "ad_title": "Just Do It - New Collection",
  "ad_text": "Discover Nike's latest athletic wear...",
  "call_to_action": "Shop Now",
  "start_date": "2025-01-15",
  "spend": "$1,000 - $5,000",
  "impressions": "10,000 - 50,000",
  "demographics": "Age 18-45, Sports enthusiasts"
}
```

### **4. Create JSON Files**
Save as:
- `manual-data/nike-ads.json`
- `manual-data/adidas-ads.json` 
- `manual-data/puma-ads.json`

### **5. Import into System**
Use the manual data import endpoint: `POST /api/import/manual-ads`

## 🔧 **Browser Extension Helper**
I can create a browser extension that automatically extracts this data as you browse the Ad Library.

## ⏱️ **Time Required**
- ~10 minutes per competitor
- ~30 ads per competitor
- Total: ~30 minutes for complete dataset