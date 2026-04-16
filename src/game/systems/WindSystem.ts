export interface WindState {
  dir: number;
  strength: number;
}

export class WindSystem {
  private t = 0;
  state: WindState = { dir: Math.PI / 3, strength: 0.6 };

  update(dt: number): void {
    this.t += dt;
    this.state.dir = Math.PI / 3 + Math.sin(this.t * 0.00005) * 0.8 + Math.sin(this.t * 0.00013) * 0.3;
    this.state.strength = 0.55 + Math.sin(this.t * 0.00009) * 0.35;
  }

  speedFactor(shipHeading: number): number {
    const diff = Math.cos(shipHeading - this.state.dir);
    return 0.45 + Math.max(0, 0.55 * (0.5 + 0.5 * diff)) * this.state.strength * 1.2;
  }
}
