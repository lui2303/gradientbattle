'use client';

import dynamic from 'next/dynamic';
import type { Layout } from 'plotly.js';
import { useMemo, useState } from 'react';
import { ContourPlotProps } from '../types';
import { norm } from '@gradientbattle/core/src/math_helper';


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

export default function ContourPlot({simulationEngine, objFunction, optimizers,running,setRunning,runningRef, optimizerTraces, setOptimizerTraces}: ContourPlotProps) {
  const [animationSpeed, setAnimationSpeed] = useState(50)
  
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

  const playAll = async () => {
    
    if (runningRef.current) {
      runningRef.current = false;
      setRunning(false);
      return
    }

    if (simulationEngine.optimizers.length === 0) return
    
    simulationEngine.reset_optimizers()

    runningRef.current = true;
    setRunning(true);

    setOptimizerTraces(prev => prev.map((item) => ({...item, x: [(item.x! as number[])[0]], y: [(item.y! as number[])[0]], distances: [item.distances[0]], objectiveValues: [item.objectiveValues[0]]})))

    for (const step of simulationEngine) {
      if (runningRef.current !== true) return

      setOptimizerTraces(prev =>
        prev.map((trace, index) => ({
                ...trace,
                x: [...((trace.x as number[])), step[index].x],
                y: [...((trace.y as number[])), step[index].y],
                distances: [...trace.distances, norm(step[index])],
                objectiveValues: [...trace.objectiveValues,objFunction.objective(step[index])]
              })
        )
      );

      await new Promise((r) => setTimeout(r, animationSpeed));
    }

    runningRef.current = false;
    setRunning(false);

  };

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

      <div className="flex flex-col gap-2 mt-2">
        <button className="bg-cyan-800" onClick={playAll}>{running ? "Stop" : "Start"}</button>
        <br />
        <label>Animation Speed: { animationSpeed } ms</label>
        <input
          type="range"
          min="50"
          max="2000"
          value={animationSpeed}
          onChange={(e) => setAnimationSpeed(Number(e.target.value))}

        />
      </div>


    </div>
  );
}

// TODO: move most of state into parent and decouple leaderboard
