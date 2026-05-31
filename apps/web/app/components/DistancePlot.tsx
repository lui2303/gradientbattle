'use client';

import { DistancePlotProps } from '../types';

// Rendered imperatively by AlgoSimulation (Plotly.newPlot / Plotly.react). Just the mount point.
export function DistancePlot({ divRef }: DistancePlotProps) {
  return <div ref={divRef} className="w-full aspect-square" />;
}
