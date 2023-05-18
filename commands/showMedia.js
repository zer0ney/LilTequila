const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, bold, EmbedBuilder } = require('discord.js');
const { request } = require('undici');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('show-media')
		.setDescription('Shows your requested media.'),
	async execute(interaction, Tags) {

		// this only triggers if we get a button response, so initial message means this is skipped

		if (interaction.isButton()) {

			await interaction.update({ content: `Loading...`, embeds: [], components: [], ephemeral: true });

			const buttonData = interaction.customId.split(':');

			const button = buttonData[1];
			const paged = buttonData[2];
			const page = buttonData[3];
			const pages = buttonData[4];
			const overseerrUserID = buttonData[5];
			// buttonData gets rehydrated with the data from the button's custom id as below:
			// 0: media (static)
			// 1: button clicked (next or prev)
			// 2: if this interaction is paged
			// 3: current page
			// 4: max pages
			// 5: overseerr user ID

			// page gets multiplied by 20 to skip results
			let newResult;
			if (button == 'prev') {
				newResult = await getRequests(overseerrUserID, paged, parseInt(page) - 1, pages);
			}
			if (button == 'next') {
				newResult = await getRequests(overseerrUserID, paged, parseInt(page) + 1, pages);
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

		// const requesterName = tag.get('name');
		await interaction.deferReply({ ephemeral: true });

		// get results from overseerr api
		const result = await getRequests(overseerrUserID);

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
				.setCustomId(`media:prev:${result.paged}:${result.page}:${result.pages}:${result.overseerrUserID}`)
				.setLabel('Previous Page')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(result.pagePrevDisabled),
			new ButtonBuilder()
				.setCustomId(`media:next:${result.paged}:${result.page}:${result.pages}:${result.overseerrUserID}`)
				.setLabel('Next Page')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(result.pageNextDisabled),
		);

	return message;
}

async function getRequests(overseerrUserID, paged = false, page = 1, onLastPage = true) {

	let url;
	let pageNextDisabled = false;
	let pagePrevDisabled = false;

	if (paged == false) {
		url = `${process.env.OVERSEERR_URL}/api/v1/user/${overseerrUserID}/requests?take=20`;
		pagePrevDisabled = true;
	} else {

		// skip results depending on what page we're on
		const skipResultCount = ((page - 1) * 15);
		// we need to take one off of page since 1 * 20 means we're skipping the first page so technically we'd end up on page 2
		// hope that makes sense :)

		url = `${process.env.OVERSEERR_URL}/api/v1/user/${overseerrUserID}/requests?take=20&skip=${skipResultCount}`;
	}

	const req = await request(url, {
		headers: { 'X-Api-Key': process.env.OVERSEERR_API_KEY },
	});
	const response = await req.body.json();

	if (response.pageInfo.pages > 1) {

		// we need to check if we're on the last page, check if current page equal to total pages
		if (response.pageInfo.page != response.pageInfo.pages) {
			onLastPage = false;
		} else {
			// if page does equal pages, then we're on the first page or last page
			onLastPage = true;
			pageNextDisabled = true;
		}

		if (response.pageInfo.page == 1) {
			// if we're on page 1, disable prev button
			pagePrevDisabled = true;
		}

		paged = true;
	}

	if (response.pageInfo.pages == 1) {
		// there's only 1 page, disable both of the buttons
		onLastPage = true;
		pageNextDisabled = true;
		pagePrevDisabled = true;
	}

	const result = [];
	// if the results are paged
	result['paged'] = paged;
	// how many pages are in the results
	result['pages'] = response.pageInfo.pages;
	// current page
	result['page'] = response.pageInfo.page;
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
	for await (const requestItem of response.results) {
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
