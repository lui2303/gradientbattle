'use client';

import dynamic from 'next/dynamic';
import type { Layout } from 'plotly.js';
import { useMemo } from 'react';
import { ContourPlotProps } from '../types';


const loadPlotly = () => import('plotly.js-cartesian-dist-min').then((m) => m.default);

const Plot = dynamic(
  async () => {
    const [Plotly, { default: createPlotlyComponent }] = await Promise.all([
      loadPlotly(),
      import('react-plotly.js/factory'),
    ]);
    return { default: createPlotlyComponent(Plotly) };
  },
  { ssr: false }
);

export default function ContourPlot({objFunction, optimizerTraces}: ContourPlotProps) {
  
  const plotValues = useMemo(() => {
    const x = Array.from({ length: 101 }, (_, i) => i * 0.2 - 10)
    const y = Array.from({ length: 101 }, (_, i) => i * 0.2 - 10)

    const z = y.map((yv) => x.map((xv) => objFunction.objective({x: xv, y: yv})))
    
    return {x:x, y:y, z:z}
  }, [objFunction])

  const contourTrace = useMemo(() => {
    return {
      type: "contour" as const,
      x: plotValues["x"],
      y: plotValues["y"],
      z: plotValues["z"],
      name: "Loss surface",
      colorbar: { tickfont: { color: "white" } },
  }}, [plotValues])


  const layout: Partial<Layout> = {
    title: { text: `$${objFunction.latex}$`, font: { color: 'white' } },
    xaxis: { title: { text: 'x' }, color: 'white', range: [Math.min(...plotValues["x"]), Math.max(...plotValues["x"])], autorange: false },
    yaxis: { title: { text: 'y' }, color: 'white', range: [Math.min(...plotValues["y"]), Math.max(...plotValues["y"])], autorange: false },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true,
    showlegend: false,
    legend: { itemclick: false, itemdoubleclick: false },
  };

  return (
    <div className="w-full aspect-square">
      <Plot
        data={[contourTrace, ...optimizerTraces]}
        layout={layout}
        config={{ displayModeBar: false, typesetMath: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
