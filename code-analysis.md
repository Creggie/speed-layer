# Code Analysis: Edmunds Unified Container

## Overview
This is a marketing/analytics script from **Edmunds** (the automotive marketplace) that's being loaded on Serra Hyundai's website.

## ⚠️ FINDING: YES, It IS Manipulating Google Analytics

### Google Analytics Manipulation Details

#### 1. **Universal Analytics (GA) Injection**
The code finds all existing GA trackers on your page and sends additional events to them:

```javascript
trackGAEvent: function(a) {
    var b = window[window.GoogleAnalyticsObject || "ga"];
    // Gets all GA trackers
    var g = b.getAll();
    // For EACH tracker found, sends events
    g.forEach(function(c) {
        b(c.get("name") + ".send", h, a.category, a.action, a.label, {
            nonInteraction: !0
        })
    })
}
```

**What this means**: It piggybacks on your existing Google Analytics setup and sends events like:
- Category: "Edmunds-View-Through"
- Action: "recent_edmunds_com_visitor"
- These events will appear in your GA reports

#### 2. **Google Analytics 4 (GA4) Manipulation**
The code also detects and uses GA4 measurement IDs:

```javascript
// Scans your dataLayer for GA4 measurement IDs
function h() {
    return (window.dataLayer || []).filter(function(a) {
        return a[0] === "config" && a[1].startsWith("G-")
    })
}

// Sends events to detected GA4 properties
trackGA4Event: function() {
    window.gtag("event", a.event, b)
}
```

**What this means**: It scans your page for GA4 tracking IDs (starting with "G-") and sends events to them.

#### 3. **GA4 Measurement ID Detection & Reporting**
The code continuously monitors (every 60 seconds) for new GA4 tags and reports them back to Edmunds:

```javascript
function j(a) {
    var b = h(), c = i(b, [], a);
    setTimeout(function() {
        var b = h();
        i(b, c, a)
    }, 6e4) // 60,000ms = 60 seconds
}
```

### What Data Is Being Collected

1. **Visitor Tracking Cookies**:
   - `edw`, `edmunds` - Edmunds visitor/session IDs
   - `_edwvts`, `_edwpv`, `_edwps` - Additional tracking cookies

2. **Tracking Pixels Sent To**: `https://edw.edmunds.com/edw/edw1x1.gif`
   - User agent, URL, referrer, page title
   - Visitor ID, Session ID
   - Whether user recently visited Edmunds.com

3. **Events Sent to YOUR Google Analytics**:
   - "recent_edmunds_com_visitor" events
   - "Edmunds-View-Through" category events

### Additional Scripts Being Loaded

For Serra Hyundai (Customer ID: 291448):
- **GTM Container**: `GTM-MZJ2ND2` (additional Google Tag Manager)
- **Edmunds Ad Solutions**: `https://cas-assets.edmunds.com/partner-analytics/291448/eas.js`
- **Site Enhancer Widgets**: From `widgetstore.edmunds.com`
- **GA4 Measurement ID**: `G-NJK6W87ZYS` (may be Edmunds' or dealership's)

## Purpose

This is a **view-through attribution system**. It:
1. Tracks users who visit Edmunds.com and then visit the dealership's website
2. Sends attribution events to the dealership's Google Analytics
3. Reports analytics data back to Edmunds for their own tracking
4. Loads additional marketing/conversion tracking scripts

## Concerns

### ✅ Legitimate Use Cases:
- Dealership likely has a business relationship with Edmunds
- Helps measure marketing ROI from Edmunds listings
- Attribution tracking is a standard marketing practice

### ⚠️ Potential Issues:
1. **Data Sharing**: User behavior data is sent to Edmunds servers
2. **GA Pollution**: Events appear in your GA reports that you didn't explicitly configure
3. **Performance**: Loads multiple additional scripts
4. **Privacy**: Cross-site tracking between Edmunds.com and dealer sites
5. **Control**: Third party can inject data into your analytics

## Recommendations

1. **Review Contract**: Check your agreement with Edmunds about data sharing
2. **Filter GA Data**: Create filters in Google Analytics to exclude Edmunds-injected events if needed
3. **Privacy Policy**: Ensure your privacy policy covers this third-party tracking
4. **Performance Review**: Monitor page load impact from additional scripts
5. **Consider Alternatives**: Evaluate if you need this level of integration

## Technical Details

- **Vendor**: Edmunds (automotive marketplace)
- **Dealership**: Serra Hyundai (serrahyundai.com)
- **Customer ID**: 291448
- **Primary Script**: Unified Container (tag management system)
- **Tracking Endpoints**: edw.edmunds.com, api.edmunds.com
