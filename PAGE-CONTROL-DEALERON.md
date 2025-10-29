# Speed Layer - Page Control (DealerOn Edition)

Control which pages Speed Layer runs on for DealerOn CMS sites using the `loader-do.js` loader.

---

## 🎯 Overview

The DealerOn edition of Speed Layer now supports **page-level control**, allowing you to:
- ✅ Run Speed Layer only on specific pages (e.g., homepage only)
- ✅ Gradually expand to more pages as you test
- ✅ Exclude specific pages from optimization
- ✅ Eventually enable site-wide when ready

**Current Configuration**: Cadillac of Greenwich is set to **HOMEPAGE ONLY** (`mode: "include"`, `patterns: ["/"]`)

---

## 📝 Configuration Structure

Add a `"pages"` object to your manifest:

```json
{
  "domain": "cadillacofgreenwich.com",
  "enabled": true,
  "pages": {
    "mode": "include",    // "all", "include", or "exclude"
    "patterns": ["/"]     // Array of path patterns
  },
  ...
}
```

### Page Modes

**1. `"all"`** - Run on all pages (default if pages config is omitted)
```json
"pages": {
  "mode": "all"
}
```
- Speed Layer runs on every page
- No pattern matching needed
- **Use when**: Ready for full site-wide deployment

---

**2. `"include"`** - Only run on specified pages (whitelist)
```json
"pages": {
  "mode": "include",
  "patterns": [
    "/",                  // Homepage only
    "/new-inventory",     // Specific page
    "/used-inventory",
    "/inventory/*",       // Wildcard - all inventory pages
    "/specials"
  ]
}
```
- Speed Layer ONLY runs on pages matching patterns
- All other pages load normally (no optimization)
- **Use when**: Testing on specific pages before expanding

---

**3. `"exclude"`** - Run on all pages EXCEPT specified ones (blacklist)
```json
"pages": {
  "mode": "exclude",
  "patterns": [
    "/admin/*",           // Exclude admin area
    "/checkout",          // Exclude checkout page
    "/finance-application" // Exclude sensitive forms
  ]
}
```
- Speed Layer runs everywhere EXCEPT matching pages
- Excluded pages load normally
- **Use when**: Want site-wide optimization but need to exclude certain pages

---

## 🎨 Pattern Matching

### Exact Match
```json
"patterns": ["/"]              // Homepage only
"patterns": ["/new-inventory"] // Exact path
```

### Wildcard Match
```json
"patterns": ["/inventory/*"]   // All inventory pages
"patterns": ["/blog/*"]        // All blog posts
"patterns": ["/*-inventory"]   // new-inventory, used-inventory, etc.
```

### Multiple Patterns
```json
"patterns": [
  "/",
  "/new-inventory",
  "/used-inventory",
  "/inventory/*",
  "/specials",
  "/service"
]
```

---

## 🚀 Usage Scenarios

### Scenario 1: Homepage Only (Current Setup for Cadillac)

**Goal**: Test Speed Layer on homepage first

```json
{
  "pages": {
    "mode": "include",
    "patterns": ["/"]
  }
}
```

**Console Output on Homepage** (`https://www.cadillacofgreenwich.com/`):
```
[SpeedLayer-DO] Initializing for DealerOn CMS: www.cadillacofgreenwich.com
[SpeedLayer-DO] ✓ Page check passed - Speed Layer will run on: /
[SpeedLayer-DO] Phase 1: Proxy interception started
```

**Console Output on Other Pages** (`https://www.cadillacofgreenwich.com/new-inventory`):
```
[SpeedLayer-DO] Initializing for DealerOn CMS: www.cadillacofgreenwich.com
[SpeedLayer-DO] 📄 Speed Layer NOT configured to run on this page: /new-inventory
[SpeedLayer-DO] Page mode: include
[SpeedLayer-DO] Page patterns: ["/"]
[SpeedLayer-DO] Site will load normally without script deferral on this page
```

---

### Scenario 2: Expand to Inventory Pages

**Goal**: After testing homepage, add inventory pages

```json
{
  "pages": {
    "mode": "include",
    "patterns": [
      "/",
      "/new-inventory",
      "/used-inventory",
      "/inventory/*"
    ]
  }
}
```

**Pages that will run Speed Layer**:
- ✅ `https://www.cadillacofgreenwich.com/` (homepage)
- ✅ `https://www.cadillacofgreenwich.com/new-inventory`
- ✅ `https://www.cadillacofgreenwich.com/used-inventory`
- ✅ `https://www.cadillacofgreenwich.com/inventory/2024-cadillac-escalade`
- ✅ `https://www.cadillacofgreenwich.com/inventory/anything`
- ❌ `https://www.cadillacofgreenwich.com/service` (not in patterns)
- ❌ `https://www.cadillacofgreenwich.com/about` (not in patterns)

---

### Scenario 3: Enable Site-Wide

**Goal**: Speed Layer proven, enable everywhere

**Option A**: Remove pages config entirely (use default)
```json
{
  "domain": "cadillacofgreenwich.com",
  "enabled": true,
  // No "pages" config = runs on all pages
}
```

**Option B**: Explicit "all" mode
```json
{
  "pages": {
    "mode": "all"
  }
}
```

**Result**: Speed Layer runs on every page of the site

---

### Scenario 4: Site-Wide with Exclusions

**Goal**: Run everywhere except sensitive pages

```json
{
  "pages": {
    "mode": "exclude",
    "patterns": [
      "/checkout",
      "/payment",
      "/finance-application",
      "/admin/*"
    ]
  }
}
```

**Pages that will run Speed Layer**:
- ✅ Homepage
- ✅ Inventory pages
- ✅ Service pages
- ✅ About pages
- ❌ `/checkout` (excluded)
- ❌ `/payment` (excluded)
- ❌ `/finance-application` (excluded)
- ❌ `/admin/dashboard` (excluded by wildcard)

---

## 📋 Step-by-Step: Gradual Rollout

### Phase 1: Homepage Only (CURRENT)

**Edit Manifest**:
```json
{
  "pages": {
    "mode": "include",
    "patterns": ["/"]
  }
}
```

**Test**:
1. Visit homepage - verify Speed Layer runs
2. Check console for: `✓ Page check passed - Speed Layer will run on: /`
3. Test functionality: forms, navigation, chat widgets
4. Verify PageSpeed improvements
5. Monitor for 1-2 weeks

---

### Phase 2: Add High-Traffic Pages

**Edit Manifest**:
```json
{
  "pages": {
    "mode": "include",
    "patterns": [
      "/",
      "/new-inventory",
      "/used-inventory",
      "/specials"
    ]
  }
}
```

**Test**:
1. Visit each new page - verify Speed Layer runs
2. Test filters, search, VDP (vehicle detail pages) if applicable
3. Monitor for issues
4. Expand after 1 week if stable

---

### Phase 3: Add Department Pages

**Edit Manifest**:
```json
{
  "pages": {
    "mode": "include",
    "patterns": [
      "/",
      "/new-inventory",
      "/used-inventory",
      "/inventory/*",
      "/specials",
      "/service",
      "/parts",
      "/about"
    ]
  }
}
```

---

### Phase 4: Enable Site-Wide

**Edit Manifest**:
```json
{
  "pages": {
    "mode": "all"
  }
}
```

**Or remove pages config entirely** (defaults to "all")

---

## 🔍 Testing & Verification

### Check Current Page Status

**Browser Console**:
```javascript
// Check if Speed Layer is active
window.__SPEED_LAYER_DO__

// Current page path
window.location.pathname

// Manual page check (if debug enabled)
// Look for these console messages:
// "✓ Page check passed" = Speed Layer running
// "📄 Speed Layer NOT configured to run" = Not running on this page
```

### Test Pattern Matching

Create test URLs and verify behavior:

**Homepage** (`/`):
- Should match pattern `"/"`
- Console: `✓ Page check passed`

**New Inventory** (`/new-inventory`):
- Should match if pattern includes `"/new-inventory"` or `"/*-inventory"`
- Console: `✓ Page check passed` (if matched) or `📄 NOT configured` (if not)

**VDP** (`/inventory/2024-cadillac-escalade`):
- Should match wildcard `"/inventory/*"`
- Console: `✓ Page check passed` (if wildcard present)

---

## ⚙️ Implementation Steps

### Step 1: Edit Manifest

Edit the appropriate manifest file:
- [manifest/cadillacofgreenwich.com.json](manifest/cadillacofgreenwich.com.json)
- [manifest/www.cadillacofgreenwich.com.json](manifest/www.cadillacofgreenwich.com.json)

**Current Configuration** (Homepage Only):
```json
{
  "pages": {
    "mode": "include",
    "patterns": ["/"]
  }
}
```

**To Expand to More Pages**, modify `patterns` array:
```json
{
  "pages": {
    "mode": "include",
    "patterns": [
      "/",
      "/new-inventory",
      "/used-inventory",
      "/inventory/*"
    ]
  }
}
```

**To Enable Site-Wide**, change mode to "all":
```json
{
  "pages": {
    "mode": "all"
  }
}
```

### Step 2: Commit and Push

```bash
git add manifest/cadillacofgreenwich.com.json manifest/www.cadillacofgreenwich.com.json
git commit -m "Expand Speed Layer to inventory pages on Cadillac of Greenwich"
git push origin main
```

### Step 3: Clear CDN Cache (Optional for Faster Update)

Visit: https://www.jsdelivr.com/tools/purge

Purge URLs:
- `https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/manifest/cadillacofgreenwich.com.json`
- `https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/manifest/www.cadillacofgreenwich.com.json`

Or wait 5-30 minutes for automatic CDN update.

### Step 4: Test

1. Visit each page type
2. Check console messages
3. Verify functionality
4. Monitor PageSpeed scores

---

## 🐛 Troubleshooting

### Problem: Speed Layer not running on homepage

**Check**:
1. Is `"enabled": true` in manifest?
2. Is homepage pattern correct? (`"/"` for homepage)
3. Check console for errors
4. Verify manifest loaded: Look for `[SpeedLayer-DO] Manifest loaded successfully`

**Solution**:
```json
{
  "enabled": true,
  "pages": {
    "mode": "include",
    "patterns": ["/"]  // Exact match for homepage
  }
}
```

---

### Problem: Speed Layer running on wrong pages

**Check**:
1. Review `mode` setting ("include" vs "exclude")
2. Check pattern matching rules
3. Test patterns in browser console

**Solution**: Adjust patterns:
```json
// If using wildcards, be specific
"patterns": ["/inventory/*"]  // Matches /inventory/anything
// NOT
"patterns": ["/*"]  // Would match everything!
```

---

### Problem: Want to quickly disable for one page

**Quick Fix** - Add to exclude mode:
```json
{
  "pages": {
    "mode": "exclude",
    "patterns": ["/problematic-page"]
  }
}
```

Or switch from "all" to "include" with specific pages:
```json
{
  "pages": {
    "mode": "include",
    "patterns": ["/", "/inventory/*"]  // Excludes everything else
  }
}
```

---

### Problem: Pattern not matching as expected

**Debug**:
```javascript
// In browser console on the page:
console.log('Current path:', window.location.pathname);

// Check if manifest loaded
window.__SPEED_LAYER_DO__.state.manifest.pages
```

**Common Issues**:
- Leading slash: Use `"/inventory"` not `"inventory"`
- Trailing slash: `/inventory` vs `/inventory/` are different
- Wildcard placement: `"/inventory/*"` matches subpaths, not parent

---

## 📊 Current Status: Cadillac of Greenwich

**Mode**: `"include"` (whitelist)
**Patterns**: `["/"]` (homepage only)
**Status**: ✅ Active on homepage, disabled on all other pages

**Console on Homepage**:
```
[SpeedLayer-DO] Initializing for DealerOn CMS: www.cadillacofgreenwich.com
[SpeedLayer-DO] Manifest loaded successfully
[SpeedLayer-DO] ✓ Page check passed - Speed Layer will run on: /
```

**Console on Other Pages**:
```
[SpeedLayer-DO] Initializing for DealerOn CMS: www.cadillacofgreenwich.com
[SpeedLayer-DO] Manifest loaded successfully
[SpeedLayer-DO] 📄 Speed Layer NOT configured to run on this page: /new-inventory
[SpeedLayer-DO] Site will load normally without script deferral on this page
```

---

## 🎯 Recommended Expansion Path

1. ✅ **Week 1-2**: Homepage only (current)
2. **Week 3**: Add `/new-inventory` and `/used-inventory`
3. **Week 4**: Add `/inventory/*` wildcard for VDPs
4. **Week 5-6**: Add high-traffic pages (`/specials`, `/service`)
5. **Week 7+**: Enable site-wide with `mode: "all"`

**Monitor each phase** for:
- Performance improvements (PageSpeed scores)
- Functionality issues (forms, widgets, analytics)
- User feedback
- Conversion rates

---

## 📞 Quick Reference

**Homepage Only**:
```json
{"pages": {"mode": "include", "patterns": ["/"]}}
```

**Specific Pages**:
```json
{"pages": {"mode": "include", "patterns": ["/", "/new-inventory", "/specials"]}}
```

**With Wildcards**:
```json
{"pages": {"mode": "include", "patterns": ["/", "/inventory/*", "/blog/*"]}}
```

**Site-Wide**:
```json
{"pages": {"mode": "all"}}
```

**Site-Wide with Exclusions**:
```json
{"pages": {"mode": "exclude", "patterns": ["/checkout", "/admin/*"]}}
```

---

**Created**: 2025-10-29
**Feature**: Page-level control for DealerOn sites
**Loader**: loader-do.js only (NOT available in loader-v2.js)
**Branch**: claude/analyze-custom-cms-site-011CUasTgUvk7AX4i3zwQoFR
