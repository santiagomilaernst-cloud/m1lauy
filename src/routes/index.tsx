import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "m1la | Moda Online Contemporánea" },
      {
        name: "description",
        content:
          "Tienda de moda online m1la (@m1la.uy) - Colección minimalista de calzados, indumentaria, gorros y accesorios.",
      },
      { property: "og:title", content: "m1la | Moda Online Contemporánea" },
      {
        property: "og:description",
        content:
          "Tienda de moda online m1la (@m1la.uy) - Colección minimalista de calzados, indumentaria, gorros y accesorios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <iframe
        className="min-h-0 w-full flex-1 border-0"
        src="/tienda-m1la.html"
        title="Tienda online m1la"
        allow="clipboard-write"
      />
    </main>
  );
}
