import React, { useState, useEffect, useRef } from 'react';
import { adsenseManager } from '../utils/adsenseManager';

// Base Google AdSense Banner Component
export const GoogleAdBanner = ({ 
  adSlot, 
  adFormat = "auto", 
  fullWidthResponsive = true,
  style = {},
  className = "",
  clientId = "ca-pub-xxxxxxxxxxxxxxxxx" // Replace with your actual client ID
}) => {
  const [adState, setAdState] = useState({
    loading: false,
    loaded: false,
    error: false,
    visible: false
  });
  const adRef = useRef(null);
  const containerRef = useRef(null);
  const adId = useRef(`ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const checkVisibility = () => {
      const shouldShow = adsenseManager.shouldShowAds();
      setAdState(prev => ({ ...prev, visible: shouldShow }));
      
      if (!shouldShow) {
        // Hide the ad container immediately
        if (containerRef.current) {
          containerRef.current.style.display = 'none';
        }
        return;
      } else {
        // Show the ad container
        if (containerRef.current) {
          containerRef.current.style.display = 'block';
        }
      }
    };

    // Initial check
    checkVisibility();

    // Set up interval to check for changes
    const interval = setInterval(checkVisibility, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadAd = async () => {
      // Don't load if ads are disabled
      if (!adsenseManager.shouldShowAds()) {
        return;
      }

      setAdState(prev => ({ ...prev, loading: true }));

      try {
        await adsenseManager.loadScript(clientId);
        
        // Small delay to ensure script is fully loaded
        setTimeout(() => {
          if (window.adsbygoogle && adRef.current && adsenseManager.shouldShowAds()) {
            try {
              window.adsbygoogle.push({});
              setAdState(prev => ({ ...prev, loaded: true, loading: false, visible: true }));
              
              // Register this ad with the manager
              adsenseManager.registerAd(adRef.current, adId.current);
            } catch (pushError) {
              console.error('Error pushing ad to adsbygoogle:', pushError);
              setAdState(prev => ({ ...prev, error: true, loading: false }));
            }
          }
        }, 100);
      } catch (error) {
        console.error('AdSense loading error:', error);
        setAdState(prev => ({ ...prev, error: true, loading: false }));
      }
    };

    if (adState.visible && !adState.loaded && !adState.loading) {
      loadAd();
    }
  }, [clientId, adState.visible, adState.loaded, adState.loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      adsenseManager.unregisterAd(adId.current);
    };
  }, []);

  // Don't render anything if ads are disabled
  if (!adState.visible || !adsenseManager.shouldShowAds()) {
    return null;
  }

  // Show loading state
  if (adState.loading) {
    return (
      <div 
        ref={containerRef}
        className={`ad-container ${className}`} 
        style={style}
        data-ad-container="true"
      >
        <div className="ad-placeholder bg-slate-700/20 rounded-lg p-4 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-600/30 rounded w-1/4 mx-auto mb-2"></div>
            <div className="h-32 bg-slate-600/30 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if there's an error
  if (adState.error) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`ad-container ${className}`} 
      style={style}
      data-ad-container="true"
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', backgroundColor: 'transparent', ...style }}
        data-ad-client={clientId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      ></ins>
    </div>
  );
};

// Responsive Ad Component with better visibility control
export const ResponsiveAd = ({ adSlot, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const checkShouldShow = () => {
      const enabled = adsenseManager.shouldShowAds();
      setShouldShow(enabled);
      
      if (!enabled && containerRef.current) {
        containerRef.current.style.display = 'none';
      } else if (enabled && containerRef.current) {
        containerRef.current.style.display = 'block';
      }
    };

    // Initial check
    checkShouldShow();

    // Check periodically for changes
    const interval = setInterval(checkShouldShow, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!shouldShow) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && shouldShow) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div ref={containerRef} className={`my-6 ${className}`} data-ad-container="true">
      <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10 min-h-[250px] flex flex-col">
        <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
        <div className="flex-1 flex items-center justify-center">
          {isVisible ? (
            <GoogleAdBanner 
              adSlot={adSlot}
              adFormat="auto"
              fullWidthResponsive={true}
              style={{ width: '100%', minHeight: '200px' }}
            />
          ) : (
            <div className="w-full h-48 bg-slate-700/20 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 text-sm">Loading ad...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Square Ad Component with visibility control
export const SquareAd = ({ adSlot, className = "" }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const checkShouldShow = () => {
      const enabled = adsenseManager.shouldShowAds();
      setShouldShow(enabled);
      
      if (!enabled && containerRef.current) {
        containerRef.current.style.display = 'none';
      } else if (enabled && containerRef.current) {
        containerRef.current.style.display = 'block';
      }
    };

    checkShouldShow();
    const interval = setInterval(checkShouldShow, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!shouldShow) {
    return null;
  }

  return (
    <div ref={containerRef} className={`my-4 ${className}`} data-ad-container="true">
      <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10">
        <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
        <GoogleAdBanner 
          adSlot={adSlot}
          adFormat="rectangle"
          fullWidthResponsive={false}
          style={{ width: '300px', height: '250px', margin: '0 auto' }}
        />
      </div>
    </div>
  );
};

// Horizontal Banner Ad with visibility control
export const BannerAd = ({ adSlot, className = "" }) => {
  const [shouldShow, setShouldShow] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const checkShouldShow = () => {
      const enabled = adsenseManager.shouldShowAds();
      setShouldShow(enabled);
      
      if (!enabled && containerRef.current) {
        containerRef.current.style.display = 'none';
      } else if (enabled && containerRef.current) {
        containerRef.current.style.display = 'block';
      }
    };

    checkShouldShow();
    const interval = setInterval(checkShouldShow, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!shouldShow) {
    return null;
  }

  return (
    <div ref={containerRef} className={`my-6 ${className}`} data-ad-container="true">
      <div className="bg-slate-800/30 rounded-xl p-4 border border-white/10">
        <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
        <GoogleAdBanner 
          adSlot={adSlot}
          adFormat="horizontal"
          fullWidthResponsive={true}
          style={{ minHeight: '90px' }}
        />
      </div>
    </div>
  );
};

// Debug component to show AdSense status (for development)
export const AdSenseDebugInfo = () => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo(adsenseManager.getDebugInfo());
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50">
      <h4 className="font-bold mb-2">AdSense Debug Info</h4>
      <div className="space-y-1">
        <div>Enabled: {debugInfo.enabled ? '✅' : '❌'}</div>
        <div>Script Loaded: {debugInfo.scriptLoaded ? '✅' : '❌'}</div>
        <div>Loading: {debugInfo.loading ? '⏳' : '❌'}</div>
        <div>Client ID: {debugInfo.clientId || 'None'}</div>
        <div>Config Enabled: {debugInfo.config?.enabled ? '✅' : '❌'}</div>
        <div>Test Mode: {debugInfo.config?.testMode ? '✅' : '❌'}</div>
        <div>Ad Instances: {debugInfo.adInstancesCount}</div>
        <div>Ads on Page: {debugInfo.adsOnPage}</div>
      </div>
    </div>
  );
};