/** The retriever's breed and name (purely cosmetic). */
export type BreedId = 'yellowLab' | 'blackLab' | 'chocolateLab' | 'chessie' | 'springer' | 'golden';

export interface BreedDef {
  id: BreedId;
  name: string;
  /** Coat, darker shade (ears, back), and a lighter muzzle. */
  coat: number;
  shade: number;
  light: number;
  /** Springers have white patches. */
  patches?: boolean;
}

export const BREEDS: Record<BreedId, BreedDef> = {
  yellowLab: { id: 'yellowLab', name: 'Yellow Lab', coat: 0xd9b26a, shade: 0xb98f4a, light: 0xead2a0 },
  blackLab: { id: 'blackLab', name: 'Black Lab', coat: 0x2a2522, shade: 0x1a1614, light: 0x46403a },
  chocolateLab: { id: 'chocolateLab', name: 'Chocolate Lab', coat: 0x6b4430, shade: 0x4e3022, light: 0x8a5e44 },
  chessie: { id: 'chessie', name: 'Chesapeake Bay Retriever', coat: 0x9a7048, shade: 0x7a5434, light: 0xb88e64 },
  springer: { id: 'springer', name: 'Springer Spaniel', coat: 0xf2ebe0, shade: 0x5a3422, light: 0xfaf6f0, patches: true },
  golden: { id: 'golden', name: 'Golden Retriever', coat: 0xc98a3c, shade: 0xa86c28, light: 0xe0b070 },
};

export const BREED_ORDER = Object.keys(BREEDS) as BreedId[];
export const DOG_NAME_MAX = 14;
