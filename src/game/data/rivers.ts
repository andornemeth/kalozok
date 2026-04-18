/**
 * A Pannon-tenger alatti régi folyók nyomvonala. Ezek az "élő" áramlatok
 * a sekélyebb tengerben — a hajózóknak kitartóbb vonulatot jelentenek,
 * de a játékban inkább vizuális elemek (karakter + délvidéki hangulat).
 *
 * Koordináták a WORLD_W=1600, WORLD_H=1100 térképen. A pontok
 * polyline-ként egy folyó útját írják le.
 */

export interface River {
  id: string;
  name: string;
  color: number;
  points: { x: number; y: number }[];
  // A feliratot melyik pont körül helyezzük el (index)
  labelIndex: number;
}

export const RIVERS: readonly River[] = [
  {
    id: 'tisza',
    name: 'Tisza',
    color: 0x8bb5c6,
    points: [
      { x: 610, y: 30 },
      { x: 640, y: 110 },
      { x: 680, y: 200 },
      { x: 700, y: 270 },
      { x: 730, y: 320 },
      { x: 735, y: 370 },
      { x: 730, y: 420 },
      { x: 860, y: 470 },
      { x: 920, y: 490 },
    ],
    labelIndex: 3,
  },
  {
    id: 'duna',
    name: 'Duna',
    color: 0x8bb5c6,
    points: [
      { x: 0, y: 280 },
      { x: 130, y: 340 },
      { x: 240, y: 380 },
      { x: 400, y: 440 },
      { x: 560, y: 500 },
      { x: 700, y: 530 },
      { x: 780, y: 560 },
      { x: 820, y: 620 },
      { x: 840, y: 770 },
      { x: 860, y: 920 },
      { x: 920, y: 1000 },
      { x: 1280, y: 990 },
      { x: 1600, y: 970 },
    ],
    labelIndex: 3,
  },
  {
    id: 'szava',
    name: 'Száva',
    color: 0x8bb5c6,
    points: [
      { x: 0, y: 860 },
      { x: 180, y: 830 },
      { x: 380, y: 790 },
      { x: 560, y: 800 },
      { x: 720, y: 860 },
      { x: 850, y: 970 },
    ],
    labelIndex: 2,
  },
  {
    id: 'temes',
    name: 'Temes',
    color: 0x8bb5c6,
    points: [
      { x: 1600, y: 510 },
      { x: 1460, y: 470 },
      { x: 1300, y: 440 },
      { x: 1140, y: 500 },
      { x: 1010, y: 610 },
      { x: 950, y: 740 },
      { x: 920, y: 850 },
    ],
    labelIndex: 3,
  },
  {
    id: 'bega',
    name: 'Béga',
    color: 0x8bb5c6,
    points: [
      { x: 1600, y: 370 },
      { x: 1450, y: 380 },
      { x: 1260, y: 400 },
      { x: 1090, y: 410 },
      { x: 980, y: 470 },
      { x: 930, y: 490 },
    ],
    labelIndex: 3,
  },
];
