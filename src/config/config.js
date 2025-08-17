module.exports = {
  prefix: process.env.PREFIX || '!',
  embedColor: '#FE9F04', // Defender Orange
  footer: 'Powered by Defender • If you want Support Team Supervisor, DM them • Status: Powered by Triple Blocks Corporation',
  
  statusMessages: {
    online: 'DM me to create a Defender Support ticket!',
    idle: 'Watching for new Defender Support tickets'
  },

  cooldowns: {
    commands: 3, // cooldown in seconds for normal commands
    newTicket: 60, // cooldown in seconds for creating a new ticket
    ticketMessage: 2, // cooldown in seconds between messages in an existing ticket
    staffResponse: 1 // cooldown in seconds for Support Team responses
  },

  ticketSettings: {
    closeConfirmation: true, // require confirmation before closing a ticket
    transcripts: true, // save ticket transcripts
    logsEnabled: true, // enable logging in a designated channel
    maxOpenTickets: 3, // maximum number of open tickets per user
    autoClose: {
      enabled: true, // automatically close inactive tickets
      inactiveHours: 72 // close tickets inactive for this many hours
    }
  },

  credits: {
    name: 'Powered by Defender | Triple Blocks Corporation',
    website: '' // no website provided
  }
};
