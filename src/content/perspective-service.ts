import { BiasSnapshot, PerspectiveIntervention, ProviderDiagnostics } from "./types";

export interface PerspectiveService {
  generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention>;
  getDiagnostics(): ProviderDiagnostics;
}
