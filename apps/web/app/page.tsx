'use client'

import { AlgoSimulation } from "./components/AlgoSimulation";

export default function Page() {

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto h-[500px] max-w-4xl">
        <AlgoSimulation>
        </AlgoSimulation>
      </div>
    </main>
  );
}