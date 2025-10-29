# Speed Layer - Pause Control Guide

Quick reference for enabling/disabling Speed Layer on specific domains via GitHub manifest files.

---

## 🎛️ How It Works

Each domain has a manifest file with an `"enabled"` flag:

```json
{
  "domain": "example.com",
  "version": "1.0.0",
  "enabled": true,    // ← Control flag
  "debug": true,
  ...
}
```

**When `"enabled": true`** (default):
- ✅ Speed Layer runs normally
- ✅ Scripts are deferred/delayed according to configuration
- ✅ Performance optimizations active

**When `"enabled": false`**:
- ⏸️ Speed Layer pauses itself
- ✅ Site loads normally (no script deferral)
- ✅ No interference with site functionality
- 📋 Console shows: `[SpeedLayer] ⏸ Speed Layer is DISABLED in manifest for: domain.com`

---

## 📝 How to Pause a Site

### Step 1: Edit the Manifest File

Navigate to the manifest file for the domain you want to pause:

**DealerInspire Sites:**
- Oxmoor Chrysler: [manifest/oxmoorchrysler.com.json](manifest/oxmoorchrysler.com.json)
- Victory Ottawa: [manifest/victoryottawa.com.json](manifest/victoryottawa.com.json)

**DealerOn Sites:**
- Cadillac of Greenwich: [manifest/cadillacofgreenwich.com.json](manifest/cadillacofgreenwich.com.json)

### Step 2: Change `enabled` to `false`

```diff
{
  "domain": "oxmoorchrysler.com",
  "version": "1.0.0",
- "enabled": true,
+ "enabled": false,
  "debug": true,
  ...
}
```

### Step 3: Commit and Push to GitHub

```bash
git add manifest/oxmoorchrysler.com.json
git commit -m "Pause Speed Layer on Oxmoor Chrysler for testing"
git push origin main
```

### Step 4: Wait for CDN Update (or Force Refresh)

**Option A: Wait for jsDelivr CDN cache** (~5-30 minutes)
- jsDelivr automatically updates from GitHub
- No action needed

**Option B: Force CDN cache clear** (instant)
1. Visit jsDelivr purge tool: https://www.jsdelivr.com/tools/purge
2. Enter URL: `https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/manifest/oxmoorchrysler.com.json`
3. Click "Purge cache"
4. Reload the website

**Option C: Use specific commit hash** (bypass cache)
- Update script tag to use new commit hash:
```html
<script src="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@COMMIT_HASH/loader-v2.js"
        data-manifest="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@COMMIT_HASH/manifest/"></script>
```

### Step 5: Verify on the Website

Open the website and check browser console:

**When paused, you'll see:**
```
[SpeedLayer v2] Initializing for: oxmoorchrysler.com
[SpeedLayer v2] Manifest loaded successfully
[SpeedLayer v2] ⏸ Speed Layer is DISABLED in manifest for: oxmoorchrysler.com
[SpeedLayer v2] Site will load normally without script deferral
[SpeedLayer v2] To enable, set "enabled": true in manifest
```

---

## 🔄 How to Re-enable a Site

### Step 1: Edit the Manifest File

Change `enabled` back to `true`:

```diff
{
  "domain": "oxmoorchrysler.com",
  "version": "1.0.0",
- "enabled": false,
+ "enabled": true,
  "debug": true,
  ...
}
```

### Step 2: Commit and Push

```bash
git add manifest/oxmoorchrysler.com.json
git commit -m "Re-enable Speed Layer on Oxmoor Chrysler"
git push origin main
```

### Step 3: Clear CDN Cache (if needed)

Follow Step 4 from the pause instructions above.

### Step 4: Verify

Console should show normal Speed Layer operation:
```
[SpeedLayer v2] Initializing for: oxmoorchrysler.com
[SpeedLayer v2] Manifest loaded successfully
[SpeedLayer v2] Phase 2: Proxy interception disabled (ComplyAuto compatibility mode)
[SpeedLayer v2] DOM observer will still catch dynamically added scripts
```

---

## 📋 Current Status (All Sites)

| Domain | Manifest File | Status | Loader |
|--------|---------------|--------|--------|
| **oxmoorchrysler.com** | [manifest/oxmoorchrysler.com.json](manifest/oxmoorchrysler.com.json) | ✅ `enabled: true` | loader-v2.js |
| **www.oxmoorchrysler.com** | [manifest/www.oxmoorchrysler.com.json](manifest/www.oxmoorchrysler.com.json) | ✅ `enabled: true` | loader-v2.js |
| **victoryottawa.com** | [manifest/victoryottawa.com.json](manifest/victoryottawa.com.json) | ✅ `enabled: true` | loader-v2.js |
| **www.victoryottawa.com** | [manifest/www.victoryottawa.com.json](manifest/www.victoryottawa.com.json) | ✅ `enabled: true` | loader-v2.js |
| **cadillacofgreenwich.com** | [manifest/cadillacofgreenwich.com.json](manifest/cadillacofgreenwich.com.json) | ✅ `enabled: true` | loader-do.js |
| **www.cadillacofgreenwich.com** | [manifest/www.cadillacofgreenwich.com.json](manifest/www.cadillacofgreenwich.com.json) | ✅ `enabled: true` | loader-do.js |

**Last Updated**: 2025-10-29

---

## ⚡ Quick Commands

### Check Status of All Sites
```bash
grep -h "\"enabled\"" manifest/*.json
```

### Pause All Sites (Emergency)
```bash
# Create a script to set all to false
for file in manifest/*.json; do
  sed -i 's/"enabled": true/"enabled": false/' "$file"
done
git add manifest/*.json
git commit -m "Emergency pause: disable Speed Layer on all sites"
git push origin main
```

### Re-enable All Sites
```bash
for file in manifest/*.json; do
  sed -i 's/"enabled": false/"enabled": true/' "$file"
done
git add manifest/*.json
git commit -m "Re-enable Speed Layer on all sites"
git push origin main
```

---

## 🧪 Testing Scenarios

### Scenario 1: Test New Configuration on One Site
1. Pause Speed Layer on all sites except test site
2. Make configuration changes to test site manifest
3. Test thoroughly
4. Apply changes to other sites
5. Re-enable all sites

### Scenario 2: Rollback After Issues
1. Set `enabled: false` for problematic site
2. Push to GitHub
3. Clear CDN cache (or wait)
4. Site loads normally while you investigate
5. Fix configuration
6. Re-enable when ready

### Scenario 3: Gradual Rollout
1. Start with `enabled: false` on all new sites
2. Enable one site at a time
3. Monitor performance and functionality
4. Enable next site after verification

---

## ⚠️ Important Notes

1. **Both Loaders Support This**: Works with both loader-v2.js (DealerInspire) and loader-do.js (DealerOn)

2. **www vs non-www**: Remember to update BOTH manifest files:
   - `domain.com.json`
   - `www.domain.com.json`

3. **CDN Cache**: Changes may take 5-30 minutes to propagate unless you force cache clear

4. **Safe Fallback**: Even when disabled, Speed Layer exits gracefully without errors

5. **No Site Changes Needed**: Everything controlled from GitHub manifests

6. **Debug Mode**: Keep `"debug": true` to see console messages confirming pause status

---

## 🔍 Troubleshooting

**Problem: Set `enabled: false` but Speed Layer still running**

Solutions:
1. Check you edited the correct manifest file (www vs non-www)
2. Clear jsDelivr CDN cache
3. Check commit was pushed to GitHub
4. Verify manifest file is valid JSON (no syntax errors)
5. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

**Problem: Want to pause immediately but CDN cache not clearing**

Solutions:
1. Temporarily rename manifest file to `.disabled` extension
2. This causes 404 error and safe fallback activates
3. Site loads normally with minimal console warnings

**Problem: Forgot which sites are paused**

Solution:
```bash
# List all manifests with their enabled status
for file in manifest/*.json; do
  echo "$(basename $file): $(grep "\"enabled\"" "$file")"
done
```

---

## 📞 Quick Reference

**To Pause a Site**: Set `"enabled": false` in manifest
**To Enable a Site**: Set `"enabled": true` in manifest
**Force CDN Update**: https://www.jsdelivr.com/tools/purge
**Verify Status**: Check browser console for pause message
**Control Method**: GitHub only (no website changes needed)

---

**Created**: 2025-10-29
**Feature Branch**: claude/analyze-custom-cms-site-011CUasTgUvk7AX4i3zwQoFR
**Applies To**: All Speed Layer loaders (v2 and DO edition)
