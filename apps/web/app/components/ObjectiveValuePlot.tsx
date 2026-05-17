import { ObjectiveValuePlotProps } from "../types";
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


export function ObjectiveValuePlot({optimizerTraces, setOptimizerTraces}: ObjectiveValuePlotProps) {

    const layout: Partial<Layout> = {
        xaxis: { title: { text: 'steps' }, color: 'white', autorange: true },
        yaxis: { title: { text: 'f(x)' }, color: 'white', autorange: true },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,
        showlegend: false,
        legend: { itemclick: false, itemdoubleclick: false },
    }

    return (
        <div className="w-full aspect-square">
            <Plot
                data={optimizerTraces.map((trace) => ({
                    ...trace,
                    x: Array.from({ length: trace.x!.length }, (_, i) => i + 1),
                    y: trace.objectiveValues
                }))}
                layout={layout}
                config={{ displayModeBar: false, typesetMath: true }}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
                onHover={(event) => {
                    const id = event.points[0].data.name
                    setOptimizerTraces(prev => {
                        return prev.map((v) => (v.name == id ? v : {...v, opacity: 0.4}))
                    })
                }}

                onUnhover={(e) => {
                    setOptimizerTraces(prev => {
                        return prev.map((v) => ({...v, opacity: 1}))
                    })
                }}
            />
        </div>
    )
}