const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const ConfigManager = require('../utils/configManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows help information for the ModMail bot'),
  
  async execute(interaction) {
    // Get embed color from config
    const embedColor = await ConfigManager.getSetting(
      interaction.guild?.id,
      'settings.appearance.embedColor',
      config.embedColor
    );

    // Main help embed
    const helpEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('📖 Defender Support Bot Help')
      .setDescription('This bot provides a ModMail system for users to contact server staff privately.')
      .setThumbnail('https://i.imgur.com/ZfXh3XK.png') // Small emblem/logo (replace with your own)
      .setImage('https://i.imgur.com/2s8qXBt.png')     // Banner image (replace with your custom one)
      .addFields(
        { 
          name: '📩 For Users', 
          value: `Send a **direct message** to this bot to create a support ticket. Your message will be forwarded to the server staff who will respond through the bot.
          
All messages are kept private and logged for administrative purposes.`
        },
        { 
          name: '👮‍♂️ For Support Team', 
          value: `When a user creates a ticket, a new channel will be created in the ModMail category. 
          
Type messages in this channel to reply to the user.

Use the slash commands below for additional functionality.`
        },
        { 
          name: '🛠️ Commands', 
          value: `
**/help** – Shows this help message  
**/close [reason]** – Closes the current ticket *(Staff only)*  
**/setup** – Sets up the ModMail system *(Admin only)*  
**/stats** – Shows ModMail statistics *(Staff only)*`
        }
      )
      .setFooter({ text: config.footer })
      .setTimestamp();

    // If used in a guild
    if (interaction.guild) {
      await interaction.reply({ embeds: [helpEmbed] });
    } 
    // If used in DM
    else {
      await interaction.reply({ embeds: [helpEmbed] });

      const dmHelpEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('✉️ How to Use Defender Support')
        .setDescription(`To create a ticket, simply **send me a message (this bot)**.  

Your message will be forwarded to the server staff, who will respond through me.  

Every message you send (except commands) will be forwarded to your ticket.  

The ticket will remain open until staff closes it.`)
        .setThumbnail('https://i.imgur.com/ZfXh3XK.png')
        .setFooter({ text: config.footer })
        .setTimestamp();

      await interaction.followUp({ embeds: [dmHelpEmbed] });
    }
  }
};
