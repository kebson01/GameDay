// GameDay Local Client
// Replaces Base44 SDK with local storage-based implementation

import { auth } from '@/lib/auth';
import { 
  Game, 
  Tailgate, 
  TailgateGroup, 
  CarLocation, 
  FriendLocation, 
  Prediction, 
  TeamPost, 
  Notification 
} from '@/lib/dataService';

// Export the client with the same structure as Base44 for compatibility
export const base44 = {
  auth,
  entities: {
    Game,
    Tailgate,
    TailgateGroup,
    CarLocation,
    FriendLocation,
    Prediction,
    TeamPost,
    Notification,
  },
};

export default base44;
