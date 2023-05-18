const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { request } = require('undici');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove-media')
		.setDescription('Removes the request and media from Plex using a request ID from /show-media.')
		.addIntegerOption(option =>
			option
				.setName('id')
				.setDescription('Request ID to remove.')
				.setRequired(true),
		),
	async execute(interaction, Tags) {

		if (interaction.isButton()) {

			const buttonData = interaction.customId.split(':');

			if (buttonData[1] == 'cancel') {
				return await interaction.update({ content: `Deletion cancelled.`, embeds: [], components: [], ephemeral: true });
			}

			const id = buttonData[2];
			await interaction.update({ content: `Deleting...`, embeds: [], components: [], ephemeral: true });

			const result = await getRequest(id);

			let deleteResult;

			if (result.media.mediaType == 'tv') {
				deleteResult = await deleteTvShow(result.media.externalServiceId);
			}
			if (result.media.mediaType == 'movie') {
				deleteResult = await deleteMovie(result.media.externalServiceId);
			}

			deleteRequest(id);

			// we need to get Overseerr to check in with Sonarr and Radarr after media gets deleted or it doesn't update for an hour or so.
			overseerrResync();

			if (deleteResult.message == 'Success') {
				return await interaction.editReply({ content: 'Request and media successfully deleted.', embeds: [], components: [], ephemeral: true });
			} else {
				return await interaction.editReply({ content: `Error!\`n${deleteResult}`, embeds: [], components: [], ephemeral: true });
			}

		}

		await interaction.deferReply({ ephemeral: true });

		// finding the user's tag in the db
		const result = await getRequest(interaction.options.getInteger('id'));
		const tag = await Tags.findOne({ where: { discord_id: interaction.user.id } });
		const overseerrUserID = tag.get('overseerr_id');

		if (result.message == 'Request not found.') {
			return await interaction.editReply({ content: 'Could not find a request with that ID. Check the ID and try again.', ephemeral: true });
		}

		if (result.requestedBy.id != overseerrUserID) {
			return await interaction.editReply({ content: 'You didn\'t make this request. Check the ID and try again.', ephemeral: true });
		}

		let resultDetails;
		let title;

		if (result.media.mediaType == 'tv') {
			resultDetails = await getTvShow(result.media.tmdbId);
			title = resultDetails.name;
		}

		if (result.media.mediaType == 'movie') {
			resultDetails = await getMovie(result.media.tmdbId);
			title = resultDetails.title;
		}

		const buttons = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId(`remove:cancel:${result.id}`)
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Danger),
				new ButtonBuilder()
					.setCustomId(`remove:confirm:${result.id}`)
					.setLabel('Confirm')
					.setStyle(ButtonStyle.Success),
			);

		await interaction.editReply({ content: `Are you sure you want to delete ${title}? This will remove the request from Overseerr and any downloaded media from Plex.`, components: [buttons] });
	},
};

async function getRequest(id) {
	const req = await request(`${process.env.OVERSEERR_URL}/api/v1/request/${id}`, {
		headers: { 'X-Api-Key': process.env.OVERSEERR_API_KEY },
	});
	const result = await req.body.json();
	return result;
}

async function getMovie(id) {
	const req = await request(`${process.env.OVERSEERR_URL}/api/v1/movie/${id}`, {
		headers: { 'X-Api-Key': process.env.OVERSEERR_API_KEY },
	});
	const result = await req.body.json();
	return result;
}

async function getTvShow(id) {
	const req = await request(`${process.env.OVERSEERR_URL}/api/v1/tv/${id}`, {
		headers: { 'X-Api-Key': process.env.OVERSEERR_API_KEY },
	});
	const result = await req.body.json();
	return result;
}

async function deleteTvShow(externalID) {
	const req = await request(`${process.env.SONARR_URL}/api/v3/series/${externalID}?deleteFiles=true`, {
		headers: { 'X-Api-Key': process.env.SONARR_API_KEY },
		method: 'DELETE',
	});

	let result = [];
	if (req.statusCode == '200') {
		result['message'] = 'Success';
	} else {
		result = await req.body.json();
	}

	return result;
}

async function deleteMovie(externalID) {
	const req = await request(`${process.env.RADARR_URL}/api/v3/movie/${externalID}?deleteFiles=true`, {
		headers: { 'X-Api-Key': process.env.RADARR_API_KEY },
		method: 'DELETE',
	});

	let result = [];
	if (req.statusCode == '200') {
		result['message'] = 'Success';
	} else {
		result = await req.body.json();
	}

	return result;
}

async function deleteRequest(id) {
	const req = await request(`${process.env.OVERSEERR_URL}/api/v1/request/${id}`, {
		headers: { 'X-Api-Key': process.env.OVERSEERR_API_KEY },
		method: 'DELETE',
	});

	let result = [];
	if (req.statusCode == '204') {
		result['message'] = 'Success';
	} else {
		result = await req.body.json();
	}

	// return result;
}

async function overseerrResync() {
	await request(`${process.env.OVERSEERR_URL}/api/v1/settings/plex/sync`, {
		headers: { 'X-Api-Key': process.env.OVERSEERR_API_KEY },
		method: 'POST',
	});
}