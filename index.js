const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// -----------------------------
// Require Sequelize
const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'database.sqlite',
});

// this db gets made in the same folder as this file
const Tags = sequelize.define('tags', {
	name: {
		type: Sequelize.STRING,
		unique: true,
	},
	discord_id: Sequelize.INTEGER,
	overseerr_id: Sequelize.INTEGER,
});
// -----------------------------


// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			return await command.execute(interaction, Tags);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	} else if (interaction.isButton()) {
		// im not sure if the button interactions go straight back to the original interaction or something so this is just a workaround.
		// still very dumb though
		if (interaction.customId.includes('media')) {
			const command = interaction.client.commands.get('show-media');
			await command.execute(interaction, Tags);
		}
		if (interaction.customId.includes('remove')) {
			const command = interaction.client.commands.get('remove-media');
			await command.execute(interaction, Tags);
		}
	}
});

// connect and set clientready to c to differentiate from existing Client var
client.once(Events.ClientReady, c => {
	Tags.sync();
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Log in to Discord with token from .env file
client.login(process.env.TOKEN);
