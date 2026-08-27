export const SCENE_PACKS = [
  {
    id: 'general',
    name: 'General',
    locations: [
      { name: 'Space Station', roles: ['Captain', 'Engineer', 'Scientist', 'Medic', 'Pilot', 'Tourist', 'Security Officer'] },
      { name: 'Casino', roles: ['Dealer', 'Bouncer', 'Bartender', 'High Roller', 'Magician', 'Pit Boss', 'Janitor'] },
      { name: 'Hospital', roles: ['Surgeon', 'Nurse', 'Patient', 'Intern', 'Anesthesiologist', 'Janitor', 'Visitor'] },
      { name: 'Submarine', roles: ['Captain', 'Sonar Operator', 'Cook', 'Engineer', 'Diver', 'Medic', 'Stowaway'] },
      { name: 'Film Set', roles: ['Director', 'Actor', 'Cameraman', 'Stunt Double', 'Makeup Artist', 'Producer', 'Extra'] },
      { name: 'Pirate Ship', roles: ['Captain', 'First Mate', 'Cook', 'Cannon Operator', 'Navigator', 'Prisoner', 'Parrot Trainer'] },
    ],
  },
  {
    id: 'general-2',
    name: 'General 2',
    locations: [
      { name: 'School', roles: ['Teacher', 'Principal', 'Student', 'Janitor', 'Lunch Lady', 'Substitute', 'Hall Monitor'] },
      { name: 'Bank', roles: ['Teller', 'Manager', 'Security Guard', 'Customer', 'Loan Officer', 'Vault Guard', 'Consultant'] },
      { name: 'Circus', roles: ['Ringmaster', 'Clown', 'Acrobat', 'Lion Tamer', 'Magician', 'Ticket Seller', 'Fire Eater'] },
      { name: 'Airport', roles: ['Pilot', 'Flight Attendant', 'Passenger', 'Security', 'Baggage Handler', 'Customs Officer', 'Shop Clerk'] },
      { name: 'Wedding', roles: ['Bride', 'Groom', 'Best Man', 'Maid of Honor', 'Photographer', 'DJ', 'Uninvited Guest'] },
      { name: 'Museum', roles: ['Curator', 'Security Guard', 'Tourist', 'Art Restorer', 'Guide', 'Thief', 'Student on Field Trip'] },
    ],
  },
  {
    id: 'harry-potter',
    name: 'Harry Potter',
    locations: [
      { name: 'Hogwarts Great Hall', roles: ['Harry Potter', 'Hermione Granger', 'Ron Weasley', 'Professor McGonagall', 'Draco Malfoy', 'Hagrid', 'Nearly Headless Nick'] },
      { name: 'Diagon Alley', roles: ['Shopkeeper', 'Ollivander', 'Gringotts Goblin', 'Student', 'Death Eater in Disguise', 'Muggle Tourist', 'Ministry Official'] },
      { name: 'Quidditch Pitch', roles: ['Seeker', 'Chaser', 'Beater', 'Keeper', 'Commentator', 'Referee', 'Fan in the Stands'] },
      { name: 'Ministry of Magic', roles: ['Auror', 'Desk Clerk', 'Prisoner', 'Politician', 'Journalist', 'House-Elf', 'Visitor'] },
      { name: 'Forbidden Forest', roles: ['Centaur', 'Acromantula', 'Unicorn Caretaker', 'Detention Student', 'Magical Creature', 'Lost First Year', 'Dark Wizard'] },
      { name: 'Platform 9¾', roles: ['Student', 'Parent', 'Trolley Witch', 'Ticket Inspector', 'Owl Handler', 'Late Runner', 'Death Eater Spy'] },
    ],
  },
  {
    id: 'star-wars',
    name: 'Star Wars',
    locations: [
      { name: 'Death Star', roles: ['Stormtrooper', 'Imperial Officer', 'Prisoner', 'Bounty Hunter', 'Engineer', 'Droid', 'Rebel Spy'] },
      { name: 'Cantina on Tatooine', roles: ['Bartender', 'Bounty Hunter', 'Smuggler', 'Moisture Farmer', 'Jawa Trader', 'Musician', 'Jedi in Hiding'] },
      { name: 'Jedi Temple', roles: ['Jedi Master', 'Padawan', 'Archivist', 'Temple Guard', 'Youngling', 'Senate Liaison', 'Sith Infiltrator'] },
      { name: 'Millennium Falcon', roles: ['Pilot', 'Co-Pilot', 'Mechanic', 'Passenger', 'Bounty on Board', 'Stowaway', 'Protocol Droid'] },
      { name: 'Cloud City', roles: ['Administrator', 'Guard', 'Gambler', 'Repair Tech', 'Refugee', 'Imperial Agent', 'Ugnaught Worker'] },
      { name: 'Rebel Base', roles: ['Commander', 'Pilot', 'Medic', 'Mechanic', 'Spy', 'Protocol Officer', 'Captured Imperial'] },
    ],
  },
  {
    id: 'countries',
    name: 'Countries',
    locations: [
      { name: 'Japan', roles: ['Tourist', 'Local Resident', 'Chef', 'Business Traveler', 'Tour Guide', 'Embassy Worker', 'Street Vendor'] },
      { name: 'Brazil', roles: ['Football Fan', 'Beach Vendor', 'Carnival Dancer', 'Tourist', 'Fisherman', 'Musician', 'Journalist'] },
      { name: 'Egypt', roles: ['Archaeologist', 'Tour Guide', 'Merchant', 'Tourist', 'Historian', 'Camel Driver', 'Security Guard'] },
      { name: 'France', roles: ['Chef', 'Artist', 'Tourist', 'Café Owner', 'Fashion Designer', 'Student', 'Street Musician'] },
      { name: 'India', roles: ['Market Seller', 'Tourist', 'Rickshaw Driver', 'Chef', 'Festival Goer', 'Tech Worker', 'Photographer'] },
      { name: 'United States', roles: ['Road Tripper', 'Food Truck Owner', 'Park Ranger', 'Tourist', 'Sports Fan', 'Musician', 'News Reporter'] },
    ],
  },
];

/** @deprecated use SCENE_PACKS — kept for any legacy imports */
export const LOCATIONS = SCENE_PACKS.flatMap(pack => pack.locations);

export function getPackById(id) {
  return SCENE_PACKS.find(p => p.id === id) ?? SCENE_PACKS[0];
}

export function getLocationsForPack(packId) {
  return getPackById(packId).locations;
}
