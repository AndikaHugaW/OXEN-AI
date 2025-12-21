'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { BarChart3, LineChart as LineChartIcon, MoreVertical, Star, Bell, TrendingUp, TrendingDown, Move, GitCompare, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { timeframeToDays, getAvailableTimeframes } from '@/lib/market/timeframe-utils';

export interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  title: string;
  data: CandlestickData[];
  symbol?: string;
  currentPrice?: number;
  change24h?: number;
  assetType?: 'crypto' | 'stock';
  // Logo dan nama perusahaan langsung dari API response
  logoUrl?: string; // Logo URL langsung dari API - bisa digunakan langsung di browser
  companyName?: string; // Nama perusahaan dari API
  // Additional market metrics
  prevClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  yearHigh?: number;
  yearLow?: number;
  fundingRate?: number;
}

export default function CandlestickChart({
  title,
  data,
  symbol,
  currentPrice,
  change24h,
  assetType = 'crypto',
  logoUrl: logoUrlFromProps, // Logo URL langsung dari API response
  companyName: companyNameFromProps, // Nama perusahaan dari API response
  prevClose,
  open,
  high,
  low,
  volume,
  marketCap,
  yearHigh,
  yearLow,
  fundingRate,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialFitRef = useRef<boolean>(false); // Track if initial fitContent has been called
  const isUserInteractingRef = useRef<boolean>(false); // Track if user is actively panning/zooming
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [isFollowing, setIsFollowing] = useState(false);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [currentData, setCurrentData] = useState<CandlestickData[]>(data);
  const [currentPriceState, setCurrentPriceState] = useState<number | undefined>(currentPrice);
  const [change24hState, setChange24hState] = useState<number | undefined>(change24h);
  const [isLoading, setIsLoading] = useState(false);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number>(currentPrice ?? 0);
  const [maxLoadedDays, setMaxLoadedDays] = useState<number>(7);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [assetLogoUrl, setAssetLogoUrl] = useState<string | null>(null);
  const [assetDisplayName, setAssetDisplayName] = useState<string | null>(null);

  // Detect if this is an Indonesian stock and determine currency
  const isIndonesianStock = useMemo(() => {
    if (!symbol || assetType === 'crypto') return false;
    const s = symbol.toUpperCase();
    if (s.endsWith('.JK')) return true;
    // Known Indonesian stock symbols
    const idxSymbols = [
      'GOTO', 'BBRI', 'BBCA', 'BBNI', 'BMRI', 'TLKM', 'ASII', 'UNVR', 'ICBP',
      'INDF', 'PGAS', 'ADRO', 'KLBF', 'GGRM', 'SMGR', 'ANTM', 'INCO', 'PTBA',
      'JSMR', 'WIKA', 'BSDE', 'CTRA', 'EXCL', 'ISAT', 'MYOR', 'ROTI', 'ULTJ',
      'BNGA', 'BJBR', 'BTPN', 'BNII', 'WEGE', 'ADHI', 'DMAS', 'TKIM', 'CPIN',
      'SRIL', 'AKRA', 'AXSI', 'IGAR', 'JAGG', 'JAGO', 'ARTO', 'EMTK', 'SCMA'
    ];
    return idxSymbols.includes(s) || (s.length === 4 && /^[A-Z]{4}$/.test(s));
  }, [symbol, assetType]);

  // Format price based on currency
  const formatPrice = useCallback((price: number): string => {
    if (isIndonesianStock) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }, [isIndonesianStock]);


  const normalizedStockTicker = useMemo(() => {
    if (!symbol) return null;
    return symbol.toUpperCase().replace('.JK', '');
  }, [symbol]);

  // Fetch / resolve asset logo (crypto from CoinGecko meta; stocks from public logo sources)
  useEffect(() => {
    let cancelled = false;
    // Don't reset logo immediately - keep previous logo while fetching new one to avoid flicker
    // setAssetLogoUrl(null);
    setAssetDisplayName(null);

    if (!symbol) return;

    // SKENARIO 1: Gunakan logoUrl langsung dari API response jika tersedia (paling ideal)
    if (logoUrlFromProps) {
      console.log(`✅ [CandlestickChart] Using logo URL directly from API response for ${symbol}:`, logoUrlFromProps);
      setAssetLogoUrl(logoUrlFromProps);
      if (companyNameFromProps) {
        setAssetDisplayName(companyNameFromProps);
      }
      // Verify logo in background (non-blocking)
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          console.log(`✅ [CandlestickChart] Logo from API verified for ${symbol}`);
        }
      };
      img.onerror = () => {
        console.warn(`⚠️ [CandlestickChart] Logo from API failed verification for ${symbol}, will try fallback`);
        // Will try fallback in onError handler
      };
      img.src = logoUrlFromProps;
      return; // Skip API call if we already have logo from props
    }
    
    // SKENARIO 2: API tidak menyediakan logoUrl, fetch dari sumber eksternal
    // For stocks, immediately try to get logo URL from direct sources
    if (assetType === 'stock') {
      const ticker = symbol.toUpperCase().replace('.JK', '');
      // Try Clearbit first (direct URL from browser)
      const domainMap: Record<string, string> = {
        BBCA: 'bca.co.id', BBRI: 'bri.co.id', BMRI: 'bankmandiri.co.id',
        BBNI: 'bni.co.id', TLKM: 'telkom.co.id', ASII: 'astra.co.id',
        GOTO: 'goto.com', UNVR: 'unilever.co.id', ICBP: 'icbpfood.com',
        INDF: 'indofood.com', PGAS: 'pertamina.com', AAPL: 'apple.com',
        MSFT: 'microsoft.com', TSLA: 'tesla.com', GOOGL: 'google.com',
        AMZN: 'amazon.com', META: 'meta.com', NVDA: 'nvidia.com',
      };
      const domain = domainMap[ticker];
      if (domain) {
        const clearbitUrl = `https://logo.clearbit.com/${domain}`;
        setAssetLogoUrl(clearbitUrl);
        console.log(`🚀 [CandlestickChart] Setting immediate Clearbit logo URL for ${symbol}:`, clearbitUrl);
      } else {
        // Try IEX as immediate fallback
        const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
        setAssetLogoUrl(iexUrl);
        console.log(`🚀 [CandlestickChart] Setting immediate IEX logo URL for ${symbol}:`, iexUrl);
      }
    }

    (async () => {
      try {
        // Use new logo API endpoint for both crypto and stock
        const logoRes = await fetch('/api/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, type: assetType }),
        });
        
        let logoSet = false;
        if (logoRes.ok) {
          const logoJson = await logoRes.json();
          console.log(`📊 [CandlestickChart] Logo API response for ${symbol}:`, logoJson);
          if (logoJson?.success && !cancelled) {
            // Prefer direct logoUrl from browser, use proxyUrl only as fallback
            const logoToUse = logoJson.logoUrl || logoJson.proxyUrl;
            if (logoToUse) {
              // Set logo immediately, don't wait for verification
              // Browser will handle loading and onError will try fallbacks
              setAssetLogoUrl(logoToUse);
              logoSet = true;
              console.log(`✅ [CandlestickChart] Logo URL set for ${symbol} (direct from browser):`, logoToUse);
              
              // Verify in background (non-blocking)
              const img = new Image();
              img.onload = () => {
                if (!cancelled) {
                  console.log(`✅ [CandlestickChart] Logo verified for ${symbol}`);
                }
              };
              img.onerror = () => {
                console.warn(`⚠️ [CandlestickChart] Logo verification failed for ${symbol}, will try fallback on render`);
              };
              img.src = logoToUse;
            } else {
              console.warn(`⚠️ [CandlestickChart] No logo URL in response for ${symbol}:`, logoJson);
            }
          } else {
            console.warn(`⚠️ [CandlestickChart] Logo API returned success=false for ${symbol}:`, logoJson);
          }
        } else {
          console.warn(`⚠️ [CandlestickChart] Logo API request failed for ${symbol}:`, logoRes.status, logoRes.statusText);
        }
        
        // If API failed or logo not set, try fallback sources for stocks
        if (!logoSet && assetType === 'stock' && !cancelled) {
          const ticker = normalizedStockTicker;
          if (ticker) {
            console.log(`🔄 [CandlestickChart] Logo not set from API, trying fallback sources for ${symbol}...`);
            // Try Clearbit directly as fallback
            const domainMap: Record<string, string> = {
              BBCA: 'bca.co.id', BBRI: 'bri.co.id', BMRI: 'bankmandiri.co.id',
              BBNI: 'bni.co.id', TLKM: 'telkom.co.id', ASII: 'astra.co.id',
              GOTO: 'goto.com', UNVR: 'unilever.co.id', ICBP: 'icbpfood.com',
              INDF: 'indofood.com', PGAS: 'pertamina.com', AAPL: 'apple.com',
              MSFT: 'microsoft.com', TSLA: 'tesla.com', GOOGL: 'google.com',
              AMZN: 'amazon.com', META: 'meta.com', NVDA: 'nvidia.com',
            };
            const domain = domainMap[ticker];
            if (domain) {
              const clearbitUrl = `https://logo.clearbit.com/${domain}`;
              console.log(`🔄 [CandlestickChart] Setting Clearbit fallback for ${symbol}:`, clearbitUrl);
              setAssetLogoUrl(clearbitUrl);
              logoSet = true;
            } else {
              // Try IEX as last resort
              const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
              console.log(`🔄 [CandlestickChart] Setting IEX fallback for ${symbol}:`, iexUrl);
              setAssetLogoUrl(iexUrl);
              logoSet = true;
            }
          }
        }
        
        if (assetType === 'crypto') {
          // Also get name from CoinGecko meta
          const res = await fetch('/api/coingecko/meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'force-cache',
            body: JSON.stringify({ symbol }),
          });
          if (!res.ok) return;
          const json = await res.json();
          if (!json?.success) return;
          if (cancelled) return;
          setAssetDisplayName(json?.data?.name || symbol.toUpperCase());
          // Only set logo if not already set from logo API
          if (!logoSet && !cancelled) {
            const coinLogoUrl = json?.data?.image?.small || json?.data?.image?.thumb || json?.data?.image?.large;
            if (coinLogoUrl) {
              setAssetLogoUrl(coinLogoUrl);
            }
          }
          return;
        }

        // STOCK: Set display name and ensure logo is set
        const ticker = normalizedStockTicker;
        if (!ticker) {
          console.warn(`⚠️ [CandlestickChart] No ticker for ${symbol}`);
          return;
        }

        if (!cancelled) {
          setAssetDisplayName(ticker);
          // If logo not set from API, use direct URLs from browser
          if (!logoSet) {
            console.log(`📡 [CandlestickChart] Logo not set from API for ${symbol}, using direct browser URLs...`);
            // Try Clearbit (direct URL from browser)
            const domainMap: Record<string, string> = {
              BBCA: 'bca.co.id', BBRI: 'bri.co.id', BMRI: 'bankmandiri.co.id',
              BBNI: 'bni.co.id', TLKM: 'telkom.co.id', ASII: 'astra.co.id',
              GOTO: 'goto.com', UNVR: 'unilever.co.id', ICBP: 'icbpfood.com',
              INDF: 'indofood.com', PGAS: 'pertamina.com', AAPL: 'apple.com',
              MSFT: 'microsoft.com', TSLA: 'tesla.com', GOOGL: 'google.com',
              AMZN: 'amazon.com', META: 'meta.com', NVDA: 'nvidia.com',
            };
            const domain = domainMap[ticker];
            if (domain) {
              const clearbitUrl = `https://logo.clearbit.com/${domain}`;
              setAssetLogoUrl(clearbitUrl);
              console.log(`✅ [CandlestickChart] Clearbit logo URL set for ${symbol}:`, clearbitUrl);
            } else {
              // Try IEX as fallback
              const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
              setAssetLogoUrl(iexUrl);
              console.log(`✅ [CandlestickChart] IEX logo URL set for ${symbol}:`, iexUrl);
            }
          } else {
            console.log(`✅ [CandlestickChart] Logo already set for ${symbol} from API`);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch logo for ${symbol}:`, error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, assetType, normalizedStockTicker, logoUrlFromProps, companyNameFromProps]);

  // Initialize display price
  useEffect(() => {
    if (currentPrice !== undefined) {
      setDisplayPrice(currentPrice);
    }
  }, []);

  // Smooth price animation function
  const animatePrice = useCallback((from: number, to: number) => {
    const duration = 500; // 500ms animation
    const steps = 30;
    const stepValue = (to - from) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayPrice(to);
        clearInterval(interval);
      } else {
        // Ease out cubic for smooth animation
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        const easedValue = from + (stepValue * steps * eased);
        setDisplayPrice(easedValue);
      }
    }, duration / steps);
  }, []);

  // Use shared timeframe conversion function (imported from utils)

  // Load more historical data when user zooms out
  const loadMoreHistoricalData = useCallback(async (visibleFrom: number, visibleTo: number) => {
    if (!symbol || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      // Calculate how many days of data we need
      const dataSpan = (visibleTo - visibleFrom) / 86400; // Convert to days
      const requestedDays = Math.ceil(dataSpan * 1.5); // Add 50% buffer

      // Check current max loaded days
      const currentMax = maxLoadedDays;
      if (requestedDays <= currentMax) {
        setIsLoadingMore(false);
        return; // Already have enough data
      }

      console.log(`📊 Loading more historical data: ${requestedDays} days (current: ${currentMax})`);

      // Fetch more data
      const endpoint = assetType === 'crypto' ? '/api/coingecko/ohlc' : '/api/market';
      const payload: Record<string, any> = {
        symbol,
        days: requestedDays,
      };
      if (endpoint === '/api/market') {
        payload.type = assetType;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch additional market data');
      }

      const result = await response.json();
      if (result.success && result.data && result.data.data) {
        const newData = result.data.data || [];
        console.log(`✅ Loaded ${newData.length} additional data points`);
        
        // Update data (new data covers wider range, so replace)
        setCurrentData(newData);
        setMaxLoadedDays(requestedDays);
      }
    } catch (error) {
      console.error('Error loading more historical data:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [symbol, assetType, maxLoadedDays, isLoadingMore]);

  // Fetch market data - PASTIKAN fetch dipanggil setiap kali timeframe berubah
  const fetchMarketData = useCallback(async (tf?: string) => {
    if (!symbol) {
      console.log('⚠️ [FETCH] No symbol provided, skipping fetch');
      return;
    }

    const timeframe = tf || selectedTimeframe;
    const days = timeframeToDays(timeframe);
    
    console.log(`📡 [FETCH] Fetching NEW market data: ${symbol} (${assetType}), timeframe: ${timeframe}, days: ${days}`);
    console.log(`📡 [FETCH] This fetch is triggered by timeframe change or polling`);
    
    setIsLoading(true);
    setMaxLoadedDays(days); // Update max loaded days

    try {
      // IMPORTANT: Disable cache untuk memastikan data fresh setiap fetch
      // Tambahkan timestamp untuk force refresh dan prevent caching
      const endpoint = assetType === 'crypto' ? '/api/coingecko/ohlc' : '/api/market';
      const payload: Record<string, any> = {
        symbol,
        days,
        timeframe, // Include timeframe untuk tracking
        _t: Date.now(), // Timestamp untuk prevent caching
      };
      if (endpoint === '/api/market') {
        payload.type = assetType;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store', // Disable Next.js fetch cache
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [FETCH] API error response:', errorText);
        throw new Error(`Failed to fetch market data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const newPrice = result.data.currentPrice;
        const oldPrice = currentPriceState ?? currentPrice;
        
        // Detect price direction for animation
        if (oldPrice && newPrice) {
          if (newPrice > oldPrice) {
            setPriceChangeDirection('up');
            setTimeout(() => setPriceChangeDirection(null), 1000);
          } else if (newPrice < oldPrice) {
            setPriceChangeDirection('down');
            setTimeout(() => setPriceChangeDirection(null), 1000);
          }
        }
        
        // Update price with smooth transition
        if (newPrice !== undefined && oldPrice !== undefined && oldPrice !== newPrice) {
          animatePrice(oldPrice, newPrice);
        } else if (newPrice !== undefined) {
          setDisplayPrice(newPrice);
        }
        
        // Update data (will trigger chart update)
        const newData = result.data.data || [];
        console.log(`✅ Received ${newData.length} data points for timeframe ${timeframe}`);
        
        // If timeframe changed, reset the initial fit flag to allow fitContent again
        if (tf && tf !== selectedTimeframe) {
          hasInitialFitRef.current = false;
          console.log(`📊 [TIMEFRAME CHANGE] Resetting fitContent flag for new timeframe: ${tf}`);
        }
        
        setCurrentData(newData);
        setCurrentPriceState(newPrice);
        setChange24hState(result.data.change24h);
      } else {
        console.error('❌ [FETCH] API returned unsuccessful response:', result);
        throw new Error(result.message || 'Failed to fetch market data');
      }
    } catch (error: any) {
      console.error('❌ [FETCH] Error fetching market data:', error);
      // Show user-friendly error (optional - bisa ditambahkan toast notification)
      // For now, just log the error
    } finally {
      setIsLoading(false);
    }
  }, [symbol, assetType, selectedTimeframe, animatePrice, currentPriceState, currentPrice]); // CRITICAL: Include selectedTimeframe in dependencies

  // Initialize chart (only once when container is ready)
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) {
      return;
    }

    // Use requestAnimationFrame to ensure container is fully rendered
    const initChart = () => {
      if (!chartContainerRef.current || chartRef.current) {
        return;
      }

      const containerWidth = chartContainerRef.current.clientWidth || chartContainerRef.current.offsetWidth;
      
      if (containerWidth === 0) {
        // Retry on next frame
        requestAnimationFrame(initChart);
        return;
      }

      initializeChart(containerWidth);
    };

    // Start initialization
    requestAnimationFrame(initChart);
  }, []);

  // Function to initialize chart
  const initializeChart = (width: number) => {
    if (!chartContainerRef.current || chartRef.current) {
      return;
    }

    console.log('🎨 Creating chart instance, container width:', width);

    // Create chart with professional styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { 
          type: ColorType.Solid, 
          color: 'hsl(var(--card))' // Solid background
        },
        // Hide attribution logo (default true in lightweight-charts v5)
        attributionLogo: false,
        textColor: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
      width: width,
      height: 500,
      grid: {
        vertLines: {
          color: 'rgba(255, 255, 255, 0.06)', // Subtle grid
          style: 0, // Solid
          visible: true,
        },
        horzLines: {
          color: 'rgba(255, 255, 255, 0.06)', // Subtle grid
          style: 0, // Solid
          visible: true,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        textColor: 'rgba(255, 255, 255, 0.7)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        entireTextOnly: false,
        ticksVisible: true,
        autoScale: true,
        invertScale: false,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
        barSpacing: 5,
        minBarSpacing: 0.5,
        rightBarStaysOnScroll: false, // Allow smooth panning without sticking to right edge
        fixLeftEdge: false,
        fixRightEdge: false, // Allow scrolling to load more data
        lockVisibleTimeRangeOnResize: false,
        visible: true,
        allowBoldLabels: true,
      },
      handleScroll: {
        mouseWheel: true, // Enable mouse wheel zoom
        pressedMouseMove: true, // Enable drag to pan
        horzTouchDrag: true, // Enable horizontal touch drag
        vertTouchDrag: true, // Enable vertical touch drag
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true, // Enable time axis drag
          price: true, // Enable price axis drag
        },
        axisDoubleClickReset: {
          time: true, // Reset zoom on double click
          price: true,
        },
        mouseWheel: true, // Enable mouse wheel zoom
        pinch: true, // Enable pinch to zoom
      },
      crosshair: {
        mode: 1, // Normal mode - show crosshair on hover
        vertLine: {
          color: 'rgba(37, 99, 235, 0.7)', // Cyan highlight color saat hover (lebih terang)
          width: 2, // Slightly thicker untuk visibility
          style: 0, // Solid line
          labelBackgroundColor: 'rgba(37, 99, 235, 0.95)', // Cyan background untuk label
          labelVisible: true,
        },
        horzLine: {
          color: 'rgba(37, 99, 235, 0.7)', // Cyan highlight color saat hover (lebih terang)
          width: 2, // Slightly thicker untuk visibility
          style: 0, // Solid line
          labelBackgroundColor: 'rgba(37, 99, 235, 0.95)', // Cyan background untuk label
          labelVisible: true,
        },
      },
    });

    chartRef.current = chart;
    
    // Reset flags when chart is recreated
    hasInitialFitRef.current = false;
    isUserInteractingRef.current = false;
    
    // Enhanced hover effect dengan crosshair subscription
    // This will be set up after series is created, see chart update effect
    
    console.log('✅ Chart instance created');

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        if (newWidth > 0) {
          chartRef.current.applyOptions({
            width: newWidth,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
  };

  // Update chart data when currentData or chartType changes
  useEffect(() => {
    if (!chartRef.current) {
      console.log('⏳ Chart instance not ready yet');
      return;
    }
    
    if (!chartContainerRef.current) {
      console.log('⏳ Chart container not ready yet');
      return;
    }
    
    // Check container dimensions
    const containerWidth = chartContainerRef.current.clientWidth;
    const containerHeight = chartContainerRef.current.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) {
      console.log(`⏳ Chart container has no dimensions: ${containerWidth}x${containerHeight}`);
      return;
    }
    
    // Use initial data if currentData is empty
    const dataToRender = currentData.length > 0 ? currentData : data;
    
    console.log(`📊 Chart update effect triggered:`, {
      chartReady: !!chartRef.current,
      containerSize: `${containerWidth}x${containerHeight}`,
      currentDataLength: currentData.length,
      initialDataLength: data.length,
      dataToRenderLength: dataToRender.length,
      chartType
    });
    
    if (dataToRender.length === 0) {
      console.log('⚠️ No data to render - currentData:', currentData.length, 'initial data:', data.length);
      return;
    }

    const formattedData = dataToRender
      .filter((item) => {
        // Filter out invalid data
        return item && 
               item.time && 
               typeof item.open === 'number' && 
               typeof item.high === 'number' &&
               typeof item.low === 'number' && 
               typeof item.close === 'number' &&
               !isNaN(item.open) && !isNaN(item.high) && !isNaN(item.low) && !isNaN(item.close);
      })
      .map((item) => {
        // Handle both ISO string and timestamp number
        let timestamp: number;
        if (typeof item.time === 'string') {
          timestamp = new Date(item.time).getTime() / 1000;
        } else if (typeof item.time === 'number') {
          // If already in seconds, use as is; if in milliseconds, convert
          timestamp = item.time > 1e12 ? item.time / 1000 : item.time;
        } else {
          console.warn('⚠️ Invalid time format:', item.time);
          return null;
        }

        if (isNaN(timestamp) || timestamp <= 0) {
          console.warn('⚠️ Invalid timestamp:', item.time, timestamp);
          return null;
        }

        // Ensure all values are valid numbers
        const open = Number(item.open);
        const high = Number(item.high);
        const low = Number(item.low);
        const close = Number(item.close);

        // Validate OHLC data integrity (high >= low, high >= open/close, low <= open/close)
        if (high < low || high < Math.max(open, close) || low > Math.min(open, close)) {
          console.warn('⚠️ Invalid OHLC data:', { open, high, low, close });
          return null;
        }

        return {
          time: timestamp as any,
          open,
          high,
          low,
          close,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.time - b.time); // Ensure ascending order

    if (formattedData.length === 0) {
      console.log('⚠️ No valid formatted data to render');
      return;
    }

    console.log(`📊 Updating chart with ${formattedData.length} valid data points, type: ${chartType}`);
    console.log('📊 Formatted data (first 3):', formattedData.slice(0, 3));

    try {
      if (chartType === 'candlestick') {
        // Remove line series if exists
        if (lineSeriesRef.current) {
          console.log('🔄 Removing existing line series');
          chartRef.current.removeSeries(lineSeriesRef.current);
          lineSeriesRef.current = null;
        }
        // Add or update candlestick series
        if (!candlestickSeriesRef.current) {
          console.log('➕ Creating NEW candlestick series');
          // Candlestick colors: teal/green for up, red for down
          const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
            priceLineVisible: false,
            lastValueVisible: false,
          });
          candlestickSeriesRef.current = candlestickSeries;
          console.log('✅ Candlestick series created successfully');
        } else {
          console.log('♻️ Using existing candlestick series');
        }
        
        console.log(`📈 Setting candlestick data: ${formattedData.length} points`);
        // Use setData for full updates, but preserve user's current view (don't reset position)
        if (candlestickSeriesRef.current) {
          console.log('📤 Calling setData with', formattedData.length, 'points (preserving user view)');
          // setData will update the data but NOT reset the visible range
          // This allows user to continue panning/zooming without interruption
          candlestickSeriesRef.current.setData(formattedData);
          console.log('✅ setData completed');
        } else {
          console.error('❌ candlestickSeriesRef.current is null!');
        }
      } else {
        // Remove candlestick series if exists
        if (candlestickSeriesRef.current) {
          console.log('🔄 Removing existing candlestick series');
          chartRef.current.removeSeries(candlestickSeriesRef.current);
          candlestickSeriesRef.current = null;
        }
        // Add or update line series
        if (!lineSeriesRef.current) {
          console.log('➕ Creating NEW line series');
          // Line chart styling
          const lineSeries = chartRef.current.addSeries(LineSeries, {
            color: '#26a69a',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
          });
          lineSeriesRef.current = lineSeries;
          console.log('✅ Line series created successfully');
        } else {
          console.log('♻️ Using existing line series');
        }
        
        const lineData = formattedData.map((item) => ({
          time: item.time,
          value: item.close,
        }));
        console.log(`📈 Setting line data: ${lineData.length} points`);
        console.log('📊 Line data (first 3):', lineData.slice(0, 3));
        
        // Always use setData for initial load or full updates
        if (lineSeriesRef.current) {
          console.log('📤 Calling setData with', lineData.length, 'points');
          lineSeriesRef.current.setData(lineData);
          console.log('✅ setData completed');
        } else {
          console.error('❌ lineSeriesRef.current is null!');
        }
      }

      // IMPORTANT: Only fitContent on initial load, NOT on every data update
      // This prevents resetting chart position when user is panning/zooming
      if (!hasInitialFitRef.current && formattedData.length > 0) {
        console.log('🔄 Initial fitContent (first load only)');
        chartRef.current.timeScale().fitContent();
        hasInitialFitRef.current = true;
      } else {
        console.log('⏸️ Skipping fitContent (not initial load or user may be interacting)');
      }

      // Set up visible range change subscription for dynamic data loading (setup once)
      if (chartRef.current && symbol && !subscriptionRef.current) {
        const handleVisibleRangeChange = () => {
          // Mark that user is interacting
          isUserInteractingRef.current = true;
          
          // Clear previous debounce timer
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          // Debounce to avoid excessive calls during panning
          debounceTimerRef.current = setTimeout(() => {
            if (!chartRef.current || !symbol || currentData.length === 0) {
              isUserInteractingRef.current = false;
              return;
            }
            
            try {
              const visibleRange = chartRef.current.timeScale().getVisibleRange();
              if (!visibleRange) {
                isUserInteractingRef.current = false;
                return;
              }

              // Convert visible range to timestamps for comparison
              const visibleFrom = typeof visibleRange.from === 'number' 
                ? visibleRange.from 
                : new Date(visibleRange.from as string).getTime() / 1000;
              const visibleTo = typeof visibleRange.to === 'number'
                ? visibleRange.to
                : new Date(visibleRange.to as string).getTime() / 1000;

              const dataFrom = new Date(currentData[0].time).getTime() / 1000;
              const dataTo = new Date(currentData[currentData.length - 1].time).getTime() / 1000;

              // Check if user zoomed out beyond loaded data (left side) with larger buffer to avoid triggering during normal panning
              const needsMoreHistory = visibleFrom < dataFrom - (86400 * 7); // 7 day buffer to avoid triggering during panning

              if (needsMoreHistory && !isLoadingMore) {
                console.log('📊 User zoomed out - need to load more historical data');
                loadMoreHistoricalData(visibleFrom, visibleTo);
              }
            } catch (error) {
              console.error('Error in visible range change handler:', error);
            } finally {
              // Reset interaction flag after a delay to allow normal updates
              setTimeout(() => {
                isUserInteractingRef.current = false;
              }, 500);
            }
          }, 300); // Debounce 300ms - only check after user stops panning/zooming
        };

        subscriptionRef.current = handleVisibleRangeChange;
        chartRef.current.timeScale().subscribeVisibleTimeRangeChange(handleVisibleRangeChange);
        console.log('✅ Visible range change subscription set up for zoom detection');
      }
      
      // Apply price scale margins
      chartRef.current.priceScale('right').applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      });
      
      // Force resize to ensure chart renders properly
      if (chartContainerRef.current) {
        const containerWidth = chartContainerRef.current.clientWidth;
        const containerHeight = chartContainerRef.current.clientHeight;
        console.log(`📏 Resizing chart to ${containerWidth}x${containerHeight}`);
        chartRef.current.applyOptions({
          width: containerWidth,
          height: containerHeight,
        });
      }
      
      // Don't force fitContent on repaint if user might be panning
      // Let chart handle its own rendering smoothly
      
      console.log('✅ Chart updated successfully - data should now be visible');
    } catch (error) {
      console.error('❌ Error updating chart:', error);
    }
  }, [currentData, chartType, data, symbol, loadMoreHistoricalData, isLoadingMore]);

  // Real-time polling every 5 seconds + initial fetch (restarts when symbol/assetType/timeframe changes)
  // IMPORTANT: Effect ini akan re-run setiap kali selectedTimeframe berubah, memicu fetch data baru
  useEffect(() => {
    if (!symbol) {
      console.log('⚠️ [TIMEFRAME EFFECT] No symbol, skipping');
      return;
    }

    console.log(`📊 [TIMEFRAME EFFECT] Setting up data fetch for ${symbol} with timeframe ${selectedTimeframe}`);
    
    // Reset fitContent flag when timeframe changes
    hasInitialFitRef.current = false;
    
    // Immediate fetch dengan timeframe yang baru (ini akan trigger setiap kali timeframe berubah)
    fetchMarketData(selectedTimeframe); // Fetch data baru dengan timeframe baru

    // Set up polling untuk timeframe saat ini
    const interval = setInterval(() => {
      console.log(`🔄 [POLLING] Updating data for ${symbol} with timeframe ${selectedTimeframe}`);
      // Fetch dengan timeframe yang sama untuk real-time updates
      fetchMarketData(selectedTimeframe);
    }, 5000); // 5 seconds

    return () => {
      console.log(`🛑 [CLEANUP] Stopping polling for ${symbol} with timeframe ${selectedTimeframe}`);
      clearInterval(interval);
    };
  }, [symbol, assetType, selectedTimeframe, fetchMarketData]); // CRITICAL: Include fetchMarketData and selectedTimeframe

  const effectiveChange24h = change24hState ?? change24h;
  const effectiveCurrentPrice = currentPriceState ?? currentPrice;
  const isPositive = effectiveChange24h !== undefined && effectiveChange24h >= 0;
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';
  
  // Calculate absolute change
  const changeAbs = effectiveChange24h !== undefined && effectiveCurrentPrice !== undefined 
    ? Math.abs((effectiveCurrentPrice * effectiveChange24h) / 100)
    : undefined;

  // Calculate metrics from currentData if not provided
  const dataToUse = currentData.length > 0 ? currentData : data;
  const calculatedHigh = high !== undefined ? high : (dataToUse.length > 0 ? Math.max(...dataToUse.map(d => d.high)) : undefined);
  const calculatedLow = low !== undefined ? low : (dataToUse.length > 0 ? Math.min(...dataToUse.map(d => d.low)) : undefined);
  const calculatedOpen = open !== undefined ? open : (dataToUse.length > 0 ? dataToUse[0].open : undefined);
  const calculatedPrevClose = prevClose !== undefined ? prevClose : (dataToUse.length > 1 ? dataToUse[dataToUse.length - 2].close : undefined);
  const calculatedVolume = volume !== undefined ? volume : (dataToUse.reduce((sum, d) => sum + (d.volume || 0), 0));

  // Format timestamp
  const timestamp = new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  return (
    <Card className={cn("my-0 border-blue-500/20 shadow-xl max-w-4xl mx-auto bg-[hsl(var(--card))]")}>
      {/* Header Section */}
      <CardHeader className="pb-4 pt-6 px-6 border-b border-blue-500/10">
        <div className="flex items-start justify-between gap-6 mb-4">
          {/* Left: Asset Info */}
          <div className="flex items-center gap-3 flex-1">
            {/* Asset Icon/Logo */}
            <div className="w-10 h-10 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {assetLogoUrl ? (
                <img
                  key={`${symbol}-logo-${assetLogoUrl}`}
                  src={assetLogoUrl}
                  alt={`${assetDisplayName || symbol || title} logo`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  crossOrigin="anonymous"
                  onLoad={(e) => {
                    console.log(`✅ [CandlestickChart] Logo loaded successfully for ${symbol}:`, e.currentTarget.src);
                    // Ensure parent background is transparent when logo loads
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.style.backgroundColor = 'transparent';
                    }
                  }}
                  onError={(e) => {
                    console.warn(`⚠️ [CandlestickChart] Logo failed to load for ${symbol}, trying fallback...`, e.currentTarget.src);
                    const target = e.currentTarget;
                    const currentSrc = target.src;
                    
                    // Helper function to get domain for Clearbit
                    const getClearbitUrl = (ticker: string): string | null => {
                      const domainMap: Record<string, string> = {
                        BBCA: 'bca.co.id', BBRI: 'bri.co.id', BMRI: 'bankmandiri.co.id',
                        BBNI: 'bni.co.id', TLKM: 'telkom.co.id', ASII: 'astra.co.id',
                        GOTO: 'goto.com', UNVR: 'unilever.co.id', ICBP: 'icbpfood.com',
                        INDF: 'indofood.com', PGAS: 'pertamina.com', AAPL: 'apple.com',
                        MSFT: 'microsoft.com', TSLA: 'tesla.com', GOOGL: 'google.com',
                        AMZN: 'amazon.com', META: 'meta.com', NVDA: 'nvidia.com',
                      };
                      const domain = domainMap[ticker];
                      return domain ? `https://logo.clearbit.com/${domain}` : null;
                    };
                    
                    // Helper function to try Clearbit
                    const tryClearbit = () => {
                      const ticker = symbol.toUpperCase().replace('.JK', '');
                      const clearbitUrl = getClearbitUrl(ticker);
                      if (clearbitUrl) {
                        console.log(`🔄 [CandlestickChart] Trying Clearbit for ${symbol}:`, clearbitUrl);
                        target.src = clearbitUrl;
                        target.onerror = () => {
                          console.warn(`❌ [CandlestickChart] Clearbit also failed for ${symbol}`);
                          // Try IEX as last resort
                          const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
                          console.log(`🔄 [CandlestickChart] Trying IEX for ${symbol}:`, iexUrl);
                          target.src = iexUrl;
                          target.onerror = () => {
                            console.warn(`❌ [CandlestickChart] All logo sources failed for ${symbol}`);
                            setAssetLogoUrl(null);
                          };
                        };
                      } else {
                        // Try IEX as last resort
                        const ticker = symbol.toUpperCase().replace('.JK', '');
                        const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
                        console.log(`🔄 [CandlestickChart] Trying IEX for ${symbol}:`, iexUrl);
                        target.src = iexUrl;
                        target.onerror = () => {
                          console.warn(`❌ [CandlestickChart] All logo sources failed for ${symbol}`);
                          setAssetLogoUrl(null);
                        };
                      }
                    };
                    
                    // If current URL failed, try direct browser URLs
                    if (currentSrc.includes('/api/logo') || currentSrc.includes('logo.clearbit.com') || currentSrc.includes('iexcloud')) {
                      console.log(`🔄 [CandlestickChart] Current URL failed, trying alternative direct browser URLs for ${symbol}...`);
                      // Try Clearbit first (direct browser URL)
                      const ticker = symbol.toUpperCase().replace('.JK', '');
                      const clearbitUrl = getClearbitUrl(ticker);
                      if (clearbitUrl && clearbitUrl !== currentSrc) {
                        console.log(`🔄 [CandlestickChart] Trying Clearbit direct URL for ${symbol}:`, clearbitUrl);
                        target.src = clearbitUrl;
                        target.onerror = () => {
                          // Clearbit failed, try IEX
                          const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
                          if (iexUrl !== currentSrc && iexUrl !== clearbitUrl) {
                            console.log(`🔄 [CandlestickChart] Trying IEX direct URL for ${symbol}:`, iexUrl);
                            target.src = iexUrl;
                            target.onerror = () => {
                              console.warn(`❌ [CandlestickChart] All direct URLs failed for ${symbol}`);
                              // Last resort: try proxy
                              const proxyUrl = `/api/logo?symbol=${encodeURIComponent(symbol)}&type=stock`;
                              target.src = proxyUrl;
                              target.onerror = () => setAssetLogoUrl(null);
                            };
                          } else {
                            setAssetLogoUrl(null);
                          }
                        };
                      } else {
                        // Try IEX
                        const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
                        if (iexUrl !== currentSrc) {
                          console.log(`🔄 [CandlestickChart] Trying IEX direct URL for ${symbol}:`, iexUrl);
                          target.src = iexUrl;
                          target.onerror = () => {
                            // Try proxy as last resort
                            const proxyUrl = `/api/logo?symbol=${encodeURIComponent(symbol)}&type=stock`;
                            target.src = proxyUrl;
                            target.onerror = () => setAssetLogoUrl(null);
                          };
                        } else {
                          setAssetLogoUrl(null);
                        }
                      }
                    } else {
                      // Unknown URL failed, try Clearbit
                      tryClearbit();
                    }
                  }}
                />
              ) : (
                // Show first 2 letters of symbol as temporary placeholder while logo loads
                <span className="text-xs font-bold text-blue-400">
                  {symbol ? symbol.toUpperCase().substring(0, 2) : '??'}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-[hsl(var(--card-foreground))] mb-0.5">
                {symbol ? (assetType === 'crypto' ? `${symbol} USD` : isIndonesianStock ? `${symbol} IDR` : `${symbol}`) : title}
              </CardTitle>
              {symbol && (
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  {(assetDisplayName || symbol)}{assetType === 'crypto' ? ' USD' : isIndonesianStock ? ' IDR' : ''} · {assetType === 'crypto' ? 'CRYPTO' : isIndonesianStock ? 'IDX STOCK' : 'NYSE/NASDAQ'}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions (Follow, Alert, etc.) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                // TODO: Implement menu dropdown
                console.log('Menu clicked');
              }}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))] transition-colors cursor-pointer"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                setIsFollowing(!isFollowing);
                console.log('Follow toggled:', !isFollowing);
              }}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5 cursor-pointer rounded-md",
                isFollowing 
                  ? "text-blue-400 bg-blue-500/10" 
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))]"
              )}
            >
              <svg className={cn("w-4 h-4", isFollowing && "fill-blue-400")} fill={isFollowing ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>
            <button 
              onClick={() => {
                // TODO: Implement price alert modal
                console.log('Price alert clicked');
                alert(`Price alert untuk ${symbol || 'asset'} akan dikonfigurasi.`);
              }}
              className="px-3 py-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))] transition-colors flex items-center gap-1.5 cursor-pointer rounded-md hover:bg-[hsl(var(--secondary))]"
            >
              <Bell className="w-4 h-4" />
              <span>Price Alert</span>
            </button>
          </div>
        </div>

        {/* Price Display */}
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <div>
            {(currentPriceState !== undefined || currentPrice !== undefined) && (
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-[hsl(var(--card-foreground))] mb-1">
                  {formatPrice(currentPriceState ?? currentPrice ?? 0)}
                </div>
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}
            {(change24hState !== undefined || change24h !== undefined) && (
              <div className={cn("flex items-center gap-2 text-lg font-semibold", changeColor)}>
                {changeAbs !== undefined && (
                  <span>{isPositive ? '+' : '-'}{isIndonesianStock ? 'Rp' : '$'}{changeAbs.toLocaleString(isIndonesianStock ? 'id-ID' : 'en-US', { maximumFractionDigits: isIndonesianStock ? 0 : 2 })}</span>
                )}
                <span className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(change24hState ?? change24h ?? 0).toFixed(2)}% 1D
                </span>
              </div>
            )}
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {timestamp} {isLoading && '• Updating...'}
            </div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {getAvailableTimeframes().map((period) => {
            const isActive = selectedTimeframe === period;
            const isDisabled = isLoading || isLoadingMore;
            
            return (
              <button
                key={period}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  console.log(`🕐 [BUTTON CLICK] Timeframe button clicked: ${period}`, {
                    current: selectedTimeframe,
                    clicked: period,
                    isDisabled,
                    isActive,
                  });
                  
                  if (isDisabled) {
                    console.log(`⚠️ [BUTTON CLICK] Button disabled (loading: ${isLoading}, loadingMore: ${isLoadingMore})`);
                    return;
                  }
                  
                  if (selectedTimeframe === period) {
                    console.log(`ℹ️ [BUTTON CLICK] Timeframe ${period} already selected, no action needed`);
                    return;
                  }
                  
                  console.log(`✅ [BUTTON CLICK] Changing timeframe: ${selectedTimeframe} → ${period}`);
                  
                  // Set timeframe baru - ini akan trigger useEffect di atas untuk fetch data baru
                  setSelectedTimeframe(period);
                }}
                disabled={isDisabled}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                  isActive
                    ? "bg-[hsl(var(--secondary))] text-[hsl(var(--card-foreground))] font-semibold shadow-sm cursor-default"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))] hover:bg-[hsl(var(--secondary))] cursor-pointer",
                  isDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
                aria-label={`Select ${period} timeframe`}
                aria-pressed={isActive}
                type="button"
              >
                {period}
              </button>
            );
          })}
          <div className="flex-1" />
          {/* Chart Tools */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setChartType(chartType === 'candlestick' ? 'line' : 'candlestick');
              }}
              className={cn(
                "p-1.5 transition-colors cursor-pointer rounded hover:bg-[hsl(var(--secondary))]",
                chartType === 'line' 
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))]"
              )}
              aria-label="Toggle chart type"
              title={chartType === 'candlestick' ? 'Switch to Line Chart' : 'Switch to Candlestick Chart'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {chartType === 'candlestick' ? (
                  // Line chart icon - show when in candlestick mode (click to switch to line)
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                ) : (
                  // Candlestick icon - show when in line mode (click to switch to candlestick)
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                )}
              </svg>
            </button>
            <button 
              onClick={() => {
                // TODO: Implement measurement tool
                console.log('Measurement tool');
              }}
              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))] transition-colors cursor-pointer rounded hover:bg-[hsl(var(--secondary))]"
              aria-label="Measurement tool"
            >
              <Move className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                // TODO: Implement compare feature
                console.log('Compare feature');
              }}
              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))] transition-colors cursor-pointer rounded hover:bg-[hsl(var(--secondary))]"
              aria-label="Compare"
            >
              <GitCompare className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                // TODO: Implement screenshot/download
                console.log('Screenshot/download');
              }}
              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--card-foreground))] transition-colors cursor-pointer rounded hover:bg-[hsl(var(--secondary))]"
              aria-label="Screenshot"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      {/* Chart Area */}
      <CardContent className="px-6 pb-6 pt-6">
        <div className={cn(
          "relative w-full mb-6 transition-opacity duration-300",
          (isLoading || isLoadingMore) ? "opacity-70" : "opacity-100"
        )}>
          <div 
            ref={chartContainerRef}
            className="chart-container w-full"
            style={{
              height: '500px',
              minHeight: '500px',
              position: 'relative',
            }} 
          />
          {(isLoading || isLoadingMore) && (
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-black/10" />
          )}
        </div>
        
        {/* Market Metrics Table */}
        {(calculatedPrevClose !== undefined || calculatedOpen !== undefined || calculatedHigh !== undefined || calculatedLow !== undefined || calculatedVolume > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-blue-500/10">
            {calculatedPrevClose !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Prev Close</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${calculatedPrevClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {calculatedOpen !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Open</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${calculatedOpen.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {yearLow !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Year Low</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${yearLow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {calculatedVolume > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">24H Volume</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${(calculatedVolume / 1000000).toFixed(2)}M
                </div>
              </div>
            )}
            {calculatedLow !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Low</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${calculatedLow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {fundingRate !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Funding Rate</div>
                <div className={cn(
                  "text-base font-semibold",
                  fundingRate < 0 ? "text-red-400" : "text-[hsl(var(--card-foreground))]"
                )}>
                  {fundingRate > 0 ? '+' : ''}{fundingRate.toFixed(2)}%
                </div>
              </div>
            )}
            {calculatedHigh !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">High</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${calculatedHigh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {yearHigh !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Year High</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${yearHigh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {marketCap !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Market Cap</div>
                <div className="text-base font-semibold text-[hsl(var(--card-foreground))]">
                  ${(marketCap / 1000000000).toFixed(2)}B
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
