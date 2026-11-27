/**
 * Guest hunting parties: guests book hunts with a request. Fill it for a
 * payout; every few parties served adds a line in the guestbook (a lasting
 * coin bonus).
 */
export const GUESTS = {
  /** Lodge level when guests start booking. */
  fromLodge: 3,
  /** Bookings on the board at once. */
  slots: 3,
  /** In-game days a booking stays open (a day is ten real minutes). */
  lastsDays: 3,
  /** Seconds of the current hunting pace a request asks for (birds). */
  workSeconds: 300,
  /** Seconds of the current coin pace a filled request pays. */
  paySeconds: 180,
  /** Every N parties served adds this much to coins per bird. */
  bookEvery: 10,
  bookBonus: 0.03,
} as const;

export const GUEST_NAMES: readonly string[] = [
  'Doc Halvorsen', 'the Pruitt brothers', 'Aunt June', 'Judge Whitcomb', 'the Delacroix twins', 'Father Tom',
  'Captain Briggs', 'Miss Odette', 'the Lindqvist family', 'Old Man Tanner', 'Coach Ramirez', 'the Okafor sisters',
  'Professor Ames', 'Sheriff Doyle', 'the Bauers from Ohio', 'Uncle Rusty', 'Mrs. Pennington', 'a newspaper fellow',
];
