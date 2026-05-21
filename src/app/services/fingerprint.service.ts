import { Injectable } from '@angular/core';
import FingerprintJS, { Agent } from '@fingerprintjs/fingerprintjs';

@Injectable({ providedIn: 'root' })
export class FingerprintService {
  private agentPromise: Promise<Agent> | null = null;

  async getFingerprint(): Promise<string> {
    if (!this.agentPromise) {
      this.agentPromise = FingerprintJS.load();
    }
    const agent = await this.agentPromise;
    const result = await agent.get();
    return result.visitorId;
  }
}
