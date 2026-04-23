'use client';

import dynamic from 'next/dynamic';
import type { Layout, PlotData } from 'plotly.js';
import { RefObject, useRef, useState } from 'react';
import {SimulationEngine} from '@gradientbattle/core/src/simulation_engine'

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

const colors = ["#0bf565", "#f50be5", "#def50b"]

export default function ContourPlot({simulationEngine}: {simulationEngine: SimulationEngine}) {
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  
  const x = [-2, -1, 0, 1, 2];
  const y = [-2, -1, 0, 1, 2];
  const z = y.map((yv) => x.map((xv) => xv * xv + yv * yv));

  const contourTrace = {
          type: "contour" as const,
          x,
          y,
          z,
          name: "Loss surface",
          colorbar: { tickfont: { color: "white" } },
        }
  const [traces, setTraces] = useState<Partial<PlotData>[]>([contourTrace])

  const playAll = async () => {
    
    if (runningRef.current) {
      runningRef.current = false;
      setRunning(false);
      return
    }

    runningRef.current = true;
    setRunning(true);


    const optimizerTraces = simulationEngine.optimizers.map((opt, i) => ({
      x: [simulationEngine.startingPoint.x],
      y: [simulationEngine.startingPoint.y],
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: opt.name,
      line: { color: colors[i] },
    }));

    setTraces(prev => [...prev.slice(0,1), ...optimizerTraces])
    
    for (const step of simulationEngine) {
      if (runningRef.current !== true) return

      console.log(step)

      setTraces(prev =>
        prev.map((trace, index) =>
          index === 0 || !trace
            ? trace
            : {
                ...trace,
                x: [...((trace.x as number[] | undefined) ?? []), step[index - 1].x],
                y: [...((trace.y as number[] | undefined) ?? []), step[index - 1].y]
              }
        )
      );

      await new Promise((r) => setTimeout(r, 300));
    }

    runningRef.current = false;
    setRunning(false);

  };

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
        data={traces}
        layout={layout}
        config={{ displayModeBar: false, typesetMath: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />

      <div className="flex gap-2 mt-2">
        <button onClick={playAll}>{running ? "Stop" : "Start"}</button>
      </div>
    </div>
  );
}
