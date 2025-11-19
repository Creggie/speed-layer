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

    window.__SPEED_LAYER__ = {
        version: '2.0.1',
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

    function shouldDelayScript(src) {
        if (!STATE.manifest || !src) return false;
        const delayedList = STATE.manifest.delayedScripts || [];
        return matchesPattern(src, delayedList);
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

    let originalCreateElement = null;
    let proxyInterceptionActive = false;

    function interceptScripts() {
        if (proxyInterceptionActive) return; // Already active

        originalCreateElement = document.createElement;
        proxyInterceptionActive = true;

        document.createElement = function (tagName) {
            const element = originalCreateElement.call(document, tagName);

            if (tagName.toLowerCase() === 'script') {
                // Track if script has been handled
                let scriptHandled = false;

                const scriptProxy = new Proxy(element, {
                    get(target, property) {
                        // Return the target itself for special symbol properties
                        if (typeof property === 'symbol') {
                            return Reflect.get(target, property);
                        }

                        const value = Reflect.get(target, property);

                        // If it's a function, wrap it to maintain proper context
                        if (typeof value === 'function') {
                            return function(...args) {
                                return Reflect.apply(value, target, args);
                            };
                        }

                        return value;
                    },
                    set(target, property, value) {
                        if (property === 'src' && value && !scriptHandled) {
                            scriptHandled = true;
                            log('Script src detected:', value);

                            if (shouldAllowScript(value)) {
                                log('✓ Allowing script immediately:', value);
                                Reflect.set(target, property, value);
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

                                // Prevent the script from loading by not setting src
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

                                // Prevent the script from loading by not setting src
                                return true;
                            }
                        }

                        Reflect.set(target, property, value);
                        return true;
                    },
                    has(target, property) {
                        return Reflect.has(target, property);
                    },
                    ownKeys(target) {
                        return Reflect.ownKeys(target);
                    },
                    getOwnPropertyDescriptor(target, property) {
                        return Reflect.getOwnPropertyDescriptor(target, property);
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
            log('Proxy interception disabled (keeping DOM observer)');
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
        log('Enhanced DOM observer active');
    }

    // =============================================================================
    // DEFERRED RESOURCE EXECUTION
    // =============================================================================

    /**
     * Safely inserts an element into the DOM with validation and fallback
     * @param {Node} newElement - The element to insert
     * @param {Node} parent - The preferred parent node
     * @param {Node} nextSibling - The sibling to insert before (can be null)
     * @param {Node} fallbackParent - Fallback parent if primary insertion fails
     * @returns {boolean} - True if insertion succeeded
     */
    function safeInsert(newElement, parent, nextSibling, fallbackParent) {
        try {
            // Validate the element is a proper Node
            if (!(newElement instanceof Node)) {
                console.warn('[SpeedLayer] Invalid node, skipping insertion');
                return false;
            }

            if (parent && parent.isConnected) {
                parent.insertBefore(newElement, nextSibling);
                return true;
            }
        } catch (error) {
            console.warn('[SpeedLayer] insertBefore failed:', error.message);
        }

        // Fallback to appending to fallback parent
        try {
            if (fallbackParent) {
                fallbackParent.appendChild(newElement);
                return true;
            }
        } catch (error) {
            console.error('[SpeedLayer] Failed to insert element:', error);
            return false;
        }

        return false;
    }

    function executeQueuedScripts() {
        if (STATE.queuedScripts.length === 0) return;

        log(`Executing ${STATE.queuedScripts.length} queued scripts`);
        mark('scripts-execution-start');

        STATE.queuedScripts.forEach(item => {
            const { element, src, parent, nextSibling } = item;

            // Use originalCreateElement to bypass Proxy interception
            const newScript = originalCreateElement ? originalCreateElement.call(document, 'script') : document.createElement('script');
            newScript.src = src;

            try {
                Array.from(element.attributes || []).forEach(attr => {
                    if (attr.name !== 'src') {
                        newScript.setAttribute(attr.name, attr.value);
                    }
                });
            } catch (error) {
                log('Warning: Could not copy attributes from original element');
            }

            if (safeInsert(newScript, parent, nextSibling, document.head)) {
                log('✓ Executed deferred script:', src);
            } else {
                log('✗ Failed to execute deferred script:', src);
            }
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

                try {
                    Array.from(element.attributes || []).forEach(attr => {
                        if (attr.name !== 'src') {
                            newIframe.setAttribute(attr.name, attr.value);
                        }
                    });
                } catch (error) {
                    log('Warning: Could not copy attributes from original iframe element');
                }

                if (safeInsert(newIframe, parent, nextSibling, document.body)) {
                    log('✓ Executed delayed iframe:', src);
                } else {
                    log('✗ Failed to execute delayed iframe:', src);
                }
            } else {
                // Use originalCreateElement to bypass Proxy interception
                const newScript = originalCreateElement ? originalCreateElement.call(document, 'script') : document.createElement('script');
                newScript.src = src;

                try {
                    Array.from(element.attributes || []).forEach(attr => {
                        if (attr.name !== 'src') {
                            newScript.setAttribute(attr.name, attr.value);
                        }
                    });
                } catch (error) {
                    log('Warning: Could not copy attributes from original script element');
                }

                if (safeInsert(newScript, parent, nextSibling, document.head)) {
                    log('✓ Executed delayed script:', src);
                } else {
                    log('✗ Failed to execute delayed script:', src);
                }
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
        console.log('[SpeedLayer v2.0.1] Initializing for:', CONFIG.domain);

        // PHASE 1: Start DOM observer immediately (safe for all sites)
        // Proxy interception will be started in Phase 2 if enabled in manifest
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                observeScripts();
                mark('dom-observer-early');
            });
        } else {
            observeScripts();
            mark('dom-observer-early');
        }
        console.log('[SpeedLayer v2] Phase 1: DOM observer started early');

        // PHASE 2: Load manifest and conditionally start Proxy interception
        loadManifest().then(manifest => {
            if (!manifest) {
                console.error('[SpeedLayer] Failed to initialize - no manifest');
                return;
            }

            // Check if Speed Layer is enabled for this domain
            if (manifest.enabled === false) {
                console.log('[SpeedLayer v2] ⏸ Speed Layer is DISABLED in manifest for:', CONFIG.domain);
                console.log('[SpeedLayer v2] Site will load normally without script deferral');
                console.log('[SpeedLayer v2] To enable, set "enabled": true in manifest');
                // Disable Proxy to let everything load normally
                disableProxyInterception();
                return;
            }

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

            // Check if we should enable Proxy interception
            if (manifest.disableInterception) {
                console.log('[SpeedLayer v2] Phase 2: Proxy interception DISABLED (compatibility mode)');
                console.log('[SpeedLayer v2] Relying on DOM observer only');
            } else {
                interceptScripts();
                console.log('[SpeedLayer v2] Phase 2: Proxy interception ENABLED');
            }

            mark('manifest-loaded');

            applyPreconnects();
            applyPreloads();
            injectCriticalCSS();
            optimizeFonts();

            setupTriggers();

            mark('init-complete');
            log('Speed Layer v2 initialized successfully');
            log('Performance marks:', STATE.performanceMarks);
        });
    }

    init();

})();
