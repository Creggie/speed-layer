/**
 * Speed Layer Loader
 * Self-contained performance optimization script that intercepts and manages resource loading
 * Version: 1.0.0
 */

(function() {
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
    queuedMedia: []
  };

  const CONFIG = {
    manifestUrl: null,
    domain: window.location.hostname,
    scriptTag: document.currentScript,
    interactionEvents: ['mousedown', 'keydown', 'touchstart', 'pointerdown'],
    idleTimeout: 4000 // Fallback if requestIdleCallback not supported
  };

  // Global namespace for debugging and external access
  window.__SPEED_LAYER__ = {
    version: '1.0.0',
    state: STATE,
    config: CONFIG,
    forceLoadAll: forceLoadAll
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Simple logging utility that respects debug mode
   */
  function log(message, data) {
    if (STATE.manifest && STATE.manifest.debug) {
      console.log('[SpeedLayer]', message, data || '');
    }
  }

  /**
   * Check if a script URL matches any pattern in the list
   */
  function matchesPattern(url, patterns) {
    if (!url || !patterns || !patterns.length) return false;
    
    return patterns.some(pattern => {
      // Exact match
      if (url.includes(pattern)) return true;
      
      // Regex pattern (if pattern starts and ends with /)
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

  /**
   * Determine if a script should be allowed to execute immediately
   */
  function shouldAllowScript(src) {
    if (!STATE.manifest || !src) return false;
    
    const allowList = STATE.manifest.allowScripts || [];
    return matchesPattern(src, allowList);
  }

  /**
   * Determine if a script should be deferred
   */
  function shouldDeferScript(src) {
    if (!STATE.manifest || !src) return true; // Default to defer
    
    const deferList = STATE.manifest.deferScripts || [];
    return matchesPattern(src, deferList);
  }

  // =============================================================================
  // MANIFEST LOADING
  // =============================================================================

  /**
   * Load and parse the manifest configuration for the current domain
   */
  function loadManifest() {
    const manifestAttr = CONFIG.scriptTag.getAttribute('data-manifest');
    
    if (!manifestAttr) {
      console.error('[SpeedLayer] No data-manifest attribute found');
      return Promise.resolve(null);
    }

    // Construct manifest URL: base URL + domain.json
    CONFIG.manifestUrl = manifestAttr.endsWith('/') 
      ? `${manifestAttr}${CONFIG.domain}.json`
      : `${manifestAttr}/${CONFIG.domain}.json`;

    log('Loading manifest from:', CONFIG.manifestUrl);

    return fetch(CONFIG.manifestUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
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
        // Use safe defaults if manifest fails to load
        STATE.manifest = {
          allowScripts: [],
          deferScripts: ['analytics', 'tracking', 'gtag', 'facebook', 'doubleclick'],
          preconnect: [],
          preload: [],
          debug: false
        };
        STATE.manifestLoaded = true;
        return STATE.manifest;
      });
  }

  // =============================================================================
  // RESOURCE OPTIMIZATION
  // =============================================================================

  /**
   * Apply preconnect hints from manifest
   */
  function applyPreconnects() {
    if (!STATE.manifest || !STATE.manifest.preconnect) return;
    
    STATE.manifest.preconnect.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      log('Applied preconnect:', url);
    });
  }

  /**
   * Apply preload hints from manifest
   */
  function applyPreloads() {
    if (!STATE.manifest || !STATE.manifest.preload) return;
    
    STATE.manifest.preload.forEach(item => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = item.url;
      link.as = item.as || 'script';
      if (item.crossorigin) link.crossOrigin = item.crossorigin;
      document.head.appendChild(link);
      log('Applied preload:', item.url);
    });
  }

  /**
   * Inject critical CSS if provided in manifest
   */
  function injectCriticalCSS() {
    if (!STATE.manifest || !STATE.manifest.criticalCssInline) return;
    
    const style = document.createElement('style');
    style.textContent = STATE.manifest.criticalCssInline;
    document.head.appendChild(style);
    log('Injected critical CSS');
  }

  // =============================================================================
  // SCRIPT INTERCEPTION
  // =============================================================================

  /**
   * Intercept script creation and apply deferral logic
   */
  function interceptScripts() {
    const originalCreateElement = document.createElement;
    
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        // Track this script element
        const scriptProxy = new Proxy(element, {
          set(target, property, value) {
            // Intercept src assignment
            if (property === 'src' && value) {
              log('Script src detected:', value);
              
              // Check if this script should be allowed immediately
              if (shouldAllowScript(value)) {
                log('Allowing script immediately:', value);
                target[property] = value;
                return true;
              }
              
              // Check if this script should be deferred
              if (shouldDeferScript(value)) {
                log('Deferring script:', value);
                
                // Store the script for later execution
                STATE.queuedScripts.push({
                  element: target,
                  src: value,
                  attributes: {}
                });
                
                // Don't set src yet - we'll do it after interaction/idle
                return true;
              }
            }
            
            // For all other properties, set normally
            target[property] = value;
            return true;
          }
        });
        
        return scriptProxy;
      }
      
      return element;
    };
  }

  /**
   * Observe DOM for dynamically added scripts
   */
  function observeScripts() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return; // Element nodes only
          
          // Check if it's a script
          if (node.tagName === 'SCRIPT' && node.src) {
            if (STATE.processedElements.has(node)) return;
            STATE.processedElements.add(node);
            
            const src = node.src;
            
            // Allow whitelisted scripts
            if (shouldAllowScript(src)) {
              log('Observer: Allowing script', src);
              return;
            }
            
            // Defer non-whitelisted scripts
            if (shouldDeferScript(src)) {
              log('Observer: Deferring script', src);
              
              // Remove from DOM
              const originalSrc = node.src;
              node.src = '';
              node.removeAttribute('src');
              
              // Queue for later
              STATE.queuedScripts.push({
                element: node,
                src: originalSrc,
                parent: node.parentNode,
                nextSibling: node.nextSibling
              });
              
              node.remove();
            }
          }
          
          // Check for images and iframes to lazy load
          if (node.tagName === 'IMG' || node.tagName === 'IFRAME') {
            if (STATE.processedElements.has(node)) return;
            STATE.processedElements.add(node);
            
            // Skip if already has loading="lazy"
            if (node.loading === 'lazy') return;
            
            // Apply lazy loading
            if (node.src && !node.dataset.speedLayerProcessed) {
              node.dataset.speedLayerProcessed = 'true';
              
              // For above-the-fold content, allow immediate loading
              const rect = node.getBoundingClientRect();
              const isAboveFold = rect.top < window.innerHeight * 1.5;
              
              if (!isAboveFold) {
                log('Lazy loading:', node.tagName, node.src);
                node.loading = 'lazy';
              }
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
    log('DOM observer active');
  }

  // =============================================================================
  // DEFERRED SCRIPT EXECUTION
  // =============================================================================

  /**
   * Execute all queued scripts
   */
  function executeQueuedScripts() {
    log('Executing queued scripts', STATE.queuedScripts.length);
    
    STATE.queuedScripts.forEach(item => {
      const { element, src, parent, nextSibling } = item;
      
      // Create a new script element to ensure proper execution
      const newScript = document.createElement('script');
      newScript.src = src;
      
      // Copy attributes
      Array.from(element.attributes || []).forEach(attr => {
        if (attr.name !== 'src') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      
      // Insert into DOM
      if (parent) {
        parent.insertBefore(newScript, nextSibling);
      } else {
        document.head.appendChild(newScript);
      }
      
      log('Executed deferred script:', src);
    });
    
    STATE.queuedScripts = [];
  }

  /**
   * Handle user interaction - load deferred resources
   */
  function onUserInteraction() {
    if (STATE.userInteracted) return;
    
    STATE.userInteracted = true;
    log('User interaction detected');
    
    // Remove event listeners
    CONFIG.interactionEvents.forEach(event => {
      document.removeEventListener(event, onUserInteraction, { capture: true, passive: true });
    });
    
    // Execute deferred scripts
    executeQueuedScripts();
  }

  /**
   * Handle idle callback - load remaining deferred resources
   */
  function onIdle() {
    if (STATE.idleCallbackFired) return;
    
    STATE.idleCallbackFired = true;
    log('Idle callback fired');
    
    // Execute deferred scripts if user hasn't interacted yet
    if (!STATE.userInteracted) {
      executeQueuedScripts();
    }
  }

  /**
   * Set up interaction and idle listeners
   */
  function setupTriggers() {
    // Listen for user interactions
    CONFIG.interactionEvents.forEach(event => {
      document.addEventListener(event, onUserInteraction, { capture: true, passive: true });
    });
    
    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(onIdle, { timeout: CONFIG.idleTimeout });
    } else {
      setTimeout(onIdle, CONFIG.idleTimeout);
    }
    
    log('Interaction triggers set up');
  }

  /**
   * Force load all deferred resources (for debugging)
   */
  function forceLoadAll() {
    log('Force loading all resources');
    executeQueuedScripts();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /**
   * Initialize the speed layer
   */
  function init() {
    log('Initializing Speed Layer for:', CONFIG.domain);
    
    // Start intercepting scripts immediately
    interceptScripts();
    
    // Load manifest and continue initialization
    loadManifest().then(manifest => {
      if (!manifest) {
        console.error('[SpeedLayer] Failed to initialize - no manifest');
        return;
      }
      
      // Apply optimization hints
      applyPreconnects();
      applyPreloads();
      injectCriticalCSS();
      
      // Start observing DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeScripts);
      } else {
        observeScripts();
      }
      
      // Set up deferred loading triggers
      setupTriggers();
      
      log('Speed Layer initialized successfully');
    });
  }

  // Start immediately
  init();

})();
