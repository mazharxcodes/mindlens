import { BiasSnapshot, PerspectiveIntervention } from "./types";

export interface PerspectiveService {
  generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention>;
}
