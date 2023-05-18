const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('show-users')
		.setDescription('Shows all users currently added to the bot.'),
	async execute(interaction, Tags) {
		if (interaction.user.id != process.env.DISCORD_ADMIN_ID) {
			return interaction.reply({ content: 'You don\'t have permission to use this command.', ephemeral: true });
		}

		await interaction.deferReply({ ephemeral: true });

		// get all of the tags
		const tag = await Tags.findAll();
		let message = `**Users:**\n`;

		if (tag.length == 0) {
			return interaction.editReply({ content: `Couldn't find any users. Use /add-user to add some.`, ephemeral: true });
		}

		// now sift through them to make our message
		tag.forEach(user => {
			message += `**${user.name}**\nDiscord ID: ${user.discord_id}\nOverseerr ID: ${user.overseerr_id}\n\n`;
		});

		return interaction.editReply({ content: message, ephemeral: true });
	},
};
