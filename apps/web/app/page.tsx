'use client'

import { AlgoSimulation } from "./components/AlgoSimulation";
import { LoadNotebookSidebar } from "./components/LoadNotebookSidebar";

export default function Page() {

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-none flex gap-4 p-4">
        <div className="flex-1 min-w-0">
          <AlgoSimulation>
          </AlgoSimulation>
        </div>
        <LoadNotebookSidebar></LoadNotebookSidebar>
      </div>
    </main>
  );
}