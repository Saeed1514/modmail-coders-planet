const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder 
} = require('discord.js');
const { closeTicket } = require('../utils/modmail');
const Config = require('../schemas/Config');
const ConfigManager = require('../utils/configManager');
const config = require('../config/config');
const logger = require('../utils/logger');

// Theme constants
const ORANGE_COLOR = '#FE9F04';
const BANNER_URL = 'https://cdn.discordapp.com/attachments/1199051285412990997/1406290016631787530/IMG_2802.png';
const FOOTER_TEXT = 'Powered by Triple Blocks Corporation • If you face problems, please contact the Support Team Supervisor.';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ModMail ticket')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for closing the ticket')
        .setRequired(false)
    ),
  
  async execute(interaction) {
    // Check if this is a modmail channel
    if (!interaction.channel.name.startsWith('modmail-')) {
      const wrongChannelEmbed = new EmbedBuilder()
        .setColor(ORANGE_COLOR)
        .setTitle('Error')
        .setDescription('This command can only be used in ModMail ticket channels.')
        .setImage(BANNER_URL)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      return interaction.reply({ embeds: [wrongChannelEmbed], ephemeral: true });
    }

    // Get the server configuration
    const guildConfig = await Config.findOne({ guildId: interaction.guild.id });
    if (!guildConfig) {
      logger.error(`No configuration found for guild ${interaction.guild.id}`);
      const noConfigEmbed = new EmbedBuilder()
        .setColor(ORANGE_COLOR)
        .setTitle('Error')
        .setDescription('Bot has not been set up. Please ask an administrator to run the `/setup` command.')
        .setImage(BANNER_URL)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      return interaction.reply({ embeds: [noConfigEmbed], ephemeral: true });
    }
    
    // Check if user has staff role
    const hasStaffRole = interaction.member.roles.cache.has(guildConfig.staffRoleId);
    if (!hasStaffRole) {
      const noPermsEmbed = new EmbedBuilder()
        .setColor(ORANGE_COLOR)
        .setTitle('Permission Denied')
        .setDescription(`You do not have permission to close tickets.\nYou need the <@&${guildConfig.staffRoleId}> role.`)
        .setImage(BANNER_URL)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true });
    }

    // Get the reason if provided
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check if confirmation is required in config
    const closeConfirmation = await ConfigManager.getSetting(
      interaction.guild.id,
      'settings.tickets.closeConfirmation',
      true
    );

    if (closeConfirmation) {
      // Confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_close')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

      // Confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor(ORANGE_COLOR)
        .setTitle('Close Ticket?')
        .setDescription(`Are you sure you want to close this ticket?\n\n**Reason:** ${reason}`)
        .setImage(BANNER_URL)
        .setFooter({ text: `${FOOTER_TEXT} • This confirmation will expire in 30 seconds.` })
        .setTimestamp();

      const response = await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        fetchReply: true
      });

      // Button interaction collector
      const filter = i => i.user.id === interaction.user.id;
      try {
        const confirmation = await response.awaitMessageComponent({ filter, time: 30_000 });
        
        if (confirmation.customId === 'confirm_close') {
          const closingEmbed = new EmbedBuilder()
            .setColor(ORANGE_COLOR)
            .setTitle('Closing Ticket...')
            .setDescription(`Closing this ModMail ticket.\n\n**Reason:** ${reason}`)
            .setImage(BANNER_URL)
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();

          await confirmation.update({ embeds: [closingEmbed], components: [] });
          
          const result = await closeTicket(interaction.channel, interaction.client, interaction.user, reason);
          if (!result.success) {
            const errorEmbed = new EmbedBuilder()
              .setColor(ORANGE_COLOR)
              .setTitle('Error')
              .setDescription(`Failed to close ticket: ${result.error}`)
              .setImage(BANNER_URL)
              .setFooter({ text: FOOTER_TEXT })
              .setTimestamp();

            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          }
        } else if (confirmation.customId === 'cancel_close') {
          const cancelEmbed = new EmbedBuilder()
            .setColor(ORANGE_COLOR)
            .setTitle('Canceled')
            .setDescription('Ticket close canceled.')
            .setImage(BANNER_URL)
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();

          await confirmation.update({ embeds: [cancelEmbed], components: [] });
        }
      } catch {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(ORANGE_COLOR)
          .setTitle('Timed Out')
          .setDescription('Ticket close canceled — confirmation timed out.')
          .setImage(BANNER_URL)
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();

        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
      }
    } else {
      // Direct close without confirmation
      const closingEmbed = new EmbedBuilder()
        .setColor(ORANGE_COLOR)
        .setTitle('Closing Ticket...')
        .setDescription(`Closing this ModMail ticket.\n\n**Reason:** ${reason}`)
        .setImage(BANNER_URL)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [closingEmbed] });
      
      const result = await closeTicket(interaction.channel, interaction.client, interaction.user, reason);
      if (!result.success) {
        const errorEmbed = new EmbedBuilder()
          .setColor(ORANGE_COLOR)
          .setTitle('Error')
          .setDescription(`Failed to close ticket: ${result.error}`)
          .setImage(BANNER_URL)
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();

        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};
