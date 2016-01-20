class TeamSpeakListener {
  constructor(server, port, queryPort) {
    const TeamSpeakClient = require("node-teamspeak");
    this.server = server;
    this.port = port;
    this.queryPort = port;
    this.cl = new TeamSpeakClient(server, queryPort);
    this.serverNotifyRegister();
  }

  serverNotifyRegister() {
    this.cl.send("use", {port: this.port}, () => {
      this.cl.send("servernotifyregister", {event: "server"}, () => {
      });
    });
  }

  handleClientEnterView(bot, Users) {
    this.cl.on("cliententerview", (resp) => {
      //noinspection JSUnresolvedVariable
      Users.find({$or: [{tsUserNames: resp.client_nickname}, {notifyAll: true}]}, (err, result) => {
        if (result) {
          for (let user in result) {
            if (result.hasOwnProperty(user)) {
              bot.sendMessage(user.tgUserId, "${resp.client_nickname} joined the server.");
            }
          }
        } if (err) {
          return;
        }
      });
    });
  }
}

export class TSOBot {
  constructor() {
    const TelegramBot = require('node-telegram-bot-api');
    const mongoose = require('mongoose');
    const fs = require('fs');

    const parsedJson = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

    this.bot = new TelegramBot(parsedJson.botApiKey, {polling: true});
    this.tsListener = new TeamSpeakListener(parsedJson.server, parsedJson.port, parsedJson.queryPort);

    const usersSchema = new mongoose.Schema(
      {
        "tgUserId": {type: String, index: true},
        "notifyAll": {type: Boolean, default: false},
        "notifyOnDisconnect": {type: Boolean, default: false},
        "tsUserNames": [String]
      }
    );
    const Users = mongoose.model('Users', usersSchema);
    mongoose.connect(parsedJson.mongooseConnection);
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', this.setMessageListeners(Users));

    this.tsListener.handleClientEnterView(this.bot, Users);
  }

  setMessageListeners(Users) {
    this.bot.onText(/\/start/, (msg) => {
      Users.findOneAndUpdate({tgUserId: msg.from.id}, {upsert: true}, (err, result) => {
        if (result) {
          this.bot.sendMessage(msg.from.id, 'Welcome to the TSOBot');
        }
        if (err) {
          this.bot.sendMessage(msg.from.id, 'Failed to Register your Telegram Account.');
        }
      });
    });

    this.bot.onText(/\/subscribeall/, (msg) => {
      Users.findOneAndUpdate({TgUserId: msg.from.id}, {"notifyAll": true}, (err, result) => {
        if (result) {
          this.bot.sendMessage(msg.from.id, 'You will receive a notification if any user connects to the server.');
        }
        if (err) {
          this.bot.sendMessage(msg.from.id, 'Failed to subscribe.');
        }
      });
    });
  }
}

