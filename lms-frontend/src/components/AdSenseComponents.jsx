// src/components/AdSenseComponents.jsx
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
    error: false
  });
  const adRef = useRef(null);

  useEffect(() => {
    const loadAd = async () => {
      // Don't load if ads are disabled
      if (!adsenseManager.isEnabled()) {
        return;
      }

      setAdState(prev => ({ ...prev, loading: true }));

      try {
        await adsenseManager.loadScript(clientId);
        
        // Small delay to ensure script is fully loaded
        setTimeout(() => {
          if (window.adsbygoogle && adRef.current) {
            window.adsbygoogle.push({});
            setAdState(prev => ({ ...prev, loaded: true, loading: false }));
          }
        }, 100);
      } catch (error) {
        console.error('AdSense loading error:', error);
        setAdState(prev => ({ ...prev, error: true, loading: false }));
      }
    };

    loadAd();
  }, [clientId]);

  // Don't render anything if ads are disabled or there's an error
  if (!adsenseManager.isEnabled() || adState.error) {
    return null;
  }

  // Show loading state
  if (adState.loading) {
    return (
      <div className={`ad-container ${className}`} style={style}>
        <div className="ad-placeholder bg-slate-700/20 rounded-lg p-4 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-600/30 rounded w-1/4 mx-auto mb-2"></div>
            <div className="h-32 bg-slate-600/30 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-container ${className}`} style={style}>
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

// Responsive Ad Component
export const ResponsiveAd = ({ adSlot, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!adsenseManager.isEnabled()) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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
  }, []);

  if (!adsenseManager.isEnabled()) {
    return null;
  }

  return (
    <div ref={containerRef} className={`my-6 ${className}`}>
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

// Square Ad Component
export const SquareAd = ({ adSlot, className = "" }) => {
  if (!adsenseManager.isEnabled()) {
    return null;
  }

  return (
    <div className={`my-4 ${className}`}>
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

// Horizontal Banner Ad
export const BannerAd = ({ adSlot, className = "" }) => {
  if (!adsenseManager.isEnabled()) {
    return null;
  }

  return (
    <div className={`my-6 ${className}`}>
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