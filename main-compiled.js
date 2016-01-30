'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TeamSpeakListener = TeamSpeakListener;
function TeamSpeakListener() {
  'use strict';

  var TeamSpeakClient = require("node-teamspeak");
  var TelegramBot = require('node-telegram-bot-api');
  var mongoose = require('mongoose');
  var fs = require('fs');

  var parsedJson = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
  var helpText = "The following commands are supported: \n\n" + "/help - Show this help.\n\n" + "/start - Initial command to start conversation with the bot.\n\n" + "/stop or /stahp - Omit this command and you'll never hear anything again from the bot. All your subscriptions will be deleted.\n\n" + "/subscribeall - Get notified if any user connects to the TS3 server.\n\n" + "/unsubscribeall - Don't get notified for every user that joins the server. If you subscribed to specific users, you'll keep getting notifications for them.\n\n" + "/subscribe [username] - Get notified if the specified [username] joins the server.\n\n" + "/unsubscribe [username] - Don't get notified if the specified [username} joins the server.\n\n" + "/subscriptions - Show all active subscriptions.";

  var server = parsedJson.server;
  var port = parsedJson.port;
  var queryPort = parsedJson.queryPort;

  var cl = new TeamSpeakClient(server, queryPort);

  cl.on("error", function (err) {
    cl = new TeamSpeakClient(server, queryPort);
    serverNotifyRegister();
    handleClientEnterView();
  });

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
          bot.sendMessage(msg.from.id, helpText);
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to register your Telegram account.');
        }
      });
    });

    bot.onText(/\/stop|\/stahp/, function (msg) {
      Users.remove({ tgUserId: msg.from.id }, function (err) {
        if (!err) {
          bot.sendMessage(msg.from.id, 'You\'ll never hear anything from me again.');
        }
        if (err) {
          bot.sendMessage(msg.from.id, 'Failed to persist in database');
        }
      });
    });

    bot.onText(/\/help/, function (msg) {
      bot.sendMessage(msg.from.id, helpText);
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

    bot.onText(/\/subscribe$/, function (msg) {
      bot.sendMessage(msg.from.id, 'Please enter a username for /subscribe.');
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

  bot.onText(/\/unsubscribe$/, function (msg) {
    bot.sendMessage(msg.from.id, 'Please enter a username for /unsubscribe..');
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

var listener = new TeamSpeakListener();

//# sourceMappingURL=main-compiled.js.map