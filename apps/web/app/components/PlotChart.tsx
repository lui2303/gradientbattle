"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function PlotChart() {
  return (
    <Plot
      data={[
        {
          x: [1, 2, 3, 4],
          y: [10, 15, 13, 17],
          type: "scatter",
          mode: "lines+markers",
        },
      ]}
      layout={{
        title: { text: "Plotly Example" },
        xaxis: { title: { text: "X Axis" } },
        yaxis: { title: { text: "Y Axis" } },
      }}
    />
  );
}

