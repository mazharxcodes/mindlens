import { BiasSnapshot, PerspectiveIntervention, ProviderDiagnostics } from "../core/types";

export interface PerspectiveService {
  generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention>;
  getDiagnostics(): ProviderDiagnostics;
}
