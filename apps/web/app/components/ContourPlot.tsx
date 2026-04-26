'use client';

import dynamic from 'next/dynamic';
import type { Layout, PlotData } from 'plotly.js';
import { RefObject, useMemo, useRef, useState } from 'react';
import {SimulationEngine} from '@gradientbattle/core/src/simulation_engine'
import { objectiveFunction } from '@gradientbattle/core';
import { Optimizer } from '../types';

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

export default function ContourPlot({simulationEngine, objFunction, optimizers}: {simulationEngine: SimulationEngine, objFunction: objectiveFunction, optimizers: Record<string, Optimizer>}) {
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  
  const plotValues = useMemo(() => {
    const x = Array.from({ length: 100 }, (_, i) => i * 0.25 - 10)
    const y = Array.from({ length: 100 }, (_, i) => i * 0.25 - 10 )

    const z = y.map((yv) => x.map((xv) => objFunction.objective({x: xv, y: yv})))
    
    return {x:x, y:y, z:z}
  }, [objFunction])

  
  const contourTrace = {
          type: "contour" as const,
          x: plotValues["x"],
          y: plotValues["y"],
          z: plotValues["z"],
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
      x: [opt.startingPoint.x],
      y: [opt.startingPoint.y],
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: opt.name,
      line: { color: optimizers[opt.id].color },
    }));

    setTraces(prev => [...prev.slice(0,1), ...optimizerTraces])
    
    for (const step of simulationEngine) {
      if (runningRef.current !== true) return

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
    xaxis: { title: { text: 'x' }, color: 'white', range: [Math.min(...plotValues["x"]), Math.max(...plotValues["x"])] },
    yaxis: { title: { text: 'y' }, color: 'white', range: [Math.min(...plotValues["y"]), Math.max(...plotValues["y"])] },
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
