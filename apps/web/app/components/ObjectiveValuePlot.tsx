import { DistancePlotProps } from "../types";
import { Layout } from "plotly.js";
import dynamic from "next/dynamic";



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


export function ObjectiveValuePlot({optimizerTraces}: ObjectiveValuePlotProps) {

    const layout: Partial<Layout> = {
        xaxis: { title: { text: 'step t' }, color: 'white', autorange: true },
        yaxis: { title: { text: 'Norm(x)' }, color: 'white', autorange: true },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,
    };

    return (
        <div>
            <Plot
                data={optimizerTraces.map((trace) => ({
                    ...trace,
                    x: Array.from({ length: trace.x!.length }, (_, i) => i + 1),
                    y: trace.distances
                }))}
                layout={layout}
                config={{ displayModeBar: false, typesetMath: true }}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    )
}


//data={[optimizerTraces.map((trace) => ({
//                    ...trace,
//                    x: Array.from({ length: n }, (_, i) => i + 1),
//                    y: trace.distances
//                }))]}