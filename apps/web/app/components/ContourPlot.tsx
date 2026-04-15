'use client';

import { Point } from '@gradientbattle/core';
import dynamic from 'next/dynamic';
import type { Data, Layout, PlotlyHTMLElement } from 'plotly.js';
import { useMemo, useRef } from 'react';

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

export default function ContourPlot({
  startingPoint,
}: {
  startingPoint: Point;
}) {
  const graphRef = useRef<PlotlyHTMLElement | null>(null);

  const x = [-2, -1, 0, 1, 2];
  const y = [-2, -1, 0, 1, 2];
  const z = y.map((yv) => x.map((xv) => xv * xv + yv * yv));

  const steps = useMemo(
    () => [
      { x: startingPoint.x, y: startingPoint.y },
      { x: 1, y: 1 },
      { x: 1.5, y: 0 },
      { x: 0, y: 1 },
    ],
    [startingPoint]
  );

  // Plotly.restyle updates the existing SVG elements in place — no z-order changes,
  // no addFrames race condition, no redraw side-effects.
  const goToStep = async (i: number) => {
    const gd = graphRef.current;
    if (!gd || i < 0 || i >= steps.length) return;
    const Plotly = await loadPlotly();
    await Plotly.restyle(
      gd,
      {
        x: [steps.slice(0, i + 1).map((p) => p.x), [steps[i].x]],
        y: [steps.slice(0, i + 1).map((p) => p.y), [steps[i].y]],
      },
      [1, 2]
    );
  };

  const playAll = async () => {
    for (let i = 0; i < steps.length; i++) {
      await goToStep(i);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const data: Partial<Data>[] = [
    {
      type: 'contour',
      x,
      y,
      z,
      name: 'Loss surface',
      colorbar: { tickfont: { color: 'white' } },
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Path',
      x: [steps[0].x],
      y: [steps[0].y],
      line: { color: '#3b82f6', width: 3 },
      marker: { color: '#3b82f6', size: 8 },
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'Current point',
      x: [steps[0].x],
      y: [steps[0].y],
      marker: { color: '#f59e0b', size: 12 },
      showlegend: false,
    },
  ];

  const layout: Partial<Layout> = {
    title: { text: '$f(x, y) = x^2 + y^2$', font: { color: 'white' } },
    xaxis: { title: { text: 'x' }, color: 'white', range: [Math.min(...x), Math.max(...x)] },
    yaxis: { title: { text: 'y' }, color: 'white', range: [Math.min(...y), Math.max(...y)] },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true,
  };

  return (
    <div>
      <Plot
        data={data}
        layout={layout}
        config={{ displayModeBar: false, typesetMath: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        onInitialized={(_, gd) => {
          graphRef.current = gd as PlotlyHTMLElement;
        }}
        onUpdate={(_, gd) => {
          graphRef.current = gd as PlotlyHTMLElement;
        }}
      />

      <div className="flex gap-2 mt-2">
        <button onClick={() => goToStep(1)}>Step 1</button>
        <button onClick={() => goToStep(2)}>Step 2</button>
        <button onClick={() => goToStep(3)}>Step 3</button>
        <button onClick={playAll}>Play</button>
      </div>
    </div>
  );
}
