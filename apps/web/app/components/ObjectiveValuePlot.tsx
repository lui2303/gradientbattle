'use client';

import { ObjectiveValuePlotProps } from '../types';

// Rendered imperatively by AlgoSimulation (Plotly.newPlot / Plotly.react). Just the mount point.
export function ObjectiveValuePlot({ divRef }: ObjectiveValuePlotProps) {
  return <div ref={divRef} className="w-full aspect-square" />;
}
