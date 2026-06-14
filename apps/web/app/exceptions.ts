export class MaxSubmissionsExceededError extends Error {
  details: { userID: string; battleID: string; };

  constructor(message: string, details: {userID: string, battleID: string}) {
    super(message);
    this.name = "MaxSubmissionsExceededError"
    this.details = details
  }
}