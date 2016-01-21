'use strict';

function TeamSpeakListener() {
  'use strict';

  var TeamSpeakClient = require("node-teamspeak");
  var TelegramBot = require('node-telegram-bot-api');
  var mongoose = require('mongoose');
  var fs = require('fs');

  var parsedJson = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
  var server = parsedJson.server;
  var port = parsedJson.port;
  var queryPort = parsedJson.queryPort;

  var cl = new TeamSpeakClient(server, queryPort);

  var bot = new TelegramBot(parsedJson.botApiKey, { polling: true });

  var usersSchema = new mongoose.Schema({
    "tgUserId": { type: String, index: true },
    "notifyAll": { type: Boolean, default: false },
    "notifyOnDisconnect": { type: Boolean, default: false },
    "tsUserNames": [String]
  });
  var Users = mongoose.model('Users', usersSchema);
  mongoose.connect(parsedJson.mongooseConnection);
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));

  db.once('open', function () {
    bot.onText(/\/start/, function (msg) {
      Users.findOneAndUpdate({ tgUserId: msg.from.id }, { tgUserId: msg.from.id }, { upsert: true }, function (err, result) {
        if (result) {
          console.log(result);
          bot.sendMessage(msg.from.id, 'Welcome to the TSOBot');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to Register your Telegram Account.');
        }
      });
    });

    bot.onText(/\/subscribeall/, function (msg) {
      Users.findOneAndUpdate({ tgUserId: msg.from.id }, { notifyAll: true }, function (err, result) {
        if (result) {
          bot.sendMessage(msg.from.id, 'You will receive a notification if any user joins the server.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to subscribe.');
        }
      });
    });

    bot.onText(/\/unsubscribeall/, function (msg) {
      Users.findOneAndUpdate({ tgUserId: msg.from.id }, { notifyAll: false }, function (err, result) {
        if (result) {
          bot.sendMessage(msg.from.id, 'You will only receive notifications for users you specified.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to subscribe.');
        }
      });
    });

    bot.onText(/\/subscribe (.+)/, function (msg, match) {
      Users.findOneAndUpdate({ tgUserId: msg.from.id }, { $addToSet: { tsUserNames: match[1] } }, function (err, result) {
        if (result) {
          bot.sendMessage(msg.from.id, 'You will receive a notification once ' + match[1] + ' joins the server.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to subscribe.');
        }
      });
    });

    bot.onText(/\/unsubscribe (.+)/, function (msg, match) {
      Users.findOneAndUpdate({ tgUserId: msg.from.id }, { $pull: { tsUserNames: match[1] } }, function (err, result) {
        if (result) {
          bot.sendMessage(msg.from.id, 'You won\'t receive a notification once ' + match[1] + ' joins the server.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to unsubscribe.');
        }
      });
    });
  });

  bot.onText(/\/subscriptions/, function (msg) {
    Users.findOne({ tgUserId: msg.from.id }, function (err, result) {
      if (result) {
        (function () {
          var subscriptions = "";
          result.tsUserNames.forEach(function (element) {
            subscriptions = subscriptions + element + "\n";
          });
          if (result.notifyAll) {
            bot.sendMessage(msg.from.id, 'You subscribed to all users.');
          } else if (subscriptions) {
            bot.sendMessage(msg.from.id, 'You subscribed to: \n' + subscriptions);
          } else {
            bot.sendMessage(msg.from.id, 'You don\'t have any subscription.');
          }
        })();
      }
      if (err) {
        bot.sendMessage(msg.from.id, 'Request failed.');
      }
    });
  });

  serverNotifyRegister();
  handleClientEnterView();

  function serverNotifyRegister() {
    cl.send("use", { port: port || 9987 }, function () {
      cl.send("servernotifyregister", { event: "server" }, function () {});
    });
  }

  function handleClientEnterView() {
    cl.on("cliententerview", function (resp) {
      //noinspection JSUnresolvedVariable
      Users.find({ $or: [{ tsUserNames: resp.client_nickname }, { notifyAll: true }] }).exec(function (err, result) {
        if (err) {
          return;
        }if (result) {
          result.forEach(function (element) {
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
  console.log("Restart on error.");
  new TeamSpeakListener();
}

//# sourceMappingURL=main-compiled.js.map