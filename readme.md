# TSOBot
This is a notification bot for TeamSpeak 3 servers. It sends a notification via Telegram once new users join a specific TS3 server.

## Installation
Before installing TSBot, make sure to set the right *b_virtualserver_notify_register* for guests on you TS3 server.

Create a new Telegram bot by sending a message to @Botfather in Telegram. He'll send you your Bot API key and gives you all information you need to run your bot. You'll find further information concerning bots at [Telegram].

TSOBot utilizes MongoDB to store active subscriptions. Therefore a running MongoDB instance is mandatory. Download and install it from [here].

Go ahead and install TSOBot via npm:

```sh
npm install tsobot
```

Navigate to the folder of the newly installed TSOBot module. Create a new ```settings.json``` file by copying the existing ```settingsExample.json``` and fill it with your personal settings:

  * **botApiKey**: You'll receive this from Telegrams @Botfather.
  * **mongooseConnection**: Connection string for your MongoDB database.
  * **server**: IP or hostname of your TS3 server.
  * **port**: TS3 server port. If empty, default port will be used (9987).
  * **queryPort**: TS3 ServerQuery port. If empty, default port will be used

[Telegram]: https://core.telegram.org/bots
[here]: https://www.mongodb.org/


## Usage

These commmands are supported:

  * **/start** - Initial command to start conversation with the bot.
  * **/stop or /stahp** - Omit this command and you'll never hear anything again from the bot. All your subscriptions will be deleted.
  * **/subscribeall** - Get notified if any user connects to the TS3 server.
  * **/unsubscribeall** - Don't get notified for every user that joins the server. If you subscribed to specific users, you'll keep getting notifications for them.
  * **/subscribe** *username* - Get notified if the specified *username* joins the server.
  * **/unsubscribe** *username* - Don't get notified if the specified *username* joins the server.
  * **/subscriptions** Show all active subscriptions.

## Development
TSOBot was developed on node.js with ES2015.