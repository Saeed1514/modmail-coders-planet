const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const SetupHandler = require('../utils/setup/setupHandler');
const SetupUIManager = require('../utils/setup/setupUIManager');
const logger = require('../utils/logger');
const Config = require('../schemas/Config');

const ORANGE_COLOR = '#FE9F04';
const BANNER_URL = 'https://cdn.discordapp.com/attachments/1199051285412990997/1406290016631787530/IMG_2802.png';
const FOOTER_TEXT = 'Powered by Triple Blocks Corporation • If you face problems, please contact the Support Team Supervisor.';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the ModMail system for your server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    // Initialize setup session
    const setupResult = await SetupHandler.initSetup(interaction);
    
    if (!setupResult.success) {
      const errorEmbed = new EmbedBuilder()
        .setColor(ORANGE_COLOR)
        .setTitle('Setup Failed')
        .setDescription(setupResult.error || 'Failed to initialize setup. Please try again.')
        .setImage(BANNER_URL)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Setup successful, we'll track the setup session
    let session = setupResult;
    
    // Create a collector for button interactions
    const message = setupResult.setupMessage;
    const filter = i => i.user.id === interaction.user.id;
    
    const collector = message.createMessageComponentCollector({
      filter,
      idle: 300000 // 5 minute idle timeout
    });
    
    // Handle button and select menu interactions
    collector.on('collect', async (i) => {
      try {
        if (i.isButton()) {
          const result = await SetupHandler.handleButtonInteraction(i, session.guildConfig);
          session = { ...session, ...result };
          if (!session.active) collector.stop('completed');
        } else if (i.isStringSelectMenu()) {
          const result = await handleSelectMenuInteraction(i, session.guildConfig);
          session = { ...session, ...result };
        }
      } catch (error) {
        logger.error('Error in setup command collector:', error);
        const errorEmbed = new EmbedBuilder()
          .setColor(ORANGE_COLOR)
          .setTitle('Error')
          .setDescription('An error occurred while processing your request. Please try again.')
          .setImage(BANNER_URL)
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();

        await i.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    });
    
    // Handle collector end
    collector.on('end', (collected, reason) => {
      if (reason === 'idle') {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(ORANGE_COLOR)
          .setTitle('Setup Timed Out')
          .setDescription('Setup timed out due to inactivity. Your changes have been saved. Use `/setup` again to continue configuring the system.')
          .setImage(BANNER_URL)
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();

        interaction.followUp({ embeds: [timeoutEmbed], ephemeral: true });
      }
    });
    
    // Set up a listener for modal submissions
    const modalFilter = i => i.user.id === interaction.user.id && i.customId.startsWith('modal_');
    const listenerName = `setupModalListener_${Date.now()}_${interaction.user.id}`;
    
    const modalHandler = async (i) => {
      if (!i.isModalSubmit() || !modalFilter(i) || i.replied || i.deferred) return;
      try {
        i._setupHandled = true;
        const result = await SetupHandler.handleModalSubmit(i, session.guildConfig);
        if (result && Object.keys(result).length > 0) {
          session = { ...session, ...result };
        }
      } catch (error) {
        logger.error('Error handling modal submission in setup command:', error);
        try {
          if (!i.replied && !i.deferred) {
            const errorEmbed = new EmbedBuilder()
              .setColor(ORANGE_COLOR)
              .setTitle('Error')
              .setDescription('An error occurred while processing your setup request. Please try again.')
              .setImage(BANNER_URL)
              .setFooter({ text: FOOTER_TEXT })
              .setTimestamp();

            await i.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          logger.error('Error sending error notification to user:', replyError);
        }
      }
    };
    
    interaction.client.on('interactionCreate', modalHandler);
    collector.on('end', () => {
      interaction.client.removeListener('interactionCreate', modalHandler);
      logger.debug(`Removed setup modal listener: ${listenerName}`);
    });
  }
};

async function handleSelectMenuInteraction(interaction, guildConfig) {
  const { customId, values } = interaction;
  const selectedValue = values[0];
  
  try {
    if (customId === 'color_select') {
      await Config.findOneAndUpdate(
        { guildId: guildConfig.guildId },
        { $set: { 'settings.appearance.embedColor': selectedValue } },
        { new: true }
      );
      const updatedConfig = await Config.findOne({ guildId: guildConfig.guildId });
      await interaction.update(SetupUIManager.getAppearanceSettingsEmbed(updatedConfig));
      return { guildConfig: updatedConfig, step: 'appearance' };
    }
    else if (customId === 'ticket_limit_select') {
      const limit = parseInt(selectedValue);
      await Config.findOneAndUpdate(
        { guildId: guildConfig.guildId },
        { $set: { 'settings.tickets.maxOpenTickets': limit } },
        { new: true }
      );
      const updatedConfig = await Config.findOne({ guildId: guildConfig.guildId });
      await interaction.update(SetupUIManager.getTicketSettingsEmbed(updatedConfig));
      return { guildConfig: updatedConfig, step: 'tickets' };
    }
    else if (customId === 'auto_close_select') {
      const hours = parseInt(selectedValue);
      const isEnabled = hours > 0;
      await Config.findOneAndUpdate(
        { guildId: guildConfig.guildId },
        { 
          $set: { 
            'settings.tickets.autoClose': isEnabled,
            'settings.tickets.autoCloseTime': hours || 48
          } 
        },
        { new: true }
      );
      const updatedConfig = await Config.findOne({ guildId: guildConfig.guildId });
      await interaction.update(SetupUIManager.getTicketSettingsEmbed(updatedConfig));
      return { guildConfig: updatedConfig, step: 'tickets' };
    }
    return {};
  } catch (error) {
    logger.error(`Error handling select menu ${customId}:`, error);
    const errorEmbed = new EmbedBuilder()
      .setColor(ORANGE_COLOR)
      .setTitle('Error')
      .setDescription('An error occurred while processing your selection. Please try again.')
      .setImage(BANNER_URL)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return { error: error.message };
  }
}
