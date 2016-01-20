"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TeamSpeakListener = function () {
  function TeamSpeakListener(server, port, queryPort) {
    _classCallCheck(this, TeamSpeakListener);

    var TeamSpeakClient = require("node-teamspeak");
    this.server = server;
    this.port = port;
    this.queryPort = port;
    this.cl = new TeamSpeakClient(server, queryPort);
    this.serverNotifyRegister();
  }

  _createClass(TeamSpeakListener, [{
    key: "serverNotifyRegister",
    value: function serverNotifyRegister() {
      var _this = this;

      this.cl.send("use", { port: this.port }, function () {
        _this.cl.send("servernotifyregister", { event: "server" }, function () {});
      });
    }
  }, {
    key: "handleClientEnterView",
    value: function handleClientEnterView(bot, Users) {
      this.cl.on("cliententerview", function (resp) {
        //noinspection JSUnresolvedVariable
        Users.find({ $or: [{ tsUserNames: resp.client_nickname }, { notifyAll: true }] }, function (err, result) {
          if (result) {
            for (var user in result) {
              if (result.hasOwnProperty(user)) {
                bot.sendMessage(user.tgUserId, "${resp.client_nickname} joined the server.");
              }
            }
          }if (err) {
            return;
          }
        });
      });
    }
  }]);

  return TeamSpeakListener;
}();

var TSOBot = exports.TSOBot = function () {
  function TSOBot() {
    _classCallCheck(this, TSOBot);

    var TelegramBot = require('node-telegram-bot-api');
    var mongoose = require('mongoose');
    var fs = require('fs');

    var parsedJson = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

    this.bot = new TelegramBot(parsedJson.botApiKey, { polling: true });
    this.tsListener = new TeamSpeakListener(parsedJson.server, parsedJson.port, parsedJson.queryPort);

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
    db.once('open', this.setMessageListeners(Users));

    this.tsListener.handleClientEnterView(this.bot, Users);
  }

  _createClass(TSOBot, [{
    key: "setMessageListeners",
    value: function setMessageListeners(Users) {
      var _this2 = this;

      this.bot.onText(/\/start/, function (msg) {
        Users.findOneAndUpdate({ tgUserId: msg.from.id }, { upsert: true }, function (err, result) {
          if (result) {
            _this2.bot.sendMessage(msg.from.id, 'Welcome to the TSOBot');
          }
          if (err) {
            _this2.bot.sendMessage(msg.from.id, 'Failed to Register your Telegram Account.');
          }
        });
      });

      this.bot.onText(/\/subscribeall/, function (msg) {
        Users.findOneAndUpdate({ TgUserId: msg.from.id }, { "notifyAll": true }, function (err, result) {
          if (result) {
            _this2.bot.sendMessage(msg.from.id, 'You will receive a notification if any user connects to the server.');
          }
          if (err) {
            _this2.bot.sendMessage(msg.from.id, 'Failed to subscribe.');
          }
        });
      });
    }
  }]);

  return TSOBot;
}();

//# sourceMappingURL=main-compiled.js.map