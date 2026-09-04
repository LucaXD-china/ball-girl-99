import { createContext, useContext, type ReactNode } from "react";
import { tournamentCaptainRoutes, type TournamentCaptainId } from "../data/tournamentCaptain";

const TournamentCaptainContext = createContext<TournamentCaptainId>("saya");

export function TournamentCaptainProvider({ captainId, children }: { captainId: TournamentCaptainId; children: ReactNode }) {
  return <TournamentCaptainContext.Provider value={captainId}>{children}</TournamentCaptainContext.Provider>;
}

export function useTournamentCaptain() {
  const captainId = useContext(TournamentCaptainContext);
  return { captainId, route: tournamentCaptainRoutes[captainId] };
}
