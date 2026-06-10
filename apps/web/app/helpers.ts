import { norm } from "@gradientbattle/core/src/math_helper";
import { treshhold } from "./constants";
import { Point } from "@gradientbattle/core";

export function distanceSatisfiesTreshhold(distance: number) {
    return distance < treshhold ? true : false
}

export function pointStatisfiesTreshhold(point: Point) {
    return distanceSatisfiesTreshhold(norm(point))
}

