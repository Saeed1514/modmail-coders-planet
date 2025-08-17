const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../schemas/Ticket');
const Config = require('../schemas/Config');
const config = require('../config/config');
const moment = require('moment');
const logger = require('../utils/logger');
const ConfigManager = require('../utils/configManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View statistics about Defender Support tickets'),
  
  async execute(interaction) {
    // Get the server configuration
    const guildConfig = await Config.findOne({ guildId: interaction.guild.id });
      
    if (!guildConfig) {
      logger.error(`No configuration found for guild ${interaction.guild.id}`);
      return interaction.reply({
        content: '⚠️ Error: Bot has not been set up. Please ask the **Server Owner** to run the `/setup` command.',
        ephemeral: true
      });
    }
    
    // Check if user has Support Team role
    const hasSupportRole = interaction.member.roles.cache.has(guildConfig.staffRoleId);
    if (!hasSupportRole) {
      return interaction.reply({
        content: `❌ You do not have permission to view ticket statistics. You need the <@&${guildConfig.staffRoleId}> (Support Team) role.`,
        ephemeral: true
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Ticket counts
      const totalTickets = await Ticket.countDocuments({ guildId: interaction.guild.id });
      const openTickets = await Ticket.countDocuments({ guildId: interaction.guild.id, closed: false });
      const closedTickets = await Ticket.countDocuments({ guildId: interaction.guild.id, closed: true });
      
      // Most recent tickets
      const recentTickets = await Ticket.find({ guildId: interaction.guild.id })
        .sort({ createdAt: -1 })
        .limit(5);
      
      // Embed color (forced to Defender orange)
      const embedColor = '#FE9F04';

      // Create the stats embed
      const statsEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('📊 Defender Support Statistics')
        .setDescription('Here are the latest ticket statistics for this server.')
        .setThumbnail('https://i.imgur.com/ZfXh3XK.png') // small emblem placeholder
        .setImage('https://cdn.discordapp.com/attachments/1199051285412990997/1406290016631787530/IMG_2802.png') // Defender banner
        .addFields(
          { name: 'Total Tickets', value: totalTickets.toString(), inline: true },
          { name: 'Open Tickets', value: openTickets.toString(), inline: true },
          { name: 'Closed Tickets', value: closedTickets.toString(), inline: true }
        )
        .setFooter({ text: 'Powered by Defender • If you want Support Team Supervisor, DM them • Status: Powered by Triple Blocks Corporation' })
        .setTimestamp();
      
      // Add recent tickets if found
      if (recentTickets.length > 0) {
        let recentTicketsText = '';
        
        for (const ticket of recentTickets) {
          const user = await interaction.client.users.fetch(ticket.userId).catch(() => null);
          const userName = user ? user.tag : `Unknown User (${ticket.userId})`;
          const status = ticket.closed ? '🔒 Closed' : '📬 Open';
          const time = moment(ticket.createdAt).format('MMM D, YYYY [at] h:mm A');
          
          recentTicketsText += `${status} - **${userName}** - ${time}\n`;
        }
        
        statsEmbed.addFields({ name: '🕐 Recent Tickets', value: recentTicketsText });
      }
      
      // Placeholder for average response time
      if (closedTickets > 0) {
        statsEmbed.addFields({
          name: '⏱ Average Response Time',
          value: 'Feature coming soon...'
        });
      }
      
      await interaction.editReply({ embeds: [statsEmbed] });
    } catch (error) {
      logger.error('Error getting statistics:', error);
      await interaction.editReply({ 
        content: '⚠️ There was an error fetching ticket statistics.' 
      });
    }
  }
};
