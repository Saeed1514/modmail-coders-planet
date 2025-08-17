const { SlashCommandBuilder } = require('discord.js');
const SetupHandler = require('../utils/setup/setupHandler');
const SetupUIManager = require('../utils/setup/setupUIManager');
const logger = require('../utils/logger');
const Config = require('../schemas/Config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the Defender Support system for your server'),
  
  async execute(interaction) {
    // Restrict command to the guild owner only
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        content: '❌ Only the **Server Owner** can run this command.',
        ephemeral: true
      });
    }

    // Initialize setup session
    const setupResult = await SetupHandler.initSetup(interaction);
    
    if (!setupResult.success) {
      return interaction.reply({ 
        content: setupResult.error || 'Failed to initialize setup. Please try again.',
        ephemeral: true 
      });
    }
    
    let session = setupResult;
    const message = setupResult.setupMessage;

    // Collector for setup buttons & menus
    const filter = i => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      idle: 300000 // 5 min idle timeout
    });
    
    collector.on('collect', async (i) => {
      try {
        if (i.isButton()) {
          const result = await SetupHandler.handleButtonInteraction(i, session.guildConfig);
          session = { ...session, ...result };
          if (!session.active) collector.stop('completed');
        } 
        else if (i.isStringSelectMenu()) {
          const result = await handleSelectMenuInteraction(i, session.guildConfig);
          session = { ...session, ...result };
        }
      } catch (error) {
        logger.error('Error in setup command collector:', error);
        await i.reply({ 
          content: '⚠️ An error occurred while processing your request. Please try again.',
          ephemeral: true 
        });
      }
    });
    
    collector.on('end', (collected, reason) => {
      if (reason === 'idle') {
        interaction.followUp({ 
          content: '⌛ Setup timed out due to inactivity. Your changes have been saved. Use `/setup` again to continue configuring the system.',
          ephemeral: true 
        });
      }
    });
    
    // Modal listener
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
            await i.reply({ 
              content: '⚠️ An error occurred while processing your setup request. Please try again.',
              ephemeral: true 
            });
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

/**
 * Handle select menu interactions for setup
 */
async function handleSelectMenuInteraction(interaction, guildConfig) {
  const { customId, values } = interaction;
  const selectedValue = values[0];
  
  try {
    if (customId === 'color_select') {
      await Config.findOneAndUpdate(
        { guildId: guildConfig.guildId },
        { $set: { 'settings.appearance.embedColor': '#FE9F04' } }, // force Defender Support orange
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
    await interaction.reply({
      content: '⚠️ An error occurred while processing your selection. Please try again.',
      ephemeral: true
    });
    return { error: error.message };
  }
}
