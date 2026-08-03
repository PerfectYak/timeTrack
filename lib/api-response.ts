import { NextResponse } from "next/server";
import { ValidationError } from "./validation";

const BUSINESS_ERRORS = new Set([
  "Nincs aktív munkamenet.", "A szünet indoklása kötelező.", "A nap már le van zárva.", "A nap nincs lezárva.",
  "Üres nap nem zárható le.", "A lezárt nap módosítás előtt újranyitandó.", "Már van aktív munkamenet.",
  "A munkamenet átfed egy másik munkamenettel.", "A befejezésnek a kezdés után kell lennie.", "A szünet nem található.",
  "A munkamenet nem található.", "A nap lezárási időpontja nem állapítható meg.", "A naphoz nem tartozik lezárt munkamenet.",
  "Nyitott munkamenet csak a mai naphoz tartozhat.", "Élő munkamenet csak a mai napon indítható.",
  "A nap le van zárva; előbb nyisd újra.", "Ismeretlen művelet.", "A munkamenet nem nyúlhat át másik napra.",
  "A kezdési és befejezési idő nem lehet a jövőben.",
]);

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Váratlan hiba történt.";
  const expected = error instanceof ValidationError || BUSINESS_ERRORS.has(message);
  return NextResponse.json({ error: expected ? message : "Váratlan hiba történt." }, { status: expected ? 400 : 500 });
}
