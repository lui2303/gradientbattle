import ContourPlotter from "./components/ContourPlot";

export default function Page() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto h-[500px] max-w-4xl">
        <p>Hello</p>
        <ContourPlotter>
          
        </ContourPlotter>
      </div>
    </main>
  );
}