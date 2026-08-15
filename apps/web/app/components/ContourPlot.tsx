'use client';

import { PlotMountProps } from '../types';

// The figure is created and updated imperatively by Simulation via Plotly.newPlot /
// Plotly.react on this div. This component is just the mount point.
export default function ContourPlot({ divRef }: PlotMountProps) {
  return <div ref={divRef} className="w-full aspect-square" />;
}
