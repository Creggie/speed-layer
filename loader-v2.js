/**
 * Speed Layer Loader v2.0 - Enhanced Edition
 * Optimized for maximum PageSpeed Insights improvements
 * Additional features: Font optimization, preload management, early hints
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
        observerActive: false,
        processedElements: new WeakSet(),
        queuedScripts: [],
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
        lazyLoadThreshold: 1.5
    };

    window.__SPEED_LAYER__ = {
        version: '2.0.0',
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
            performance.mark(`speed-layer-${name}`);
        }
    }

    function getPerformanceMetrics() {
        return {
            marks: STATE.performanceMarks,
            queuedScripts: STATE.queuedScripts.length,
            queuedMedia: STATE.queuedMedia.length,
            userInteracted: STATE.userInteracted,
            idleFired: STATE.idleCallbackFired
        };
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    function log(message, data) {
        if (STATE.manifest && STATE.manifest.debug) {
            console.log('[SpeedLayer v2]', message, data || '');
        }
    }

    function matchesPattern(url, patterns) {
        if (!url || !patterns || !patterns.length) return false;

        return patterns.some(pattern => {
            if (url.includes(pattern)) return true;

            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                try {
                    const regex = new RegExp(pattern.slice(1, -1));
                    return regex.test(url);
                } catch (e) {
                    return false;
                }
            }

            return false;
        });
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

    // =============================================================================
    // MANIFEST LOADING
    // =============================================================================

    function loadManifest() {
        const manifestAttr = CONFIG.scriptTag.getAttribute('data-manifest');

        if (!manifestAttr) {
            console.error('[SpeedLayer] No data-manifest attribute found');
            return Promise.resolve(null);
        }

        CONFIG.manifestUrl = manifestAttr.endsWith('/')
            ? `${manifestAttr}${CONFIG.domain}.json`
            : `${manifestAttr}/${CONFIG.domain}.json`;

        log('Loading manifest from:', CONFIG.manifestUrl);

        return fetch(CONFIG.manifestUrl)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(manifest => {
                STATE.manifest = manifest;
                STATE.manifestLoaded = true;
                log('Manifest loaded successfully', manifest);
                return manifest;
            })
            .catch(error => {
                console.warn('[SpeedLayer] Failed to load manifest:', error.message);
                STATE.manifest = {
                    allowScripts: [],
                    deferScripts: ['analytics', 'tracking', 'gtag', 'facebook', 'doubleclick', 'googlesyndication'],
                    preconnect: [],
                    preload: [],
                    debug: false
                };
                STATE.manifestLoaded = true;
                return STATE.manifest;
            });
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
        document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(link => {
            if (!link.href.includes('display=')) {
                link.href += (link.href.includes('?') ? '&' : '?') + 'display=swap';
                log('Optimized font loading:', link.href);
            }
        });
    }

    // =============================================================================
    // SCRIPT INTERCEPTION - ENHANCED
    // =============================================================================

    function interceptScripts() {
        const originalCreateElement = document.createElement;

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

                            if (shouldDeferScript(value)) {
                                log('⏸ Deferring script:', value);

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

                        if (shouldAllowScript(src)) {
                            log('Observer: ✓ Allowing script', src);
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
        log('Enhanced DOM observer active');
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

            const newScript = document.createElement('script');
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

        window.addEventListener('load', () => {
            setTimeout(onIdle, 1000);
        }, { once: true });

        mark('triggers-setup');
        log('Triggers configured');
    }

    function forceLoadAll() {
        log('Force loading all resources');
        executeQueuedScripts();
        executeQueuedIframes();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    function init() {
        mark('init-start');
        log('Initializing Speed Layer v2 for:', CONFIG.domain);

        loadManifest().then(manifest => {
            if (!manifest) {
                console.error('[SpeedLayer] Failed to initialize - no manifest');
                return;
            }

            // Only intercept scripts if not disabled in manifest
            if (!manifest.disableInterception) {
                interceptScripts();
                log('Script interception enabled');
            } else {
                log('Script interception disabled - using DOM observer only');
            }

            mark('manifest-loaded');

            applyPreconnects();
            applyPreloads();
            injectCriticalCSS();
            optimizeFonts();

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
            log('Speed Layer v2 initialized successfully');
            log('Performance marks:', STATE.performanceMarks);
        });
    }

    init();

})();
