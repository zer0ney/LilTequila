# 😵‍💫:tumbler_glass: Lil Tequila 🌅🏖️

A Discord.js bot that lets users remove media they've finished watching from Plex as well as the original requests from Overseerr/Sonarr/Radarr, giving them direct control over media they request. 

![Screenshot 2023-05-18 223130](https://github.com/zer0ney/LilTequila/assets/19390566/d0021776-fbab-4db9-ad21-608b5a6508ab)

## Requirements

You'll need to install Node.js to run the bot. Download it from [here.](https://nodejs.org/en)

If you don't already have Overseerr set up, check it out [here.](https://overseerr.dev/)

If you're already using [Sonarr](https://sonarr.tv/) and [Radarr](https://radarr.video/) then you're good to go!

You'll also need to [create a Discord bot](https://discord.com/developers/applications) and join it to the server you want to use the bot in.
FWIW: The bot's only designed for use on a single server.

## Setup

- Clone the repo into a folder.
- Open `example.env` and change all of the fields as required, then rename the file to `.env`.
- Open up a command prompt and navigate to the folder where the bot is.
- Run `npm install` and wait for the dependencies to install.
- Run `node utilities/refreshCommands.js`. You should see output stating `Successfully reloaded 5 application (/) commands.`
- Now run `node index.js` - your bot should come online in your server!

You'll now need to add your users to the bot. Get their Discord ID from Discord ([here's how](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-)) and their Overseerr ID from their user's profile in Overseerr:

![firefox_3Nrbk5us4b](https://github.com/zer0ney/LilTequila/assets/19390566/6deab4cd-50c5-4c2e-a9a2-83a5220f130e)

Now you can use `/add-user` to add your users:

![Screenshot 2023-05-18 234111](https://github.com/zer0ney/LilTequila/assets/19390566/43a76915-571f-4830-8737-943670695997)

You can double check the user is registered in the bot with `/show-users`.

Once all the users are added they can now use `/show-media` and `/remove-media` to manage their media files.

## FAQ

### What are all of the commands?

| Command | Description |
| --- | --- |
| `/add-user`  | Adds a user to the bot so they can see their media and remove it. Only usable by the admin.  |
| `/show-users`  | Lists all users. Only usable by the admin.  |
| `/remove-user` | Removes a user from the bot. Only usable by the admin. |
| `/show-media` | Gets all of the media you've requested from your Overseerr ID. |
| `/remove-media` | Removes media with the ID you get from `/show-media`. You can't remove someone else's media. |

### How do I join my bot to a server?

You can follow the steps on the Discord.js Guide page [here.](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links)

### The bot isn't coming online! What's gone wrong?

Check the output in your console, and **double triple check** your fields in `.env` are all correct.

### I'm still having issues!

That's not really a question, is it? Get in touch with me on Discord at zer0ney#0025.
