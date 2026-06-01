export type KeyperPhoto = {
  id: string;
  name: string;
  url: string | null; // null => render a generated deco placeholder
  seed: number;
  createdAt: number;
};

const NAMES = [
  "Vivienne Gold",
  "Auguste Marlowe",
  "Cleo Beaumont",
  "Rex Ferro",
  "Odette Vance",
  "Sterling Cross",
  "Lux Devereaux",
  "Cassian Wilde",
  "Iris Castellane",
  "Dorian Ash",
  "Seraphine Locke",
  "Maximilian Roy",
  "Greta Lindqvist",
  "Ambrose Hale",
  "Josephine Crane",
  "Lucian Wren",
  "Margot Sinclair",
  "Theodore Knox",
  "Estelle Moreau",
  "Hugo Valentine",
];

/** Generated deco "portraits" so the gallery looks alive before any uploads. */
export const PLACEHOLDER_PHOTOS: KeyperPhoto[] = NAMES.map((name, i) => ({
  id: `placeholder-${i}`,
  name,
  url: null,
  seed: i + 1,
  createdAt: Date.now() - i * 1000 * 60 * 37,
}));
