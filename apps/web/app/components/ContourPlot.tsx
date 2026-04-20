'use client';

import { Point } from '@gradientbattle/core';
import dynamic from 'next/dynamic';
import type { Data, Layout, PlotlyHTMLElement } from 'plotly.js';
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
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

export default function ContourPlot({simulationEngineRef}: {simulationEngineRef: RefObject<SimulationEngine | null>}) {
  const graphRef = useRef<PlotlyHTMLElement | null>(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const x = [-2, -1, 0, 1, 2];
  const y = [-2, -1, 0, 1, 2];
  const z = y.map((yv) => x.map((xv) => xv * xv + yv * yv));


  const playAll = async () => {
    if (runningRef.current) {
      runningRef.current = false;
      setRunning(false);
      return
    }

    runningRef.current = true;
    setRunning(true);
    

    console.log(graphRef.current)
    console.log(simulationEngineRef.current)
    const gd = graphRef.current;
    if (!gd) return;
    if (!simulationEngineRef.current) return
    
    const Plotly = await loadPlotly();
    
    const engine: SimulationEngine = simulationEngineRef.current

    let currentSteps: Point[][] = [engine.optimizers.map(() => ({x: engine.startingPoint.x, y: engine.startingPoint.y}))]


    const optimizerTraces = engine.optimizers.map((opt, i) => ({
      x: [engine.startingPoint.x],
      y: [engine.startingPoint.y],
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: opt.name,
      line: { color: colors[i] },
    }));

    await Plotly.addTraces(gd, optimizerTraces);
    
    for (const step of engine) {
      if (runningRef.current !== true) return
      console.log(step)
      currentSteps = [...currentSteps, step]

      
      for (let i=0; i < step.length; i++) {
        await Plotly.restyle(
        gd,
        { 
          x: [currentSteps.map((p) => p[i].x)],
          y: [currentSteps.map((p) => p[i].y)],
        },
        [i+1]
      );

      }
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
        data={[{
          type: "contour",
          x,
          y,
          z,
          name: "Loss surface",
          colorbar: { tickfont: { color: "white" } },
        }]}
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
        <button onClick={playAll}>{running ? "Stop" : "Start"}</button>
      </div>
    </div>
  );
}
