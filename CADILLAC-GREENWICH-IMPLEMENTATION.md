# Speed Layer - DealerOn Edition Implementation Guide
## Cadillac of Greenwich (DealerOn CMS)

---

## 📊 Site Analysis Summary

**Domain**: www.cadillacofgreenwich.com
**CMS Platform**: DealerOn v22.92.0
**Dealer ID**: 27114
**Analysis Date**: 2025-10-29

---

## 🔍 DealerOn Scripts Identified

### Core Platform Scripts (Must Load Immediately)
These scripts are essential for DealerOn site functionality and must load without delay:

1. **jQuery & Bootstrap Foundation**
   - `/resources/external/jQuery/jquery-3.7.1.min.js`
   - `/resources/external/bootstrap/js-v341/bootstrap.min.js`
   - `/resources/external/jQuery/ua-parser.min.js`
   - `/resources/external/bootstrap/js/userAgent-detection.min.js`

2. **DealerOn Core Platform**
   - `/dealeron.js` (Main platform script)
   - `/resources/global/dealeron.static.min.js` (Static assets)
   - `/resources/utilities/do_utility.min.js` (Utilities)
   - `https://cdn.dlron.us/*` (DealerOn CDN)

3. **Form & Lead Management**
   - `/resources/external/jQuery/jquery.validate.min.js`
   - `/resources/leadbaa/js/dealerOnLeadsBundle.js`
   - `/resources/global/lead/formPhoneUtility.min.js`

4. **Core Components**
   - `/resources/components/core/coreBundle.js`
   - `/resources/components/navigation/navigation.min.js`
   - `/resources/components/homepageBanners/bannerManager.min.js`
   - `/resources/pages/homepageCosmos/homepageSearchWidgetCosmosBundle.js`
   - `/resources/components/lazyLoad/lazyLoadHomepage.min.js`

5. **Utilities**
   - `/resources/external/modernizr/modernizr.min.js`
   - `/resources/global/locationSort/js/locationSortInjection.min.js`

---

## 🌐 Third-Party Integrations

### Analytics & Tracking (Defer to 3s)
1. **Google Tag Manager** - 6 containers:
   - GTM-KGGLWR3
   - GTM-PQW5KW8L
   - GTM-W33G7Q5
   - GTM-K7QPBHS
   - GTM-5HVJJR9F
   - GTM-MLHK883

2. **DealerOn Tracking**
   - `https://taggbaa.dealeron.com/dotagging.js?v=2901`
   - `/resources/components/dealerOnTrack/dealerOnTrack.min.js`
   - `/resources/components/tagging/gm/gmGlobalEvents.min.js`

### Heavy Widgets & Services (Delay to 10s)
1. **Chat & CRM**
   - **CarCode SMS**: `https://www.carcodesms.com/widgets/42932.js`
   - **Harmoniq CRM**: `https://media.assets.sincrod.com/agency/release/harmoniq/init.umd.js`

2. **Personalization**
   - `https://prsnbaa.dealeron.com/personalization.js`

3. **Banner System**
   - `https://banrsaa.dealeron.com/banner.js`

4. **Price Tracking**
   - `https://www.cadillacofgreenwich.com/resources/vclwsaa/js/priceTrack.min.js`

5. **Audio Validation**
   - `https://tag.validate.audio/validate.js`

### Compliance
- **ComplyAuto**: Cookie banner and blocker
  - `https://cdn.complyauto.com/cookiebanner/banner/561399d4-c098-4c6e-9f05-41dfb5370c88/blocker.js`
  - `https://cdn.complyauto.com/cookiebanner/banner.js`

### Fonts
- **Adobe Typekit**: hrx7xqc, gpc7ewp
- **Bootstrap Icons**: v1.11.3

### Video Embeds
- **YouTube iframes** with lazy loading (srcdoc pattern)

---

## ⚙️ Configuration Strategy

### Timing/Interception Decision

**Chosen Approach**: Use `loader-do.js` (DealerOn-specific loader) with `disableInterception: true`

**Reasoning**:
1. **Separate CMS Loader**: Created dedicated loader for DealerOn CMS to keep v2 loader clean for other platforms (DealerInspire, WordPress, etc.)
2. **ComplyAuto Compatibility**: Site uses ComplyAuto blocker.js which implements its own Proxy-based script interception (similar to Victory Ottawa)
3. **Nested Proxy Conflict**: Running Speed Layer's Proxy alongside ComplyAuto's would cause "Illegal invocation" errors
4. **DOM Observer Sufficient**: With `disableInterception: true`, the Proxy is disabled but DOM MutationObserver remains active for catching dynamically added scripts
5. **DealerOn Optimizations**: Includes DealerOn-specific fallbacks and Typekit font optimization
6. **Conservative Approach**: Minimizes risk while still providing significant performance gains

### Three-Tier Loading System

**Tier 1: allowScripts** (Load Immediately)
- All DealerOn core platform scripts
- jQuery, Bootstrap, Modernizr
- Navigation, forms, leads, core components
- Essential for site functionality

**Tier 2: deferScripts** (Defer to 3s or user interaction)
- All Google Tag Manager containers
- DealerOn tracking and tagging
- Third-party analytics (Facebook, DoubleClick, etc.)

**Tier 3: delayedScripts** (Delay to 10s or user interaction)
- Chat widgets (CarCode SMS)
- CRM (Harmoniq)
- Personalization engine
- Banner system
- Price tracking
- Audio validation

---

## 🚀 Implementation Instructions

### Step 1: Add Speed Layer Script Tag

Add this script tag to the `<head>` section of your DealerOn site, **as early as possible** (preferably right after the opening `<head>` tag):

```html
<script src="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/loader-do.js"
        data-manifest="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/manifest/"></script>
```

**Note**: This uses `@main` branch. For production, use a specific commit hash:
```html
<script src="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@587f3d0/loader-do.js"
        data-manifest="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@587f3d0/manifest/"></script>
```

### Step 2: Verify Manifest Loading

After adding the script, open your browser's DevTools console and check for:

```
[SpeedLayer-DO] Initializing for DealerOn CMS: www.cadillacofgreenwich.com
[SpeedLayer-DO] Loading manifest from: https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/manifest/www.cadillacofgreenwich.com.json
[SpeedLayer-DO] Manifest loaded successfully
```

### Step 3: Monitor Script Interception

Watch the console for these debug messages:

```
[SpeedLayer-DO] Phase 2: Proxy interception disabled (ComplyAuto compatibility mode)
[SpeedLayer-DO] DOM observer will still catch dynamically added scripts
[SpeedLayer-DO] Observer: ✓ Allowing script [script-url]
[SpeedLayer-DO] Observer: ⏸ Deferring script [script-url]
[SpeedLayer-DO] Observer: ⏰ Delaying script (10s) [script-url]
```

### Step 4: Test User Interaction

Click anywhere on the page and verify deferred scripts load:
```
[SpeedLayer-DO] User interaction detected: click
[SpeedLayer-DO] Executing 15 queued scripts
```

After 10 seconds, delayed scripts should execute:
```
[SpeedLayer-DO] Executing 8 delayed scripts
```

---

## 🧪 Testing Steps

### Functional Testing

1. **Homepage Load**
   - ✅ Page renders correctly
   - ✅ Navigation works
   - ✅ Search widget functions
   - ✅ Images and fonts load

2. **Forms & Leads**
   - ✅ Contact forms validate
   - ✅ Lead submission works
   - ✅ Phone formatting works

3. **Chat Widget** (after 10s delay)
   - ✅ CarCode SMS widget appears
   - ✅ Chat opens and functions

4. **Analytics** (after 3s or interaction)
   - ✅ GTM containers fire
   - ✅ DealerOn tracking active
   - ✅ No console errors

5. **Personalization** (after 10s)
   - ✅ DealerOn personalization engine loads
   - ✅ Banner system functions
   - ✅ Price tracking active

### Performance Testing

1. **PageSpeed Insights**
   - Run test: https://pagespeed.web.dev/analysis?url=https://www.cadillacofgreenwich.com/
   - Target: Significant improvement in Performance score
   - Check: Reduced "Render-blocking resources"
   - Check: Improved "Time to Interactive"

2. **WebPageTest**
   - Run test: https://www.webpagetest.org/
   - Compare before/after metrics
   - Check filmstrip for visual loading

3. **Browser DevTools**
   - Network tab: Check script loading sequence
   - Performance tab: Record page load
   - Console: No JavaScript errors

---

## 🐛 Debug Commands

Access Speed Layer DealerOn Edition internals via browser console:

```javascript
// Get current state
window.__SPEED_LAYER_DO__

// Force load all queued scripts
window.__SPEED_LAYER_DO__.forceLoadAll()

// Get performance metrics
window.__SPEED_LAYER_DO__.getMetrics()

// Check manifest
window.__SPEED_LAYER_DO__.state.manifest

// Check queued scripts
window.__SPEED_LAYER_DO__.state.queuedScripts
window.__SPEED_LAYER_DO__.state.queuedDelayedScripts

// Verify platform
window.__SPEED_LAYER_DO__.platform  // Returns "DealerOn CMS"
window.__SPEED_LAYER_DO__.version   // Returns "1.0.0-dealeron"
```

---

## ⚠️ Potential Compatibility Concerns

### 1. ComplyAuto Blocker.js
**Issue**: Nested Proxy conflicts
**Mitigation**: `disableInterception: true` disables Speed Layer's Proxy
**Status**: ✅ Handled

### 2. Multiple GTM Containers
**Issue**: 6 GTM containers can be heavy
**Mitigation**: All deferred to 3s or user interaction
**Status**: ✅ Optimized

### 3. DealerOn Lazy Loading
**Issue**: DealerOn has its own lazyLoadHomepage.min.js
**Mitigation**: Allowed to load immediately, works alongside Speed Layer
**Status**: ✅ Compatible

### 4. Inline Scripts
**Issue**: Many inline scripts in page (GTM initialization, etc.)
**Mitigation**: Inline scripts not intercepted by Speed Layer
**Status**: ℹ️ No action needed

### 5. YouTube iframes
**Issue**: Multiple YouTube embeds with srcdoc pattern
**Mitigation**: Speed Layer observes iframes, delays if needed
**Status**: ✅ Handled by DOM observer

---

## 📈 Expected Results

### Before Speed Layer
- **Performance Score**: ~50-70 (typical for dealer sites)
- **Time to Interactive**: 8-12 seconds
- **Render-blocking Resources**: 30-50 scripts

### After Speed Layer
- **Performance Score**: 75-90 (estimated)
- **Time to Interactive**: 3-5 seconds
- **Render-blocking Resources**: 5-15 scripts (allowScripts only)

### Key Improvements
1. ✅ Deferred 6 GTM containers + analytics (3s delay)
2. ✅ Delayed heavy widgets: chat, CRM, personalization (10s delay)
3. ✅ Early preconnect to critical domains
4. ✅ Maintained full site functionality
5. ✅ ComplyAuto compatibility preserved

---

## 🔧 Configuration Files

### Manifest Locations
- `/workspaces/speed-layer/manifest/www.cadillacofgreenwich.com.json`
- `/workspaces/speed-layer/manifest/cadillacofgreenwich.com.json`

### Loader Location
- `/workspaces/speed-layer/loader-do.js` (DealerOn-specific)

### CDN URLs
- Loader: `https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/loader-do.js`
- Manifest: `https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/manifest/`

---

## 📝 Notes

- **DealerOn-specific loader**: loader-do.js created specifically for DealerOn CMS sites
- **Separate from v2**: Keeps loader-v2.js clean for other platforms (DealerInspire, WordPress, etc.)
- **Debug mode enabled**: Set `"debug": false` in manifest for production
- **Timing adjustable**: Modify `idleTimeout` (3s) and `delayedTimeout` (10s) as needed
- **Pattern matching**: All patterns use substring matching (e.g., "dealeron.js" matches any URL containing that string)
- **Typekit optimization**: Automatically adds font-display=swap to Adobe Typekit fonts

---

## 🎯 Optimization Opportunities

If further optimization is needed:

1. **Reduce allowScripts**: Move some DealerOn components to deferScripts if non-critical
2. **Increase delays**: Push chat widgets to 15s (like Victory Ottawa with Autolead Star)
3. **Enable Proxy**: If ComplyAuto is removed, set `disableInterception: false` for more aggressive interception
4. **Critical CSS**: Add above-the-fold CSS to `criticalCssInline` to eliminate render-blocking stylesheets

---

## 📞 Support

For issues or questions:
- Check browser console for `[SpeedLayer v2]` debug messages
- Use `window.__SPEED_LAYER__.getMetrics()` to diagnose
- Review manifest configuration in DevTools
- Test with `debug: true` for verbose logging

---

**Implementation Date**: 2025-10-29
**Speed Layer Version**: 1.0.0-dealeron (DealerOn Edition)
**Loader File**: loader-do.js
**Manifest Version**: 1.0.0
**Status**: Ready for testing
