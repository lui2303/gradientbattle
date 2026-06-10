import { objectiveFunction } from "@gradientbattle/core";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";

export function FunctionSelector({allowedFunctions, func, setFuncCallback}: {allowedFunctions: string[],func: objectiveFunction, setFuncCallback: (func: objectiveFunction) => void}) {
    return (
        <div className="border-2 p-4 border-b-amber-50">
            <select value={func.name} onChange={(option) => {
                setFuncCallback(functionFactory(option.target.value))
            }}>
                {allowedFunctions.map((func) => <option key={func} value={func}>{func}</option>)}
            </select>
        </div>
    )
}


// TODO: fix latex on different function select