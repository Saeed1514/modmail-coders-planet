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
    .setDescription('View statistics about ModMail tickets'),
  
  async execute(interaction) {
    // Get the server configuration
    const guildConfig = await Config.findOne({ guildId: interaction.guild.id });
      
    if (!guildConfig) {
      logger.error(`No configuration found for guild ${interaction.guild.id}`);
      return interaction.reply({
        content: 'Error: Bot has not been set up. Please ask an administrator to run the /setup command.',
        ephemeral: true
      });
    }
    
    // Check if user has staff role
    const hasStaffRole = interaction.member.roles.cache.has(guildConfig.staffRoleId);
    if (!hasStaffRole) {
      return interaction.reply({
        content: `You do not have permission to view ticket statistics. You need the <@&${guildConfig.staffRoleId}> role.`,
        ephemeral: true
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Get ticket statistics
      const totalTickets = await Ticket.countDocuments({ guildId: interaction.guild.id });
      const openTickets = await Ticket.countDocuments({ guildId: interaction.guild.id, closed: false });
      const closedTickets = await Ticket.countDocuments({ guildId: interaction.guild.id, closed: true });
      
      // Get the most recent tickets
      const recentTickets = await Ticket.find({ guildId: interaction.guild.id })
        .sort({ createdAt: -1 })
        .limit(5);
      
      // Get embed color from config
      const embedColor = await ConfigManager.getSetting(
        interaction.guild.id, 
        'settings.appearance.embedColor',
        config.embedColor
      );

      // Create the embed
      const statsEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('📊 ModMail Statistics')
        .setDescription('Here are the latest ticket statistics for this server.')
        .setThumbnail('https://i.imgur.com/ZfXh3XK.png') // Small emblem (you can change this link)
        .setImage('https://i.imgur.com/2s8qXBt.png')     // Banner image (you can replace with your custom one)
        .addFields(
          { name: 'Total Tickets', value: totalTickets.toString(), inline: true },
          { name: 'Open Tickets', value: openTickets.toString(), inline: true },
          { name: 'Closed Tickets', value: closedTickets.toString(), inline: true }
        )
        .setFooter({ text: `${config.footer} • Statistics are refreshed live` })
        .setTimestamp();
      
      // Add recent tickets if there are any
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
      
      // Add average response time placeholder
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
        content: 'There was an error fetching ticket statistics.' 
      });
    }
  }
};
