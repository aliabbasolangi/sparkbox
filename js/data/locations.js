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
      { name: 'Hotel', roles: ['Concierge', 'Bellhop', 'Guest', 'Housekeeper', 'Chef', 'Manager', 'Room Service'] },
      { name: 'Zoo', roles: ['Zookeeper', 'Veterinarian', 'Tourist', 'Gift Shop Clerk', 'Tour Guide', 'Janitor', 'Kid on a Field Trip'] },
      { name: 'Police Station', roles: ['Detective', 'Desk Sergeant', 'Suspect', 'Lawyer', 'Forensics Tech', 'Captain', 'Informant'] },
      { name: 'Restaurant Kitchen', roles: ['Head Chef', 'Sous Chef', 'Waiter', 'Dishwasher', 'Food Critic', 'Health Inspector', 'Host'] },
      { name: 'Beach Resort', roles: ['Lifeguard', 'Tourist', 'Bartender', 'Surf Instructor', 'Hotel Staff', 'Street Vendor', 'Photographer'] },
      { name: 'Theater', roles: ['Lead Actor', 'Director', 'Stagehand', 'Usher', 'Costume Designer', 'Critic', 'Understudy'] },
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
      { name: 'Cruise Ship', roles: ['Captain', 'Passenger', 'Entertainer', 'Chef', 'Lifeguard', 'Cabin Steward', 'Stowaway'] },
      { name: 'Gym', roles: ['Trainer', 'Member', 'Receptionist', 'Yoga Instructor', 'Janitor', 'Influencer', 'Physio'] },
      { name: 'Office', roles: ['Boss', 'Intern', 'IT Support', 'Accountant', 'Receptionist', 'Sales Rep', 'Night Cleaner'] },
      { name: 'Ski Resort', roles: ['Instructor', 'Lift Operator', 'Tourist', 'Paramedic', 'Chef', 'Rental Clerk', 'Snowboarder'] },
      { name: 'Concert', roles: ['Lead Singer', 'Roadie', 'Fan', 'Security', 'Sound Tech', 'Merch Seller', 'Journalist'] },
      { name: 'Haunted House', roles: ['Ghost Actor', 'Tourist', 'Ticket Taker', 'Makeup Artist', 'Lost Kid', 'Skeptic', 'Night Manager'] },
    ],
  },
  {
    id: 'general-3',
    name: 'General 3',
    locations: [
      { name: 'University Campus', roles: ['Professor', 'Freshman', 'Librarian', 'Coach', 'RA', 'Researcher', 'Campus Security'] },
      { name: 'Fire Station', roles: ['Firefighter', 'Chief', 'Paramedic', 'Dispatcher', 'Dalmatian Handler', 'Trainee', 'Journalist'] },
      { name: 'Amusement Park', roles: ['Ride Operator', 'Mascot', 'Guest', 'Food Vendor', 'Mechanic', 'Lost & Found', 'Teen on a Date'] },
      { name: 'Library', roles: ['Librarian', 'Student', 'Archivist', 'Security', 'Toddler\'s Parent', 'Rare Book Thief', 'Volunteer'] },
      { name: 'Farm', roles: ['Farmer', 'Veterinarian', 'Farmhand', 'Market Seller', 'Tractor Mechanic', 'City Cousin', 'Scarecrow Maker'] },
      { name: 'Subway Station', roles: ['Conductor', 'Commuter', 'Busker', 'Ticket Inspector', 'Janitor', 'Tourist', 'Pickpocket'] },
      { name: 'Newsroom', roles: ['Anchor', 'Producer', 'Camera Operator', 'Intern', 'Weather Person', 'Editor', 'Whistleblower'] },
      { name: 'Spa', roles: ['Masseuse', 'Guest', 'Receptionist', 'Esthetician', 'Cleaner', 'Influencer', 'Manager'] },
      { name: 'Courtroom', roles: ['Judge', 'Lawyer', 'Defendant', 'Jury Member', 'Bailiff', 'Witness', 'Court Reporter'] },
      { name: 'Vineyard', roles: ['Winemaker', 'Tourist', 'Sommelier', 'Picker', 'Owner', 'Chef', 'Wedding Planner'] },
      { name: 'Recording Studio', roles: ['Producer', 'Singer', 'Sound Engineer', 'Session Musician', 'Intern', 'Label Exec', 'Songwriter'] },
      { name: 'Arctic Research Base', roles: ['Scientist', 'Pilot', 'Cook', 'Mechanic', 'Medic', 'Photographer', 'New Arrival'] },
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
      { name: 'Italy', roles: ['Chef', 'Tourist', 'Gondolier', 'Fashion Student', 'Nonna', 'Football Fan', 'Art Restorer'] },
      { name: 'Australia', roles: ['Surfer', 'Tourist', 'Park Ranger', 'Barista', 'Farmer', 'Backpacker', 'Wildlife Vet'] },
      { name: 'Mexico', roles: ['Street Food Cook', 'Tourist', 'Mariachi', 'Guide', 'Artist', 'Festival Dancer', 'Taxi Driver'] },
      { name: 'Iceland', roles: ['Tour Guide', 'Hot Spring Regular', 'Photographer', 'Fisherman', 'Tourist', 'Northern Lights Chaser', 'Farmer'] },
      { name: 'Morocco', roles: ['Souk Merchant', 'Tourist', 'Tea Server', 'Guide', 'Carpet Weaver', 'Chef', 'Camel Trek Leader'] },
      { name: 'South Korea', roles: ['K-pop Fan', 'Tourist', 'Street Food Vendor', 'Student', 'Temple Guide', 'Café Owner', 'Business Traveler'] },
    ],
  },
];

// flat list if something still imports LOCATIONS; packs are the real source
export const LOCATIONS = SCENE_PACKS.flatMap(pack => pack.locations);

export function getPackById(id) {
  return SCENE_PACKS.find(p => p.id === id) ?? SCENE_PACKS[0];
}

export function getLocationsForPack(packId) {
  return getPackById(packId).locations;
}
