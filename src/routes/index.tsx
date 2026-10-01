import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { DiscountWheel } from "@/components/discount-wheel";
import { supabase } from "@/integrations/supabase/client";

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
  const shopFrame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    const send = (payload: Record<string, unknown>) => shopFrame.current?.contentWindow?.postMessage(payload, window.location.origin);
    const status = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) send({ type: "m1la-wheel-status", signedIn: false, prize: null });
        return;
      }
      const { data } = await supabase.from("discount_wheel_spins")
        .select("discount_percent, is_free_pair, redeemed_at").maybeSingle();
      if (active) send({ type: "m1la-wheel-status", signedIn: true, prize: data ?? null });
    };
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== shopFrame.current?.contentWindow) return;
      if (event.data?.type === "m1la-wheel-get-status") void status();
      if (event.data?.type !== "m1la-wheel-redeem") return;
      const orderId = event.data.orderId;
      if (typeof orderId !== "string" || !/^m1la-[a-f0-9-]{36}$/.test(orderId)) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        send({ type: "m1la-wheel-checkout", orderId, error: "Iniciá sesión en la ruleta para usar tu premio." });
        return;
      }
      const { data, error } = await supabase.rpc("redeem_discount_wheel", { p_order_id: orderId });
      if (error) {
        send({ type: "m1la-wheel-checkout", orderId, error: "No pudimos aplicar el premio. Probá de nuevo." });
        return;
      }
      const prize = data?.[0];
      if (!prize) {
        send({ type: "m1la-wheel-checkout", orderId, error: "Este premio ya se usó en otro pedido." });
        void status();
        return;
      }
      send({ type: "m1la-wheel-checkout", orderId, prize });
      void status();
    };
    window.addEventListener("message", onMessage);
    const { data: listener } = supabase.auth.onAuthStateChange(() => { window.setTimeout(() => void status(), 0); });
    return () => { active = false; window.removeEventListener("message", onMessage); listener.subscription.unsubscribe(); };
  }, []);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <DiscountWheel />
      <iframe
        ref={shopFrame}
        className="min-h-0 w-full flex-1 border-0"
        src="/tienda-m1la.html"
        title="Tienda online m1la"
        allow="clipboard-write"
      />
    </main>
  );
}
