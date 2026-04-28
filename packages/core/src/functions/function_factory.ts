import { objectiveFunction } from "../types";
import { functionList } from "./function_registry";
import { quadraticFunction } from "./quadratic_function"
import { matyasFunction } from "./matyas_function"


export function functionFactory(functionName: string): objectiveFunction {
    switch(functionName) {
        case functionList[1]:
            return new matyasFunction();
    }
    return new quadraticFunction([[1,0], [0,1]], {x:0, y:0}, 0)
}