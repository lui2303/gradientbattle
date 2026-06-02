import type { objectiveFunction, Point } from "../types";
import { functionList } from "./function_registry";

export class matyasFunction implements objectiveFunction {
    name = functionList[1]
    latex: string = "f(x, y) = 0.26(x^2 + y^2) - 0.48xy"

    objective(point: Point): number {
        return 0.26*(point.x*point.x + point.y*point.y) - 0.48*point.x*point.y
    }
    
    gradient(point: Point): Point {
        return {
            x: 0.52*point.x - 0.48*point.y,
            y: 0.52*point.y - 0.48*point.x
        }
    }
}

