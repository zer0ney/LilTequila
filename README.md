# 😵‍💫:tumbler_glass: Lil Tequila

A Discord.js bot that lets users remove media they've finished watching from Plex, giving them direct control over media they request. 

![Image of a list of requested media items with IDs](https://github.com/zer0ney/LilTequila/assets/19390566/a8cd2409-7e95-4fd4-871d-371913abf808)

## Requirements

You'll need to install Node.js to run the bot. Download it from [here.](https://nodejs.org/en)

If you don't already have Overseerr set up, check it out [here.](https://overseerr.dev/)

If you're already using [Sonarr](https://sonarr.tv/) and [Radarr](https://radarr.video/), then you're good to go!

You'll also need to [create a Discord bot](https://discord.com/developers/applications) and join it to the server you want to use the bot in.
FWIW: The bot's only designed for use on a single server.

## Setup

- Clone the repo into a folder.
- Open `example.env` and change all of the fields as required, then rename the file to `.env`.
- Open up a command prompt (or a PowerShell window! I won't judge) and navigate to the folder where the bot is.
- Run `npm install` and wait for the dependencies to install.
- Run `node refreshCommands.js`. You should see output stating `Successfully reloaded 3 application (/) commands.`
- Now run `node index.js` - your bot should come online in your server!

You'll now need to add users to the bot using the `/add-user` command - have their Discord ID and Overseerr ID on hand (easily found on their profile in Overseerr).

Once all users are added they can now use `/show-media` and `/remove-media` to manage their media files.

## FAQ

### How do I join my bot to a server?

You can follow the steps on the Discord.js Guide page [here.](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links)

### The bot isn't coming online! What's gone wrong?

Check the output in your console, and double triple check your fields in `.env` are all correct.

### I'm still having issues!

That's not really a question, is it? Get in touch with me on Discord at zer0ney#0025.
