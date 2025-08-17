const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows help information for the Defender Support bot'),
  
  async execute(interaction) {
    // Create the main help embed
    const helpEmbed = new EmbedBuilder()
      .setColor('#FE9F04') // Defender Support orange
      .setTitle('🛡️ Defender Support Help')
      .setDescription('This bot provides a support ticket system for users to contact the Support Team privately.')
      .setThumbnail('https://cdn.discordapp.com/attachments/1199051285412990997/1406290016631787530/IMG_2802.png')
      .setImage('https://cdn.discordapp.com/attachments/1199051285412990997/1406290016631787530/IMG_2802.png')
      .addFields(
        { 
          name: '📩 For Users', 
          value: `Send a direct message to this bot to create a support ticket. Your message will be forwarded to the Support Team who will respond through the bot.
          
All messages are kept private and logged for administrative purposes.` 
        },
        { 
          name: '👥 For Support Team', 
          value: `When a user creates a ticket, a new channel will be created in the **Defender Support** category. 
          
Type messages in this channel to reply to the user.

Use slash commands for additional functionality.`
        },
        { 
          name: '🛠️ Commands', 
          value: `
**/help** - Shows this help message  
**/close [reason]** - Closes the current ticket (Support Team only)  
**/setup** - Sets up the Defender Support system (Admin only)  
**/stats** - Shows ticket statistics (Support Team only)`
        }
      )
      .setFooter({ text: 'Powered by Defender | If you want a Support Team Supervisor, DM them | Status: Powered by Triple Blocks Corporation' })
      .setTimestamp();

    // Check if the command is used in a guild or DM
    if (interaction.guild) {
      // Send help message in the guild
      await interaction.reply({ embeds: [helpEmbed] });
    } else {
      // Send help message in DM
      await interaction.reply({ embeds: [helpEmbed] });
      
      // Also add user-specific instructions
      const dmHelpEmbed = new EmbedBuilder()
        .setColor('#FE9F04')
        .setTitle('📨 How to Use Defender Support')
        .setDescription(`To create a ticket, simply send a message to me (this bot). 
        
Your message will be forwarded to the Support Team who will respond to you through me.

Every message you send (except commands) will be forwarded to your ticket.

The ticket will remain open until the Support Team closes it.`)
        .setThumbnail('https://cdn.discordapp.com/attachments/1199051285412990997/1406290016631787530/IMG_2802.png')
        .setFooter({ text: 'Powered by Defender | If you want a Support Team Supervisor, DM them | Status: Powered by Triple Blocks Corporation' })
        .setTimestamp();
        
      await interaction.followUp({ embeds: [dmHelpEmbed] });
    }
  }
};
