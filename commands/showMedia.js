const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, bold, EmbedBuilder } = require('discord.js');
const { request } = require('undici');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('show-media')
		.setDescription('Shows your requested media.'),
	async execute(interaction, Tags, ReturnedResults) {

		if (interaction.isButton()) {
			// this only triggers if we get a button response, so initial message means this is skipped

			await interaction.update({ content: `Loading...`, embeds: [], components: [], ephemeral: true });

			const buttonData = interaction.customId.split(':');

			const button = buttonData[1];
			const page = buttonData[2];
			const pages = buttonData[3];
			const overseerrUserID = buttonData[4];
			// buttonData gets rehydrated with the data from the button's custom id as below:
			// 0: media (static)
			// 1: button clicked (next or prev)
			// 2: current page
			// 3: max pages
			// 4: overseerr user ID

			let newResult;
			if (button == 'prev') {
				newResult = await getRequests(overseerrUserID, interaction.user.id, false, ReturnedResults, parseInt(page) - 1, pages);
			}
			if (button == 'next') {
				newResult = await getRequests(overseerrUserID, interaction.user.id, false, ReturnedResults, parseInt(page) + 1, pages);
			}

			const newMessage = await createMessage(newResult);

			// create the new message with embed and buttons
			return await interaction.editReply({ content: '', embeds: [newMessage.embed], components: [newMessage.buttons], ephemeral: true });
		}

		// search the db for the user matching the discord ID of the requester
		const tag = await Tags.findOne({ where: { discord_id: interaction.user.id } });
		// if tag is null they're not in the database
		if (tag == null) {
			return await interaction.reply({ content: `Couldn't find you in the database. Ask <@${process.env.DISCORD_ADMIN_ID}> to add you using /add-user.`, ephemeral: true });
		}
		const overseerrUserID = tag.get('overseerr_id');

		// we need to destroy (if it exists) the last returned results object
		const dbResult = await ReturnedResults.findOne({ where: { discord_id: interaction.user.id } });
		if (dbResult != null) {
			await ReturnedResults.destroy({ where: { discord_id: interaction.user.id } });
		}
		await interaction.deferReply({ ephemeral: true });

		// get results from overseerr api. since this is the first grab we need to specify true
		const result = await getRequests(overseerrUserID, interaction.user.id, true, ReturnedResults);

		// create buttons and embed from above result
		const message = await createMessage(result);

		// send the buttons and embed
		await interaction.editReply({ content: '', embeds: [message.embed], components: [message.buttons], ephemeral: true });

		// const collectButtonInteraction = await interaction.channel?.awaitMessageComponent({ componentType: ComponentType.Button });
		// collectors just don't seem to work for me. index.js just passes the button interaction back to this function at the moment as a workaround
	},
};

async function createMessage(result) {
	const message = [];

	message['embed'] = new EmbedBuilder()
		.setColor('Blurple')
		.setDescription(result.menuSelectorResults);

	message['buttons'] = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`media:prev:${result.page}:${result.pages}:${result.overseerrUserID}`)
				.setLabel('Previous Page')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(result.pagePrevDisabled),
			new ButtonBuilder()
				.setCustomId(`media:next:${result.page}:${result.pages}:${result.overseerrUserID}`)
				.setLabel('Next Page')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(result.pageNextDisabled),
		);

	return message;
}

async function getRequests(overseerrUserID, discordID, firstGrab, ReturnedResults, page = 1, onLastPage = true) {

	let pageNextDisabled = false;
	let pagePrevDisabled = false;
	let response;
	let firstResult;
	let lastResult;

	if (firstGrab) {
		// this is the first time we're getting this object, need to store it
		const req = await request(`${process.env.OVERSEERR_URL}/api/v1/user/${overseerrUserID}/requests?take=999999`, {
			headers: { 'X-Api-Key': process.env.OVERSEERR_API_KEY },
		});
		response = await req.body.json();

		await ReturnedResults.create({
			discord_id: discordID,
			data: JSON.stringify(response),
		});

		firstResult = 0;
	} else {
		// not first grab, we should have this stored
		const allResults = await ReturnedResults.findOne({ where: { discord_id: discordID } });
		response = JSON.parse(allResults.data);

		firstResult = (page - 1) * 15;
	}

	const pages = Math.ceil(response.pageInfo.results / 15);
	if (pages > 1) {
		lastResult = firstResult + 15;
		// we need to check if we're on the last page, check if current page equal to total pages (from our response data)
		if (page != pages) {
			onLastPage = false;
		} else {
			// if page does equal pages, then we're on the first page or last page
			onLastPage = true;
			pageNextDisabled = true;
		}

		if (page == 1) {
			// if we're on page 1, disable prev button
			pagePrevDisabled = true;
		}
	}

	if (pages == 1) {
		// there's only 1 page, disable both of the buttons
		onLastPage = true;
		pageNextDisabled = true;
		pagePrevDisabled = true;
	}

	const slicedResults = response.results.slice(firstResult, lastResult);

	const result = [];
	// how many pages are in the results
	result['pages'] = pages;
	// current page
	result['page'] = page;
	// if we're on the last page
	result['onLastPage'] = onLastPage;
	// if the next page button should be disabled
	result['pageNextDisabled'] = pageNextDisabled;
	// if the prev page button should be disabled
	result['pagePrevDisabled'] = pagePrevDisabled;
	// total number of all results
	result['totalResults'] = response.pageInfo.results;
	// passing back through the overseerr ID
	result['overseerrUserID'] = overseerrUserID;
	// temp variable for the results
	result['menuSelectorResults'] = ``;

	// now we have everything we need to make the actual results message
	for await (const requestItem of slicedResults) {
		if (requestItem.type == 'movie') {
			const movieResult = await getMovie(requestItem.media.tmdbId);
			result.menuSelectorResults += `${bold(movieResult.title)}\nRequest ID: ${requestItem.id}\n\n`;
		}

		if (requestItem.type == 'tv') {
			const tvResult = await getTvShow(requestItem.media.tmdbId);
			result.menuSelectorResults += `${bold(tvResult.name)}\nRequest ID: ${requestItem.id}\n\n`;
		}
	}
	// add page numbers to end
	result.menuSelectorResults += `${bold(`Page ${result.page} of ${result.pages}`)}`;

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
