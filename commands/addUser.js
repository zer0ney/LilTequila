const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-user')
		.setDescription('Adds a new user to the bot.')
		.addStringOption(option =>
			option
				.setName('name')
				.setDescription('Name of user'),
		)
		.addStringOption(option =>
			option
				.setName('discord_id')
				.setDescription('Discord ID of user'),
		)
		.addStringOption(option =>
			option
				.setName('overseerr_id')
				.setDescription('Overseerr ID of user'),
		),
	async execute(interaction, Tags) {
		const tagName = interaction.options.getString('name');
		const tagDiscord = interaction.options.getString('discord_id');
		const tagOverseerr = interaction.options.getString('overseerr_id');

		if (interaction.user.id != process.env.DISCORD_ADMIN_ID) {
			return interaction.reply({ content: 'You don\'t have permission to use this command.', ephemeral: true });
		}

		try {
			// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
			const tag = await Tags.create({
				name: tagName,
				discord_id: tagDiscord,
				overseerr_id: tagOverseerr,
			});

			return interaction.reply(`Tag ${tag.name} added.`);
		} catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				return interaction.reply('That tag already exists.');
			}

			return interaction.reply('Something went wrong with adding a tag.');
		}
	},
};
