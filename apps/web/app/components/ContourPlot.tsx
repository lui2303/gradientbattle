'use client';

import dynamic from 'next/dynamic';
import type { Data, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function ContourPlot() {
  const x = [-2, -1, 0, 1, 2];
  const y = [-2, -1, 0, 1, 2];

  const z = y.map((yv) =>
    x.map((xv) => xv * xv + yv * yv)
  );

  const data: Partial<Data>[] = [
    {
      type: 'contour',
      x,
      y,
      z,
      colorbar: {
        tickfont: {
        color: 'white'
    }
}
    },
  ];

  const layout: Partial<Layout> = {
    title: { text: '$f(x, y) = x^2 + y^2$', font: {color: "white" }},
    xaxis: { title: { text: 'x' }, color: 'white' },
    yaxis: { title: { text: 'y' }, color: 'white'},
    paper_bgcolor: 'rgba(0,0,0,0)',
    autosize: true

  };

  const config = {
    displayModeBar: false, 
    staticPlot: true,
    typesetMath: true,     
  };

  return <Plot data={data} layout={layout} config={config} useResizeHandler style={{ width: '100%', height: '100%' }}/>;
}