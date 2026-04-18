export interface WindState {
  /** Szél IRÁNYA radiánban — ahonnan FÚJ a szél (oceanographic convention). */
  dir: number;
  /** Erősség 0..1. */
  strength: number;
}

/**
 * Egyszerű ambient szél-modell: két átlapolódó alacsony frekvenciás szinusz adja a
 * lassan kanyarodó passzátszelet. A `speedFactor` 0..1.4 között skálázza a hajó
 * sebességét annak függvényében, mennyire hátszélben halad.
 */
export class WindSystem {
  private t = 0;
  state: WindState = { dir: Math.PI / 6, strength: 0.65 };

  update(dt: number): void {
    this.t += dt;
    this.state.dir = Math.PI / 6 + Math.sin(this.t * 0.00004) * 0.7 + Math.sin(this.t * 0.00012) * 0.25;
    this.state.strength = 0.55 + Math.sin(this.t * 0.00008) * 0.35;
  }

  /**
   * 0.45 (szembeszél) — 1.4 (hátszél) közötti sebesség-szorzó.
   */
  speedFactor(shipHeading: number): number {
    // A szél innen FÚJ → a hajóra ható komponens cos(heading - (dir+pi))
    const blowDir = this.state.dir + Math.PI;
    const aligned = Math.cos(shipHeading - blowDir); // -1..1
    return 0.55 + 0.55 * (0.5 + 0.5 * aligned) * (0.6 + 0.8 * this.state.strength);
  }
}
