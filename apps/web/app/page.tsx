'use client'

import { SessionProvider } from "next-auth/react";
import { Simulation } from "./components/Simulation";
import { FreeForAllSimulationMode } from "@/lib/simulationMode";

export default function Page() {
    return (
      <SessionProvider>
        <Simulation mode={FreeForAllSimulationMode}></Simulation>
      </SessionProvider>
    );
}
