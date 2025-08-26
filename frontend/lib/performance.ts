/**
 * Performance monitoring utilities for ExpenseAI
 * Tracks page load times, component render performance, and user interactions
 */

// Performance metrics interface
interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

// Global performance store
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private isEnabled: boolean

  constructor() {
    // Only enable in production for real user monitoring
    // or in development if explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                    process.env.NEXT_PUBLIC_ENABLE_PERF_MONITORING === 'true'
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.setupObservers()
    }
  }

  private setupObservers() {
    // Monitor page load performance
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart)
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart)
            this.recordMetric('first_paint', navEntry.responseEnd - navEntry.fetchStart)
          }
        }
      })

      try {
        navigationObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navigationObserver)
      } catch (e) {
        // Silently handle unsupported entry types
      }

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) { // Only track slow resources (>1s)
            this.recordMetric('slow_resource_load', entry.duration, {
              name: entry.name,
              type: (entry as any).initiatorType
            })
          }
        }
      })

      try {
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.push(resourceObserver)
      } catch (e) {
        // Silently handle unsupported entry types
      }

      // Monitor layout shifts (CLS)
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            this.recordMetric('cumulative_layout_shift', (entry as any).value)
          }
        }
      })

      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(layoutShiftObserver)
      } catch (e) {
        // Silently handle unsupported entry types
      }
    }
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value}ms`, metadata)
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name)
  }

  /**
   * Get average value for a metric
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return 0
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0)
    return sum / metrics.length
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = []
  }

  /**
   * Send metrics to analytics service (placeholder)
   */
  async sendMetrics() {
    if (!this.isEnabled || this.metrics.length === 0) return

    try {
      // In a real application, you would send these to your analytics service
      // Example: await analyticsService.sendMetrics(this.metrics)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Sending performance metrics:', this.metrics)
      }

      // Clear metrics after sending
      this.clearMetrics()
    } catch (error) {
      console.error('Failed to send performance metrics:', error)
    }
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Hook to measure component render time
 */
export const usePerformanceTimer = (componentName: string) => {
  if (typeof window === 'undefined') return { startTimer: () => {}, endTimer: () => {} }

  let startTime: number

  const startTimer = () => {
    startTime = performance.now()
  }

  const endTimer = () => {
    if (startTime) {
      const duration = performance.now() - startTime
      performanceMonitor.recordMetric(`component_render_${componentName}`, duration)
    }
  }

  return { startTimer, endTimer }
}

/**
 * Measure function execution time
 */
export const measureExecutionTime = async <T>(
  name: string, 
  fn: () => Promise<T> | T
): Promise<T> => {
  const start = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - start
    performanceMonitor.recordMetric(`function_execution_${name}`, duration)
    return result
  } catch (error) {
    const duration = performance.now() - start
    performanceMonitor.recordMetric(`function_execution_${name}_error`, duration, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

/**
 * Track user interaction performance
 */
export const trackInteraction = (interactionName: string, metadata?: Record<string, any>) => {
  performanceMonitor.recordMetric(`user_interaction_${interactionName}`, performance.now(), metadata)
}

/**
 * Get Core Web Vitals
 */
export const getCoreWebVitals = () => {
  if (typeof window === 'undefined') return null

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

  return {
    // Largest Contentful Paint (LCP)
    lcp: performanceMonitor.getAverageMetric('largest_contentful_paint'),
    
    // First Input Delay (FID) - would need to be measured separately
    fid: performanceMonitor.getAverageMetric('first_input_delay'),
    
    // Cumulative Layout Shift (CLS)
    cls: performanceMonitor.getAverageMetric('cumulative_layout_shift'),
    
    // First Contentful Paint (FCP)
    fcp: navigation ? navigation.responseEnd - navigation.fetchStart : 0,
    
    // Time to Interactive (TTI)
    tti: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0
  }
}

/**
 * Performance monitoring React hook
 */
export const usePerformanceMonitoring = () => {
  const metrics = performanceMonitor.getMetrics()
  
  return {
    metrics,
    recordMetric: (name: string, value: number, metadata?: Record<string, any>) =>
      performanceMonitor.recordMetric(name, value, metadata),
    getAverageMetric: (name: string) => performanceMonitor.getAverageMetric(name),
    getCoreWebVitals,
    sendMetrics: () => performanceMonitor.sendMetrics()
  }
}

/**
 * Initialize performance monitoring
 */
export const initPerformanceMonitoring = () => {
  // Send metrics every 5 minutes
  if (typeof window !== 'undefined') {
    setInterval(() => {
      performanceMonitor.sendMetrics()
    }, 5 * 60 * 1000)

    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      performanceMonitor.sendMetrics()
    })

    // Cleanup on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        performanceMonitor.sendMetrics()
      }
    })
  }
}

export default performanceMonitor