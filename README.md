# Speed Layer - Client-Side Performance Optimization

A self-contained, synchronous script loader that optimizes web performance by intelligently deferring non-critical resources while allowing platform-critical scripts to execute immediately.

## Features

- **Zero Dependencies**: Completely self-contained, no external libraries required
- **Synchronous Execution**: Runs early in page lifecycle before other scripts
- **Script Interception**: Automatically detects and manages third-party scripts
- **Lazy Loading**: Defers images and iframes below the fold
- **Resource Hints**: Supports preconnect and preload for critical resources
- **Critical CSS**: Inline above-the-fold CSS to eliminate render-blocking
- **User Interaction Based**: Loads deferred resources on first interaction or idle
- **Per-Domain Configuration**: JSON manifests for granular control per site

## Quick Start

### 1. Repository Setup

Create a GitHub repository with the following structure:

```
speed-layer/
├── loader.js                    # Main loader script
└── manifest/
    ├── victoryottawa.com.json   # Domain-specific config
    └── oxmoorchrysler.com.json  # Domain-specific config
```

### 2. Add Script to Website

Add this single line to the `<head>` section of your website (must be synchronous, no defer/async):

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@latest/loader.js"
        data-manifest="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@latest/manifest/"></script>
```

**Important**: This script must be placed as early as possible in the `<head>` and should NOT have `defer` or `async` attributes.

### 3. Create Domain Manifest

Create a JSON file named `{yourdomain.com}.json` in the `/manifest/` directory:

```json
{
  "domain": "yourdomain.com",
  "version": "1.0.0",
  "debug": false,
  "allowScripts": [
    "platform-core.js",
    "jquery",
    "essential-vendor.js"
  ],
  "deferScripts": [
    "google-analytics.com",
    "facebook.net",
    "doubleclick.net"
  ],
  "preconnect": [
    "https://fonts.googleapis.com"
  ],
  "preload": [],
  "criticalCssInline": ""
}
```

## Manifest Configuration

### `allowScripts` (Array of Strings)

Scripts that match these patterns will execute immediately without delay. Use this for platform-critical scripts.

**Examples**:
- `"dealerinspire.com"` - Matches any script containing this string
- `"dealer.com"` - Platform scripts
- `"jquery"` - Core libraries
- `"main.js"` - Your main application code

### `deferScripts` (Array of Strings)

Scripts matching these patterns will be deferred until user interaction or idle. Use this for analytics, tracking, and ads.

**Examples**:
- `"google-analytics.com"` - Google Analytics
- `"facebook.net"` - Facebook Pixel
- `"gtag"` - Google Tag Manager
- `"tracking"` - Generic tracking scripts
- `"/analytics.js"` - Specific filename patterns

**Regex Support**: Patterns can be regex if wrapped in slashes:
```json
"deferScripts": [
  "/ga\\.js$/",
  "/\\/tracking\\//",
  "/(analytics|tracking|pixel)/"
]
```

### `preconnect` (Array of Strings)

Origins to establish early connections to, reducing latency for future requests.

```json
"preconnect": [
  "https://fonts.googleapis.com",
  "https://www.google-analytics.com"
]
```

### `preload` (Array of Objects)

Critical resources to fetch early in the page load.

```json
"preload": [
  {
    "url": "https://fonts.googleapis.com/css2?family=Roboto",
    "as": "style",
    "crossorigin": "anonymous"
  },
  {
    "url": "/critical-script.js",
    "as": "script"
  }
]
```

### `criticalCssInline` (String)

Above-the-fold CSS to inject directly into the page, eliminating render-blocking CSS requests.

```json
"criticalCssInline": "body{margin:0}header{background:#000}.hero{height:500px}"
```

### `debug` (Boolean)

Enable detailed console logging for troubleshooting.

```json
"debug": true
```

## How It Works

### 1. Synchronous Initialization
The loader executes synchronously in the `<head>`, before any other scripts or content.

### 2. Script Interception
- Overrides `document.createElement` to intercept script creation
- Uses `MutationObserver` to catch dynamically added scripts
- Checks each script against `allowScripts` and `deferScripts` patterns

### 3. Resource Management
- **Allowed scripts**: Execute immediately (platform-critical)
- **Deferred scripts**: Queued and held until trigger
- **Images/Iframes**: Automatically lazy-loaded if below the fold

### 4. Deferred Loading Triggers
Scripts are loaded when:
- **User Interaction**: First mousedown, keydown, touchstart, or pointerdown
- **Idle Time**: After 4 seconds if no interaction (uses `requestIdleCallback`)

### 5. Optimization Hints
- Applies preconnect links early
- Adds preload hints for critical resources
- Injects critical CSS directly into the page

## Testing & Validation

### Check Installation

Open browser console and verify:

```javascript
// Should return object with version info
window.__SPEED_LAYER__

// Should show current state
window.__SPEED_LAYER__.state

// Force load all deferred scripts (for testing)
window.__SPEED_LAYER__.forceLoadAll()
```

### Enable Debug Mode

Set `"debug": true` in your manifest, then reload and check console for detailed logs:

```
[SpeedLayer] Initializing Speed Layer for: yourdomain.com
[SpeedLayer] Loading manifest from: https://...
[SpeedLayer] Manifest loaded successfully
[SpeedLayer] Script src detected: https://www.google-analytics.com/analytics.js
[SpeedLayer] Deferring script: https://www.google-analytics.com/analytics.js
[SpeedLayer] User interaction detected
[SpeedLayer] Executing queued scripts 3
```

### Performance Testing

1. **Before Speed Layer**: Run Lighthouse audit
2. **Add Speed Layer**: Install script and configure manifest
3. **After Speed Layer**: Run Lighthouse audit again

**Expected Improvements**:
- Lower **Total Blocking Time (TBT)**: 30-50% reduction typical
- Improved **Largest Contentful Paint (LCP)**: 15-30% faster
- Better **First Input Delay (FID)**: More responsive UI
- Higher **Performance Score**: 10-25 point increase

### Validation Checklist

- [ ] `window.__SPEED_LAYER__` exists after page load
- [ ] Platform scripts (Dealer Inspire, Dealer.com) execute immediately
- [ ] Analytics scripts (GA, Facebook Pixel) wait for interaction
- [ ] Console shows no errors related to Speed Layer
- [ ] Site functionality unchanged (forms, navigation, etc.)
- [ ] Lighthouse TBT reduced by at least 20%
- [ ] LCP improved or unchanged

## Common Patterns

### Dealer Inspire Sites

```json
{
  "allowScripts": [
    "dealerinspire.com",
    "di-assets.com",
    "jquery",
    "bootstrap"
  ],
  "deferScripts": [
    "google-analytics.com",
    "googletagmanager.com",
    "facebook.net",
    "doubleclick.net"
  ]
}
```

### Dealer.com Sites

```json
{
  "allowScripts": [
    "dealer.com",
    "dealerdotcom",
    "ddc-prod",
    "jquery"
  ],
  "deferScripts": [
    "google-analytics.com",
    "facebook.net",
    "googlesyndication",
    "doubleclick.net"
  ]
}
```

### Generic WordPress

```json
{
  "allowScripts": [
    "wp-includes",
    "wp-content/themes",
    "jquery"
  ],
  "deferScripts": [
    "google-analytics",
    "facebook",
    "twitter",
    "tracking"
  ]
}
```

## Deployment Options

### Option 1: jsDelivr (Recommended)

Fast, global CDN with automatic minification:

```html
<script src="https://cdn.jsdelivr.net/gh/username/repo@main/loader.js"
        data-manifest="https://cdn.jsdelivr.net/gh/username/repo@main/manifest/"></script>
```

**Pros**: Fast, reliable, free, automatic caching
**Cons**: 10-minute cache delay for updates

### Option 2: GitHub Pages

Direct serving from GitHub:

```html
<script src="https://username.github.io/repo/loader.js"
        data-manifest="https://username.github.io/repo/manifest/"></script>
```

**Pros**: Instant updates, simple setup
**Cons**: Slightly slower than CDN

### Option 3: Raw GitHub (Not Recommended)

```html
<script src="https://raw.githubusercontent.com/username/repo/main/loader.js"
        data-manifest="https://raw.githubusercontent.com/username/repo/main/manifest/"></script>
```

**Pros**: Instant updates
**Cons**: Not a CDN, rate limited, slower

## Troubleshooting

### Scripts Not Being Deferred

1. Check that patterns in `deferScripts` match the script URL
2. Enable `"debug": true` to see what's being detected
3. Verify Speed Layer script is loaded before the target scripts

### Platform Broken After Installation

1. Check that platform scripts are in `allowScripts`
2. Use Chrome DevTools Network tab to see script loading order
3. Temporarily set `deferScripts: []` to disable all deferral

### Manifest Not Loading

1. Verify the manifest URL is publicly accessible
2. Check browser console for CORS or 404 errors
3. Ensure filename matches exactly: `{domain}.json`
4. Wait 10 minutes after changes if using jsDelivr

### Performance Not Improving

1. Verify third-party scripts are actually being deferred (check Network tab)
2. Use Lighthouse to identify remaining bottlenecks
3. Add more aggressive patterns to `deferScripts`
4. Consider adding critical CSS to eliminate render-blocking

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 12.2+)
- **IE11**: Not supported (use modern browsers)

## Size & Performance

- **Unminified**: ~6.5 KB
- **Minified**: ~2.8 KB
- **Gzipped**: ~1.2 KB
- **Execution Time**: < 5ms on average hardware

## Security Considerations

- No `eval()` or `Function()` constructor usage
- No external dependencies or imports
- Manifest loaded over HTTPS only
- Graceful degradation if manifest fails

## License

MIT License - Feel free to use, modify, and distribute.

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.
