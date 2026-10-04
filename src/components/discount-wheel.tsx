import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight, Gift, LogIn, LogOut, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { playFunEnd, playSpinTicks, playWin } from "@/lib/wheel-sounds";

type WheelResult = {
  prize_code: string;
  discount_percent: number | null;
  is_free_pair: boolean;
  won_at: string;
  redeemed_at?: string | null;
  is_new?: boolean;
};

const segments = [
  "1%", "5%", "9%", "3%", "7%", "11%", "2%", "6%", "10%",
  "4%", "8%", "12%", "20%", "1%", "50%", "6%", "3%", "PAR GRATIS",
];

function nextRotation(current: number, landingAngle: number) {
  const currentMod = ((current % 360) + 360) % 360;
  const delta = (((360 - landingAngle - currentMod) % 360) + 360) % 360;
  return current + 1800 + delta;
}

function labelAt(rotation: number) {
  const angle = (((-rotation) % 360) + 360) % 360;
  return segments[Math.floor(angle / (360 / segments.length)) % segments.length] ?? "";
}

function resultLabel(result: WheelResult) {
  return result.is_free_pair ? "¡Ganaste un par gratis!" : `¡Ganaste ${result.discount_percent}% de descuento!`;
}

export function DiscountWheel() {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [result, setResult] = useState<WheelResult | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [funSpinning, setFunSpinning] = useState(false);
  const [funResult, setFunResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const openWheel = () => setOpen(true);
    window.addEventListener("m1la-wheel-open", openWheel);
    return () => window.removeEventListener("m1la-wheel-open", openWheel);
  }, []);

  const segmentStep = 360 / segments.length;
  const wheelLabels = useMemo(
    () => segments.map((label, index) => ({ label, angle: index * segmentStep + segmentStep / 2 })),
    [segmentStep],
  );

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUserEmail(data.user?.email ?? null);
      if (data.user) await loadExistingResult();
    };
    void loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUserEmail(session?.user.email ?? null);
      if (session?.user) void loadExistingResult();
      else setResult(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadExistingResult() {
    const { data } = await supabase
      .from("discount_wheel_spins")
      .select("prize_code, discount_percent, is_free_pair, won_at, redeemed_at")
      .maybeSingle();
    if (data) setResult(data);
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage("Revisá tu correo para confirmar la cuenta y luego iniciá sesión.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("No pudimos iniciar sesión. Revisá el correo y la contraseña.");
    }
    setBusy(false);
  }

  async function handleGoogle() {
    setBusy(true);
    setMessage("");
    const response = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (response.error) setMessage("No pudimos iniciar sesión con Google.");
    setBusy(false);
  }

  async function handleSpin() {
    if (!userEmail || spinning || result) return;
    setSpinning(true);
    setMessage("");
    const { data, error } = await supabase.rpc("spin_discount_wheel");
    const won = data?.[0] as WheelResult | undefined;
    if (error || !won) {
      setMessage("No pudimos realizar el giro. Probá nuevamente.");
      setSpinning(false);
      return;
    }

    const target = won.is_free_pair ? "PAR GRATIS" : `${won.discount_percent}%`;
    const targetIndex = segments.indexOf(target);
    const landingAngle = targetIndex >= 0 ? targetIndex * segmentStep + segmentStep / 2 : 0;
    const nextRot = nextRotation(rotation, landingAngle);
    playSpinTicks(nextRot - rotation, 4200, segmentStep);
    setRotation(nextRot);
    window.setTimeout(() => {
      setResult(won);
      setSpinning(false);
      playWin(won.is_free_pair || (won.discount_percent ?? 0) >= 20);
    }, 4300);
  }

  function handleFunSpin() {
    if (funSpinning || spinning) return;
    setFunSpinning(true);
    setFunResult(null);
    const pick = segments[Math.floor(Math.random() * segments.length)] ?? "5%";
    const pickIndex = segments.indexOf(pick);
    const landingAngle = pickIndex >= 0 ? pickIndex * segmentStep + segmentStep / 2 : 0;
    const nextRot = nextRotation(rotation, landingAngle);
    playSpinTicks(nextRot - rotation, 4200, segmentStep);
    setRotation(nextRot);
    window.setTimeout(() => {
      setFunSpinning(false);
      playFunEnd();
      setFunResult(
        pick === "PAR GRATIS"
          ? "¡Casi un par gratis!… pero esta tirada era solo por diversión."
          : `${pick} — ¡Buen ojo! Esta tirada no cuenta como premio.`,
      );
    }, 4300);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setResult(null);
  }

  function handleBrowsePairs() {
    setOpen(false);
    window.setTimeout(() => {
      document.querySelector<HTMLIFrameElement>('iframe[title="Tienda online m1la"]')
        ?.contentDocument?.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  return (
    <>
      {open ? (
        <div className="wheel-overlay" role="dialog" aria-modal="true" aria-labelledby="wheel-title">
          <div className="wheel-panel">
            <Button className="wheel-close" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar ruleta">
              <X />
            </Button>
            <div className="wheel-copy">
              <span className="wheel-kicker"><Gift /> PREMIO DE BIENVENIDA</span>
              <h2 id="wheel-title">Ruleta de descuentos</h2>
              <p>Un giro por persona. Tu premio queda guardado en tu cuenta.</p>
            </div>

            <div className="wheel-layout">
              <div className="wheel-readout-stage">
              <div className="wheel-readout" role="status" aria-live="polite">
                <small>La flecha marca</small>
                <span>{spinning || funSpinning ? "…" : labelAt(rotation)}</span>
              </div>
              <div className="wheel-stage">
                <div className="wheel-pointer" aria-hidden="true" />
                <div
                  className={`wheel-disc${spinning ? " is-spinning" : ""}`}
                  style={{ transform: `rotate(${rotation}deg)` }}
                  aria-label="Ruleta con descuentos del 1 al 50 por ciento y un par gratis"
                >
                  {wheelLabels.map(({ label, angle }, index) => (
                    <span
                      className={label === "PAR GRATIS" ? "wheel-label wheel-jackpot" : "wheel-label"}
                      style={{ "--wheel-angle": `${angle}deg` } as CSSProperties}
                      key={`${label}-${index}`}
                    >
                      {label}
                    </span>
                  ))}
                  <div className="wheel-hub">m1la</div>
                </div>
              </div>
              </div>

              <div className="wheel-actions">
                {!userEmail ? (
                  <>
                    <div className="wheel-auth-heading"><LogIn /> Inici&aacute; sesi&oacute;n para girar</div>
                    <form onSubmit={handleEmailAuth} className="wheel-auth-form">
                      <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Tu correo" autoComplete="email" />
                      <Input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" autoComplete={authMode === "login" ? "current-password" : "new-password"} />
                      <Button type="submit" disabled={busy} className="w-full">
                        {busy ? "Esperá…" : authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
                      </Button>
                    </form>
                    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={handleGoogle}>
                      Continuar con Google
                    </Button>
                    <button className="wheel-mode" type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setMessage(""); }}>
                      {authMode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Iniciá sesión"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="wheel-account">
                      <span>Conectado como <strong>{userEmail}</strong></span>
                      <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Cerrar sesión"><LogOut /></Button>
                    </div>
                    {result ? (
                      <div className={result.is_free_pair ? "wheel-result wheel-result-jackpot" : "wheel-result"}>
                        <Sparkles />
                        <strong>{resultLabel(result)}</strong>
                        <span>{result.redeemed_at ? "Este premio ya se usó en una compra." : "Disponible para usar una sola vez en el carrito."}</span>
                        <Button type="button" className="wheel-browse-button" onClick={handleBrowsePairs}>
                          Elegir pares <ArrowRight aria-hidden="true" />
                        </Button>
                      </div>
                    ) : (
                      <Button className="wheel-spin-button" onClick={handleSpin} disabled={spinning}>
                        {spinning ? "Girando…" : "Girar ahora"}
                      </Button>
                    )}
                  </>
                )}
                {message ? <p className="wheel-message" role="status">{message}</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}