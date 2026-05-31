'use client';

import { ContourPlotProps } from '../types';

// The figure is created and updated imperatively by AlgoSimulation via Plotly.newPlot /
// Plotly.react on this div. This component is just the mount point.
export default function ContourPlot({ divRef }: ContourPlotProps) {
  return <div ref={divRef} className="w-full aspect-square" />;
}
