'use client';

import { PlotMountProps } from '../types';

// Rendered imperatively by Simulation (Plotly.newPlot / Plotly.react). Just the mount point.
export function DistancePlot({ divRef }: PlotMountProps) {
  return <div ref={divRef} className="w-full aspect-square" />;
}
