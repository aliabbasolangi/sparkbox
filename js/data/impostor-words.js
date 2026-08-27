export const IMPOSTOR_GENRES = [
  {
    id: 'food',
    name: 'Food & Drink',
    words: [
      { word: 'Pizza', hint: 'Italian' },
      { word: 'Sushi', hint: 'Raw fish' },
      { word: 'Taco', hint: 'Mexican' },
      { word: 'Burger', hint: 'Fast food' },
      { word: 'Ramen', hint: 'Noodles' },
      { word: 'Coffee', hint: 'Morning' },
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    words: [
      { word: 'Penguin', hint: 'Antarctic' },
      { word: 'Elephant', hint: 'Trunk' },
      { word: 'Dolphin', hint: 'Ocean' },
      { word: 'Eagle', hint: 'Sky' },
      { word: 'Tiger', hint: 'Stripes' },
      { word: 'Octopus', hint: 'Eight' },
    ],
  },
  {
    id: 'places',
    name: 'Places',
    words: [
      { word: 'Beach', hint: 'Sand' },
      { word: 'Library', hint: 'Quiet' },
      { word: 'Hospital', hint: 'Doctors' },
      { word: 'Airport', hint: 'Flights' },
      { word: 'Museum', hint: 'Art' },
      { word: 'Stadium', hint: 'Sports' },
    ],
  },
  {
    id: 'movies',
    name: 'Movies',
    words: [
      { word: 'Titanic', hint: 'Ship' },
      { word: 'Frozen', hint: 'Ice' },
      { word: 'Jaws', hint: 'Shark' },
      { word: 'Shrek', hint: 'Ogre' },
      { word: 'Matrix', hint: 'Pills' },
      { word: 'Up', hint: 'Balloons' },
    ],
  },
  {
    id: 'jobs',
    name: 'Jobs',
    words: [
      { word: 'Chef', hint: 'Kitchen' },
      { word: 'Pilot', hint: 'Cockpit' },
      { word: 'Teacher', hint: 'Classroom' },
      { word: 'Doctor', hint: 'Patients' },
      { word: 'Firefighter', hint: 'Hoses' },
      { word: 'Artist', hint: 'Canvas' },
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    words: [
      { word: 'Soccer', hint: 'Goals' },
      { word: 'Tennis', hint: 'Racket' },
      { word: 'Boxing', hint: 'Gloves' },
      { word: 'Swimming', hint: 'Pool' },
      { word: 'Golf', hint: 'Holes' },
      { word: 'Cricket', hint: 'Wickets' },
    ],
  },
];

export function buildWordPool(selectedGenreIds) {
  const pool = [];
  for (const genre of IMPOSTOR_GENRES) {
    if (!selectedGenreIds.includes(genre.id)) continue;
    for (const entry of genre.words) {
      pool.push({ ...entry, genre: genre.name });
    }
  }
  return pool;
}
