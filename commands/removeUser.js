const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove-user')
		.setDescription('Removes a user from the bot. Use /show-users to get names.')
		.addStringOption(option =>
			option
				.setName('name')
				.setDescription('Name of user to remove')
				.setRequired(true),
		),
	async execute(interaction, Tags) {
		if (interaction.user.id != process.env.DISCORD_ADMIN_ID) {
			return interaction.reply({ content: 'You don\'t have permission to use this command.', ephemeral: true });
		}

		await interaction.deferReply({ ephemeral: true });

		const name = interaction.options.getString('name');

		try {
			// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
			const tag = await Tags.findAll({ where: { name: name } });

			if (tag.length == 0) {
				return interaction.editReply({ content: `Couldn't find a user under ${name}. Double check it with /show-users.`, ephemeral: true });
			}

			await Tags.destroy({ where: { name: name } });

			return interaction.editReply({ content: `Removed ${name} from the bot.`, ephemeral: true });

		} catch (error) {
			console.log(error);
		}
	},
};
