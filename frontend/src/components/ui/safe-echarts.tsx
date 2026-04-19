"use client";

import * as React from "react";
import ReactECharts, { type EChartsOption } from "echarts-for-react";
import type { EChartsInstance } from "echarts-for-react";

interface SafeEChartsProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  /** Forwarded ECharts init opts (renderer, devicePixelRatio, …). */
  opts?: { renderer?: "canvas" | "svg"; devicePixelRatio?: number };
  /** Optional fallback rendered if ECharts throws at runtime. */
  fallback?: React.ReactNode;
  /**
   * ECharts event handlers, e.g. `{ click: (params) => ... }`. Forwarded
   * straight through to `react-echarts` so callers can wire up
   * heatmap / pie / bar drill-downs without bypassing the safe wrapper.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvents?: Record<string, (params: any) => void>;
}

interface SafeEChartsState {
  hasError: boolean;
}

/**
 * Wrapper around `react-echarts` that prevents the most common ECharts
 * animation crash:
 *
 *   `Cannot read properties of undefined (reading 'length')`
 *   from `zrender/animation/Animator.interpolate1DArray`
 *
 * Why this happens:
 * - ECharts merges new options into the existing chart instance and runs
 *   an interpolated animation between old and new values.
 * - When the new `series[].data` shape changes (length, axis, etc.) the
 *   animator can read `undefined` from the old array and crash inside
 *   zrender. The user-visible symptom is a Next.js error overlay even
 *   though the page is otherwise fine.
 *
 * The fix:
 * - `notMerge` — replace the option object instead of merging in-place,
 *   so zrender starts a fresh animation lifecycle.
 * - `lazyUpdate` — defer the redraw to the next animation frame so React
 *   doesn't try to update a chart that's still mid-transition.
 * - An error boundary around the chart catches anything that still slips
 *   through and renders a quiet fallback instead of crashing the whole
 *   page.
 */
export class SafeECharts extends React.Component<
  SafeEChartsProps,
  SafeEChartsState
> {
  state: SafeEChartsState = { hasError: false };

  // ECharts instance ref — used by the ResizeObserver to trigger
  // `instance.resize()` whenever the container changes width (e.g. the
  // mentions filter sidebar is toggled, the dashboard sidebar collapses,
  // the browser is resized).
  private chartInstance: EChartsInstance | null = null;
  private wrapperRef: HTMLDivElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static getDerivedStateFromError(): SafeEChartsState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[SafeECharts] caught render error:", error.message);
    }
  }

  componentDidMount() {
    this.attachResizeObserver();
  }

  componentDidUpdate(prevProps: SafeEChartsProps) {
    // If the option reference changes, attempt to recover from a previous
    // crash on the new data.
    if (this.state.hasError && prevProps.option !== this.props.option) {
      this.setState({ hasError: false });
    }
    // Re-attach if we were in fallback mode and the wrapper just mounted.
    if (!this.resizeObserver) {
      this.attachResizeObserver();
    }
  }

  componentWillUnmount() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private attachResizeObserver() {
    if (this.resizeObserver || !this.wrapperRef) return;
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => {
      // The chart instance may not be ready on the very first observe.
      if (this.chartInstance) {
        try {
          this.chartInstance.resize();
        } catch {
          // ignore — instance has been disposed already
        }
      }
    });
    this.resizeObserver.observe(this.wrapperRef);
  }

  private setWrapperRef = (el: HTMLDivElement | null) => {
    this.wrapperRef = el;
    if (el) this.attachResizeObserver();
  };

  private handleChartReady = (instance: EChartsInstance) => {
    this.chartInstance = instance;
  };

  render() {
    const { option, style, className, opts, fallback, onEvents } = this.props;

    if (this.state.hasError) {
      return (
        <div
          className={className}
          style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {fallback ?? (
            <span className="text-xs text-muted-foreground">
              Chart unavailable
            </span>
          )}
        </div>
      );
    }

    return (
      // The extra wrapper is what we observe; ECharts renders inside it
      // with width:100%/height:inherit so any container reflow becomes a
      // chart resize.
      <div
        ref={this.setWrapperRef}
        className={className}
        style={{ width: "100%", ...style }}
      >
        <ReactECharts
          option={option}
          style={{ width: "100%", height: "100%" }}
          opts={opts}
          notMerge
          lazyUpdate
          onEvents={onEvents}
          onChartReady={this.handleChartReady}
        />
      </div>
    );
  }
}
