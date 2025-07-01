// // Create a new file: src/utils/adsense.js
// export const loadAdSenseScript = () => {
//   return new Promise((resolve, reject) => {
//     // Check if script already exists
//     if (document.querySelector('script[src*="adsbygoogle.js"]')) {
//       resolve(true);
//       return;
//     }

//     const script = document.createElement('script');
//     script.async = true;
//     script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxxxxxxxxxxxxxxxx';
//     script.crossOrigin = 'anonymous';
    
//     script.onload = () => {
//       resolve(true);
//     };
    
//     script.onerror = () => {
//       reject(new Error('Failed to load AdSense script'));
//     };

//     document.head.appendChild(script);
//   });
// };

// export const initializeAd = (adElement) => {
//   try {
//     if (window.adsbygoogle && adElement) {
//       window.adsbygoogle.push({});
//     }
//   } catch (error) {
//     console.error('Ad initialization error:', error);
//   }
// };

// src/utils/adsenseManager.js
class AdSenseManager {
  constructor() {
    this.scriptLoaded = false;
    this.loading = false;
    this.enabled = false; // Control this from admin settings
  }

  async loadScript(clientId) {
    if (this.scriptLoaded || this.loading) {
      return this.scriptLoaded;
    }

    this.loading = true;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        this.scriptLoaded = true;
        this.loading = false;
        resolve(true);
      };
      
      script.onerror = () => {
        this.loading = false;
        reject(new Error('Failed to load AdSense script'));
      };

      document.head.appendChild(script);
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  isScriptLoaded() {
    return this.scriptLoaded;
  }

  removeScript() {
    const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existingScript) {
      existingScript.remove();
      this.scriptLoaded = false;
    }
  }
}

export const adsenseManager = new AdSenseManager();