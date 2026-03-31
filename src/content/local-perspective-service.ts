import { generatePerspectiveIntervention } from "./perspective-generator";
import { PerspectiveService } from "./perspective-service";
import { BiasSnapshot, PerspectiveIntervention } from "./types";

export class LocalPerspectiveService implements PerspectiveService {
  async generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention> {
    return generatePerspectiveIntervention(snapshot);
  }
}
