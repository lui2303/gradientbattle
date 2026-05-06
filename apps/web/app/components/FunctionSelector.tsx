import { objectiveFunction } from "@gradientbattle/core";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";
import { functionList } from "@gradientbattle/core/src/functions/function_registry";

export function FunctionSelector({func, setFuncCallback}: {func: objectiveFunction, setFuncCallback: (func: objectiveFunction) => void}) {
    return (
        <div className="border-2 p-4 border-b-amber-50">
            <select value={func.name} onChange={(option) => {
                setFuncCallback(functionFactory(option.target.value))
            }}>
                {functionList.map((func) => <option key={func} value={func}>{func}</option>)}
            </select>
        </div>
    )
}


// TODO: fix latex on different function select