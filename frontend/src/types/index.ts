export interface Umpire {
  _id: string;
  name: string;
  email: string;
  experience: number;
  specialization: string[];
  isActive: boolean;
}

export interface Match {
  _id: string;
  matchName: string;
  sportType: 'cricket' | 'badminton';
  umpireId: Umpire;
  venueId?: string;
  bookingId?: string;
  team1?: string;
  team2?: string;
  totalOvers?: number;
  player1?: string;
  player2?: string;
  maxSets?: number;
  pointsToWin?: number;
  status: 'upcoming' | 'live' | 'completed';
  startTime: string;
  endTime?: string;
}

export interface CricketScore {
  team1Runs: number;
  team1Wickets: number;
  team1Overs: number;
  team1Balls: number;
  team2Runs: number;
  team2Wickets: number;
  team2Overs: number;
  team2Balls: number;
  currentInnings: number;
  isInningsComplete: boolean;
}

export interface BadmintonSet {
  setNumber: number;
  player1Score: number;
  player2Score: number;
  isComplete: boolean;
  winner?: 'player1' | 'player2' | null;
}

export interface BadmintonScore {
  player1Sets: number;
  player2Sets: number;
  currentSet: number;
  sets: BadmintonSet[];
}

export interface Score {
  _id: string;
  matchId: string;
  cricketScore?: CricketScore;
  badmintonScore?: BadmintonScore;
  winner?: string;
  isMatchComplete: boolean;
  lastUpdated: string;
}

export interface Venue {
  _id: string;
  name: string;
  city: string;
  address?: string;
  sports: string[];
  type: 'indoor' | 'outdoor' | 'mixed' | string;
  imageUrl?: string;
  gallery?: string[];
  openingTime?: string;
  closingTime?: string;
  amenities?: string[];
  about?: string;
  mapUrl?: string;
  rating?: number;
  pricePerHour?: number;
  isActive?: boolean;
}

export interface Booking {
  _id: string;
  venue: string; // venue id
  sport: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  court?: string;
  notes?: string;
  createdAt?: string;
}
