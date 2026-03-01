/**
 * Speed Layer Loader - DealerOn Edition (v1.2.0)
 *
 * Optimized specifically for DealerOn CMS platform
 * Based on Speed Layer v2.2.0 architecture
 *
 * Key DealerOn Optimizations:
 * - Compatible with ComplyAuto blocker.js (Proxy conflict mitigation)
 * - Handles DealerOn's extensive GTM container implementations
 * - Optimized for DealerOn lazy loading patterns
 * - Supports DealerOn personalization and banner systems
 *
 * Reliability (v1.1.0):
 * - fetchWithTimeout + classifyFetchError + retry (3x exponential backoff)
 * - Compiled regex cache via _regexCache Map
 * - Telemetry via navigator.sendBeacon (data-telemetry attr or manifest config)
 *
 * Platform: DealerOn CMS
 * CMS URL: https://www.dealeron.com/
 */

(function () {
    'use strict';

    // =============================================================================
    // CONFIGURATION & STATE
    // =============================================================================

    const STATE = {
        manifest: null,
        manifestLoaded: false,
        userInteracted: false,
        idleCallbackFired: false,
        delayedCallbackFired: false,
        observerActive: false,
        processedElements: new WeakSet(),
        queuedScripts: [],
        queuedDelayedScripts: [],
        queuedMedia: [],
        queuedIframes: [],
        performanceMarks: {}
    };

    const CONFIG = {
        manifestUrl: null,
        domain: window.location.hostname,
        scriptTag: document.currentScript,
        interactionEvents: ['mousedown', 'keydown', 'touchstart', 'pointerdown', 'click'],
        idleTimeout: 3000,
        delayedTimeout: 10000,
        lazyLoadThreshold: 1.5
    };

    window.__SPEED_LAYER_DO__ = {
        version: '1.2.0-dealeron',
        platform: 'DealerOn CMS',
        state: STATE,
        config: CONFIG,
        forceLoadAll: forceLoadAll,
        getMetrics: getPerformanceMetrics
    };

    // =============================================================================
    // PERFORMANCE MONITORING
    // =============================================================================

    function mark(name) {
        STATE.performanceMarks[name] = performance.now();
        if (performance.mark) {
            performance.mark(`speed-layer-do-${name}`);
        }
    }

    function getPerformanceMetrics() {
        return {
            marks: STATE.performanceMarks,
            queuedScripts: STATE.queuedScripts.length,
            queuedMedia: STATE.queuedMedia.length,
            userInteracted: STATE.userInteracted,
            idleFired: STATE.idleCallbackFired,
            platform: 'DealerOn'
        };
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    function log(message, data) {
        if (STATE.manifest && STATE.manifest.debug) {
            console.log('[SpeedLayer-DO]', message, data || '');
        }
    }

    // Compiled regex cache — each pattern is compiled once on first use
    const _regexCache = new Map();

    function getRegex(pattern) {
        if (!_regexCache.has(pattern)) {
            try {
                _regexCache.set(pattern, new RegExp(pattern.slice(1, -1)));
            } catch (e) {
                _regexCache.set(pattern, null);
            }
        }
        return _regexCache.get(pattern);
    }

    function matchesPattern(url, patterns) {
        if (!url || !patterns || !patterns.length) return false;

        return patterns.some(pattern => {
            if (url.includes(pattern)) return true;

            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                const regex = getRegex(pattern);
                return regex ? regex.test(url) : false;
            }

            return false;
        });
    }

    function shouldBlockScript(src) {
        if (!STATE.manifest || !src) return false;
        const blockList = STATE.manifest.blockScripts || [];
        return matchesPattern(src, blockList);
    }

    function shouldAllowScript(src) {
        if (!STATE.manifest || !src) return false;
        const allowList = STATE.manifest.allowScripts || [];
        return matchesPattern(src, allowList);
    }

    function shouldDeferScript(src) {
        if (!STATE.manifest || !src) return true;
        const deferList = STATE.manifest.deferScripts || [];
        return matchesPattern(src, deferList);
    }

    function shouldDelayScript(src) {
        if (!STATE.manifest || !src) return false;
        const delayedList = STATE.manifest.delayedScripts || [];
        return matchesPattern(src, delayedList);
    }

    // =============================================================================
    // PAGE DETECTION - DEALERON SPECIFIC
    // =============================================================================

    function matchesPagePattern(pathname, pattern) {
        // Exact match
        if (pathname === pattern) return true;

        // Wildcard match (e.g., "/inventory/*")
        if (pattern.includes('*')) {
            const regexPattern = pattern
                .replace(/\*/g, '.*')
                .replace(/\//g, '\\/');
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(pathname);
        }

        // Starts with match
        if (pattern.endsWith('/') && pathname.startsWith(pattern)) {
            return true;
        }

        return false;
    }

    function shouldRunOnCurrentPage() {
        if (!STATE.manifest || !STATE.manifest.pages) {
            // No page config = run on all pages (default behavior)
            return true;
        }

        const pageConfig = STATE.manifest.pages;
        const mode = pageConfig.mode || 'all';
        const patterns = pageConfig.patterns || [];
        const currentPath = window.location.pathname;

        log('Page detection:', {
            mode: mode,
            currentPath: currentPath,
            patterns: patterns
        });

        // Mode: "all" - run on all pages
        if (mode === 'all') {
            log('Page mode: ALL - running on all pages');
            return true;
        }

        // Mode: "include" - only run on matching pages (whitelist)
        if (mode === 'include') {
            const matches = patterns.some(pattern => matchesPagePattern(currentPath, pattern));
            if (matches) {
                log('✓ Page INCLUDED - Speed Layer will run');
            } else {
                log('✗ Page NOT in include list - Speed Layer will NOT run');
            }
            return matches;
        }

        // Mode: "exclude" - run on all pages EXCEPT matching ones (blacklist)
        if (mode === 'exclude') {
            const matches = patterns.some(pattern => matchesPagePattern(currentPath, pattern));
            if (matches) {
                log('✗ Page EXCLUDED - Speed Layer will NOT run');
            } else {
                log('✓ Page not in exclude list - Speed Layer will run');
            }
            return !matches; // Invert the match
        }

        // Unknown mode - default to running
        console.warn('[SpeedLayer-DO] Unknown page mode:', mode, '- defaulting to run');
        return true;
    }

    // =============================================================================
    // TELEMETRY
    // =============================================================================

    function sendTelemetry(event, extra) {
        var endpoint = (CONFIG.scriptTag && CONFIG.scriptTag.getAttribute('data-telemetry')) ||
            (STATE.manifest && STATE.manifest.telemetry && STATE.manifest.telemetry.endpoint) || null;
        if (!endpoint) return;

        var sampleRate = (STATE.manifest && STATE.manifest.telemetry && STATE.manifest.telemetry.sampleRate);
        if (sampleRate !== undefined && Math.random() > sampleRate) return;

        var payload = JSON.stringify(Object.assign({
            event: event,
            domain: CONFIG.domain,
            timestamp: Date.now(),
            loaderVersion: '1.1.0-dealeron'
        }, extra || {}));

        if (navigator.sendBeacon) {
            navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
        }
    }

    // =============================================================================
    // MANIFEST LOADING — with timeout, error classification, and retry
    // =============================================================================

    function fetchWithTimeout(url, ms) {
        var controller = new AbortController();
        var id = setTimeout(function () { controller.abort(); }, ms);
        return fetch(url, { signal: controller.signal })
            .finally(function () { clearTimeout(id); });
    }

    function classifyFetchError(err, status) {
        if (err && err.name === 'AbortError') return 'TIMEOUT';
        if (status === 404) return 'NOT_FOUND';
        if (status >= 500) return 'SERVER_ERROR';
        if (err instanceof SyntaxError) return 'JSON_PARSE_ERROR';
        return 'NETWORK_ERROR';
    }

    function loadManifest() {
        const manifestAttr = CONFIG.scriptTag.getAttribute('data-manifest');

        if (!manifestAttr) {
            console.error('[SpeedLayer-DO] No data-manifest attribute found');
            return Promise.resolve(null);
        }

        CONFIG.manifestUrl = manifestAttr.endsWith('/')
            ? `${manifestAttr}${CONFIG.domain}.json`
            : `${manifestAttr}/${CONFIG.domain}.json`;

        log('Loading manifest from:', CONFIG.manifestUrl);

        var maxAttempts = 3;
        var timeoutMs = 5000;
        var attempt = 0;

        function tryFetch() {
            attempt++;
            var httpStatus = null;
            return fetchWithTimeout(CONFIG.manifestUrl, timeoutMs)
                .then(function (response) {
                    httpStatus = response.status;
                    if (!response.ok) {
                        var err = new Error('HTTP ' + response.status);
                        err._httpStatus = response.status;
                        throw err;
                    }
                    return response.json();
                })
                .then(function (manifest) {
                    STATE.manifest = manifest;
                    STATE.manifestLoaded = true;
                    log('Manifest loaded successfully', manifest);
                    return manifest;
                })
                .catch(function (err) {
                    var status = err._httpStatus || httpStatus;
                    var errorType = classifyFetchError(err, status);
                    var noRetry = (errorType === 'NOT_FOUND' || errorType === 'JSON_PARSE_ERROR');

                    if (!noRetry && attempt < maxAttempts) {
                        var backoff = Math.pow(2, attempt - 1) * 1000;
                        log('[SpeedLayer-DO] Manifest fetch ' + errorType + ', retry ' + attempt + '/' + maxAttempts + ' in ' + backoff + 'ms');
                        return new Promise(function (resolve) {
                            setTimeout(function () { resolve(tryFetch()); }, backoff);
                        });
                    }

                    console.warn('[SpeedLayer-DO] Failed to load manifest:', err.message);
                    sendTelemetry('manifest_error', {
                        errorType: errorType,
                        url: CONFIG.manifestUrl,
                        attempt: attempt,
                        httpStatus: status
                    });

                    // DealerOn-specific safe fallback
                    STATE.manifest = {
                        allowScripts: ['dealeron.js', 'dlron.us', 'jquery', 'bootstrap'],
                        deferScripts: ['analytics', 'tracking', 'gtag', 'gtm', 'googletagmanager', 'facebook', 'doubleclick'],
                        delayedScripts: ['carcodesms', 'harmoniq', 'sincrod', 'personalization'],
                        preconnect: [],
                        preload: [],
                        debug: false,
                        disableInterception: true // Safe default for DealerOn (ComplyAuto compatibility)
                    };
                    STATE.manifestLoaded = true;
                    return STATE.manifest;
                });
        }

        return tryFetch();
    }

    // =============================================================================
    // RESOURCE OPTIMIZATION - ENHANCED
    // =============================================================================

    function applyPreconnects() {
        if (!STATE.manifest || !STATE.manifest.preconnect) return;

        STATE.manifest.preconnect.forEach(url => {
            const linkPreconnect = document.createElement('link');
            linkPreconnect.rel = 'preconnect';
            linkPreconnect.href = url;
            linkPreconnect.crossOrigin = 'anonymous';
            document.head.appendChild(linkPreconnect);

            const linkDnsPrefetch = document.createElement('link');
            linkDnsPrefetch.rel = 'dns-prefetch';
            linkDnsPrefetch.href = url;
            document.head.appendChild(linkDnsPrefetch);

            log('Applied preconnect + dns-prefetch:', url);
        });
    }

    function applyPreloads() {
        if (!STATE.manifest || !STATE.manifest.preload) return;

        STATE.manifest.preload.forEach(item => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = item.url;
            link.as = item.as || 'script';
            if (item.crossorigin) link.crossOrigin = item.crossorigin;
            if (item.type) link.type = item.type;
            document.head.appendChild(link);
            log('Applied preload:', item.url);
        });
    }

    function injectCriticalCSS() {
        if (!STATE.manifest || !STATE.manifest.criticalCssInline) return;

        const style = document.createElement('style');
        let css = STATE.manifest.criticalCssInline;
        css = css.replace(/@font-face\s*{([^}]*)}/g, (match, p1) => {
            if (!p1.includes('font-display')) {
                return `@font-face{${p1};font-display:swap}`;
            }
            return match;
        });
        style.textContent = css;
        document.head.appendChild(style);
        log('Injected critical CSS with font-display optimization');
    }

    function optimizeFonts() {
        // Optimize Google Fonts
        document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(link => {
            if (!link.href.includes('display=')) {
                link.href += (link.href.includes('?') ? '&' : '?') + 'display=swap';
                log('Optimized Google font loading:', link.href);
            }
        });

        // Optimize Adobe Typekit fonts (common on DealerOn sites)
        document.querySelectorAll('link[href*="typekit.net"]').forEach(link => {
            if (!link.href.includes('display=')) {
                link.href += (link.href.includes('?') ? '&' : '?') + 'display=swap';
                log('Optimized Typekit font loading:', link.href);
            }
        });
    }

    // =============================================================================
    // SCRIPT INTERCEPTION - ENHANCED
    // =============================================================================

    let originalCreateElement = null;
    let proxyInterceptionActive = false;

    function interceptScripts() {
        if (proxyInterceptionActive) return; // Already active

        originalCreateElement = document.createElement;
        proxyInterceptionActive = true;

        document.createElement = function (tagName) {
            const element = originalCreateElement.call(document, tagName);

            if (tagName.toLowerCase() === 'script') {
                const scriptProxy = new Proxy(element, {
                    set(target, property, value) {
                        if (property === 'src' && value) {
                            log('Script src detected:', value);

                            if (shouldAllowScript(value)) {
                                log('✓ Allowing script immediately:', value);
                                target[property] = value;
                                return true;
                            }

                            if (shouldDelayScript(value)) {
                                log('⏰ Delaying script (via Proxy):', value);

                                STATE.queuedDelayedScripts.push({
                                    element: target,
                                    src: value,
                                    type: target.type || 'text/javascript',
                                    async: target.async,
                                    defer: target.defer,
                                    attributes: Array.from(target.attributes || [])
                                });

                                return true;
                            }

                            if (shouldDeferScript(value)) {
                                log('⏸ Deferring script (via Proxy):', value);

                                STATE.queuedScripts.push({
                                    element: target,
                                    src: value,
                                    type: target.type || 'text/javascript',
                                    async: target.async,
                                    defer: target.defer,
                                    attributes: Array.from(target.attributes || [])
                                });

                                return true;
                            }
                        }

                        target[property] = value;
                        return true;
                    }
                });

                return scriptProxy;
            }

            return element;
        };

        mark('script-interception-setup');
        log('Proxy interception active');
    }

    function disableProxyInterception() {
        if (!proxyInterceptionActive) return;

        if (originalCreateElement) {
            document.createElement = originalCreateElement;
            proxyInterceptionActive = false;
            log('Proxy interception disabled (ComplyAuto compatibility mode)');
            log('DOM observer remains active for catching dynamically added scripts');
        }
    }

    function observeScripts() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;

                    if (node.tagName === 'SCRIPT' && node.src) {
                        if (STATE.processedElements.has(node)) return;
                        STATE.processedElements.add(node);

                        const src = node.src;

                        if (shouldBlockScript(src)) {
                            log('Observer: 🚫 Blocking script (permanently removed):', src);
                            node.src = '';
                            node.removeAttribute('src');
                            node.remove();
                            return;
                        }

                        if (shouldAllowScript(src)) {
                            log('Observer: ✓ Allowing script', src);
                            return;
                        }

                        if (shouldDelayScript(src)) {
                            log('Observer: ⏰ Delaying script (10s)', src);

                            const originalSrc = node.src;
                            const parent = node.parentNode;
                            const nextSibling = node.nextSibling;

                            node.src = '';
                            node.removeAttribute('src');
                            node.remove();

                            STATE.queuedDelayedScripts.push({
                                element: node,
                                src: originalSrc,
                                parent: parent,
                                nextSibling: nextSibling
                            });
                            return;
                        }

                        if (shouldDeferScript(src)) {
                            log('Observer: ⏸ Deferring script', src);

                            const originalSrc = node.src;
                            const parent = node.parentNode;
                            const nextSibling = node.nextSibling;

                            node.src = '';
                            node.removeAttribute('src');
                            node.remove();

                            STATE.queuedScripts.push({
                                element: node,
                                src: originalSrc,
                                parent: parent,
                                nextSibling: nextSibling
                            });
                        }
                    }

                    if (node.tagName === 'IFRAME' && node.src) {
                        if (STATE.processedElements.has(node)) return;
                        STATE.processedElements.add(node);

                        // Check if iframe should be allowed immediately (e.g., chat widgets)
                        if (shouldAllowScript(node.src)) {
                            log('✓ Allowing iframe immediately:', node.src);
                            return;
                        }

                        // Check if iframe should be delayed
                        if (shouldDelayScript(node.src)) {
                            log('Observer: ⏰ Delaying iframe (10s)', node.src);

                            const originalSrc = node.src;
                            const parent = node.parentNode;
                            const nextSibling = node.nextSibling;

                            node.src = '';
                            node.removeAttribute('src');
                            node.remove();

                            STATE.queuedDelayedScripts.push({
                                element: node,
                                src: originalSrc,
                                parent: parent,
                                nextSibling: nextSibling,
                                isIframe: true
                            });
                            return;
                        }

                        const rect = node.getBoundingClientRect();
                        const isAboveFold = rect.top < window.innerHeight * CONFIG.lazyLoadThreshold;

                        if (!isAboveFold) {
                            log('Lazy loading iframe:', node.src);

                            const originalSrc = node.src;
                            node.src = '';
                            node.dataset.src = originalSrc;
                            node.loading = 'lazy';

                            STATE.queuedIframes.push({
                                element: node,
                                src: originalSrc
                            });
                        }
                    }

                    if (node.tagName === 'IMG' && node.src) {
                        if (STATE.processedElements.has(node)) return;
                        STATE.processedElements.add(node);

                        if (node.loading === 'lazy') return;

                        const rect = node.getBoundingClientRect();
                        const isAboveFold = rect.top < window.innerHeight * CONFIG.lazyLoadThreshold;

                        if (!isAboveFold && !node.dataset.speedLayerProcessed) {
                            node.dataset.speedLayerProcessed = 'true';
                            node.loading = 'lazy';
                            log('Applied lazy loading to image');
                        }
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        STATE.observerActive = true;
        mark('observer-active');
        log('Enhanced DOM observer active (DealerOn mode)');
    }

    // =============================================================================
    // DEFERRED RESOURCE EXECUTION
    // =============================================================================

    function executeQueuedScripts() {
        if (STATE.queuedScripts.length === 0) return;

        log(`Executing ${STATE.queuedScripts.length} queued scripts`);
        mark('scripts-execution-start');

        STATE.queuedScripts.forEach(item => {
            const { element, src, parent, nextSibling } = item;

            // Use originalCreateElement to bypass Proxy interception
            const newScript = originalCreateElement ? originalCreateElement.call(document, 'script') : document.createElement('script');
            newScript.src = src;

            Array.from(element.attributes || []).forEach(attr => {
                if (attr.name !== 'src') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });

            if (parent && parent.isConnected) {
                parent.insertBefore(newScript, nextSibling);
            } else {
                document.head.appendChild(newScript);
            }

            log('✓ Executed deferred script:', src);
        });

        STATE.queuedScripts = [];
        mark('scripts-execution-complete');
    }

    function executeQueuedIframes() {
        if (STATE.queuedIframes.length === 0) return;

        log(`Loading ${STATE.queuedIframes.length} queued iframes`);

        STATE.queuedIframes.forEach(item => {
            const { element, src } = item;
            if (element.isConnected) {
                element.src = src;
                log('✓ Loaded iframe:', src);
            }
        });

        STATE.queuedIframes = [];
    }

    function executeDelayedScripts() {
        if (STATE.queuedDelayedScripts.length === 0) return;

        log(`Executing ${STATE.queuedDelayedScripts.length} delayed scripts`);
        mark('delayed-scripts-execution-start');

        STATE.queuedDelayedScripts.forEach(item => {
            const { element, src, parent, nextSibling, isIframe } = item;

            if (isIframe) {
                // Use originalCreateElement to bypass Proxy interception
                const newIframe = originalCreateElement ? originalCreateElement.call(document, 'iframe') : document.createElement('iframe');
                newIframe.src = src;

                Array.from(element.attributes || []).forEach(attr => {
                    if (attr.name !== 'src') {
                        newIframe.setAttribute(attr.name, attr.value);
                    }
                });

                if (parent && parent.isConnected) {
                    parent.insertBefore(newIframe, nextSibling);
                } else {
                    document.body.appendChild(newIframe);
                }

                log('✓ Executed delayed iframe:', src);
            } else {
                // Use originalCreateElement to bypass Proxy interception
                const newScript = originalCreateElement ? originalCreateElement.call(document, 'script') : document.createElement('script');
                newScript.src = src;

                Array.from(element.attributes || []).forEach(attr => {
                    if (attr.name !== 'src') {
                        newScript.setAttribute(attr.name, attr.value);
                    }
                });

                if (parent && parent.isConnected) {
                    parent.insertBefore(newScript, nextSibling);
                } else {
                    document.head.appendChild(newScript);
                }

                log('✓ Executed delayed script:', src);
            }
        });

        STATE.queuedDelayedScripts = [];
        mark('delayed-scripts-execution-complete');
    }

    function onUserInteraction(event) {
        if (STATE.userInteracted) return;

        STATE.userInteracted = true;
        mark('user-interaction');
        log('User interaction detected:', event.type);

        CONFIG.interactionEvents.forEach(eventType => {
            document.removeEventListener(eventType, onUserInteraction, { capture: true, passive: true });
        });

        executeQueuedScripts();
        executeQueuedIframes();
        executeDelayedScripts();
    }

    function onIdle() {
        if (STATE.idleCallbackFired) return;

        STATE.idleCallbackFired = true;
        mark('idle-callback');
        log('Idle callback fired');

        if (!STATE.userInteracted) {
            executeQueuedScripts();
            executeQueuedIframes();
        }
    }

    function onDelayed() {
        if (STATE.delayedCallbackFired) return;

        STATE.delayedCallbackFired = true;
        mark('delayed-callback');
        log('Delayed callback fired (10s)');

        if (!STATE.userInteracted) {
            executeDelayedScripts();
        }
    }

    function setupTriggers() {
        CONFIG.interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, onUserInteraction, {
                capture: true,
                passive: true,
                once: false
            });
        });

        if ('requestIdleCallback' in window) {
            requestIdleCallback(onIdle, { timeout: CONFIG.idleTimeout });
        } else {
            setTimeout(onIdle, CONFIG.idleTimeout);
        }

        // Set up delayed timeout for delayedScripts (10 seconds default)
        setTimeout(onDelayed, CONFIG.delayedTimeout);

        window.addEventListener('load', () => {
            setTimeout(onIdle, 1000);
        }, { once: true });

        mark('triggers-setup');
        log('Triggers configured (defer: ' + CONFIG.idleTimeout + 'ms, delayed: ' + CONFIG.delayedTimeout + 'ms)');
    }

    function forceLoadAll() {
        log('Force loading all resources');
        executeQueuedScripts();
        executeQueuedIframes();
        executeDelayedScripts();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    function init() {
        mark('init-start');
        console.log('[SpeedLayer-DO] Initializing for DealerOn CMS:', CONFIG.domain);

        // PHASE 1: Start Proxy interception immediately (before manifest loads)
        // This catches early scripts that load during manifest fetch
        interceptScripts();
        console.log('[SpeedLayer-DO] Phase 1: Proxy interception started (catching early scripts)');

        // PHASE 2: Load manifest and conditionally adjust interception
        loadManifest().then(manifest => {
            if (!manifest) {
                console.error('[SpeedLayer-DO] Failed to initialize - no manifest');
                return;
            }

            // Check if Speed Layer is enabled for this domain
            if (manifest.enabled === false) {
                console.log('[SpeedLayer-DO] ⏸ Speed Layer is DISABLED in manifest for:', CONFIG.domain);
                console.log('[SpeedLayer-DO] Site will load normally without script deferral');
                console.log('[SpeedLayer-DO] To enable, set "enabled": true in manifest');
                // Disable Proxy to let everything load normally
                disableProxyInterception();
                return;
            }

            // Check if Speed Layer should run on current page
            if (!shouldRunOnCurrentPage()) {
                console.log('[SpeedLayer-DO] 📄 Speed Layer NOT configured to run on this page:', window.location.pathname);
                console.log('[SpeedLayer-DO] Page mode:', manifest.pages?.mode || 'all');
                console.log('[SpeedLayer-DO] Page patterns:', manifest.pages?.patterns || 'none');
                console.log('[SpeedLayer-DO] Site will load normally without script deferral on this page');
                // Disable Proxy to let everything load normally
                disableProxyInterception();
                return;
            }
            console.log('[SpeedLayer-DO] ✓ Page check passed - Speed Layer will run on:', window.location.pathname);

            // Apply custom idle timeout from manifest
            if (manifest.idleTimeout) {
                CONFIG.idleTimeout = manifest.idleTimeout;
                log('Custom idle timeout configured:', CONFIG.idleTimeout + 'ms');
            }

            // Apply custom delayed timeout from manifest
            if (manifest.delayedTimeout) {
                CONFIG.delayedTimeout = manifest.delayedTimeout;
                log('Custom delayed timeout configured:', CONFIG.delayedTimeout + 'ms');
            }

            // Check if we should disable Proxy interception (but keep DOM observer)
            // This is typically needed for ComplyAuto compatibility on DealerOn sites
            if (manifest.disableInterception) {
                disableProxyInterception();
                log('Phase 2: Proxy interception disabled (ComplyAuto compatibility mode)');
                log('DOM observer will still catch dynamically added scripts');
            } else {
                log('Phase 2: Proxy interception confirmed active');
            }

            mark('manifest-loaded');

            applyPreconnects();
            applyPreloads();
            injectCriticalCSS();
            optimizeFonts();

            // Always start DOM observer (safe for all sites)
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    observeScripts();
                    mark('dom-ready');
                });
            } else {
                observeScripts();
            }

            setupTriggers();

            mark('init-complete');
            log('Speed Layer DealerOn Edition initialized successfully');
            log('Performance marks:', STATE.performanceMarks);
        });
    }

    init();

})();
