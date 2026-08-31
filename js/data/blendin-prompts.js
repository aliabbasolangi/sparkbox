export const ROUNDS_TO_PLAY = [5, 7, 10];
export const PICK_SECONDS = 25;
export const DISCUSS_SECONDS = 40;

export const BLEND_PROMPTS = [
  'Who would survive the longest on a deserted island?',
  'Who would you trust with a secret?',
  'Who is most likely to become famous?',
  'Who would stay calm in an emergency?',
  'Who would spend a million pounds the fastest?',
  'Who would start a fight at a wedding?',
  'Who would make the best boss?',
  'Who would survive a horror movie?',
  'Who is most likely to go viral overnight?',
  'Who would you want on your team in a pub quiz?',
  'Who would last the longest without their phone?',
  'Who gives the best advice?',
  'Who would get away with a crime?',
  'Who is most likely to show up early?',
  'Who would thrive at a silent retreat?',
  'Who would be the best at keeping a plant alive?',
  'Who would win a talent show?',
  'Who is the most organised person here?',
  'Who would you call at 3am?',
  'Who would do best in a cooking competition?',
  'Who would become mayor for a day?',
  'Who is most likely to get a tattoo tonight?',
  'Who would win an argument even if they were wrong?',
  'Who would be the main character in a film about this group?',
  'Who would survive office politics?',
  'Who is the most competitive?',
  'Who would be a surprisingly good detective?',
  'Who would you want next to you on a long flight?',
  'Who is most likely to start a group chat and immediately regret it?',
  'Who would handle a zombie outbreak the best?',
  'Who looks like they have their life together?',
  'Who would write the group’s autobiography?',
  'Who is most likely to become a conspiracy theorist?',
  'Who would be the best at a heist?',
  'Who would you leave in charge of the playlist?',
  'Who would last the longest in a staring contest?',
  'Who would make the best spy?',
  'Who is most likely to move abroad on a whim?',
  'Who would win a roast battle?',
  'Who would be the group’s emergency contact?',
  'Who would get kicked out of a museum?',
  'Who is banned from cooking?',
  'Who would livestream by accident?',
  'Who would ruin a surprise party?',
  'Who would you never let drive?',
  'Who would fall asleep first at a sleepover?',
  'Who would start a cult?',
  'Who would get lost in a supermarket?',
  'Who would win a hot-dog eating contest?',
  'Who would talk their way out of a parking ticket?',
  'Who would cry at an advert?',
  'Who would survive a week with no wifi?',
  'Who would be a terrible roommate?',
  'Who would send a voice note that’s eight minutes long?',
  'Who would forget their own birthday?',
  'Who would join a pyramid scheme?',
  'Who would win on a gameshow?',
  'Who would get adopted by a stray cat?',
  'Who would be late to their own funeral?',
  'Who would accidentally reply-all?',
];

export function pickTwoPrompts(used) {
  const pool = BLEND_PROMPTS.filter(p => !used.has(p));
  const src = pool.length >= 2 ? pool : BLEND_PROMPTS;
  const first = src[Math.floor(Math.random() * src.length)];
  const rest = src.filter(p => p !== first);
  const second = rest[Math.floor(Math.random() * rest.length)];
  return { crew: first, impostor: second };
}
