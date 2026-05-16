'use client'

import { AlgoSimulation } from "./components/AlgoSimulation";

export default function Page() {

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-none">
        <AlgoSimulation>
        </AlgoSimulation>
      </div>
    </main>
  );
}