class AdSenseManager {
  constructor() {
    this.scriptLoaded = false;
    this.loading = false;
    this.enabled = false;
    this.clientId = null;
    this.adInstances = new Set(); // Track all ad instances
    this.config = {
      enabled: false,
      testMode: true,
      clientId: null
    };
  }

  async loadScript(clientId) {
    if (!this.enabled) {
      return false;
    }

    if (this.scriptLoaded || this.loading) {
      return this.scriptLoaded;
    }

    this.loading = true;
    this.clientId = clientId;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-adsense-manager', 'true');
      
      script.onload = () => {
        this.scriptLoaded = true;
        this.loading = false;
        resolve(true);
      };
      
      script.onerror = () => {
        this.loading = false;
        console.error('Failed to load AdSense script');
        reject(new Error('Failed to load AdSense script'));
      };

      document.head.appendChild(script);
    });
  }

  setConfig(config) {
    const wasEnabled = this.enabled;
    this.config = { ...this.config, ...config };
    this.enabled = config.enabled;


    // If ads were enabled and now disabled, remove all ads
    if (wasEnabled && !this.enabled) {
      this.removeAllAds();
    }

    // If ads were disabled and now enabled, we'll need to reload the page
    // or re-render components for ads to appear
    if (!wasEnabled && this.enabled) {
    }
  }

  setEnabled(enabled) {
    const wasEnabled = this.enabled;
    this.enabled = enabled;
    this.config.enabled = enabled;


    // If disabling ads, remove all existing ads immediately
    if (wasEnabled && !enabled) {
      this.removeAllAds();
    }
  }

  isEnabled() {
    return this.enabled && this.config.enabled;
  }

  isScriptLoaded() {
    return this.scriptLoaded && this.enabled;
  }

  getConfig() {
    return { ...this.config };
  }

  // Register an ad instance
  registerAd(adElement, adId) {
    if (adElement && adId) {
      this.adInstances.add({ element: adElement, id: adId });
    }
  }

  // Unregister an ad instance
  unregisterAd(adId) {
    this.adInstances.forEach(ad => {
      if (ad.id === adId) {
        this.adInstances.delete(ad);
      }
    });
  }

  // Remove all ads from the page
  removeAllAds() {

    // Remove ads tracked by our manager
    this.adInstances.forEach(ad => {
      if (ad.element && ad.element.parentNode) {
        ad.element.parentNode.removeChild(ad.element);
      }
    });
    this.adInstances.clear();

    // Remove any remaining Google ads on the page
    const allAds = document.querySelectorAll('.adsbygoogle');
    allAds.forEach(ad => {
      // Hide the ad and its container
      ad.style.display = 'none';
      
      // Also hide parent containers that might be ad wrappers
      let parent = ad.parentElement;
      while (parent && parent.className && 
             (parent.className.includes('ad-container') || 
              parent.className.includes('ad-wrapper') ||
              parent.className.includes('advertisement'))) {
        parent.style.display = 'none';
        parent = parent.parentElement;
      }
    });

    // Remove any ad containers created by our components
    const adContainers = document.querySelectorAll('[data-ad-container="true"]');
    adContainers.forEach(container => {
      container.style.display = 'none';
    });
  }

  // Show all ads (when re-enabling)
  showAllAds() {
    if (!this.enabled) return;


    const allAds = document.querySelectorAll('.adsbygoogle');
    allAds.forEach(ad => {
      ad.style.display = 'block';
      
      // Show parent containers
      let parent = ad.parentElement;
      while (parent && parent.className && 
             (parent.className.includes('ad-container') || 
              parent.className.includes('ad-wrapper') ||
              parent.className.includes('advertisement'))) {
        parent.style.display = 'block';
        parent = parent.parentElement;
      }
    });

    const adContainers = document.querySelectorAll('[data-ad-container="true"]');
    adContainers.forEach(container => {
      container.style.display = 'block';
    });
  }

  removeScript() {
    
    // Remove all ads first
    this.removeAllAds();
    
    // Remove the script
    const existingScript = document.querySelector('script[data-adsense-manager="true"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Reset state
    this.scriptLoaded = false;
    this.loading = false;
    this.clientId = null;
    
    // Clear adsbygoogle array if it exists
    if (window.adsbygoogle) {
      window.adsbygoogle.length = 0;
    }
  }

  // Check if we should show ads (used by components)
  shouldShowAds() {
    return this.enabled && this.config.enabled;
  }

  // Initialize AdSense with config from server
  async initializeFromServer() {
    try {
      const response = await fetch('/api/adsense-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const config = await response.json();
        this.setConfig(config);
        
        // If enabled, load the script
        if (config.enabled && config.clientId) {
          await this.loadScript(config.clientId);
        }
        
        return config;
      } else {
        console.warn('Failed to fetch AdSense config');
        return null;
      }
    } catch (error) {
      console.error('Error initializing AdSense from server:', error);
      return null;
    }
  }

  // Debug method to check current state
  getDebugInfo() {
    return {
      enabled: this.enabled,
      scriptLoaded: this.scriptLoaded,
      loading: this.loading,
      clientId: this.clientId,
      config: this.config,
      adInstancesCount: this.adInstances.size,
      adsOnPage: document.querySelectorAll('.adsbygoogle').length
    };
  }
}

// Create singleton instance
export const adsenseManager = new AdSenseManager();

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  window.adsenseManager = adsenseManager;
}

// Auto-initialize when the module loads
if (typeof window !== 'undefined') {
  // Initialize from server config when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    adsenseManager.initializeFromServer();
  });
}