export class ErrFaucetAlreadyFunded extends Error {
  public untilDate: Date;
  constructor(message?: string) {
    super(message ? message : 'address already funded');
    if (message) {
      const date = message.split('wait until ');
      const [datePart, timePart] = date[date.length - 1].split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      this.untilDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    }
  }
}
