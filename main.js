function TeamSpeakListener() {
  'use strict';
  const TeamSpeakClient = require("node-teamspeak");
  const TelegramBot = require('node-telegram-bot-api');
  const mongoose = require('mongoose');
  const fs = require('fs');

  const parsedJson = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
  const server = parsedJson.server;
  const port = parsedJson.port;
  const queryPort = parsedJson.queryPort;

  const cl = new TeamSpeakClient(server, queryPort);

  const bot = new TelegramBot(parsedJson.botApiKey, {polling: true});

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

  db.once('open', () => {
    bot.onText(/\/start/, (msg) => {
      Users.findOneAndUpdate({tgUserId: msg.from.id}, {tgUserId: msg.from.id}, {upsert: true}, (err, result) => {
        if (result) {
          console.log(result);
          bot.sendMessage(msg.from.id, 'Welcome to the TSOBot');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to Register your Telegram Account.');
        }
      });
    });

    bot.onText(/\/subscribeall/, (msg) => {
      Users.findOneAndUpdate({tgUserId: msg.from.id}, {notifyAll: true}, (err, result) => {
        if (result) {
          bot.sendMessage(msg.from.id, 'You will receive a notification if any user joins the server.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to subscribe.');
        }
      });
    });

    bot.onText(/\/unsubscribeall/, (msg) => {
      Users.findOneAndUpdate({tgUserId: msg.from.id}, {notifyAll: false}, (err, result) => {
        if (result) {
          bot.sendMessage(msg.from.id, 'You will only receive notifications for users you specified.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to subscribe.');
        }
      });
    });

    bot.onText(/\/subscribe (.+)/, (msg, match) => {
      Users.findOneAndUpdate({tgUserId: msg.from.id}, {$addToSet: {tsUserNames: match[1]}}, (err, result) => {
        if(result) {
          bot.sendMessage(msg.from.id, 'You will receive a notification once ' + match[1] + ' joins the server.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to subscribe.');
        }
      });
    });

    bot.onText(/\/unsubscribe (.+)/, (msg, match) => {
      Users.findOneAndUpdate({tgUserId: msg.from.id}, {$pull: {tsUserNames: match[1]}}, (err, result) => {
        if(result) {
          bot.sendMessage(msg.from.id, 'You won\'t receive a notification once ' + match[1] + ' joins the server.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to unsubscribe.');
        }
      });
    });
  });

  bot.onText(/\/subscriptions/, (msg) => {
    Users.findOne({tgUserId: msg.from.id}, (err, result) => {
      if(result) {
        let subscriptions = "";
        result.tsUserNames.forEach((element) => {
          subscriptions = subscriptions + element + "\n";
        });
        if (result.notifyAll) {
          bot.sendMessage(msg.from.id, 'You subscribed to all users.');
        }
        else if (subscriptions) {
          bot.sendMessage(msg.from.id, 'You subscribed to: \n' + subscriptions);
        } else {
          bot.sendMessage(msg.from.id, 'You don\'t have any subscription.');
        }
      }
      if (err) {
        bot.sendMessage(msg.from.id, 'Request failed.');
      }
    });
  });


  serverNotifyRegister();
  handleClientEnterView();

  function serverNotifyRegister() {
    cl.send("use", {port: port || 9987}, () => {
      cl.send("servernotifyregister", {event: "server"}, () => {
      });
    });
  }

  function handleClientEnterView() {
    cl.on("cliententerview", (resp) => {
      //noinspection JSUnresolvedVariable
      Users.find({$or: [{tsUserNames: resp.client_nickname}, {notifyAll: true}]}).exec((err, result) => {
        if (err) {
          return;
        } if (result) {
          result.forEach((element) => {
            bot.sendMessage(element.tgUserId, resp.client_nickname + " joined the server.");
          });
        }
      });
    });
  }
}

try {
  new TeamSpeakListener();
} catch (ex) {
  console.log("Restart on error.")
  new TeamSpeakListener();
}