var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function commonjsRequire(path) {
  throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var mqtt$1 = { exports: {} };
(function(module, exports) {
  (function(f) {
    {
      module.exports = f();
    }
  })(function() {
    return function() {
      function r(e, n, t) {
        function o(i2, f) {
          if (!n[i2]) {
            if (!e[i2]) {
              var c = typeof commonjsRequire == "function" && commonjsRequire;
              if (!f && c)
                return c(i2, true);
              if (u)
                return u(i2, true);
              var a = new Error("Cannot find module '" + i2 + "'");
              throw a.code = "MODULE_NOT_FOUND", a;
            }
            var p = n[i2] = { exports: {} };
            e[i2][0].call(p.exports, function(r2) {
              var n2 = e[i2][1][r2];
              return o(n2 || r2);
            }, p, p.exports, r, e, n, t);
          }
          return n[i2].exports;
        }
        for (var u = typeof commonjsRequire == "function" && commonjsRequire, i = 0; i < t.length; i++)
          o(t[i]);
        return o;
      }
      return r;
    }()({ 1: [function(require2, module2, exports2) {
      (function(process, global2) {
        (function() {
          const EventEmitter = require2("events").EventEmitter;
          const Store = require2("./store");
          const TopicAliasRecv = require2("./topic-alias-recv");
          const TopicAliasSend = require2("./topic-alias-send");
          const mqttPacket = require2("mqtt-packet");
          const DefaultMessageIdProvider = require2("./default-message-id-provider");
          const Writable = require2("readable-stream").Writable;
          const inherits = require2("inherits");
          const reInterval = require2("reinterval");
          const clone = require2("rfdc/default");
          const validations = require2("./validations");
          const xtend = require2("xtend");
          const debug = require2("debug")("mqttjs:client");
          const nextTick = process ? process.nextTick : function(callback) {
            setTimeout(callback, 0);
          };
          const setImmediate = global2.setImmediate || function(callback) {
            nextTick(callback);
          };
          const defaultConnectOptions = {
            keepalive: 60,
            reschedulePings: true,
            protocolId: "MQTT",
            protocolVersion: 4,
            reconnectPeriod: 1e3,
            connectTimeout: 30 * 1e3,
            clean: true,
            resubscribe: true
          };
          const socketErrors = [
            "ECONNREFUSED",
            "EADDRINUSE",
            "ECONNRESET",
            "ENOTFOUND"
          ];
          const errors = {
            0: "",
            1: "Unacceptable protocol version",
            2: "Identifier rejected",
            3: "Server unavailable",
            4: "Bad username or password",
            5: "Not authorized",
            16: "No matching subscribers",
            17: "No subscription existed",
            128: "Unspecified error",
            129: "Malformed Packet",
            130: "Protocol Error",
            131: "Implementation specific error",
            132: "Unsupported Protocol Version",
            133: "Client Identifier not valid",
            134: "Bad User Name or Password",
            135: "Not authorized",
            136: "Server unavailable",
            137: "Server busy",
            138: "Banned",
            139: "Server shutting down",
            140: "Bad authentication method",
            141: "Keep Alive timeout",
            142: "Session taken over",
            143: "Topic Filter invalid",
            144: "Topic Name invalid",
            145: "Packet identifier in use",
            146: "Packet Identifier not found",
            147: "Receive Maximum exceeded",
            148: "Topic Alias invalid",
            149: "Packet too large",
            150: "Message rate too high",
            151: "Quota exceeded",
            152: "Administrative action",
            153: "Payload format invalid",
            154: "Retain not supported",
            155: "QoS not supported",
            156: "Use another server",
            157: "Server moved",
            158: "Shared Subscriptions not supported",
            159: "Connection rate exceeded",
            160: "Maximum connect time",
            161: "Subscription Identifiers not supported",
            162: "Wildcard Subscriptions not supported"
          };
          function defaultId() {
            return "mqttjs_" + Math.random().toString(16).substr(2, 8);
          }
          function applyTopicAlias(client2, packet) {
            if (client2.options.protocolVersion === 5) {
              if (packet.cmd === "publish") {
                let alias;
                if (packet.properties) {
                  alias = packet.properties.topicAlias;
                }
                const topic = packet.topic.toString();
                if (client2.topicAliasSend) {
                  if (alias) {
                    if (topic.length !== 0) {
                      debug("applyTopicAlias :: register topic: %s - alias: %d", topic, alias);
                      if (!client2.topicAliasSend.put(topic, alias)) {
                        debug("applyTopicAlias :: error out of range. topic: %s - alias: %d", topic, alias);
                        return new Error("Sending Topic Alias out of range");
                      }
                    }
                  } else {
                    if (topic.length !== 0) {
                      if (client2.options.autoAssignTopicAlias) {
                        alias = client2.topicAliasSend.getAliasByTopic(topic);
                        if (alias) {
                          packet.topic = "";
                          packet.properties = __spreadProps(__spreadValues({}, packet.properties), { topicAlias: alias });
                          debug("applyTopicAlias :: auto assign(use) topic: %s - alias: %d", topic, alias);
                        } else {
                          alias = client2.topicAliasSend.getLruAlias();
                          client2.topicAliasSend.put(topic, alias);
                          packet.properties = __spreadProps(__spreadValues({}, packet.properties), { topicAlias: alias });
                          debug("applyTopicAlias :: auto assign topic: %s - alias: %d", topic, alias);
                        }
                      } else if (client2.options.autoUseTopicAlias) {
                        alias = client2.topicAliasSend.getAliasByTopic(topic);
                        if (alias) {
                          packet.topic = "";
                          packet.properties = __spreadProps(__spreadValues({}, packet.properties), { topicAlias: alias });
                          debug("applyTopicAlias :: auto use topic: %s - alias: %d", topic, alias);
                        }
                      }
                    }
                  }
                } else if (alias) {
                  debug("applyTopicAlias :: error out of range. topic: %s - alias: %d", topic, alias);
                  return new Error("Sending Topic Alias out of range");
                }
              }
            }
          }
          function removeTopicAliasAndRecoverTopicName(client2, packet) {
            let alias;
            if (packet.properties) {
              alias = packet.properties.topicAlias;
            }
            let topic = packet.topic.toString();
            if (topic.length === 0) {
              if (typeof alias === "undefined") {
                return new Error("Unregistered Topic Alias");
              } else {
                topic = client2.topicAliasSend.getTopicByAlias(alias);
                if (typeof topic === "undefined") {
                  return new Error("Unregistered Topic Alias");
                } else {
                  packet.topic = topic;
                }
              }
            }
            if (alias) {
              delete packet.properties.topicAlias;
            }
          }
          function sendPacket(client2, packet, cb) {
            debug("sendPacket :: packet: %O", packet);
            debug("sendPacket :: emitting `packetsend`");
            client2.emit("packetsend", packet);
            debug("sendPacket :: writing to stream");
            const result = mqttPacket.writeToStream(packet, client2.stream, client2.options);
            debug("sendPacket :: writeToStream result %s", result);
            if (!result && cb && cb !== nop) {
              debug("sendPacket :: handle events on `drain` once through callback.");
              client2.stream.once("drain", cb);
            } else if (cb) {
              debug("sendPacket :: invoking cb");
              cb();
            }
          }
          function flush(queue) {
            if (queue) {
              debug("flush: queue exists? %b", !!queue);
              Object.keys(queue).forEach(function(messageId) {
                if (typeof queue[messageId].cb === "function") {
                  queue[messageId].cb(new Error("Connection closed"));
                  delete queue[messageId];
                }
              });
            }
          }
          function flushVolatile(queue) {
            if (queue) {
              debug("flushVolatile :: deleting volatile messages from the queue and setting their callbacks as error function");
              Object.keys(queue).forEach(function(messageId) {
                if (queue[messageId].volatile && typeof queue[messageId].cb === "function") {
                  queue[messageId].cb(new Error("Connection closed"));
                  delete queue[messageId];
                }
              });
            }
          }
          function storeAndSend(client2, packet, cb, cbStorePut) {
            debug("storeAndSend :: store packet with cmd %s to outgoingStore", packet.cmd);
            let storePacket = packet;
            let err;
            if (storePacket.cmd === "publish") {
              storePacket = clone(packet);
              err = removeTopicAliasAndRecoverTopicName(client2, storePacket);
              if (err) {
                return cb && cb(err);
              }
            }
            client2.outgoingStore.put(storePacket, function storedPacket(err2) {
              if (err2) {
                return cb && cb(err2);
              }
              cbStorePut();
              sendPacket(client2, packet, cb);
            });
          }
          function nop(error) {
            debug("nop ::", error);
          }
          function MqttClient(streamBuilder, options) {
            let k;
            const that = this;
            if (!(this instanceof MqttClient)) {
              return new MqttClient(streamBuilder, options);
            }
            this.options = options || {};
            for (k in defaultConnectOptions) {
              if (typeof this.options[k] === "undefined") {
                this.options[k] = defaultConnectOptions[k];
              } else {
                this.options[k] = options[k];
              }
            }
            debug("MqttClient :: options.protocol", options.protocol);
            debug("MqttClient :: options.protocolVersion", options.protocolVersion);
            debug("MqttClient :: options.username", options.username);
            debug("MqttClient :: options.keepalive", options.keepalive);
            debug("MqttClient :: options.reconnectPeriod", options.reconnectPeriod);
            debug("MqttClient :: options.rejectUnauthorized", options.rejectUnauthorized);
            debug("MqttClient :: options.topicAliasMaximum", options.topicAliasMaximum);
            this.options.clientId = typeof options.clientId === "string" ? options.clientId : defaultId();
            debug("MqttClient :: clientId", this.options.clientId);
            this.options.customHandleAcks = options.protocolVersion === 5 && options.customHandleAcks ? options.customHandleAcks : function() {
              arguments[3](0);
            };
            this.streamBuilder = streamBuilder;
            this.messageIdProvider = typeof this.options.messageIdProvider === "undefined" ? new DefaultMessageIdProvider() : this.options.messageIdProvider;
            this.outgoingStore = options.outgoingStore || new Store();
            this.incomingStore = options.incomingStore || new Store();
            this.queueQoSZero = options.queueQoSZero === void 0 ? true : options.queueQoSZero;
            this._resubscribeTopics = {};
            this.messageIdToTopic = {};
            this.pingTimer = null;
            this.connected = false;
            this.disconnecting = false;
            this.queue = [];
            this.connackTimer = null;
            this.reconnectTimer = null;
            this._storeProcessing = false;
            this._packetIdsDuringStoreProcessing = {};
            this._storeProcessingQueue = [];
            this.outgoing = {};
            this._firstConnection = true;
            if (options.topicAliasMaximum > 0) {
              if (options.topicAliasMaximum > 65535) {
                debug("MqttClient :: options.topicAliasMaximum is out of range");
              } else {
                this.topicAliasRecv = new TopicAliasRecv(options.topicAliasMaximum);
              }
            }
            this.on("connect", function() {
              const queue = this.queue;
              function deliver() {
                const entry = queue.shift();
                debug("deliver :: entry %o", entry);
                let packet = null;
                if (!entry) {
                  that._resubscribe();
                  return;
                }
                packet = entry.packet;
                debug("deliver :: call _sendPacket for %o", packet);
                let send = true;
                if (packet.messageId && packet.messageId !== 0) {
                  if (!that.messageIdProvider.register(packet.messageId)) {
                    send = false;
                  }
                }
                if (send) {
                  that._sendPacket(packet, function(err) {
                    if (entry.cb) {
                      entry.cb(err);
                    }
                    deliver();
                  });
                } else {
                  debug("messageId: %d has already used. The message is skipped and removed.", packet.messageId);
                  deliver();
                }
              }
              debug("connect :: sending queued packets");
              deliver();
            });
            this.on("close", function() {
              debug("close :: connected set to `false`");
              this.connected = false;
              debug("close :: clearing connackTimer");
              clearTimeout(this.connackTimer);
              debug("close :: clearing ping timer");
              if (that.pingTimer !== null) {
                that.pingTimer.clear();
                that.pingTimer = null;
              }
              if (this.topicAliasRecv) {
                this.topicAliasRecv.clear();
              }
              debug("close :: calling _setupReconnect");
              this._setupReconnect();
            });
            EventEmitter.call(this);
            debug("MqttClient :: setting up stream");
            this._setupStream();
          }
          inherits(MqttClient, EventEmitter);
          MqttClient.prototype._setupStream = function() {
            const that = this;
            const writable = new Writable();
            const parser = mqttPacket.parser(this.options);
            let completeParse = null;
            const packets = [];
            debug("_setupStream :: calling method to clear reconnect");
            this._clearReconnect();
            debug("_setupStream :: using streamBuilder provided to client to create stream");
            this.stream = this.streamBuilder(this);
            parser.on("packet", function(packet) {
              debug("parser :: on packet push to packets array.");
              packets.push(packet);
            });
            function nextTickWork() {
              if (packets.length) {
                nextTick(work);
              } else {
                const done = completeParse;
                completeParse = null;
                done();
              }
            }
            function work() {
              debug("work :: getting next packet in queue");
              const packet = packets.shift();
              if (packet) {
                debug("work :: packet pulled from queue");
                that._handlePacket(packet, nextTickWork);
              } else {
                debug("work :: no packets in queue");
                const done = completeParse;
                completeParse = null;
                debug("work :: done flag is %s", !!done);
                if (done)
                  done();
              }
            }
            writable._write = function(buf, enc, done) {
              completeParse = done;
              debug("writable stream :: parsing buffer");
              parser.parse(buf);
              work();
            };
            function streamErrorHandler(error) {
              debug("streamErrorHandler :: error", error.message);
              if (socketErrors.includes(error.code)) {
                debug("streamErrorHandler :: emitting error");
                that.emit("error", error);
              } else {
                nop(error);
              }
            }
            debug("_setupStream :: pipe stream to writable stream");
            this.stream.pipe(writable);
            this.stream.on("error", streamErrorHandler);
            this.stream.on("close", function() {
              debug("(%s)stream :: on close", that.options.clientId);
              flushVolatile(that.outgoing);
              debug("stream: emit close to MqttClient");
              that.emit("close");
            });
            debug("_setupStream: sending packet `connect`");
            const connectPacket = Object.create(this.options);
            connectPacket.cmd = "connect";
            if (this.topicAliasRecv) {
              if (!connectPacket.properties) {
                connectPacket.properties = {};
              }
              if (this.topicAliasRecv) {
                connectPacket.properties.topicAliasMaximum = this.topicAliasRecv.max;
              }
            }
            sendPacket(this, connectPacket);
            parser.on("error", this.emit.bind(this, "error"));
            if (this.options.properties) {
              if (!this.options.properties.authenticationMethod && this.options.properties.authenticationData) {
                that.end(() => this.emit("error", new Error("Packet has no Authentication Method")));
                return this;
              }
              if (this.options.properties.authenticationMethod && this.options.authPacket && typeof this.options.authPacket === "object") {
                const authPacket = xtend({ cmd: "auth", reasonCode: 0 }, this.options.authPacket);
                sendPacket(this, authPacket);
              }
            }
            this.stream.setMaxListeners(1e3);
            clearTimeout(this.connackTimer);
            this.connackTimer = setTimeout(function() {
              debug("!!connectTimeout hit!! Calling _cleanUp with force `true`");
              that._cleanUp(true);
            }, this.options.connectTimeout);
          };
          MqttClient.prototype._handlePacket = function(packet, done) {
            const options = this.options;
            if (options.protocolVersion === 5 && options.properties && options.properties.maximumPacketSize && options.properties.maximumPacketSize < packet.length) {
              this.emit("error", new Error("exceeding packets size " + packet.cmd));
              this.end({ reasonCode: 149, properties: { reasonString: "Maximum packet size was exceeded" } });
              return this;
            }
            debug("_handlePacket :: emitting packetreceive");
            this.emit("packetreceive", packet);
            switch (packet.cmd) {
              case "publish":
                this._handlePublish(packet, done);
                break;
              case "puback":
              case "pubrec":
              case "pubcomp":
              case "suback":
              case "unsuback":
                this._handleAck(packet);
                done();
                break;
              case "pubrel":
                this._handlePubrel(packet, done);
                break;
              case "connack":
                this._handleConnack(packet);
                done();
                break;
              case "auth":
                this._handleAuth(packet);
                done();
                break;
              case "pingresp":
                this._handlePingresp(packet);
                done();
                break;
              case "disconnect":
                this._handleDisconnect(packet);
                done();
                break;
            }
          };
          MqttClient.prototype._checkDisconnecting = function(callback) {
            if (this.disconnecting) {
              if (callback && callback !== nop) {
                callback(new Error("client disconnecting"));
              } else {
                this.emit("error", new Error("client disconnecting"));
              }
            }
            return this.disconnecting;
          };
          MqttClient.prototype.publish = function(topic, message, opts, callback) {
            debug("publish :: message `%s` to topic `%s`", message, topic);
            const options = this.options;
            if (typeof opts === "function") {
              callback = opts;
              opts = null;
            }
            const defaultOpts = { qos: 0, retain: false, dup: false };
            opts = xtend(defaultOpts, opts);
            if (this._checkDisconnecting(callback)) {
              return this;
            }
            const that = this;
            const publishProc = function() {
              let messageId = 0;
              if (opts.qos === 1 || opts.qos === 2) {
                messageId = that._nextId();
                if (messageId === null) {
                  debug("No messageId left");
                  return false;
                }
              }
              const packet = {
                cmd: "publish",
                topic,
                payload: message,
                qos: opts.qos,
                retain: opts.retain,
                messageId,
                dup: opts.dup
              };
              if (options.protocolVersion === 5) {
                packet.properties = opts.properties;
              }
              debug("publish :: qos", opts.qos);
              switch (opts.qos) {
                case 1:
                case 2:
                  that.outgoing[packet.messageId] = {
                    volatile: false,
                    cb: callback || nop
                  };
                  debug("MqttClient:publish: packet cmd: %s", packet.cmd);
                  that._sendPacket(packet, void 0, opts.cbStorePut);
                  break;
                default:
                  debug("MqttClient:publish: packet cmd: %s", packet.cmd);
                  that._sendPacket(packet, callback, opts.cbStorePut);
                  break;
              }
              return true;
            };
            if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !publishProc()) {
              this._storeProcessingQueue.push({
                invoke: publishProc,
                cbStorePut: opts.cbStorePut,
                callback
              });
            }
            return this;
          };
          MqttClient.prototype.subscribe = function() {
            const that = this;
            const args = new Array(arguments.length);
            for (let i = 0; i < arguments.length; i++) {
              args[i] = arguments[i];
            }
            const subs = [];
            let obj = args.shift();
            const resubscribe = obj.resubscribe;
            let callback = args.pop() || nop;
            let opts = args.pop();
            const version = this.options.protocolVersion;
            delete obj.resubscribe;
            if (typeof obj === "string") {
              obj = [obj];
            }
            if (typeof callback !== "function") {
              opts = callback;
              callback = nop;
            }
            const invalidTopic = validations.validateTopics(obj);
            if (invalidTopic !== null) {
              setImmediate(callback, new Error("Invalid topic " + invalidTopic));
              return this;
            }
            if (this._checkDisconnecting(callback)) {
              debug("subscribe: discconecting true");
              return this;
            }
            const defaultOpts = {
              qos: 0
            };
            if (version === 5) {
              defaultOpts.nl = false;
              defaultOpts.rap = false;
              defaultOpts.rh = 0;
            }
            opts = xtend(defaultOpts, opts);
            if (Array.isArray(obj)) {
              obj.forEach(function(topic) {
                debug("subscribe: array topic %s", topic);
                if (!Object.prototype.hasOwnProperty.call(that._resubscribeTopics, topic) || that._resubscribeTopics[topic].qos < opts.qos || resubscribe) {
                  const currentOpts = {
                    topic,
                    qos: opts.qos
                  };
                  if (version === 5) {
                    currentOpts.nl = opts.nl;
                    currentOpts.rap = opts.rap;
                    currentOpts.rh = opts.rh;
                    currentOpts.properties = opts.properties;
                  }
                  debug("subscribe: pushing topic `%s` and qos `%s` to subs list", currentOpts.topic, currentOpts.qos);
                  subs.push(currentOpts);
                }
              });
            } else {
              Object.keys(obj).forEach(function(k) {
                debug("subscribe: object topic %s", k);
                if (!Object.prototype.hasOwnProperty.call(that._resubscribeTopics, k) || that._resubscribeTopics[k].qos < obj[k].qos || resubscribe) {
                  const currentOpts = {
                    topic: k,
                    qos: obj[k].qos
                  };
                  if (version === 5) {
                    currentOpts.nl = obj[k].nl;
                    currentOpts.rap = obj[k].rap;
                    currentOpts.rh = obj[k].rh;
                    currentOpts.properties = opts.properties;
                  }
                  debug("subscribe: pushing `%s` to subs list", currentOpts);
                  subs.push(currentOpts);
                }
              });
            }
            if (!subs.length) {
              callback(null, []);
              return this;
            }
            const subscribeProc = function() {
              const messageId = that._nextId();
              if (messageId === null) {
                debug("No messageId left");
                return false;
              }
              const packet = {
                cmd: "subscribe",
                subscriptions: subs,
                qos: 1,
                retain: false,
                dup: false,
                messageId
              };
              if (opts.properties) {
                packet.properties = opts.properties;
              }
              if (that.options.resubscribe) {
                debug("subscribe :: resubscribe true");
                const topics = [];
                subs.forEach(function(sub) {
                  if (that.options.reconnectPeriod > 0) {
                    const topic = { qos: sub.qos };
                    if (version === 5) {
                      topic.nl = sub.nl || false;
                      topic.rap = sub.rap || false;
                      topic.rh = sub.rh || 0;
                      topic.properties = sub.properties;
                    }
                    that._resubscribeTopics[sub.topic] = topic;
                    topics.push(sub.topic);
                  }
                });
                that.messageIdToTopic[packet.messageId] = topics;
              }
              that.outgoing[packet.messageId] = {
                volatile: true,
                cb: function(err, packet2) {
                  if (!err) {
                    const granted = packet2.granted;
                    for (let i = 0; i < granted.length; i += 1) {
                      subs[i].qos = granted[i];
                    }
                  }
                  callback(err, subs);
                }
              };
              debug("subscribe :: call _sendPacket");
              that._sendPacket(packet);
              return true;
            };
            if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !subscribeProc()) {
              this._storeProcessingQueue.push({
                invoke: subscribeProc,
                callback
              });
            }
            return this;
          };
          MqttClient.prototype.unsubscribe = function() {
            const that = this;
            const args = new Array(arguments.length);
            for (let i = 0; i < arguments.length; i++) {
              args[i] = arguments[i];
            }
            let topic = args.shift();
            let callback = args.pop() || nop;
            let opts = args.pop();
            if (typeof topic === "string") {
              topic = [topic];
            }
            if (typeof callback !== "function") {
              opts = callback;
              callback = nop;
            }
            const invalidTopic = validations.validateTopics(topic);
            if (invalidTopic !== null) {
              setImmediate(callback, new Error("Invalid topic " + invalidTopic));
              return this;
            }
            if (that._checkDisconnecting(callback)) {
              return this;
            }
            const unsubscribeProc = function() {
              const messageId = that._nextId();
              if (messageId === null) {
                debug("No messageId left");
                return false;
              }
              const packet = {
                cmd: "unsubscribe",
                qos: 1,
                messageId
              };
              if (typeof topic === "string") {
                packet.unsubscriptions = [topic];
              } else if (Array.isArray(topic)) {
                packet.unsubscriptions = topic;
              }
              if (that.options.resubscribe) {
                packet.unsubscriptions.forEach(function(topic2) {
                  delete that._resubscribeTopics[topic2];
                });
              }
              if (typeof opts === "object" && opts.properties) {
                packet.properties = opts.properties;
              }
              that.outgoing[packet.messageId] = {
                volatile: true,
                cb: callback
              };
              debug("unsubscribe: call _sendPacket");
              that._sendPacket(packet);
              return true;
            };
            if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !unsubscribeProc()) {
              this._storeProcessingQueue.push({
                invoke: unsubscribeProc,
                callback
              });
            }
            return this;
          };
          MqttClient.prototype.end = function(force, opts, cb) {
            const that = this;
            debug("end :: (%s)", this.options.clientId);
            if (force == null || typeof force !== "boolean") {
              cb = opts || nop;
              opts = force;
              force = false;
              if (typeof opts !== "object") {
                cb = opts;
                opts = null;
                if (typeof cb !== "function") {
                  cb = nop;
                }
              }
            }
            if (typeof opts !== "object") {
              cb = opts;
              opts = null;
            }
            debug("end :: cb? %s", !!cb);
            cb = cb || nop;
            function closeStores() {
              debug("end :: closeStores: closing incoming and outgoing stores");
              that.disconnected = true;
              that.incomingStore.close(function(e1) {
                that.outgoingStore.close(function(e2) {
                  debug("end :: closeStores: emitting end");
                  that.emit("end");
                  if (cb) {
                    const err = e1 || e2;
                    debug("end :: closeStores: invoking callback with args");
                    cb(err);
                  }
                });
              });
              if (that._deferredReconnect) {
                that._deferredReconnect();
              }
            }
            function finish() {
              debug("end :: (%s) :: finish :: calling _cleanUp with force %s", that.options.clientId, force);
              that._cleanUp(force, () => {
                debug("end :: finish :: calling process.nextTick on closeStores");
                nextTick(closeStores.bind(that));
              }, opts);
            }
            if (this.disconnecting) {
              cb();
              return this;
            }
            this._clearReconnect();
            this.disconnecting = true;
            if (!force && Object.keys(this.outgoing).length > 0) {
              debug("end :: (%s) :: calling finish in 10ms once outgoing is empty", that.options.clientId);
              this.once("outgoingEmpty", setTimeout.bind(null, finish, 10));
            } else {
              debug("end :: (%s) :: immediately calling finish", that.options.clientId);
              finish();
            }
            return this;
          };
          MqttClient.prototype.removeOutgoingMessage = function(messageId) {
            const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null;
            delete this.outgoing[messageId];
            this.outgoingStore.del({ messageId }, function() {
              cb(new Error("Message removed"));
            });
            return this;
          };
          MqttClient.prototype.reconnect = function(opts) {
            debug("client reconnect");
            const that = this;
            const f = function() {
              if (opts) {
                that.options.incomingStore = opts.incomingStore;
                that.options.outgoingStore = opts.outgoingStore;
              } else {
                that.options.incomingStore = null;
                that.options.outgoingStore = null;
              }
              that.incomingStore = that.options.incomingStore || new Store();
              that.outgoingStore = that.options.outgoingStore || new Store();
              that.disconnecting = false;
              that.disconnected = false;
              that._deferredReconnect = null;
              that._reconnect();
            };
            if (this.disconnecting && !this.disconnected) {
              this._deferredReconnect = f;
            } else {
              f();
            }
            return this;
          };
          MqttClient.prototype._reconnect = function() {
            debug("_reconnect: emitting reconnect to client");
            this.emit("reconnect");
            if (this.connected) {
              this.end(() => {
                this._setupStream();
              });
              debug("client already connected. disconnecting first.");
            } else {
              debug("_reconnect: calling _setupStream");
              this._setupStream();
            }
          };
          MqttClient.prototype._setupReconnect = function() {
            const that = this;
            if (!that.disconnecting && !that.reconnectTimer && that.options.reconnectPeriod > 0) {
              if (!this.reconnecting) {
                debug("_setupReconnect :: emit `offline` state");
                this.emit("offline");
                debug("_setupReconnect :: set `reconnecting` to `true`");
                this.reconnecting = true;
              }
              debug("_setupReconnect :: setting reconnectTimer for %d ms", that.options.reconnectPeriod);
              that.reconnectTimer = setInterval(function() {
                debug("reconnectTimer :: reconnect triggered!");
                that._reconnect();
              }, that.options.reconnectPeriod);
            } else {
              debug("_setupReconnect :: doing nothing...");
            }
          };
          MqttClient.prototype._clearReconnect = function() {
            debug("_clearReconnect : clearing reconnect timer");
            if (this.reconnectTimer) {
              clearInterval(this.reconnectTimer);
              this.reconnectTimer = null;
            }
          };
          MqttClient.prototype._cleanUp = function(forced, done) {
            const opts = arguments[2];
            if (done) {
              debug("_cleanUp :: done callback provided for on stream close");
              this.stream.on("close", done);
            }
            debug("_cleanUp :: forced? %s", forced);
            if (forced) {
              if (this.options.reconnectPeriod === 0 && this.options.clean) {
                flush(this.outgoing);
              }
              debug("_cleanUp :: (%s) :: destroying stream", this.options.clientId);
              this.stream.destroy();
            } else {
              const packet = xtend({ cmd: "disconnect" }, opts);
              debug("_cleanUp :: (%s) :: call _sendPacket with disconnect packet", this.options.clientId);
              this._sendPacket(packet, setImmediate.bind(null, this.stream.end.bind(this.stream)));
            }
            if (!this.disconnecting) {
              debug("_cleanUp :: client not disconnecting. Clearing and resetting reconnect.");
              this._clearReconnect();
              this._setupReconnect();
            }
            if (this.pingTimer !== null) {
              debug("_cleanUp :: clearing pingTimer");
              this.pingTimer.clear();
              this.pingTimer = null;
            }
            if (done && !this.connected) {
              debug("_cleanUp :: (%s) :: removing stream `done` callback `close` listener", this.options.clientId);
              this.stream.removeListener("close", done);
              done();
            }
          };
          MqttClient.prototype._sendPacket = function(packet, cb, cbStorePut) {
            debug("_sendPacket :: (%s) ::  start", this.options.clientId);
            cbStorePut = cbStorePut || nop;
            cb = cb || nop;
            const err = applyTopicAlias(this, packet);
            if (err) {
              cb(err);
              return;
            }
            if (!this.connected) {
              if (packet.cmd === "auth") {
                this._shiftPingInterval();
                sendPacket(this, packet, cb);
                return;
              }
              debug("_sendPacket :: client not connected. Storing packet offline.");
              this._storePacket(packet, cb, cbStorePut);
              return;
            }
            this._shiftPingInterval();
            switch (packet.cmd) {
              case "publish":
                break;
              case "pubrel":
                storeAndSend(this, packet, cb, cbStorePut);
                return;
              default:
                sendPacket(this, packet, cb);
                return;
            }
            switch (packet.qos) {
              case 2:
              case 1:
                storeAndSend(this, packet, cb, cbStorePut);
                break;
              case 0:
              default:
                sendPacket(this, packet, cb);
                break;
            }
            debug("_sendPacket :: (%s) ::  end", this.options.clientId);
          };
          MqttClient.prototype._storePacket = function(packet, cb, cbStorePut) {
            debug("_storePacket :: packet: %o", packet);
            debug("_storePacket :: cb? %s", !!cb);
            cbStorePut = cbStorePut || nop;
            let storePacket = packet;
            if (storePacket.cmd === "publish") {
              storePacket = clone(packet);
              const err = removeTopicAliasAndRecoverTopicName(this, storePacket);
              if (err) {
                return cb && cb(err);
              }
            }
            if ((storePacket.qos || 0) === 0 && this.queueQoSZero || storePacket.cmd !== "publish") {
              this.queue.push({ packet: storePacket, cb });
            } else if (storePacket.qos > 0) {
              cb = this.outgoing[storePacket.messageId] ? this.outgoing[storePacket.messageId].cb : null;
              this.outgoingStore.put(storePacket, function(err) {
                if (err) {
                  return cb && cb(err);
                }
                cbStorePut();
              });
            } else if (cb) {
              cb(new Error("No connection to broker"));
            }
          };
          MqttClient.prototype._setupPingTimer = function() {
            debug("_setupPingTimer :: keepalive %d (seconds)", this.options.keepalive);
            const that = this;
            if (!this.pingTimer && this.options.keepalive) {
              this.pingResp = true;
              this.pingTimer = reInterval(function() {
                that._checkPing();
              }, this.options.keepalive * 1e3);
            }
          };
          MqttClient.prototype._shiftPingInterval = function() {
            if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
              this.pingTimer.reschedule(this.options.keepalive * 1e3);
            }
          };
          MqttClient.prototype._checkPing = function() {
            debug("_checkPing :: checking ping...");
            if (this.pingResp) {
              debug("_checkPing :: ping response received. Clearing flag and sending `pingreq`");
              this.pingResp = false;
              this._sendPacket({ cmd: "pingreq" });
            } else {
              debug("_checkPing :: calling _cleanUp with force true");
              this._cleanUp(true);
            }
          };
          MqttClient.prototype._handlePingresp = function() {
            this.pingResp = true;
          };
          MqttClient.prototype._handleConnack = function(packet) {
            debug("_handleConnack");
            const options = this.options;
            const version = options.protocolVersion;
            const rc = version === 5 ? packet.reasonCode : packet.returnCode;
            clearTimeout(this.connackTimer);
            delete this.topicAliasSend;
            if (packet.properties) {
              if (packet.properties.topicAliasMaximum) {
                if (packet.properties.topicAliasMaximum > 65535) {
                  this.emit("error", new Error("topicAliasMaximum from broker is out of range"));
                  return;
                }
                if (packet.properties.topicAliasMaximum > 0) {
                  this.topicAliasSend = new TopicAliasSend(packet.properties.topicAliasMaximum);
                }
              }
              if (packet.properties.serverKeepAlive && options.keepalive) {
                options.keepalive = packet.properties.serverKeepAlive;
                this._shiftPingInterval();
              }
              if (packet.properties.maximumPacketSize) {
                if (!options.properties) {
                  options.properties = {};
                }
                options.properties.maximumPacketSize = packet.properties.maximumPacketSize;
              }
            }
            if (rc === 0) {
              this.reconnecting = false;
              this._onConnect(packet);
            } else if (rc > 0) {
              const err = new Error("Connection refused: " + errors[rc]);
              err.code = rc;
              this.emit("error", err);
            }
          };
          MqttClient.prototype._handleAuth = function(packet) {
            const options = this.options;
            const version = options.protocolVersion;
            const rc = version === 5 ? packet.reasonCode : packet.returnCode;
            if (version !== 5) {
              const err = new Error("Protocol error: Auth packets are only supported in MQTT 5. Your version:" + version);
              err.code = rc;
              this.emit("error", err);
              return;
            }
            const that = this;
            this.handleAuth(packet, function(err, packet2) {
              if (err) {
                that.emit("error", err);
                return;
              }
              if (rc === 24) {
                that.reconnecting = false;
                that._sendPacket(packet2);
              } else {
                const error = new Error("Connection refused: " + errors[rc]);
                err.code = rc;
                that.emit("error", error);
              }
            });
          };
          MqttClient.prototype.handleAuth = function(packet, callback) {
            callback();
          };
          MqttClient.prototype._handlePublish = function(packet, done) {
            debug("_handlePublish: packet %o", packet);
            done = typeof done !== "undefined" ? done : nop;
            let topic = packet.topic.toString();
            const message = packet.payload;
            const qos = packet.qos;
            const messageId = packet.messageId;
            const that = this;
            const options = this.options;
            const validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153];
            if (this.options.protocolVersion === 5) {
              let alias;
              if (packet.properties) {
                alias = packet.properties.topicAlias;
              }
              if (typeof alias !== "undefined") {
                if (topic.length === 0) {
                  if (alias > 0 && alias <= 65535) {
                    const gotTopic = this.topicAliasRecv.getTopicByAlias(alias);
                    if (gotTopic) {
                      topic = gotTopic;
                      debug("_handlePublish :: topic complemented by alias. topic: %s - alias: %d", topic, alias);
                    } else {
                      debug("_handlePublish :: unregistered topic alias. alias: %d", alias);
                      this.emit("error", new Error("Received unregistered Topic Alias"));
                      return;
                    }
                  } else {
                    debug("_handlePublish :: topic alias out of range. alias: %d", alias);
                    this.emit("error", new Error("Received Topic Alias is out of range"));
                    return;
                  }
                } else {
                  if (this.topicAliasRecv.put(topic, alias)) {
                    debug("_handlePublish :: registered topic: %s - alias: %d", topic, alias);
                  } else {
                    debug("_handlePublish :: topic alias out of range. alias: %d", alias);
                    this.emit("error", new Error("Received Topic Alias is out of range"));
                    return;
                  }
                }
              }
            }
            debug("_handlePublish: qos %d", qos);
            switch (qos) {
              case 2: {
                options.customHandleAcks(topic, message, packet, function(error, code) {
                  if (!(error instanceof Error)) {
                    code = error;
                    error = null;
                  }
                  if (error) {
                    return that.emit("error", error);
                  }
                  if (validReasonCodes.indexOf(code) === -1) {
                    return that.emit("error", new Error("Wrong reason code for pubrec"));
                  }
                  if (code) {
                    that._sendPacket({ cmd: "pubrec", messageId, reasonCode: code }, done);
                  } else {
                    that.incomingStore.put(packet, function() {
                      that._sendPacket({ cmd: "pubrec", messageId }, done);
                    });
                  }
                });
                break;
              }
              case 1: {
                options.customHandleAcks(topic, message, packet, function(error, code) {
                  if (!(error instanceof Error)) {
                    code = error;
                    error = null;
                  }
                  if (error) {
                    return that.emit("error", error);
                  }
                  if (validReasonCodes.indexOf(code) === -1) {
                    return that.emit("error", new Error("Wrong reason code for puback"));
                  }
                  if (!code) {
                    that.emit("message", topic, message, packet);
                  }
                  that.handleMessage(packet, function(err) {
                    if (err) {
                      return done && done(err);
                    }
                    that._sendPacket({ cmd: "puback", messageId, reasonCode: code }, done);
                  });
                });
                break;
              }
              case 0:
                this.emit("message", topic, message, packet);
                this.handleMessage(packet, done);
                break;
              default:
                debug("_handlePublish: unknown QoS. Doing nothing.");
                break;
            }
          };
          MqttClient.prototype.handleMessage = function(packet, callback) {
            callback();
          };
          MqttClient.prototype._handleAck = function(packet) {
            const messageId = packet.messageId;
            const type = packet.cmd;
            let response = null;
            const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null;
            const that = this;
            let err;
            if (!cb) {
              debug("_handleAck :: Server sent an ack in error. Ignoring.");
              return;
            }
            debug("_handleAck :: packet type", type);
            switch (type) {
              case "pubcomp":
              case "puback": {
                const pubackRC = packet.reasonCode;
                if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
                  err = new Error("Publish error: " + errors[pubackRC]);
                  err.code = pubackRC;
                  cb(err, packet);
                }
                delete this.outgoing[messageId];
                this.outgoingStore.del(packet, cb);
                this.messageIdProvider.deallocate(messageId);
                this._invokeStoreProcessingQueue();
                break;
              }
              case "pubrec": {
                response = {
                  cmd: "pubrel",
                  qos: 2,
                  messageId
                };
                const pubrecRC = packet.reasonCode;
                if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
                  err = new Error("Publish error: " + errors[pubrecRC]);
                  err.code = pubrecRC;
                  cb(err, packet);
                } else {
                  this._sendPacket(response);
                }
                break;
              }
              case "suback": {
                delete this.outgoing[messageId];
                this.messageIdProvider.deallocate(messageId);
                for (let grantedI = 0; grantedI < packet.granted.length; grantedI++) {
                  if ((packet.granted[grantedI] & 128) !== 0) {
                    const topics = this.messageIdToTopic[messageId];
                    if (topics) {
                      topics.forEach(function(topic) {
                        delete that._resubscribeTopics[topic];
                      });
                    }
                  }
                }
                this._invokeStoreProcessingQueue();
                cb(null, packet);
                break;
              }
              case "unsuback": {
                delete this.outgoing[messageId];
                this.messageIdProvider.deallocate(messageId);
                this._invokeStoreProcessingQueue();
                cb(null);
                break;
              }
              default:
                that.emit("error", new Error("unrecognized packet type"));
            }
            if (this.disconnecting && Object.keys(this.outgoing).length === 0) {
              this.emit("outgoingEmpty");
            }
          };
          MqttClient.prototype._handlePubrel = function(packet, callback) {
            debug("handling pubrel packet");
            callback = typeof callback !== "undefined" ? callback : nop;
            const messageId = packet.messageId;
            const that = this;
            const comp = { cmd: "pubcomp", messageId };
            that.incomingStore.get(packet, function(err, pub) {
              if (!err) {
                that.emit("message", pub.topic, pub.payload, pub);
                that.handleMessage(pub, function(err2) {
                  if (err2) {
                    return callback(err2);
                  }
                  that.incomingStore.del(pub, nop);
                  that._sendPacket(comp, callback);
                });
              } else {
                that._sendPacket(comp, callback);
              }
            });
          };
          MqttClient.prototype._handleDisconnect = function(packet) {
            this.emit("disconnect", packet);
          };
          MqttClient.prototype._nextId = function() {
            return this.messageIdProvider.allocate();
          };
          MqttClient.prototype.getLastMessageId = function() {
            return this.messageIdProvider.getLastAllocated();
          };
          MqttClient.prototype._resubscribe = function() {
            debug("_resubscribe");
            const _resubscribeTopicsKeys = Object.keys(this._resubscribeTopics);
            if (!this._firstConnection && (this.options.clean || this.options.protocolVersion === 5 && !this.connackPacket.sessionPresent) && _resubscribeTopicsKeys.length > 0) {
              if (this.options.resubscribe) {
                if (this.options.protocolVersion === 5) {
                  debug("_resubscribe: protocolVersion 5");
                  for (let topicI = 0; topicI < _resubscribeTopicsKeys.length; topicI++) {
                    const resubscribeTopic = {};
                    resubscribeTopic[_resubscribeTopicsKeys[topicI]] = this._resubscribeTopics[_resubscribeTopicsKeys[topicI]];
                    resubscribeTopic.resubscribe = true;
                    this.subscribe(resubscribeTopic, { properties: resubscribeTopic[_resubscribeTopicsKeys[topicI]].properties });
                  }
                } else {
                  this._resubscribeTopics.resubscribe = true;
                  this.subscribe(this._resubscribeTopics);
                }
              } else {
                this._resubscribeTopics = {};
              }
            }
            this._firstConnection = false;
          };
          MqttClient.prototype._onConnect = function(packet) {
            if (this.disconnected) {
              this.emit("connect", packet);
              return;
            }
            const that = this;
            this.connackPacket = packet;
            this.messageIdProvider.clear();
            this._setupPingTimer();
            this.connected = true;
            function startStreamProcess() {
              let outStore = that.outgoingStore.createStream();
              function clearStoreProcessing() {
                that._storeProcessing = false;
                that._packetIdsDuringStoreProcessing = {};
              }
              that.once("close", remove);
              outStore.on("error", function(err) {
                clearStoreProcessing();
                that._flushStoreProcessingQueue();
                that.removeListener("close", remove);
                that.emit("error", err);
              });
              function remove() {
                outStore.destroy();
                outStore = null;
                that._flushStoreProcessingQueue();
                clearStoreProcessing();
              }
              function storeDeliver() {
                if (!outStore) {
                  return;
                }
                that._storeProcessing = true;
                const packet2 = outStore.read(1);
                let cb;
                if (!packet2) {
                  outStore.once("readable", storeDeliver);
                  return;
                }
                if (that._packetIdsDuringStoreProcessing[packet2.messageId]) {
                  storeDeliver();
                  return;
                }
                if (!that.disconnecting && !that.reconnectTimer) {
                  cb = that.outgoing[packet2.messageId] ? that.outgoing[packet2.messageId].cb : null;
                  that.outgoing[packet2.messageId] = {
                    volatile: false,
                    cb: function(err, status) {
                      if (cb) {
                        cb(err, status);
                      }
                      storeDeliver();
                    }
                  };
                  that._packetIdsDuringStoreProcessing[packet2.messageId] = true;
                  if (that.messageIdProvider.register(packet2.messageId)) {
                    that._sendPacket(packet2);
                  } else {
                    debug("messageId: %d has already used.", packet2.messageId);
                  }
                } else if (outStore.destroy) {
                  outStore.destroy();
                }
              }
              outStore.on("end", function() {
                let allProcessed = true;
                for (const id in that._packetIdsDuringStoreProcessing) {
                  if (!that._packetIdsDuringStoreProcessing[id]) {
                    allProcessed = false;
                    break;
                  }
                }
                if (allProcessed) {
                  clearStoreProcessing();
                  that.removeListener("close", remove);
                  that._invokeAllStoreProcessingQueue();
                  that.emit("connect", packet);
                } else {
                  startStreamProcess();
                }
              });
              storeDeliver();
            }
            startStreamProcess();
          };
          MqttClient.prototype._invokeStoreProcessingQueue = function() {
            if (this._storeProcessingQueue.length > 0) {
              const f = this._storeProcessingQueue[0];
              if (f && f.invoke()) {
                this._storeProcessingQueue.shift();
                return true;
              }
            }
            return false;
          };
          MqttClient.prototype._invokeAllStoreProcessingQueue = function() {
            while (this._invokeStoreProcessingQueue()) {
            }
          };
          MqttClient.prototype._flushStoreProcessingQueue = function() {
            for (const f of this._storeProcessingQueue) {
              if (f.cbStorePut)
                f.cbStorePut(new Error("Connection closed"));
              if (f.callback)
                f.callback(new Error("Connection closed"));
            }
            this._storeProcessingQueue.splice(0);
          };
          module2.exports = MqttClient;
        }).call(this);
      }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, { "./default-message-id-provider": 7, "./store": 8, "./topic-alias-recv": 9, "./topic-alias-send": 10, "./validations": 11, "_process": 50, "debug": 18, "events": 22, "inherits": 24, "mqtt-packet": 40, "readable-stream": 69, "reinterval": 70, "rfdc/default": 71, "xtend": 81 }], 2: [function(require2, module2, exports2) {
      const { Buffer: Buffer2 } = require2("buffer");
      const Transform = require2("readable-stream").Transform;
      const duplexify = require2("duplexify");
      let my;
      let proxy;
      let stream;
      let isInitialized = false;
      function buildProxy() {
        const proxy2 = new Transform();
        proxy2._write = function(chunk, encoding, next) {
          my.sendSocketMessage({
            data: chunk.buffer,
            success: function() {
              next();
            },
            fail: function() {
              next(new Error());
            }
          });
        };
        proxy2._flush = function socketEnd(done) {
          my.closeSocket({
            success: function() {
              done();
            }
          });
        };
        return proxy2;
      }
      function setDefaultOpts(opts) {
        if (!opts.hostname) {
          opts.hostname = "localhost";
        }
        if (!opts.path) {
          opts.path = "/";
        }
        if (!opts.wsOptions) {
          opts.wsOptions = {};
        }
      }
      function buildUrl(opts, client2) {
        const protocol = opts.protocol === "alis" ? "wss" : "ws";
        let url = protocol + "://" + opts.hostname + opts.path;
        if (opts.port && opts.port !== 80 && opts.port !== 443) {
          url = protocol + "://" + opts.hostname + ":" + opts.port + opts.path;
        }
        if (typeof opts.transformWsUrl === "function") {
          url = opts.transformWsUrl(url, opts, client2);
        }
        return url;
      }
      function bindEventHandler() {
        if (isInitialized)
          return;
        isInitialized = true;
        my.onSocketOpen(function() {
          stream.setReadable(proxy);
          stream.setWritable(proxy);
          stream.emit("connect");
        });
        my.onSocketMessage(function(res) {
          if (typeof res.data === "string") {
            const buffer = Buffer2.from(res.data, "base64");
            proxy.push(buffer);
          } else {
            const reader = new FileReader();
            reader.addEventListener("load", function() {
              let data = reader.result;
              if (data instanceof ArrayBuffer)
                data = Buffer2.from(data);
              else
                data = Buffer2.from(data, "utf8");
              proxy.push(data);
            });
            reader.readAsArrayBuffer(res.data);
          }
        });
        my.onSocketClose(function() {
          stream.end();
          stream.destroy();
        });
        my.onSocketError(function(res) {
          stream.destroy(res);
        });
      }
      function buildStream(client2, opts) {
        opts.hostname = opts.hostname || opts.host;
        if (!opts.hostname) {
          throw new Error("Could not determine host. Specify host manually.");
        }
        const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
        setDefaultOpts(opts);
        const url = buildUrl(opts, client2);
        my = opts.my;
        my.connectSocket({
          url,
          protocols: websocketSubProtocol
        });
        proxy = buildProxy();
        stream = duplexify.obj();
        bindEventHandler();
        return stream;
      }
      module2.exports = buildStream;
    }, { "buffer": 17, "duplexify": 20, "readable-stream": 69 }], 3: [function(require2, module2, exports2) {
      const net = require2("net");
      const debug = require2("debug")("mqttjs:tcp");
      function streamBuilder(client2, opts) {
        opts.port = opts.port || 1883;
        opts.hostname = opts.hostname || opts.host || "localhost";
        const port = opts.port;
        const host = opts.hostname;
        debug("port %d and host %s", port, host);
        return net.createConnection(port, host);
      }
      module2.exports = streamBuilder;
    }, { "debug": 18, "net": 16 }], 4: [function(require2, module2, exports2) {
      const tls = require2("tls");
      const net = require2("net");
      const debug = require2("debug")("mqttjs:tls");
      function buildBuilder(mqttClient, opts) {
        opts.port = opts.port || 8883;
        opts.host = opts.hostname || opts.host || "localhost";
        if (net.isIP(opts.host) === 0) {
          opts.servername = opts.host;
        }
        opts.rejectUnauthorized = opts.rejectUnauthorized !== false;
        delete opts.path;
        debug("port %d host %s rejectUnauthorized %b", opts.port, opts.host, opts.rejectUnauthorized);
        const connection = tls.connect(opts);
        connection.on("secureConnect", function() {
          if (opts.rejectUnauthorized && !connection.authorized) {
            connection.emit("error", new Error("TLS not authorized"));
          } else {
            connection.removeListener("error", handleTLSerrors);
          }
        });
        function handleTLSerrors(err) {
          if (opts.rejectUnauthorized) {
            mqttClient.emit("error", err);
          }
          connection.end();
        }
        connection.on("error", handleTLSerrors);
        return connection;
      }
      module2.exports = buildBuilder;
    }, { "debug": 18, "net": 16, "tls": 16 }], 5: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          const { Buffer: Buffer2 } = require2("buffer");
          const WS = require2("ws");
          const debug = require2("debug")("mqttjs:ws");
          const duplexify = require2("duplexify");
          const Transform = require2("readable-stream").Transform;
          const WSS_OPTIONS = [
            "rejectUnauthorized",
            "ca",
            "cert",
            "key",
            "pfx",
            "passphrase"
          ];
          const IS_BROWSER = typeof process !== "undefined" && process.title === "browser" || typeof __webpack_require__ === "function";
          function buildUrl(opts, client2) {
            let url = opts.protocol + "://" + opts.hostname + ":" + opts.port + opts.path;
            if (typeof opts.transformWsUrl === "function") {
              url = opts.transformWsUrl(url, opts, client2);
            }
            return url;
          }
          function setDefaultOpts(opts) {
            const options = opts;
            if (!opts.hostname) {
              options.hostname = "localhost";
            }
            if (!opts.port) {
              if (opts.protocol === "wss") {
                options.port = 443;
              } else {
                options.port = 80;
              }
            }
            if (!opts.path) {
              options.path = "/";
            }
            if (!opts.wsOptions) {
              options.wsOptions = {};
            }
            if (!IS_BROWSER && opts.protocol === "wss") {
              WSS_OPTIONS.forEach(function(prop) {
                if (Object.prototype.hasOwnProperty.call(opts, prop) && !Object.prototype.hasOwnProperty.call(opts.wsOptions, prop)) {
                  options.wsOptions[prop] = opts[prop];
                }
              });
            }
            return options;
          }
          function setDefaultBrowserOpts(opts) {
            const options = setDefaultOpts(opts);
            if (!options.hostname) {
              options.hostname = options.host;
            }
            if (!options.hostname) {
              if (typeof document === "undefined") {
                throw new Error("Could not determine host. Specify host manually.");
              }
              const parsed = new URL(document.URL);
              options.hostname = parsed.hostname;
              if (!options.port) {
                options.port = parsed.port;
              }
            }
            if (options.objectMode === void 0) {
              options.objectMode = !(options.binary === true || options.binary === void 0);
            }
            return options;
          }
          function createWebSocket(client2, url, opts) {
            debug("createWebSocket");
            debug("protocol: " + opts.protocolId + " " + opts.protocolVersion);
            const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
            debug("creating new Websocket for url: " + url + " and protocol: " + websocketSubProtocol);
            const socket = new WS(url, [websocketSubProtocol], opts.wsOptions);
            return socket;
          }
          function createBrowserWebSocket(client2, opts) {
            const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
            const url = buildUrl(opts, client2);
            const socket = new WebSocket(url, [websocketSubProtocol]);
            socket.binaryType = "arraybuffer";
            return socket;
          }
          function streamBuilder(client2, opts) {
            debug("streamBuilder");
            const options = setDefaultOpts(opts);
            const url = buildUrl(options, client2);
            const socket = createWebSocket(client2, url, options);
            const webSocketStream = WS.createWebSocketStream(socket, options.wsOptions);
            webSocketStream.url = url;
            socket.on("close", () => {
              webSocketStream.destroy();
            });
            return webSocketStream;
          }
          function browserStreamBuilder(client2, opts) {
            debug("browserStreamBuilder");
            let stream;
            const options = setDefaultBrowserOpts(opts);
            const bufferSize = options.browserBufferSize || 1024 * 512;
            const bufferTimeout = opts.browserBufferTimeout || 1e3;
            const coerceToBuffer = !opts.objectMode;
            const socket = createBrowserWebSocket(client2, opts);
            const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser);
            if (!opts.objectMode) {
              proxy._writev = writev;
            }
            proxy.on("close", () => {
              socket.close();
            });
            const eventListenerSupport = typeof socket.addEventListener !== "undefined";
            if (socket.readyState === socket.OPEN) {
              stream = proxy;
            } else {
              stream = stream = duplexify(void 0, void 0, opts);
              if (!opts.objectMode) {
                stream._writev = writev;
              }
              if (eventListenerSupport) {
                socket.addEventListener("open", onopen);
              } else {
                socket.onopen = onopen;
              }
            }
            stream.socket = socket;
            if (eventListenerSupport) {
              socket.addEventListener("close", onclose);
              socket.addEventListener("error", onerror);
              socket.addEventListener("message", onmessage);
            } else {
              socket.onclose = onclose;
              socket.onerror = onerror;
              socket.onmessage = onmessage;
            }
            function buildProxy(options2, socketWrite, socketEnd) {
              const proxy2 = new Transform({
                objectModeMode: options2.objectMode
              });
              proxy2._write = socketWrite;
              proxy2._flush = socketEnd;
              return proxy2;
            }
            function onopen() {
              stream.setReadable(proxy);
              stream.setWritable(proxy);
              stream.emit("connect");
            }
            function onclose() {
              stream.end();
              stream.destroy();
            }
            function onerror(err) {
              stream.destroy(err);
            }
            function onmessage(event) {
              let data = event.data;
              if (data instanceof ArrayBuffer)
                data = Buffer2.from(data);
              else
                data = Buffer2.from(data, "utf8");
              proxy.push(data);
            }
            function writev(chunks, cb) {
              const buffers = new Array(chunks.length);
              for (let i = 0; i < chunks.length; i++) {
                if (typeof chunks[i].chunk === "string") {
                  buffers[i] = Buffer2.from(chunks[i], "utf8");
                } else {
                  buffers[i] = chunks[i].chunk;
                }
              }
              this._write(Buffer2.concat(buffers), "binary", cb);
            }
            function socketWriteBrowser(chunk, enc, next) {
              if (socket.bufferedAmount > bufferSize) {
                setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next);
              }
              if (coerceToBuffer && typeof chunk === "string") {
                chunk = Buffer2.from(chunk, "utf8");
              }
              try {
                socket.send(chunk);
              } catch (err) {
                return next(err);
              }
              next();
            }
            function socketEndBrowser(done) {
              socket.close();
              done();
            }
            return stream;
          }
          if (IS_BROWSER) {
            module2.exports = browserStreamBuilder;
          } else {
            module2.exports = streamBuilder;
          }
        }).call(this);
      }).call(this, require2("_process"));
    }, { "_process": 50, "buffer": 17, "debug": 18, "duplexify": 20, "readable-stream": 69, "ws": 80 }], 6: [function(require2, module2, exports2) {
      const { Buffer: Buffer2 } = require2("buffer");
      const Transform = require2("readable-stream").Transform;
      const duplexify = require2("duplexify");
      let socketTask, proxy, stream;
      function buildProxy() {
        const proxy2 = new Transform();
        proxy2._write = function(chunk, encoding, next) {
          socketTask.send({
            data: chunk.buffer,
            success: function() {
              next();
            },
            fail: function(errMsg) {
              next(new Error(errMsg));
            }
          });
        };
        proxy2._flush = function socketEnd(done) {
          socketTask.close({
            success: function() {
              done();
            }
          });
        };
        return proxy2;
      }
      function setDefaultOpts(opts) {
        if (!opts.hostname) {
          opts.hostname = "localhost";
        }
        if (!opts.path) {
          opts.path = "/";
        }
        if (!opts.wsOptions) {
          opts.wsOptions = {};
        }
      }
      function buildUrl(opts, client2) {
        const protocol = opts.protocol === "wxs" ? "wss" : "ws";
        let url = protocol + "://" + opts.hostname + opts.path;
        if (opts.port && opts.port !== 80 && opts.port !== 443) {
          url = protocol + "://" + opts.hostname + ":" + opts.port + opts.path;
        }
        if (typeof opts.transformWsUrl === "function") {
          url = opts.transformWsUrl(url, opts, client2);
        }
        return url;
      }
      function bindEventHandler() {
        socketTask.onOpen(function() {
          stream.setReadable(proxy);
          stream.setWritable(proxy);
          stream.emit("connect");
        });
        socketTask.onMessage(function(res) {
          let data = res.data;
          if (data instanceof ArrayBuffer)
            data = Buffer2.from(data);
          else
            data = Buffer2.from(data, "utf8");
          proxy.push(data);
        });
        socketTask.onClose(function() {
          stream.end();
          stream.destroy();
        });
        socketTask.onError(function(res) {
          stream.destroy(new Error(res.errMsg));
        });
      }
      function buildStream(client2, opts) {
        opts.hostname = opts.hostname || opts.host;
        if (!opts.hostname) {
          throw new Error("Could not determine host. Specify host manually.");
        }
        const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
        setDefaultOpts(opts);
        const url = buildUrl(opts, client2);
        socketTask = wx.connectSocket({
          url,
          protocols: [websocketSubProtocol]
        });
        proxy = buildProxy();
        stream = duplexify.obj();
        stream._destroy = function(err, cb) {
          socketTask.close({
            success: function() {
              cb && cb(err);
            }
          });
        };
        const destroyRef = stream.destroy;
        stream.destroy = function() {
          stream.destroy = destroyRef;
          const self2 = this;
          setTimeout(function() {
            socketTask.close({
              fail: function() {
                self2._destroy(new Error());
              }
            });
          }, 0);
        }.bind(stream);
        bindEventHandler();
        return stream;
      }
      module2.exports = buildStream;
    }, { "buffer": 17, "duplexify": 20, "readable-stream": 69 }], 7: [function(require2, module2, exports2) {
      function DefaultMessageIdProvider() {
        if (!(this instanceof DefaultMessageIdProvider)) {
          return new DefaultMessageIdProvider();
        }
        this.nextId = Math.max(1, Math.floor(Math.random() * 65535));
      }
      DefaultMessageIdProvider.prototype.allocate = function() {
        const id = this.nextId++;
        if (this.nextId === 65536) {
          this.nextId = 1;
        }
        return id;
      };
      DefaultMessageIdProvider.prototype.getLastAllocated = function() {
        return this.nextId === 1 ? 65535 : this.nextId - 1;
      };
      DefaultMessageIdProvider.prototype.register = function(messageId) {
        return true;
      };
      DefaultMessageIdProvider.prototype.deallocate = function(messageId) {
      };
      DefaultMessageIdProvider.prototype.clear = function() {
      };
      module2.exports = DefaultMessageIdProvider;
    }, {}], 8: [function(require2, module2, exports2) {
      const xtend = require2("xtend");
      const Readable = require2("readable-stream").Readable;
      const streamsOpts = { objectMode: true };
      const defaultStoreOptions = {
        clean: true
      };
      function Store(options) {
        if (!(this instanceof Store)) {
          return new Store(options);
        }
        this.options = options || {};
        this.options = xtend(defaultStoreOptions, options);
        this._inflights = /* @__PURE__ */ new Map();
      }
      Store.prototype.put = function(packet, cb) {
        this._inflights.set(packet.messageId, packet);
        if (cb) {
          cb();
        }
        return this;
      };
      Store.prototype.createStream = function() {
        const stream = new Readable(streamsOpts);
        const values = [];
        let destroyed = false;
        let i = 0;
        this._inflights.forEach(function(value, key) {
          values.push(value);
        });
        stream._read = function() {
          if (!destroyed && i < values.length) {
            this.push(values[i++]);
          } else {
            this.push(null);
          }
        };
        stream.destroy = function() {
          if (destroyed) {
            return;
          }
          const self2 = this;
          destroyed = true;
          setTimeout(function() {
            self2.emit("close");
          }, 0);
        };
        return stream;
      };
      Store.prototype.del = function(packet, cb) {
        packet = this._inflights.get(packet.messageId);
        if (packet) {
          this._inflights.delete(packet.messageId);
          cb(null, packet);
        } else if (cb) {
          cb(new Error("missing packet"));
        }
        return this;
      };
      Store.prototype.get = function(packet, cb) {
        packet = this._inflights.get(packet.messageId);
        if (packet) {
          cb(null, packet);
        } else if (cb) {
          cb(new Error("missing packet"));
        }
        return this;
      };
      Store.prototype.close = function(cb) {
        if (this.options.clean) {
          this._inflights = null;
        }
        if (cb) {
          cb();
        }
      };
      module2.exports = Store;
    }, { "readable-stream": 69, "xtend": 81 }], 9: [function(require2, module2, exports2) {
      function TopicAliasRecv(max) {
        if (!(this instanceof TopicAliasRecv)) {
          return new TopicAliasRecv(max);
        }
        this.aliasToTopic = {};
        this.max = max;
      }
      TopicAliasRecv.prototype.put = function(topic, alias) {
        if (alias === 0 || alias > this.max) {
          return false;
        }
        this.aliasToTopic[alias] = topic;
        this.length = Object.keys(this.aliasToTopic).length;
        return true;
      };
      TopicAliasRecv.prototype.getTopicByAlias = function(alias) {
        return this.aliasToTopic[alias];
      };
      TopicAliasRecv.prototype.clear = function() {
        this.aliasToTopic = {};
      };
      module2.exports = TopicAliasRecv;
    }, {}], 10: [function(require2, module2, exports2) {
      const LruMap = require2("lru-cache");
      const NumberAllocator = require2("number-allocator").NumberAllocator;
      function TopicAliasSend(max) {
        if (!(this instanceof TopicAliasSend)) {
          return new TopicAliasSend(max);
        }
        if (max > 0) {
          this.aliasToTopic = new LruMap({ max });
          this.topicToAlias = {};
          this.numberAllocator = new NumberAllocator(1, max);
          this.max = max;
          this.length = 0;
        }
      }
      TopicAliasSend.prototype.put = function(topic, alias) {
        if (alias === 0 || alias > this.max) {
          return false;
        }
        const entry = this.aliasToTopic.get(alias);
        if (entry) {
          delete this.topicToAlias[entry];
        }
        this.aliasToTopic.set(alias, topic);
        this.topicToAlias[topic] = alias;
        this.numberAllocator.use(alias);
        this.length = this.aliasToTopic.length;
        return true;
      };
      TopicAliasSend.prototype.getTopicByAlias = function(alias) {
        return this.aliasToTopic.get(alias);
      };
      TopicAliasSend.prototype.getAliasByTopic = function(topic) {
        const alias = this.topicToAlias[topic];
        if (typeof alias !== "undefined") {
          this.aliasToTopic.get(alias);
        }
        return alias;
      };
      TopicAliasSend.prototype.clear = function() {
        this.aliasToTopic.reset();
        this.topicToAlias = {};
        this.numberAllocator.clear();
        this.length = 0;
      };
      TopicAliasSend.prototype.getLruAlias = function() {
        const alias = this.numberAllocator.firstVacant();
        if (alias)
          return alias;
        return this.aliasToTopic.keys()[this.aliasToTopic.length - 1];
      };
      module2.exports = TopicAliasSend;
    }, { "lru-cache": 37, "number-allocator": 46 }], 11: [function(require2, module2, exports2) {
      function validateTopic(topic) {
        const parts = topic.split("/");
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === "+") {
            continue;
          }
          if (parts[i] === "#") {
            return i === parts.length - 1;
          }
          if (parts[i].indexOf("+") !== -1 || parts[i].indexOf("#") !== -1) {
            return false;
          }
        }
        return true;
      }
      function validateTopics(topics) {
        if (topics.length === 0) {
          return "empty_topic_list";
        }
        for (let i = 0; i < topics.length; i++) {
          if (!validateTopic(topics[i])) {
            return topics[i];
          }
        }
        return null;
      }
      module2.exports = {
        validateTopics
      };
    }, {}], 12: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          const MqttClient = require2("../client");
          const Store = require2("../store");
          const url = require2("url");
          const xtend = require2("xtend");
          const debug = require2("debug")("mqttjs");
          const protocols = {};
          if (typeof process !== "undefined" && process.title !== "browser" || typeof __webpack_require__ !== "function") {
            protocols.mqtt = require2("./tcp");
            protocols.tcp = require2("./tcp");
            protocols.ssl = require2("./tls");
            protocols.tls = require2("./tls");
            protocols.mqtts = require2("./tls");
          } else {
            protocols.wx = require2("./wx");
            protocols.wxs = require2("./wx");
            protocols.ali = require2("./ali");
            protocols.alis = require2("./ali");
          }
          protocols.ws = require2("./ws");
          protocols.wss = require2("./ws");
          function parseAuthOptions(opts) {
            let matches;
            if (opts.auth) {
              matches = opts.auth.match(/^(.+):(.+)$/);
              if (matches) {
                opts.username = matches[1];
                opts.password = matches[2];
              } else {
                opts.username = opts.auth;
              }
            }
          }
          function connect2(brokerUrl, opts) {
            debug("connecting to an MQTT broker...");
            if (typeof brokerUrl === "object" && !opts) {
              opts = brokerUrl;
              brokerUrl = null;
            }
            opts = opts || {};
            if (brokerUrl) {
              const parsed = url.parse(brokerUrl, true);
              if (parsed.port != null) {
                parsed.port = Number(parsed.port);
              }
              opts = xtend(parsed, opts);
              if (opts.protocol === null) {
                throw new Error("Missing protocol");
              }
              opts.protocol = opts.protocol.replace(/:$/, "");
            }
            parseAuthOptions(opts);
            if (opts.query && typeof opts.query.clientId === "string") {
              opts.clientId = opts.query.clientId;
            }
            if (opts.cert && opts.key) {
              if (opts.protocol) {
                if (["mqtts", "wss", "wxs", "alis"].indexOf(opts.protocol) === -1) {
                  switch (opts.protocol) {
                    case "mqtt":
                      opts.protocol = "mqtts";
                      break;
                    case "ws":
                      opts.protocol = "wss";
                      break;
                    case "wx":
                      opts.protocol = "wxs";
                      break;
                    case "ali":
                      opts.protocol = "alis";
                      break;
                    default:
                      throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!');
                  }
                }
              } else {
                throw new Error("Missing secure protocol key");
              }
            }
            if (!protocols[opts.protocol]) {
              const isSecure = ["mqtts", "wss"].indexOf(opts.protocol) !== -1;
              opts.protocol = [
                "mqtt",
                "mqtts",
                "ws",
                "wss",
                "wx",
                "wxs",
                "ali",
                "alis"
              ].filter(function(key, index) {
                if (isSecure && index % 2 === 0) {
                  return false;
                }
                return typeof protocols[key] === "function";
              })[0];
            }
            if (opts.clean === false && !opts.clientId) {
              throw new Error("Missing clientId for unclean clients");
            }
            if (opts.protocol) {
              opts.defaultProtocol = opts.protocol;
            }
            function wrapper(client3) {
              if (opts.servers) {
                if (!client3._reconnectCount || client3._reconnectCount === opts.servers.length) {
                  client3._reconnectCount = 0;
                }
                opts.host = opts.servers[client3._reconnectCount].host;
                opts.port = opts.servers[client3._reconnectCount].port;
                opts.protocol = !opts.servers[client3._reconnectCount].protocol ? opts.defaultProtocol : opts.servers[client3._reconnectCount].protocol;
                opts.hostname = opts.host;
                client3._reconnectCount++;
              }
              debug("calling streambuilder for", opts.protocol);
              return protocols[opts.protocol](client3, opts);
            }
            const client2 = new MqttClient(wrapper, opts);
            client2.on("error", function() {
            });
            return client2;
          }
          module2.exports = connect2;
          module2.exports.connect = connect2;
          module2.exports.MqttClient = MqttClient;
          module2.exports.Store = Store;
        }).call(this);
      }).call(this, require2("_process"));
    }, { "../client": 1, "../store": 8, "./ali": 2, "./tcp": 3, "./tls": 4, "./ws": 5, "./wx": 6, "_process": 50, "debug": 18, "url": 76, "xtend": 81 }], 13: [function(require2, module2, exports2) {
      exports2.byteLength = byteLength;
      exports2.toByteArray = toByteArray;
      exports2.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1)
          validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
        }
        return parts.join("");
      }
    }, {}], 14: [function(require2, module2, exports2) {
      const { Buffer: Buffer2 } = require2("buffer");
      const symbol = Symbol.for("BufferList");
      function BufferList(buf) {
        if (!(this instanceof BufferList)) {
          return new BufferList(buf);
        }
        BufferList._init.call(this, buf);
      }
      BufferList._init = function _init(buf) {
        Object.defineProperty(this, symbol, { value: true });
        this._bufs = [];
        this.length = 0;
        if (buf) {
          this.append(buf);
        }
      };
      BufferList.prototype._new = function _new(buf) {
        return new BufferList(buf);
      };
      BufferList.prototype._offset = function _offset(offset) {
        if (offset === 0) {
          return [0, 0];
        }
        let tot = 0;
        for (let i = 0; i < this._bufs.length; i++) {
          const _t = tot + this._bufs[i].length;
          if (offset < _t || i === this._bufs.length - 1) {
            return [i, offset - tot];
          }
          tot = _t;
        }
      };
      BufferList.prototype._reverseOffset = function(blOffset) {
        const bufferId = blOffset[0];
        let offset = blOffset[1];
        for (let i = 0; i < bufferId; i++) {
          offset += this._bufs[i].length;
        }
        return offset;
      };
      BufferList.prototype.get = function get(index) {
        if (index > this.length || index < 0) {
          return void 0;
        }
        const offset = this._offset(index);
        return this._bufs[offset[0]][offset[1]];
      };
      BufferList.prototype.slice = function slice(start, end) {
        if (typeof start === "number" && start < 0) {
          start += this.length;
        }
        if (typeof end === "number" && end < 0) {
          end += this.length;
        }
        return this.copy(null, 0, start, end);
      };
      BufferList.prototype.copy = function copy(dst, dstStart, srcStart, srcEnd) {
        if (typeof srcStart !== "number" || srcStart < 0) {
          srcStart = 0;
        }
        if (typeof srcEnd !== "number" || srcEnd > this.length) {
          srcEnd = this.length;
        }
        if (srcStart >= this.length) {
          return dst || Buffer2.alloc(0);
        }
        if (srcEnd <= 0) {
          return dst || Buffer2.alloc(0);
        }
        const copy2 = !!dst;
        const off = this._offset(srcStart);
        const len = srcEnd - srcStart;
        let bytes = len;
        let bufoff = copy2 && dstStart || 0;
        let start = off[1];
        if (srcStart === 0 && srcEnd === this.length) {
          if (!copy2) {
            return this._bufs.length === 1 ? this._bufs[0] : Buffer2.concat(this._bufs, this.length);
          }
          for (let i = 0; i < this._bufs.length; i++) {
            this._bufs[i].copy(dst, bufoff);
            bufoff += this._bufs[i].length;
          }
          return dst;
        }
        if (bytes <= this._bufs[off[0]].length - start) {
          return copy2 ? this._bufs[off[0]].copy(dst, dstStart, start, start + bytes) : this._bufs[off[0]].slice(start, start + bytes);
        }
        if (!copy2) {
          dst = Buffer2.allocUnsafe(len);
        }
        for (let i = off[0]; i < this._bufs.length; i++) {
          const l = this._bufs[i].length - start;
          if (bytes > l) {
            this._bufs[i].copy(dst, bufoff, start);
            bufoff += l;
          } else {
            this._bufs[i].copy(dst, bufoff, start, start + bytes);
            bufoff += l;
            break;
          }
          bytes -= l;
          if (start) {
            start = 0;
          }
        }
        if (dst.length > bufoff)
          return dst.slice(0, bufoff);
        return dst;
      };
      BufferList.prototype.shallowSlice = function shallowSlice(start, end) {
        start = start || 0;
        end = typeof end !== "number" ? this.length : end;
        if (start < 0) {
          start += this.length;
        }
        if (end < 0) {
          end += this.length;
        }
        if (start === end) {
          return this._new();
        }
        const startOffset = this._offset(start);
        const endOffset = this._offset(end);
        const buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1);
        if (endOffset[1] === 0) {
          buffers.pop();
        } else {
          buffers[buffers.length - 1] = buffers[buffers.length - 1].slice(0, endOffset[1]);
        }
        if (startOffset[1] !== 0) {
          buffers[0] = buffers[0].slice(startOffset[1]);
        }
        return this._new(buffers);
      };
      BufferList.prototype.toString = function toString(encoding, start, end) {
        return this.slice(start, end).toString(encoding);
      };
      BufferList.prototype.consume = function consume(bytes) {
        bytes = Math.trunc(bytes);
        if (Number.isNaN(bytes) || bytes <= 0)
          return this;
        while (this._bufs.length) {
          if (bytes >= this._bufs[0].length) {
            bytes -= this._bufs[0].length;
            this.length -= this._bufs[0].length;
            this._bufs.shift();
          } else {
            this._bufs[0] = this._bufs[0].slice(bytes);
            this.length -= bytes;
            break;
          }
        }
        return this;
      };
      BufferList.prototype.duplicate = function duplicate() {
        const copy = this._new();
        for (let i = 0; i < this._bufs.length; i++) {
          copy.append(this._bufs[i]);
        }
        return copy;
      };
      BufferList.prototype.append = function append(buf) {
        if (buf == null) {
          return this;
        }
        if (buf.buffer) {
          this._appendBuffer(Buffer2.from(buf.buffer, buf.byteOffset, buf.byteLength));
        } else if (Array.isArray(buf)) {
          for (let i = 0; i < buf.length; i++) {
            this.append(buf[i]);
          }
        } else if (this._isBufferList(buf)) {
          for (let i = 0; i < buf._bufs.length; i++) {
            this.append(buf._bufs[i]);
          }
        } else {
          if (typeof buf === "number") {
            buf = buf.toString();
          }
          this._appendBuffer(Buffer2.from(buf));
        }
        return this;
      };
      BufferList.prototype._appendBuffer = function appendBuffer(buf) {
        this._bufs.push(buf);
        this.length += buf.length;
      };
      BufferList.prototype.indexOf = function(search, offset, encoding) {
        if (encoding === void 0 && typeof offset === "string") {
          encoding = offset;
          offset = void 0;
        }
        if (typeof search === "function" || Array.isArray(search)) {
          throw new TypeError('The "value" argument must be one of type string, Buffer, BufferList, or Uint8Array.');
        } else if (typeof search === "number") {
          search = Buffer2.from([search]);
        } else if (typeof search === "string") {
          search = Buffer2.from(search, encoding);
        } else if (this._isBufferList(search)) {
          search = search.slice();
        } else if (Array.isArray(search.buffer)) {
          search = Buffer2.from(search.buffer, search.byteOffset, search.byteLength);
        } else if (!Buffer2.isBuffer(search)) {
          search = Buffer2.from(search);
        }
        offset = Number(offset || 0);
        if (isNaN(offset)) {
          offset = 0;
        }
        if (offset < 0) {
          offset = this.length + offset;
        }
        if (offset < 0) {
          offset = 0;
        }
        if (search.length === 0) {
          return offset > this.length ? this.length : offset;
        }
        const blOffset = this._offset(offset);
        let blIndex = blOffset[0];
        let buffOffset = blOffset[1];
        for (; blIndex < this._bufs.length; blIndex++) {
          const buff = this._bufs[blIndex];
          while (buffOffset < buff.length) {
            const availableWindow = buff.length - buffOffset;
            if (availableWindow >= search.length) {
              const nativeSearchResult = buff.indexOf(search, buffOffset);
              if (nativeSearchResult !== -1) {
                return this._reverseOffset([blIndex, nativeSearchResult]);
              }
              buffOffset = buff.length - search.length + 1;
            } else {
              const revOffset = this._reverseOffset([blIndex, buffOffset]);
              if (this._match(revOffset, search)) {
                return revOffset;
              }
              buffOffset++;
            }
          }
          buffOffset = 0;
        }
        return -1;
      };
      BufferList.prototype._match = function(offset, search) {
        if (this.length - offset < search.length) {
          return false;
        }
        for (let searchOffset = 0; searchOffset < search.length; searchOffset++) {
          if (this.get(offset + searchOffset) !== search[searchOffset]) {
            return false;
          }
        }
        return true;
      };
      (function() {
        const methods = {
          readDoubleBE: 8,
          readDoubleLE: 8,
          readFloatBE: 4,
          readFloatLE: 4,
          readInt32BE: 4,
          readInt32LE: 4,
          readUInt32BE: 4,
          readUInt32LE: 4,
          readInt16BE: 2,
          readInt16LE: 2,
          readUInt16BE: 2,
          readUInt16LE: 2,
          readInt8: 1,
          readUInt8: 1,
          readIntBE: null,
          readIntLE: null,
          readUIntBE: null,
          readUIntLE: null
        };
        for (const m in methods) {
          (function(m2) {
            if (methods[m2] === null) {
              BufferList.prototype[m2] = function(offset, byteLength) {
                return this.slice(offset, offset + byteLength)[m2](0, byteLength);
              };
            } else {
              BufferList.prototype[m2] = function(offset = 0) {
                return this.slice(offset, offset + methods[m2])[m2](0);
              };
            }
          })(m);
        }
      })();
      BufferList.prototype._isBufferList = function _isBufferList(b) {
        return b instanceof BufferList || BufferList.isBufferList(b);
      };
      BufferList.isBufferList = function isBufferList(b) {
        return b != null && b[symbol];
      };
      module2.exports = BufferList;
    }, { "buffer": 17 }], 15: [function(require2, module2, exports2) {
      const DuplexStream = require2("readable-stream").Duplex;
      const inherits = require2("inherits");
      const BufferList = require2("./BufferList");
      function BufferListStream(callback) {
        if (!(this instanceof BufferListStream)) {
          return new BufferListStream(callback);
        }
        if (typeof callback === "function") {
          this._callback = callback;
          const piper = function piper2(err) {
            if (this._callback) {
              this._callback(err);
              this._callback = null;
            }
          }.bind(this);
          this.on("pipe", function onPipe(src) {
            src.on("error", piper);
          });
          this.on("unpipe", function onUnpipe(src) {
            src.removeListener("error", piper);
          });
          callback = null;
        }
        BufferList._init.call(this, callback);
        DuplexStream.call(this);
      }
      inherits(BufferListStream, DuplexStream);
      Object.assign(BufferListStream.prototype, BufferList.prototype);
      BufferListStream.prototype._new = function _new(callback) {
        return new BufferListStream(callback);
      };
      BufferListStream.prototype._write = function _write(buf, encoding, callback) {
        this._appendBuffer(buf);
        if (typeof callback === "function") {
          callback();
        }
      };
      BufferListStream.prototype._read = function _read(size) {
        if (!this.length) {
          return this.push(null);
        }
        size = Math.min(size, this.length);
        this.push(this.slice(0, size));
        this.consume(size);
      };
      BufferListStream.prototype.end = function end(chunk) {
        DuplexStream.prototype.end.call(this, chunk);
        if (this._callback) {
          this._callback(null, this.slice());
          this._callback = null;
        }
      };
      BufferListStream.prototype._destroy = function _destroy(err, cb) {
        this._bufs.length = 0;
        this.length = 0;
        cb(err);
      };
      BufferListStream.prototype._isBufferList = function _isBufferList(b) {
        return b instanceof BufferListStream || b instanceof BufferList || BufferListStream.isBufferList(b);
      };
      BufferListStream.isBufferList = BufferList.isBufferList;
      module2.exports = BufferListStream;
      module2.exports.BufferListStream = BufferListStream;
      module2.exports.BufferList = BufferList;
    }, { "./BufferList": 14, "inherits": 24, "readable-stream": 69 }], 16: [function(require2, module2, exports2) {
    }, {}], 17: [function(require2, module2, exports2) {
      (function(Buffer2) {
        (function() {
          var base64 = require2("base64-js");
          var ieee754 = require2("ieee754");
          exports2.Buffer = Buffer3;
          exports2.SlowBuffer = SlowBuffer;
          exports2.INSPECT_MAX_BYTES = 50;
          var K_MAX_LENGTH = 2147483647;
          exports2.kMaxLength = K_MAX_LENGTH;
          Buffer3.TYPED_ARRAY_SUPPORT = typedArraySupport();
          if (!Buffer3.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
            console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
          }
          function typedArraySupport() {
            try {
              var arr = new Uint8Array(1);
              arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function() {
                return 42;
              } };
              return arr.foo() === 42;
            } catch (e) {
              return false;
            }
          }
          Object.defineProperty(Buffer3.prototype, "parent", {
            enumerable: true,
            get: function() {
              if (!Buffer3.isBuffer(this))
                return void 0;
              return this.buffer;
            }
          });
          Object.defineProperty(Buffer3.prototype, "offset", {
            enumerable: true,
            get: function() {
              if (!Buffer3.isBuffer(this))
                return void 0;
              return this.byteOffset;
            }
          });
          function createBuffer(length) {
            if (length > K_MAX_LENGTH) {
              throw new RangeError('The value "' + length + '" is invalid for option "size"');
            }
            var buf = new Uint8Array(length);
            buf.__proto__ = Buffer3.prototype;
            return buf;
          }
          function Buffer3(arg, encodingOrOffset, length) {
            if (typeof arg === "number") {
              if (typeof encodingOrOffset === "string") {
                throw new TypeError('The "string" argument must be of type string. Received type number');
              }
              return allocUnsafe(arg);
            }
            return from(arg, encodingOrOffset, length);
          }
          if (typeof Symbol !== "undefined" && Symbol.species != null && Buffer3[Symbol.species] === Buffer3) {
            Object.defineProperty(Buffer3, Symbol.species, {
              value: null,
              configurable: true,
              enumerable: false,
              writable: false
            });
          }
          Buffer3.poolSize = 8192;
          function from(value, encodingOrOffset, length) {
            if (typeof value === "string") {
              return fromString(value, encodingOrOffset);
            }
            if (ArrayBuffer.isView(value)) {
              return fromArrayLike(value);
            }
            if (value == null) {
              throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
            }
            if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
              return fromArrayBuffer(value, encodingOrOffset, length);
            }
            if (typeof value === "number") {
              throw new TypeError('The "value" argument must not be of type number. Received type number');
            }
            var valueOf = value.valueOf && value.valueOf();
            if (valueOf != null && valueOf !== value) {
              return Buffer3.from(valueOf, encodingOrOffset, length);
            }
            var b = fromObject(value);
            if (b)
              return b;
            if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
              return Buffer3.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
            }
            throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
          }
          Buffer3.from = function(value, encodingOrOffset, length) {
            return from(value, encodingOrOffset, length);
          };
          Buffer3.prototype.__proto__ = Uint8Array.prototype;
          Buffer3.__proto__ = Uint8Array;
          function assertSize(size) {
            if (typeof size !== "number") {
              throw new TypeError('"size" argument must be of type number');
            } else if (size < 0) {
              throw new RangeError('The value "' + size + '" is invalid for option "size"');
            }
          }
          function alloc(size, fill, encoding) {
            assertSize(size);
            if (size <= 0) {
              return createBuffer(size);
            }
            if (fill !== void 0) {
              return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
            }
            return createBuffer(size);
          }
          Buffer3.alloc = function(size, fill, encoding) {
            return alloc(size, fill, encoding);
          };
          function allocUnsafe(size) {
            assertSize(size);
            return createBuffer(size < 0 ? 0 : checked(size) | 0);
          }
          Buffer3.allocUnsafe = function(size) {
            return allocUnsafe(size);
          };
          Buffer3.allocUnsafeSlow = function(size) {
            return allocUnsafe(size);
          };
          function fromString(string, encoding) {
            if (typeof encoding !== "string" || encoding === "") {
              encoding = "utf8";
            }
            if (!Buffer3.isEncoding(encoding)) {
              throw new TypeError("Unknown encoding: " + encoding);
            }
            var length = byteLength(string, encoding) | 0;
            var buf = createBuffer(length);
            var actual = buf.write(string, encoding);
            if (actual !== length) {
              buf = buf.slice(0, actual);
            }
            return buf;
          }
          function fromArrayLike(array) {
            var length = array.length < 0 ? 0 : checked(array.length) | 0;
            var buf = createBuffer(length);
            for (var i = 0; i < length; i += 1) {
              buf[i] = array[i] & 255;
            }
            return buf;
          }
          function fromArrayBuffer(array, byteOffset, length) {
            if (byteOffset < 0 || array.byteLength < byteOffset) {
              throw new RangeError('"offset" is outside of buffer bounds');
            }
            if (array.byteLength < byteOffset + (length || 0)) {
              throw new RangeError('"length" is outside of buffer bounds');
            }
            var buf;
            if (byteOffset === void 0 && length === void 0) {
              buf = new Uint8Array(array);
            } else if (length === void 0) {
              buf = new Uint8Array(array, byteOffset);
            } else {
              buf = new Uint8Array(array, byteOffset, length);
            }
            buf.__proto__ = Buffer3.prototype;
            return buf;
          }
          function fromObject(obj) {
            if (Buffer3.isBuffer(obj)) {
              var len = checked(obj.length) | 0;
              var buf = createBuffer(len);
              if (buf.length === 0) {
                return buf;
              }
              obj.copy(buf, 0, 0, len);
              return buf;
            }
            if (obj.length !== void 0) {
              if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
                return createBuffer(0);
              }
              return fromArrayLike(obj);
            }
            if (obj.type === "Buffer" && Array.isArray(obj.data)) {
              return fromArrayLike(obj.data);
            }
          }
          function checked(length) {
            if (length >= K_MAX_LENGTH) {
              throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
            }
            return length | 0;
          }
          function SlowBuffer(length) {
            if (+length != length) {
              length = 0;
            }
            return Buffer3.alloc(+length);
          }
          Buffer3.isBuffer = function isBuffer(b) {
            return b != null && b._isBuffer === true && b !== Buffer3.prototype;
          };
          Buffer3.compare = function compare(a, b) {
            if (isInstance(a, Uint8Array))
              a = Buffer3.from(a, a.offset, a.byteLength);
            if (isInstance(b, Uint8Array))
              b = Buffer3.from(b, b.offset, b.byteLength);
            if (!Buffer3.isBuffer(a) || !Buffer3.isBuffer(b)) {
              throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
            }
            if (a === b)
              return 0;
            var x = a.length;
            var y = b.length;
            for (var i = 0, len = Math.min(x, y); i < len; ++i) {
              if (a[i] !== b[i]) {
                x = a[i];
                y = b[i];
                break;
              }
            }
            if (x < y)
              return -1;
            if (y < x)
              return 1;
            return 0;
          };
          Buffer3.isEncoding = function isEncoding(encoding) {
            switch (String(encoding).toLowerCase()) {
              case "hex":
              case "utf8":
              case "utf-8":
              case "ascii":
              case "latin1":
              case "binary":
              case "base64":
              case "ucs2":
              case "ucs-2":
              case "utf16le":
              case "utf-16le":
                return true;
              default:
                return false;
            }
          };
          Buffer3.concat = function concat(list, length) {
            if (!Array.isArray(list)) {
              throw new TypeError('"list" argument must be an Array of Buffers');
            }
            if (list.length === 0) {
              return Buffer3.alloc(0);
            }
            var i;
            if (length === void 0) {
              length = 0;
              for (i = 0; i < list.length; ++i) {
                length += list[i].length;
              }
            }
            var buffer = Buffer3.allocUnsafe(length);
            var pos = 0;
            for (i = 0; i < list.length; ++i) {
              var buf = list[i];
              if (isInstance(buf, Uint8Array)) {
                buf = Buffer3.from(buf);
              }
              if (!Buffer3.isBuffer(buf)) {
                throw new TypeError('"list" argument must be an Array of Buffers');
              }
              buf.copy(buffer, pos);
              pos += buf.length;
            }
            return buffer;
          };
          function byteLength(string, encoding) {
            if (Buffer3.isBuffer(string)) {
              return string.length;
            }
            if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
              return string.byteLength;
            }
            if (typeof string !== "string") {
              throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string);
            }
            var len = string.length;
            var mustMatch = arguments.length > 2 && arguments[2] === true;
            if (!mustMatch && len === 0)
              return 0;
            var loweredCase = false;
            for (; ; ) {
              switch (encoding) {
                case "ascii":
                case "latin1":
                case "binary":
                  return len;
                case "utf8":
                case "utf-8":
                  return utf8ToBytes(string).length;
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                  return len * 2;
                case "hex":
                  return len >>> 1;
                case "base64":
                  return base64ToBytes(string).length;
                default:
                  if (loweredCase) {
                    return mustMatch ? -1 : utf8ToBytes(string).length;
                  }
                  encoding = ("" + encoding).toLowerCase();
                  loweredCase = true;
              }
            }
          }
          Buffer3.byteLength = byteLength;
          function slowToString(encoding, start, end) {
            var loweredCase = false;
            if (start === void 0 || start < 0) {
              start = 0;
            }
            if (start > this.length) {
              return "";
            }
            if (end === void 0 || end > this.length) {
              end = this.length;
            }
            if (end <= 0) {
              return "";
            }
            end >>>= 0;
            start >>>= 0;
            if (end <= start) {
              return "";
            }
            if (!encoding)
              encoding = "utf8";
            while (true) {
              switch (encoding) {
                case "hex":
                  return hexSlice(this, start, end);
                case "utf8":
                case "utf-8":
                  return utf8Slice(this, start, end);
                case "ascii":
                  return asciiSlice(this, start, end);
                case "latin1":
                case "binary":
                  return latin1Slice(this, start, end);
                case "base64":
                  return base64Slice(this, start, end);
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                  return utf16leSlice(this, start, end);
                default:
                  if (loweredCase)
                    throw new TypeError("Unknown encoding: " + encoding);
                  encoding = (encoding + "").toLowerCase();
                  loweredCase = true;
              }
            }
          }
          Buffer3.prototype._isBuffer = true;
          function swap(b, n, m) {
            var i = b[n];
            b[n] = b[m];
            b[m] = i;
          }
          Buffer3.prototype.swap16 = function swap16() {
            var len = this.length;
            if (len % 2 !== 0) {
              throw new RangeError("Buffer size must be a multiple of 16-bits");
            }
            for (var i = 0; i < len; i += 2) {
              swap(this, i, i + 1);
            }
            return this;
          };
          Buffer3.prototype.swap32 = function swap32() {
            var len = this.length;
            if (len % 4 !== 0) {
              throw new RangeError("Buffer size must be a multiple of 32-bits");
            }
            for (var i = 0; i < len; i += 4) {
              swap(this, i, i + 3);
              swap(this, i + 1, i + 2);
            }
            return this;
          };
          Buffer3.prototype.swap64 = function swap64() {
            var len = this.length;
            if (len % 8 !== 0) {
              throw new RangeError("Buffer size must be a multiple of 64-bits");
            }
            for (var i = 0; i < len; i += 8) {
              swap(this, i, i + 7);
              swap(this, i + 1, i + 6);
              swap(this, i + 2, i + 5);
              swap(this, i + 3, i + 4);
            }
            return this;
          };
          Buffer3.prototype.toString = function toString() {
            var length = this.length;
            if (length === 0)
              return "";
            if (arguments.length === 0)
              return utf8Slice(this, 0, length);
            return slowToString.apply(this, arguments);
          };
          Buffer3.prototype.toLocaleString = Buffer3.prototype.toString;
          Buffer3.prototype.equals = function equals(b) {
            if (!Buffer3.isBuffer(b))
              throw new TypeError("Argument must be a Buffer");
            if (this === b)
              return true;
            return Buffer3.compare(this, b) === 0;
          };
          Buffer3.prototype.inspect = function inspect() {
            var str = "";
            var max = exports2.INSPECT_MAX_BYTES;
            str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
            if (this.length > max)
              str += " ... ";
            return "<Buffer " + str + ">";
          };
          Buffer3.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
            if (isInstance(target, Uint8Array)) {
              target = Buffer3.from(target, target.offset, target.byteLength);
            }
            if (!Buffer3.isBuffer(target)) {
              throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target);
            }
            if (start === void 0) {
              start = 0;
            }
            if (end === void 0) {
              end = target ? target.length : 0;
            }
            if (thisStart === void 0) {
              thisStart = 0;
            }
            if (thisEnd === void 0) {
              thisEnd = this.length;
            }
            if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
              throw new RangeError("out of range index");
            }
            if (thisStart >= thisEnd && start >= end) {
              return 0;
            }
            if (thisStart >= thisEnd) {
              return -1;
            }
            if (start >= end) {
              return 1;
            }
            start >>>= 0;
            end >>>= 0;
            thisStart >>>= 0;
            thisEnd >>>= 0;
            if (this === target)
              return 0;
            var x = thisEnd - thisStart;
            var y = end - start;
            var len = Math.min(x, y);
            var thisCopy = this.slice(thisStart, thisEnd);
            var targetCopy = target.slice(start, end);
            for (var i = 0; i < len; ++i) {
              if (thisCopy[i] !== targetCopy[i]) {
                x = thisCopy[i];
                y = targetCopy[i];
                break;
              }
            }
            if (x < y)
              return -1;
            if (y < x)
              return 1;
            return 0;
          };
          function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
            if (buffer.length === 0)
              return -1;
            if (typeof byteOffset === "string") {
              encoding = byteOffset;
              byteOffset = 0;
            } else if (byteOffset > 2147483647) {
              byteOffset = 2147483647;
            } else if (byteOffset < -2147483648) {
              byteOffset = -2147483648;
            }
            byteOffset = +byteOffset;
            if (numberIsNaN(byteOffset)) {
              byteOffset = dir ? 0 : buffer.length - 1;
            }
            if (byteOffset < 0)
              byteOffset = buffer.length + byteOffset;
            if (byteOffset >= buffer.length) {
              if (dir)
                return -1;
              else
                byteOffset = buffer.length - 1;
            } else if (byteOffset < 0) {
              if (dir)
                byteOffset = 0;
              else
                return -1;
            }
            if (typeof val === "string") {
              val = Buffer3.from(val, encoding);
            }
            if (Buffer3.isBuffer(val)) {
              if (val.length === 0) {
                return -1;
              }
              return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
            } else if (typeof val === "number") {
              val = val & 255;
              if (typeof Uint8Array.prototype.indexOf === "function") {
                if (dir) {
                  return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
                } else {
                  return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
                }
              }
              return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
            }
            throw new TypeError("val must be string, number or Buffer");
          }
          function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
            var indexSize = 1;
            var arrLength = arr.length;
            var valLength = val.length;
            if (encoding !== void 0) {
              encoding = String(encoding).toLowerCase();
              if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
                if (arr.length < 2 || val.length < 2) {
                  return -1;
                }
                indexSize = 2;
                arrLength /= 2;
                valLength /= 2;
                byteOffset /= 2;
              }
            }
            function read(buf, i2) {
              if (indexSize === 1) {
                return buf[i2];
              } else {
                return buf.readUInt16BE(i2 * indexSize);
              }
            }
            var i;
            if (dir) {
              var foundIndex = -1;
              for (i = byteOffset; i < arrLength; i++) {
                if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
                  if (foundIndex === -1)
                    foundIndex = i;
                  if (i - foundIndex + 1 === valLength)
                    return foundIndex * indexSize;
                } else {
                  if (foundIndex !== -1)
                    i -= i - foundIndex;
                  foundIndex = -1;
                }
              }
            } else {
              if (byteOffset + valLength > arrLength)
                byteOffset = arrLength - valLength;
              for (i = byteOffset; i >= 0; i--) {
                var found = true;
                for (var j = 0; j < valLength; j++) {
                  if (read(arr, i + j) !== read(val, j)) {
                    found = false;
                    break;
                  }
                }
                if (found)
                  return i;
              }
            }
            return -1;
          }
          Buffer3.prototype.includes = function includes(val, byteOffset, encoding) {
            return this.indexOf(val, byteOffset, encoding) !== -1;
          };
          Buffer3.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
            return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
          };
          Buffer3.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
            return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
          };
          function hexWrite(buf, string, offset, length) {
            offset = Number(offset) || 0;
            var remaining = buf.length - offset;
            if (!length) {
              length = remaining;
            } else {
              length = Number(length);
              if (length > remaining) {
                length = remaining;
              }
            }
            var strLen = string.length;
            if (length > strLen / 2) {
              length = strLen / 2;
            }
            for (var i = 0; i < length; ++i) {
              var parsed = parseInt(string.substr(i * 2, 2), 16);
              if (numberIsNaN(parsed))
                return i;
              buf[offset + i] = parsed;
            }
            return i;
          }
          function utf8Write(buf, string, offset, length) {
            return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
          }
          function asciiWrite(buf, string, offset, length) {
            return blitBuffer(asciiToBytes(string), buf, offset, length);
          }
          function latin1Write(buf, string, offset, length) {
            return asciiWrite(buf, string, offset, length);
          }
          function base64Write(buf, string, offset, length) {
            return blitBuffer(base64ToBytes(string), buf, offset, length);
          }
          function ucs2Write(buf, string, offset, length) {
            return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
          }
          Buffer3.prototype.write = function write(string, offset, length, encoding) {
            if (offset === void 0) {
              encoding = "utf8";
              length = this.length;
              offset = 0;
            } else if (length === void 0 && typeof offset === "string") {
              encoding = offset;
              length = this.length;
              offset = 0;
            } else if (isFinite(offset)) {
              offset = offset >>> 0;
              if (isFinite(length)) {
                length = length >>> 0;
                if (encoding === void 0)
                  encoding = "utf8";
              } else {
                encoding = length;
                length = void 0;
              }
            } else {
              throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
            }
            var remaining = this.length - offset;
            if (length === void 0 || length > remaining)
              length = remaining;
            if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
              throw new RangeError("Attempt to write outside buffer bounds");
            }
            if (!encoding)
              encoding = "utf8";
            var loweredCase = false;
            for (; ; ) {
              switch (encoding) {
                case "hex":
                  return hexWrite(this, string, offset, length);
                case "utf8":
                case "utf-8":
                  return utf8Write(this, string, offset, length);
                case "ascii":
                  return asciiWrite(this, string, offset, length);
                case "latin1":
                case "binary":
                  return latin1Write(this, string, offset, length);
                case "base64":
                  return base64Write(this, string, offset, length);
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                  return ucs2Write(this, string, offset, length);
                default:
                  if (loweredCase)
                    throw new TypeError("Unknown encoding: " + encoding);
                  encoding = ("" + encoding).toLowerCase();
                  loweredCase = true;
              }
            }
          };
          Buffer3.prototype.toJSON = function toJSON() {
            return {
              type: "Buffer",
              data: Array.prototype.slice.call(this._arr || this, 0)
            };
          };
          function base64Slice(buf, start, end) {
            if (start === 0 && end === buf.length) {
              return base64.fromByteArray(buf);
            } else {
              return base64.fromByteArray(buf.slice(start, end));
            }
          }
          function utf8Slice(buf, start, end) {
            end = Math.min(buf.length, end);
            var res = [];
            var i = start;
            while (i < end) {
              var firstByte = buf[i];
              var codePoint = null;
              var bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
              if (i + bytesPerSequence <= end) {
                var secondByte, thirdByte, fourthByte, tempCodePoint;
                switch (bytesPerSequence) {
                  case 1:
                    if (firstByte < 128) {
                      codePoint = firstByte;
                    }
                    break;
                  case 2:
                    secondByte = buf[i + 1];
                    if ((secondByte & 192) === 128) {
                      tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                      if (tempCodePoint > 127) {
                        codePoint = tempCodePoint;
                      }
                    }
                    break;
                  case 3:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                      tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                      if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                        codePoint = tempCodePoint;
                      }
                    }
                    break;
                  case 4:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    fourthByte = buf[i + 3];
                    if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                      tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                      if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                        codePoint = tempCodePoint;
                      }
                    }
                }
              }
              if (codePoint === null) {
                codePoint = 65533;
                bytesPerSequence = 1;
              } else if (codePoint > 65535) {
                codePoint -= 65536;
                res.push(codePoint >>> 10 & 1023 | 55296);
                codePoint = 56320 | codePoint & 1023;
              }
              res.push(codePoint);
              i += bytesPerSequence;
            }
            return decodeCodePointsArray(res);
          }
          var MAX_ARGUMENTS_LENGTH = 4096;
          function decodeCodePointsArray(codePoints) {
            var len = codePoints.length;
            if (len <= MAX_ARGUMENTS_LENGTH) {
              return String.fromCharCode.apply(String, codePoints);
            }
            var res = "";
            var i = 0;
            while (i < len) {
              res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
            }
            return res;
          }
          function asciiSlice(buf, start, end) {
            var ret = "";
            end = Math.min(buf.length, end);
            for (var i = start; i < end; ++i) {
              ret += String.fromCharCode(buf[i] & 127);
            }
            return ret;
          }
          function latin1Slice(buf, start, end) {
            var ret = "";
            end = Math.min(buf.length, end);
            for (var i = start; i < end; ++i) {
              ret += String.fromCharCode(buf[i]);
            }
            return ret;
          }
          function hexSlice(buf, start, end) {
            var len = buf.length;
            if (!start || start < 0)
              start = 0;
            if (!end || end < 0 || end > len)
              end = len;
            var out = "";
            for (var i = start; i < end; ++i) {
              out += toHex(buf[i]);
            }
            return out;
          }
          function utf16leSlice(buf, start, end) {
            var bytes = buf.slice(start, end);
            var res = "";
            for (var i = 0; i < bytes.length; i += 2) {
              res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
            }
            return res;
          }
          Buffer3.prototype.slice = function slice(start, end) {
            var len = this.length;
            start = ~~start;
            end = end === void 0 ? len : ~~end;
            if (start < 0) {
              start += len;
              if (start < 0)
                start = 0;
            } else if (start > len) {
              start = len;
            }
            if (end < 0) {
              end += len;
              if (end < 0)
                end = 0;
            } else if (end > len) {
              end = len;
            }
            if (end < start)
              end = start;
            var newBuf = this.subarray(start, end);
            newBuf.__proto__ = Buffer3.prototype;
            return newBuf;
          };
          function checkOffset(offset, ext, length) {
            if (offset % 1 !== 0 || offset < 0)
              throw new RangeError("offset is not uint");
            if (offset + ext > length)
              throw new RangeError("Trying to access beyond buffer length");
          }
          Buffer3.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
            offset = offset >>> 0;
            byteLength2 = byteLength2 >>> 0;
            if (!noAssert)
              checkOffset(offset, byteLength2, this.length);
            var val = this[offset];
            var mul = 1;
            var i = 0;
            while (++i < byteLength2 && (mul *= 256)) {
              val += this[offset + i] * mul;
            }
            return val;
          };
          Buffer3.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
            offset = offset >>> 0;
            byteLength2 = byteLength2 >>> 0;
            if (!noAssert) {
              checkOffset(offset, byteLength2, this.length);
            }
            var val = this[offset + --byteLength2];
            var mul = 1;
            while (byteLength2 > 0 && (mul *= 256)) {
              val += this[offset + --byteLength2] * mul;
            }
            return val;
          };
          Buffer3.prototype.readUInt8 = function readUInt8(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 1, this.length);
            return this[offset];
          };
          Buffer3.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 2, this.length);
            return this[offset] | this[offset + 1] << 8;
          };
          Buffer3.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 2, this.length);
            return this[offset] << 8 | this[offset + 1];
          };
          Buffer3.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 4, this.length);
            return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
          };
          Buffer3.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 4, this.length);
            return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
          };
          Buffer3.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
            offset = offset >>> 0;
            byteLength2 = byteLength2 >>> 0;
            if (!noAssert)
              checkOffset(offset, byteLength2, this.length);
            var val = this[offset];
            var mul = 1;
            var i = 0;
            while (++i < byteLength2 && (mul *= 256)) {
              val += this[offset + i] * mul;
            }
            mul *= 128;
            if (val >= mul)
              val -= Math.pow(2, 8 * byteLength2);
            return val;
          };
          Buffer3.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
            offset = offset >>> 0;
            byteLength2 = byteLength2 >>> 0;
            if (!noAssert)
              checkOffset(offset, byteLength2, this.length);
            var i = byteLength2;
            var mul = 1;
            var val = this[offset + --i];
            while (i > 0 && (mul *= 256)) {
              val += this[offset + --i] * mul;
            }
            mul *= 128;
            if (val >= mul)
              val -= Math.pow(2, 8 * byteLength2);
            return val;
          };
          Buffer3.prototype.readInt8 = function readInt8(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 1, this.length);
            if (!(this[offset] & 128))
              return this[offset];
            return (255 - this[offset] + 1) * -1;
          };
          Buffer3.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 2, this.length);
            var val = this[offset] | this[offset + 1] << 8;
            return val & 32768 ? val | 4294901760 : val;
          };
          Buffer3.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 2, this.length);
            var val = this[offset + 1] | this[offset] << 8;
            return val & 32768 ? val | 4294901760 : val;
          };
          Buffer3.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 4, this.length);
            return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
          };
          Buffer3.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 4, this.length);
            return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
          };
          Buffer3.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 4, this.length);
            return ieee754.read(this, offset, true, 23, 4);
          };
          Buffer3.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 4, this.length);
            return ieee754.read(this, offset, false, 23, 4);
          };
          Buffer3.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 8, this.length);
            return ieee754.read(this, offset, true, 52, 8);
          };
          Buffer3.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
            offset = offset >>> 0;
            if (!noAssert)
              checkOffset(offset, 8, this.length);
            return ieee754.read(this, offset, false, 52, 8);
          };
          function checkInt(buf, value, offset, ext, max, min) {
            if (!Buffer3.isBuffer(buf))
              throw new TypeError('"buffer" argument must be a Buffer instance');
            if (value > max || value < min)
              throw new RangeError('"value" argument is out of bounds');
            if (offset + ext > buf.length)
              throw new RangeError("Index out of range");
          }
          Buffer3.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
            value = +value;
            offset = offset >>> 0;
            byteLength2 = byteLength2 >>> 0;
            if (!noAssert) {
              var maxBytes = Math.pow(2, 8 * byteLength2) - 1;
              checkInt(this, value, offset, byteLength2, maxBytes, 0);
            }
            var mul = 1;
            var i = 0;
            this[offset] = value & 255;
            while (++i < byteLength2 && (mul *= 256)) {
              this[offset + i] = value / mul & 255;
            }
            return offset + byteLength2;
          };
          Buffer3.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
            value = +value;
            offset = offset >>> 0;
            byteLength2 = byteLength2 >>> 0;
            if (!noAssert) {
              var maxBytes = Math.pow(2, 8 * byteLength2) - 1;
              checkInt(this, value, offset, byteLength2, maxBytes, 0);
            }
            var i = byteLength2 - 1;
            var mul = 1;
            this[offset + i] = value & 255;
            while (--i >= 0 && (mul *= 256)) {
              this[offset + i] = value / mul & 255;
            }
            return offset + byteLength2;
          };
          Buffer3.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 1, 255, 0);
            this[offset] = value & 255;
            return offset + 1;
          };
          Buffer3.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 2, 65535, 0);
            this[offset] = value & 255;
            this[offset + 1] = value >>> 8;
            return offset + 2;
          };
          Buffer3.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 2, 65535, 0);
            this[offset] = value >>> 8;
            this[offset + 1] = value & 255;
            return offset + 2;
          };
          Buffer3.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 4, 4294967295, 0);
            this[offset + 3] = value >>> 24;
            this[offset + 2] = value >>> 16;
            this[offset + 1] = value >>> 8;
            this[offset] = value & 255;
            return offset + 4;
          };
          Buffer3.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 4, 4294967295, 0);
            this[offset] = value >>> 24;
            this[offset + 1] = value >>> 16;
            this[offset + 2] = value >>> 8;
            this[offset + 3] = value & 255;
            return offset + 4;
          };
          Buffer3.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert) {
              var limit = Math.pow(2, 8 * byteLength2 - 1);
              checkInt(this, value, offset, byteLength2, limit - 1, -limit);
            }
            var i = 0;
            var mul = 1;
            var sub = 0;
            this[offset] = value & 255;
            while (++i < byteLength2 && (mul *= 256)) {
              if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
                sub = 1;
              }
              this[offset + i] = (value / mul >> 0) - sub & 255;
            }
            return offset + byteLength2;
          };
          Buffer3.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert) {
              var limit = Math.pow(2, 8 * byteLength2 - 1);
              checkInt(this, value, offset, byteLength2, limit - 1, -limit);
            }
            var i = byteLength2 - 1;
            var mul = 1;
            var sub = 0;
            this[offset + i] = value & 255;
            while (--i >= 0 && (mul *= 256)) {
              if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
                sub = 1;
              }
              this[offset + i] = (value / mul >> 0) - sub & 255;
            }
            return offset + byteLength2;
          };
          Buffer3.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 1, 127, -128);
            if (value < 0)
              value = 255 + value + 1;
            this[offset] = value & 255;
            return offset + 1;
          };
          Buffer3.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 2, 32767, -32768);
            this[offset] = value & 255;
            this[offset + 1] = value >>> 8;
            return offset + 2;
          };
          Buffer3.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 2, 32767, -32768);
            this[offset] = value >>> 8;
            this[offset + 1] = value & 255;
            return offset + 2;
          };
          Buffer3.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 4, 2147483647, -2147483648);
            this[offset] = value & 255;
            this[offset + 1] = value >>> 8;
            this[offset + 2] = value >>> 16;
            this[offset + 3] = value >>> 24;
            return offset + 4;
          };
          Buffer3.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert)
              checkInt(this, value, offset, 4, 2147483647, -2147483648);
            if (value < 0)
              value = 4294967295 + value + 1;
            this[offset] = value >>> 24;
            this[offset + 1] = value >>> 16;
            this[offset + 2] = value >>> 8;
            this[offset + 3] = value & 255;
            return offset + 4;
          };
          function checkIEEE754(buf, value, offset, ext, max, min) {
            if (offset + ext > buf.length)
              throw new RangeError("Index out of range");
            if (offset < 0)
              throw new RangeError("Index out of range");
          }
          function writeFloat(buf, value, offset, littleEndian, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert) {
              checkIEEE754(buf, value, offset, 4);
            }
            ieee754.write(buf, value, offset, littleEndian, 23, 4);
            return offset + 4;
          }
          Buffer3.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
            return writeFloat(this, value, offset, true, noAssert);
          };
          Buffer3.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
            return writeFloat(this, value, offset, false, noAssert);
          };
          function writeDouble(buf, value, offset, littleEndian, noAssert) {
            value = +value;
            offset = offset >>> 0;
            if (!noAssert) {
              checkIEEE754(buf, value, offset, 8);
            }
            ieee754.write(buf, value, offset, littleEndian, 52, 8);
            return offset + 8;
          }
          Buffer3.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
            return writeDouble(this, value, offset, true, noAssert);
          };
          Buffer3.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
            return writeDouble(this, value, offset, false, noAssert);
          };
          Buffer3.prototype.copy = function copy(target, targetStart, start, end) {
            if (!Buffer3.isBuffer(target))
              throw new TypeError("argument should be a Buffer");
            if (!start)
              start = 0;
            if (!end && end !== 0)
              end = this.length;
            if (targetStart >= target.length)
              targetStart = target.length;
            if (!targetStart)
              targetStart = 0;
            if (end > 0 && end < start)
              end = start;
            if (end === start)
              return 0;
            if (target.length === 0 || this.length === 0)
              return 0;
            if (targetStart < 0) {
              throw new RangeError("targetStart out of bounds");
            }
            if (start < 0 || start >= this.length)
              throw new RangeError("Index out of range");
            if (end < 0)
              throw new RangeError("sourceEnd out of bounds");
            if (end > this.length)
              end = this.length;
            if (target.length - targetStart < end - start) {
              end = target.length - targetStart + start;
            }
            var len = end - start;
            if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
              this.copyWithin(targetStart, start, end);
            } else if (this === target && start < targetStart && targetStart < end) {
              for (var i = len - 1; i >= 0; --i) {
                target[i + targetStart] = this[i + start];
              }
            } else {
              Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
            }
            return len;
          };
          Buffer3.prototype.fill = function fill(val, start, end, encoding) {
            if (typeof val === "string") {
              if (typeof start === "string") {
                encoding = start;
                start = 0;
                end = this.length;
              } else if (typeof end === "string") {
                encoding = end;
                end = this.length;
              }
              if (encoding !== void 0 && typeof encoding !== "string") {
                throw new TypeError("encoding must be a string");
              }
              if (typeof encoding === "string" && !Buffer3.isEncoding(encoding)) {
                throw new TypeError("Unknown encoding: " + encoding);
              }
              if (val.length === 1) {
                var code = val.charCodeAt(0);
                if (encoding === "utf8" && code < 128 || encoding === "latin1") {
                  val = code;
                }
              }
            } else if (typeof val === "number") {
              val = val & 255;
            }
            if (start < 0 || this.length < start || this.length < end) {
              throw new RangeError("Out of range index");
            }
            if (end <= start) {
              return this;
            }
            start = start >>> 0;
            end = end === void 0 ? this.length : end >>> 0;
            if (!val)
              val = 0;
            var i;
            if (typeof val === "number") {
              for (i = start; i < end; ++i) {
                this[i] = val;
              }
            } else {
              var bytes = Buffer3.isBuffer(val) ? val : Buffer3.from(val, encoding);
              var len = bytes.length;
              if (len === 0) {
                throw new TypeError('The value "' + val + '" is invalid for argument "value"');
              }
              for (i = 0; i < end - start; ++i) {
                this[i + start] = bytes[i % len];
              }
            }
            return this;
          };
          var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
          function base64clean(str) {
            str = str.split("=")[0];
            str = str.trim().replace(INVALID_BASE64_RE, "");
            if (str.length < 2)
              return "";
            while (str.length % 4 !== 0) {
              str = str + "=";
            }
            return str;
          }
          function toHex(n) {
            if (n < 16)
              return "0" + n.toString(16);
            return n.toString(16);
          }
          function utf8ToBytes(string, units) {
            units = units || Infinity;
            var codePoint;
            var length = string.length;
            var leadSurrogate = null;
            var bytes = [];
            for (var i = 0; i < length; ++i) {
              codePoint = string.charCodeAt(i);
              if (codePoint > 55295 && codePoint < 57344) {
                if (!leadSurrogate) {
                  if (codePoint > 56319) {
                    if ((units -= 3) > -1)
                      bytes.push(239, 191, 189);
                    continue;
                  } else if (i + 1 === length) {
                    if ((units -= 3) > -1)
                      bytes.push(239, 191, 189);
                    continue;
                  }
                  leadSurrogate = codePoint;
                  continue;
                }
                if (codePoint < 56320) {
                  if ((units -= 3) > -1)
                    bytes.push(239, 191, 189);
                  leadSurrogate = codePoint;
                  continue;
                }
                codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
              } else if (leadSurrogate) {
                if ((units -= 3) > -1)
                  bytes.push(239, 191, 189);
              }
              leadSurrogate = null;
              if (codePoint < 128) {
                if ((units -= 1) < 0)
                  break;
                bytes.push(codePoint);
              } else if (codePoint < 2048) {
                if ((units -= 2) < 0)
                  break;
                bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
              } else if (codePoint < 65536) {
                if ((units -= 3) < 0)
                  break;
                bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
              } else if (codePoint < 1114112) {
                if ((units -= 4) < 0)
                  break;
                bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
              } else {
                throw new Error("Invalid code point");
              }
            }
            return bytes;
          }
          function asciiToBytes(str) {
            var byteArray = [];
            for (var i = 0; i < str.length; ++i) {
              byteArray.push(str.charCodeAt(i) & 255);
            }
            return byteArray;
          }
          function utf16leToBytes(str, units) {
            var c, hi, lo;
            var byteArray = [];
            for (var i = 0; i < str.length; ++i) {
              if ((units -= 2) < 0)
                break;
              c = str.charCodeAt(i);
              hi = c >> 8;
              lo = c % 256;
              byteArray.push(lo);
              byteArray.push(hi);
            }
            return byteArray;
          }
          function base64ToBytes(str) {
            return base64.toByteArray(base64clean(str));
          }
          function blitBuffer(src, dst, offset, length) {
            for (var i = 0; i < length; ++i) {
              if (i + offset >= dst.length || i >= src.length)
                break;
              dst[i + offset] = src[i];
            }
            return i;
          }
          function isInstance(obj, type) {
            return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
          }
          function numberIsNaN(obj) {
            return obj !== obj;
          }
        }).call(this);
      }).call(this, require2("buffer").Buffer);
    }, { "base64-js": 13, "buffer": 17, "ieee754": 23 }], 18: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          exports2.formatArgs = formatArgs;
          exports2.save = save;
          exports2.load = load;
          exports2.useColors = useColors;
          exports2.storage = localstorage();
          exports2.destroy = (() => {
            let warned = false;
            return () => {
              if (!warned) {
                warned = true;
                console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
              }
            };
          })();
          exports2.colors = [
            "#0000CC",
            "#0000FF",
            "#0033CC",
            "#0033FF",
            "#0066CC",
            "#0066FF",
            "#0099CC",
            "#0099FF",
            "#00CC00",
            "#00CC33",
            "#00CC66",
            "#00CC99",
            "#00CCCC",
            "#00CCFF",
            "#3300CC",
            "#3300FF",
            "#3333CC",
            "#3333FF",
            "#3366CC",
            "#3366FF",
            "#3399CC",
            "#3399FF",
            "#33CC00",
            "#33CC33",
            "#33CC66",
            "#33CC99",
            "#33CCCC",
            "#33CCFF",
            "#6600CC",
            "#6600FF",
            "#6633CC",
            "#6633FF",
            "#66CC00",
            "#66CC33",
            "#9900CC",
            "#9900FF",
            "#9933CC",
            "#9933FF",
            "#99CC00",
            "#99CC33",
            "#CC0000",
            "#CC0033",
            "#CC0066",
            "#CC0099",
            "#CC00CC",
            "#CC00FF",
            "#CC3300",
            "#CC3333",
            "#CC3366",
            "#CC3399",
            "#CC33CC",
            "#CC33FF",
            "#CC6600",
            "#CC6633",
            "#CC9900",
            "#CC9933",
            "#CCCC00",
            "#CCCC33",
            "#FF0000",
            "#FF0033",
            "#FF0066",
            "#FF0099",
            "#FF00CC",
            "#FF00FF",
            "#FF3300",
            "#FF3333",
            "#FF3366",
            "#FF3399",
            "#FF33CC",
            "#FF33FF",
            "#FF6600",
            "#FF6633",
            "#FF9900",
            "#FF9933",
            "#FFCC00",
            "#FFCC33"
          ];
          function useColors() {
            if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
              return true;
            }
            if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
              return false;
            }
            return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
          }
          function formatArgs(args) {
            args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
            if (!this.useColors) {
              return;
            }
            const c = "color: " + this.color;
            args.splice(1, 0, c, "color: inherit");
            let index = 0;
            let lastC = 0;
            args[0].replace(/%[a-zA-Z%]/g, (match) => {
              if (match === "%%") {
                return;
              }
              index++;
              if (match === "%c") {
                lastC = index;
              }
            });
            args.splice(lastC, 0, c);
          }
          exports2.log = console.debug || console.log || (() => {
          });
          function save(namespaces) {
            try {
              if (namespaces) {
                exports2.storage.setItem("debug", namespaces);
              } else {
                exports2.storage.removeItem("debug");
              }
            } catch (error) {
            }
          }
          function load() {
            let r;
            try {
              r = exports2.storage.getItem("debug");
            } catch (error) {
            }
            if (!r && typeof process !== "undefined" && "env" in process) {
              r = {}.DEBUG;
            }
            return r;
          }
          function localstorage() {
            try {
              return localStorage;
            } catch (error) {
            }
          }
          module2.exports = require2("./common")(exports2);
          const { formatters } = module2.exports;
          formatters.j = function(v) {
            try {
              return JSON.stringify(v);
            } catch (error) {
              return "[UnexpectedJSONParseError]: " + error.message;
            }
          };
        }).call(this);
      }).call(this, require2("_process"));
    }, { "./common": 19, "_process": 50 }], 19: [function(require2, module2, exports2) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require2("ms");
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self2 = debug;
            const curr = Number(new Date());
            const ms = curr - (prevTime || curr);
            self2.diff = ms;
            self2.prev = prevTime;
            self2.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self2, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self2, args);
            const logFn = self2.log || createDebug.log;
            logFn.apply(self2, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          let i;
          const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
          const len = split.length;
          for (i = 0; i < len; i++) {
            if (!split[i]) {
              continue;
            }
            namespaces = split[i].replace(/\*/g, ".*?");
            if (namespaces[0] === "-") {
              createDebug.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
            } else {
              createDebug.names.push(new RegExp("^" + namespaces + "$"));
            }
          }
        }
        function disable() {
          const namespaces = [
            ...createDebug.names.map(toNamespace),
            ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          if (name[name.length - 1] === "*") {
            return true;
          }
          let i;
          let len;
          for (i = 0, len = createDebug.skips.length; i < len; i++) {
            if (createDebug.skips[i].test(name)) {
              return false;
            }
          }
          for (i = 0, len = createDebug.names.length; i < len; i++) {
            if (createDebug.names[i].test(name)) {
              return true;
            }
          }
          return false;
        }
        function toNamespace(regexp) {
          return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module2.exports = setup;
    }, { "ms": 45 }], 20: [function(require2, module2, exports2) {
      (function(process, Buffer2) {
        (function() {
          var stream = require2("readable-stream");
          var eos = require2("end-of-stream");
          var inherits = require2("inherits");
          var shift = require2("stream-shift");
          var SIGNAL_FLUSH = Buffer2.from && Buffer2.from !== Uint8Array.from ? Buffer2.from([0]) : new Buffer2([0]);
          var onuncork = function(self2, fn) {
            if (self2._corked)
              self2.once("uncork", fn);
            else
              fn();
          };
          var autoDestroy = function(self2, err) {
            if (self2._autoDestroy)
              self2.destroy(err);
          };
          var destroyer = function(self2, end2) {
            return function(err) {
              if (err)
                autoDestroy(self2, err.message === "premature close" ? null : err);
              else if (end2 && !self2._ended)
                self2.end();
            };
          };
          var end = function(ws, fn) {
            if (!ws)
              return fn();
            if (ws._writableState && ws._writableState.finished)
              return fn();
            if (ws._writableState)
              return ws.end(fn);
            ws.end();
            fn();
          };
          var noop = function() {
          };
          var toStreams2 = function(rs) {
            return new stream.Readable({ objectMode: true, highWaterMark: 16 }).wrap(rs);
          };
          var Duplexify = function(writable, readable, opts) {
            if (!(this instanceof Duplexify))
              return new Duplexify(writable, readable, opts);
            stream.Duplex.call(this, opts);
            this._writable = null;
            this._readable = null;
            this._readable2 = null;
            this._autoDestroy = !opts || opts.autoDestroy !== false;
            this._forwardDestroy = !opts || opts.destroy !== false;
            this._forwardEnd = !opts || opts.end !== false;
            this._corked = 1;
            this._ondrain = null;
            this._drained = false;
            this._forwarding = false;
            this._unwrite = null;
            this._unread = null;
            this._ended = false;
            this.destroyed = false;
            if (writable)
              this.setWritable(writable);
            if (readable)
              this.setReadable(readable);
          };
          inherits(Duplexify, stream.Duplex);
          Duplexify.obj = function(writable, readable, opts) {
            if (!opts)
              opts = {};
            opts.objectMode = true;
            opts.highWaterMark = 16;
            return new Duplexify(writable, readable, opts);
          };
          Duplexify.prototype.cork = function() {
            if (++this._corked === 1)
              this.emit("cork");
          };
          Duplexify.prototype.uncork = function() {
            if (this._corked && --this._corked === 0)
              this.emit("uncork");
          };
          Duplexify.prototype.setWritable = function(writable) {
            if (this._unwrite)
              this._unwrite();
            if (this.destroyed) {
              if (writable && writable.destroy)
                writable.destroy();
              return;
            }
            if (writable === null || writable === false) {
              this.end();
              return;
            }
            var self2 = this;
            var unend = eos(writable, { writable: true, readable: false }, destroyer(this, this._forwardEnd));
            var ondrain = function() {
              var ondrain2 = self2._ondrain;
              self2._ondrain = null;
              if (ondrain2)
                ondrain2();
            };
            var clear = function() {
              self2._writable.removeListener("drain", ondrain);
              unend();
            };
            if (this._unwrite)
              process.nextTick(ondrain);
            this._writable = writable;
            this._writable.on("drain", ondrain);
            this._unwrite = clear;
            this.uncork();
          };
          Duplexify.prototype.setReadable = function(readable) {
            if (this._unread)
              this._unread();
            if (this.destroyed) {
              if (readable && readable.destroy)
                readable.destroy();
              return;
            }
            if (readable === null || readable === false) {
              this.push(null);
              this.resume();
              return;
            }
            var self2 = this;
            var unend = eos(readable, { writable: false, readable: true }, destroyer(this));
            var onreadable = function() {
              self2._forward();
            };
            var onend = function() {
              self2.push(null);
            };
            var clear = function() {
              self2._readable2.removeListener("readable", onreadable);
              self2._readable2.removeListener("end", onend);
              unend();
            };
            this._drained = true;
            this._readable = readable;
            this._readable2 = readable._readableState ? readable : toStreams2(readable);
            this._readable2.on("readable", onreadable);
            this._readable2.on("end", onend);
            this._unread = clear;
            this._forward();
          };
          Duplexify.prototype._read = function() {
            this._drained = true;
            this._forward();
          };
          Duplexify.prototype._forward = function() {
            if (this._forwarding || !this._readable2 || !this._drained)
              return;
            this._forwarding = true;
            var data;
            while (this._drained && (data = shift(this._readable2)) !== null) {
              if (this.destroyed)
                continue;
              this._drained = this.push(data);
            }
            this._forwarding = false;
          };
          Duplexify.prototype.destroy = function(err, cb) {
            if (!cb)
              cb = noop;
            if (this.destroyed)
              return cb(null);
            this.destroyed = true;
            var self2 = this;
            process.nextTick(function() {
              self2._destroy(err);
              cb(null);
            });
          };
          Duplexify.prototype._destroy = function(err) {
            if (err) {
              var ondrain = this._ondrain;
              this._ondrain = null;
              if (ondrain)
                ondrain(err);
              else
                this.emit("error", err);
            }
            if (this._forwardDestroy) {
              if (this._readable && this._readable.destroy)
                this._readable.destroy();
              if (this._writable && this._writable.destroy)
                this._writable.destroy();
            }
            this.emit("close");
          };
          Duplexify.prototype._write = function(data, enc, cb) {
            if (this.destroyed)
              return;
            if (this._corked)
              return onuncork(this, this._write.bind(this, data, enc, cb));
            if (data === SIGNAL_FLUSH)
              return this._finish(cb);
            if (!this._writable)
              return cb();
            if (this._writable.write(data) === false)
              this._ondrain = cb;
            else if (!this.destroyed)
              cb();
          };
          Duplexify.prototype._finish = function(cb) {
            var self2 = this;
            this.emit("preend");
            onuncork(this, function() {
              end(self2._forwardEnd && self2._writable, function() {
                if (self2._writableState.prefinished === false)
                  self2._writableState.prefinished = true;
                self2.emit("prefinish");
                onuncork(self2, cb);
              });
            });
          };
          Duplexify.prototype.end = function(data, enc, cb) {
            if (typeof data === "function")
              return this.end(null, null, data);
            if (typeof enc === "function")
              return this.end(data, null, enc);
            this._ended = true;
            if (data)
              this.write(data);
            if (!this._writableState.ending && !this._writableState.destroyed)
              this.write(SIGNAL_FLUSH);
            return stream.Writable.prototype.end.call(this, cb);
          };
          module2.exports = Duplexify;
        }).call(this);
      }).call(this, require2("_process"), require2("buffer").Buffer);
    }, { "_process": 50, "buffer": 17, "end-of-stream": 21, "inherits": 24, "readable-stream": 69, "stream-shift": 74 }], 21: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          var once = require2("once");
          var noop = function() {
          };
          var isRequest = function(stream) {
            return stream.setHeader && typeof stream.abort === "function";
          };
          var isChildProcess = function(stream) {
            return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3;
          };
          var eos = function(stream, opts, callback) {
            if (typeof opts === "function")
              return eos(stream, null, opts);
            if (!opts)
              opts = {};
            callback = once(callback || noop);
            var ws = stream._writableState;
            var rs = stream._readableState;
            var readable = opts.readable || opts.readable !== false && stream.readable;
            var writable = opts.writable || opts.writable !== false && stream.writable;
            var cancelled = false;
            var onlegacyfinish = function() {
              if (!stream.writable)
                onfinish();
            };
            var onfinish = function() {
              writable = false;
              if (!readable)
                callback.call(stream);
            };
            var onend = function() {
              readable = false;
              if (!writable)
                callback.call(stream);
            };
            var onexit = function(exitCode) {
              callback.call(stream, exitCode ? new Error("exited with error code: " + exitCode) : null);
            };
            var onerror = function(err) {
              callback.call(stream, err);
            };
            var onclose = function() {
              process.nextTick(onclosenexttick);
            };
            var onclosenexttick = function() {
              if (cancelled)
                return;
              if (readable && !(rs && (rs.ended && !rs.destroyed)))
                return callback.call(stream, new Error("premature close"));
              if (writable && !(ws && (ws.ended && !ws.destroyed)))
                return callback.call(stream, new Error("premature close"));
            };
            var onrequest = function() {
              stream.req.on("finish", onfinish);
            };
            if (isRequest(stream)) {
              stream.on("complete", onfinish);
              stream.on("abort", onclose);
              if (stream.req)
                onrequest();
              else
                stream.on("request", onrequest);
            } else if (writable && !ws) {
              stream.on("end", onlegacyfinish);
              stream.on("close", onlegacyfinish);
            }
            if (isChildProcess(stream))
              stream.on("exit", onexit);
            stream.on("end", onend);
            stream.on("finish", onfinish);
            if (opts.error !== false)
              stream.on("error", onerror);
            stream.on("close", onclose);
            return function() {
              cancelled = true;
              stream.removeListener("complete", onfinish);
              stream.removeListener("abort", onclose);
              stream.removeListener("request", onrequest);
              if (stream.req)
                stream.req.removeListener("finish", onfinish);
              stream.removeListener("end", onlegacyfinish);
              stream.removeListener("close", onlegacyfinish);
              stream.removeListener("finish", onfinish);
              stream.removeListener("exit", onexit);
              stream.removeListener("end", onend);
              stream.removeListener("error", onerror);
              stream.removeListener("close", onclose);
            };
          };
          module2.exports = eos;
        }).call(this);
      }).call(this, require2("_process"));
    }, { "_process": 50, "once": 48 }], 22: [function(require2, module2, exports2) {
      var objectCreate = Object.create || objectCreatePolyfill;
      var objectKeys = Object.keys || objectKeysPolyfill;
      var bind = Function.prototype.bind || functionBindPolyfill;
      function EventEmitter() {
        if (!this._events || !Object.prototype.hasOwnProperty.call(this, "_events")) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        }
        this._maxListeners = this._maxListeners || void 0;
      }
      module2.exports = EventEmitter;
      EventEmitter.EventEmitter = EventEmitter;
      EventEmitter.prototype._events = void 0;
      EventEmitter.prototype._maxListeners = void 0;
      var defaultMaxListeners = 10;
      var hasDefineProperty;
      try {
        var o = {};
        if (Object.defineProperty)
          Object.defineProperty(o, "x", { value: 0 });
        hasDefineProperty = o.x === 0;
      } catch (err) {
        hasDefineProperty = false;
      }
      if (hasDefineProperty) {
        Object.defineProperty(EventEmitter, "defaultMaxListeners", {
          enumerable: true,
          get: function() {
            return defaultMaxListeners;
          },
          set: function(arg) {
            if (typeof arg !== "number" || arg < 0 || arg !== arg)
              throw new TypeError('"defaultMaxListeners" must be a positive number');
            defaultMaxListeners = arg;
          }
        });
      } else {
        EventEmitter.defaultMaxListeners = defaultMaxListeners;
      }
      EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
        if (typeof n !== "number" || n < 0 || isNaN(n))
          throw new TypeError('"n" argument must be a positive number');
        this._maxListeners = n;
        return this;
      };
      function $getMaxListeners(that) {
        if (that._maxListeners === void 0)
          return EventEmitter.defaultMaxListeners;
        return that._maxListeners;
      }
      EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
        return $getMaxListeners(this);
      };
      function emitNone(handler, isFn, self2) {
        if (isFn)
          handler.call(self2);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self2);
        }
      }
      function emitOne(handler, isFn, self2, arg1) {
        if (isFn)
          handler.call(self2, arg1);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self2, arg1);
        }
      }
      function emitTwo(handler, isFn, self2, arg1, arg2) {
        if (isFn)
          handler.call(self2, arg1, arg2);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self2, arg1, arg2);
        }
      }
      function emitThree(handler, isFn, self2, arg1, arg2, arg3) {
        if (isFn)
          handler.call(self2, arg1, arg2, arg3);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self2, arg1, arg2, arg3);
        }
      }
      function emitMany(handler, isFn, self2, args) {
        if (isFn)
          handler.apply(self2, args);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].apply(self2, args);
        }
      }
      EventEmitter.prototype.emit = function emit(type) {
        var er, handler, len, args, i, events;
        var doError = type === "error";
        events = this._events;
        if (events)
          doError = doError && events.error == null;
        else if (!doError)
          return false;
        if (doError) {
          if (arguments.length > 1)
            er = arguments[1];
          if (er instanceof Error) {
            throw er;
          } else {
            var err = new Error('Unhandled "error" event. (' + er + ")");
            err.context = er;
            throw err;
          }
        }
        handler = events[type];
        if (!handler)
          return false;
        var isFn = typeof handler === "function";
        len = arguments.length;
        switch (len) {
          case 1:
            emitNone(handler, isFn, this);
            break;
          case 2:
            emitOne(handler, isFn, this, arguments[1]);
            break;
          case 3:
            emitTwo(handler, isFn, this, arguments[1], arguments[2]);
            break;
          case 4:
            emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
            break;
          default:
            args = new Array(len - 1);
            for (i = 1; i < len; i++)
              args[i - 1] = arguments[i];
            emitMany(handler, isFn, this, args);
        }
        return true;
      };
      function _addListener(target, type, listener, prepend) {
        var m;
        var events;
        var existing;
        if (typeof listener !== "function")
          throw new TypeError('"listener" argument must be a function');
        events = target._events;
        if (!events) {
          events = target._events = objectCreate(null);
          target._eventsCount = 0;
        } else {
          if (events.newListener) {
            target.emit("newListener", type, listener.listener ? listener.listener : listener);
            events = target._events;
          }
          existing = events[type];
        }
        if (!existing) {
          existing = events[type] = listener;
          ++target._eventsCount;
        } else {
          if (typeof existing === "function") {
            existing = events[type] = prepend ? [listener, existing] : [existing, listener];
          } else {
            if (prepend) {
              existing.unshift(listener);
            } else {
              existing.push(listener);
            }
          }
          if (!existing.warned) {
            m = $getMaxListeners(target);
            if (m && m > 0 && existing.length > m) {
              existing.warned = true;
              var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + ' "' + String(type) + '" listeners added. Use emitter.setMaxListeners() to increase limit.');
              w.name = "MaxListenersExceededWarning";
              w.emitter = target;
              w.type = type;
              w.count = existing.length;
              if (typeof console === "object" && console.warn) {
                console.warn("%s: %s", w.name, w.message);
              }
            }
          }
        }
        return target;
      }
      EventEmitter.prototype.addListener = function addListener(type, listener) {
        return _addListener(this, type, listener, false);
      };
      EventEmitter.prototype.on = EventEmitter.prototype.addListener;
      EventEmitter.prototype.prependListener = function prependListener(type, listener) {
        return _addListener(this, type, listener, true);
      };
      function onceWrapper() {
        if (!this.fired) {
          this.target.removeListener(this.type, this.wrapFn);
          this.fired = true;
          switch (arguments.length) {
            case 0:
              return this.listener.call(this.target);
            case 1:
              return this.listener.call(this.target, arguments[0]);
            case 2:
              return this.listener.call(this.target, arguments[0], arguments[1]);
            case 3:
              return this.listener.call(this.target, arguments[0], arguments[1], arguments[2]);
            default:
              var args = new Array(arguments.length);
              for (var i = 0; i < args.length; ++i)
                args[i] = arguments[i];
              this.listener.apply(this.target, args);
          }
        }
      }
      function _onceWrap(target, type, listener) {
        var state = { fired: false, wrapFn: void 0, target, type, listener };
        var wrapped = bind.call(onceWrapper, state);
        wrapped.listener = listener;
        state.wrapFn = wrapped;
        return wrapped;
      }
      EventEmitter.prototype.once = function once(type, listener) {
        if (typeof listener !== "function")
          throw new TypeError('"listener" argument must be a function');
        this.on(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
        if (typeof listener !== "function")
          throw new TypeError('"listener" argument must be a function');
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter.prototype.removeListener = function removeListener(type, listener) {
        var list, events, position, i, originalListener;
        if (typeof listener !== "function")
          throw new TypeError('"listener" argument must be a function');
        events = this._events;
        if (!events)
          return this;
        list = events[type];
        if (!list)
          return this;
        if (list === listener || list.listener === listener) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else {
            delete events[type];
            if (events.removeListener)
              this.emit("removeListener", type, list.listener || listener);
          }
        } else if (typeof list !== "function") {
          position = -1;
          for (i = list.length - 1; i >= 0; i--) {
            if (list[i] === listener || list[i].listener === listener) {
              originalListener = list[i].listener;
              position = i;
              break;
            }
          }
          if (position < 0)
            return this;
          if (position === 0)
            list.shift();
          else
            spliceOne(list, position);
          if (list.length === 1)
            events[type] = list[0];
          if (events.removeListener)
            this.emit("removeListener", type, originalListener || listener);
        }
        return this;
      };
      EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
        var listeners, events, i;
        events = this._events;
        if (!events)
          return this;
        if (!events.removeListener) {
          if (arguments.length === 0) {
            this._events = objectCreate(null);
            this._eventsCount = 0;
          } else if (events[type]) {
            if (--this._eventsCount === 0)
              this._events = objectCreate(null);
            else
              delete events[type];
          }
          return this;
        }
        if (arguments.length === 0) {
          var keys = objectKeys(events);
          var key;
          for (i = 0; i < keys.length; ++i) {
            key = keys[i];
            if (key === "removeListener")
              continue;
            this.removeAllListeners(key);
          }
          this.removeAllListeners("removeListener");
          this._events = objectCreate(null);
          this._eventsCount = 0;
          return this;
        }
        listeners = events[type];
        if (typeof listeners === "function") {
          this.removeListener(type, listeners);
        } else if (listeners) {
          for (i = listeners.length - 1; i >= 0; i--) {
            this.removeListener(type, listeners[i]);
          }
        }
        return this;
      };
      function _listeners(target, type, unwrap) {
        var events = target._events;
        if (!events)
          return [];
        var evlistener = events[type];
        if (!evlistener)
          return [];
        if (typeof evlistener === "function")
          return unwrap ? [evlistener.listener || evlistener] : [evlistener];
        return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
      }
      EventEmitter.prototype.listeners = function listeners(type) {
        return _listeners(this, type, true);
      };
      EventEmitter.prototype.rawListeners = function rawListeners(type) {
        return _listeners(this, type, false);
      };
      EventEmitter.listenerCount = function(emitter, type) {
        if (typeof emitter.listenerCount === "function") {
          return emitter.listenerCount(type);
        } else {
          return listenerCount.call(emitter, type);
        }
      };
      EventEmitter.prototype.listenerCount = listenerCount;
      function listenerCount(type) {
        var events = this._events;
        if (events) {
          var evlistener = events[type];
          if (typeof evlistener === "function") {
            return 1;
          } else if (evlistener) {
            return evlistener.length;
          }
        }
        return 0;
      }
      EventEmitter.prototype.eventNames = function eventNames() {
        return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
      };
      function spliceOne(list, index) {
        for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
          list[i] = list[k];
        list.pop();
      }
      function arrayClone(arr, n) {
        var copy = new Array(n);
        for (var i = 0; i < n; ++i)
          copy[i] = arr[i];
        return copy;
      }
      function unwrapListeners(arr) {
        var ret = new Array(arr.length);
        for (var i = 0; i < ret.length; ++i) {
          ret[i] = arr[i].listener || arr[i];
        }
        return ret;
      }
      function objectCreatePolyfill(proto) {
        var F = function() {
        };
        F.prototype = proto;
        return new F();
      }
      function objectKeysPolyfill(obj) {
        for (var k in obj)
          if (Object.prototype.hasOwnProperty.call(obj, k))
            ;
        return k;
      }
      function functionBindPolyfill(context) {
        var fn = this;
        return function() {
          return fn.apply(context, arguments);
        };
      }
    }, {}], 23: [function(require2, module2, exports2) {
      /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
      exports2.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports2.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }, {}], 24: [function(require2, module2, exports2) {
      if (typeof Object.create === "function") {
        module2.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          }
        };
      } else {
        module2.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function() {
            };
            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          }
        };
      }
    }, {}], 25: [function(require2, module2, exports2) {
      Object.defineProperty(exports2, "__esModule", { value: true });
      var TreeNode = function() {
        function TreeNode2(key, value) {
          this.color = true;
          this.key = void 0;
          this.value = void 0;
          this.parent = void 0;
          this.brother = void 0;
          this.leftChild = void 0;
          this.rightChild = void 0;
          this.key = key;
          this.value = value;
        }
        TreeNode2.prototype.rotateLeft = function() {
          var PP = this.parent;
          var PB = this.brother;
          var F = this.leftChild;
          var V = this.rightChild;
          if (!V)
            throw new Error("unknown error");
          var R = V.leftChild;
          var X = V.rightChild;
          if (PP) {
            if (PP.leftChild === this)
              PP.leftChild = V;
            else if (PP.rightChild === this)
              PP.rightChild = V;
          }
          V.parent = PP;
          V.brother = PB;
          V.leftChild = this;
          V.rightChild = X;
          if (PB)
            PB.brother = V;
          this.parent = V;
          this.brother = X;
          this.leftChild = F;
          this.rightChild = R;
          if (X) {
            X.parent = V;
            X.brother = this;
          }
          if (F) {
            F.parent = this;
            F.brother = R;
          }
          if (R) {
            R.parent = this;
            R.brother = F;
          }
          return V;
        };
        TreeNode2.prototype.rotateRight = function() {
          var PP = this.parent;
          var PB = this.brother;
          var F = this.leftChild;
          if (!F)
            throw new Error("unknown error");
          var V = this.rightChild;
          var D = F.leftChild;
          var K = F.rightChild;
          if (PP) {
            if (PP.leftChild === this)
              PP.leftChild = F;
            else if (PP.rightChild === this)
              PP.rightChild = F;
          }
          F.parent = PP;
          F.brother = PB;
          F.leftChild = D;
          F.rightChild = this;
          if (PB)
            PB.brother = F;
          if (D) {
            D.parent = F;
            D.brother = this;
          }
          this.parent = F;
          this.brother = D;
          this.leftChild = K;
          this.rightChild = V;
          if (K) {
            K.parent = this;
            K.brother = V;
          }
          if (V) {
            V.parent = this;
            V.brother = K;
          }
          return F;
        };
        TreeNode2.prototype.remove = function() {
          if (this.leftChild || this.rightChild)
            throw new Error("can only remove leaf node");
          if (this.parent) {
            if (this === this.parent.leftChild)
              this.parent.leftChild = void 0;
            else if (this === this.parent.rightChild)
              this.parent.rightChild = void 0;
          }
          if (this.brother)
            this.brother.brother = void 0;
          this.key = void 0;
          this.value = void 0;
          this.parent = void 0;
          this.brother = void 0;
        };
        TreeNode2.TreeNodeColorType = {
          red: true,
          black: false
        };
        return TreeNode2;
      }();
      Object.freeze(TreeNode);
      exports2.default = TreeNode;
    }, {}], 26: [function(require2, module2, exports2) {
      var __generator = this && this.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      Object.defineProperty(exports2, "__esModule", { value: true });
      Deque.sigma = 3;
      Deque.bucketSize = 5e3;
      function Deque(container) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        var map = [];
        var first = 0;
        var curFirst = 0;
        var last = 0;
        var curLast = 0;
        var bucketNum = 0;
        var len = 0;
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          first = last = curFirst = curLast = bucketNum = len = 0;
          reAllocate.call(this, Deque.bucketSize);
          len = 0;
        };
        this.front = function() {
          return map[first][curFirst];
        };
        this.back = function() {
          return map[last][curLast];
        };
        this.forEach = function(callback) {
          if (this.empty())
            return;
          var index = 0;
          if (first === last) {
            for (var i = curFirst; i <= curLast; ++i) {
              callback(map[first][i], index++);
            }
            return;
          }
          for (var i = curFirst; i < Deque.bucketSize; ++i) {
            callback(map[first][i], index++);
          }
          for (var i = first + 1; i < last; ++i) {
            for (var j = 0; j < Deque.bucketSize; ++j) {
              callback(map[i][j], index++);
            }
          }
          for (var i = 0; i <= curLast; ++i) {
            callback(map[last][i], index++);
          }
        };
        var getElementIndex = function(pos) {
          var curFirstIndex = first * Deque.bucketSize + curFirst;
          var curNodeIndex = curFirstIndex + pos;
          var curLastIndex = last * Deque.bucketSize + curLast;
          if (curNodeIndex < curFirstIndex || curNodeIndex > curLastIndex)
            throw new Error("pos should more than 0 and less than queue's size");
          var curNodeBucketIndex = Math.floor(curNodeIndex / Deque.bucketSize);
          var curNodePointerIndex = curNodeIndex % Deque.bucketSize;
          return { curNodeBucketIndex, curNodePointerIndex };
        };
        this.getElementByPos = function(pos) {
          var _a = getElementIndex(pos), curNodeBucketIndex = _a.curNodeBucketIndex, curNodePointerIndex = _a.curNodePointerIndex;
          return map[curNodeBucketIndex][curNodePointerIndex];
        };
        this.eraseElementByPos = function(pos) {
          var _this2 = this;
          if (pos < 0 || pos > len)
            throw new Error("pos should more than 0 and less than queue's size");
          if (pos === 0)
            this.popFront();
          else if (pos === this.size())
            this.popBack();
          else {
            var arr = [];
            for (var i = pos + 1; i < len; ++i) {
              arr.push(this.getElementByPos(i));
            }
            this.cut(pos);
            this.popBack();
            arr.forEach(function(element) {
              return _this2.pushBack(element);
            });
          }
        };
        this.eraseElementByValue = function(value) {
          if (this.empty())
            return;
          var arr = [];
          this.forEach(function(element) {
            if (element !== value) {
              arr.push(element);
            }
          });
          var _len = arr.length;
          for (var i = 0; i < _len; ++i)
            this.setElementByPos(i, arr[i]);
          this.cut(_len - 1);
        };
        var reAllocate = function(originalSize) {
          var newMap = [];
          var needSize = originalSize * Deque.sigma;
          var newBucketNum = Math.max(Math.ceil(needSize / Deque.bucketSize), 2);
          for (var i = 0; i < newBucketNum; ++i) {
            newMap.push(new Array(Deque.bucketSize));
          }
          var needBucketNum = Math.ceil(originalSize / Deque.bucketSize);
          var newFirst = Math.floor(newBucketNum / 2) - Math.floor(needBucketNum / 2);
          var newLast = newFirst, newCurLast = 0;
          if (this.size()) {
            for (var i = 0; i < needBucketNum; ++i) {
              for (var j = 0; j < Deque.bucketSize; ++j) {
                newMap[newFirst + i][j] = this.front();
                this.popFront();
                if (this.empty()) {
                  newLast = newFirst + i;
                  newCurLast = j;
                  break;
                }
              }
              if (this.empty())
                break;
            }
          }
          map = newMap;
          first = newFirst;
          curFirst = 0;
          last = newLast;
          curLast = newCurLast;
          bucketNum = newBucketNum;
          len = originalSize;
        };
        this.pushBack = function(element) {
          if (!this.empty()) {
            if (last === bucketNum - 1 && curLast === Deque.bucketSize - 1) {
              reAllocate.call(this, this.size());
            }
            if (curLast < Deque.bucketSize - 1) {
              ++curLast;
            } else if (last < bucketNum - 1) {
              ++last;
              curLast = 0;
            }
          }
          ++len;
          map[last][curLast] = element;
        };
        this.popBack = function() {
          if (this.empty())
            return;
          if (this.size() !== 1) {
            if (curLast > 0) {
              --curLast;
            } else if (first < last) {
              --last;
              curLast = Deque.bucketSize - 1;
            }
          }
          if (len > 0)
            --len;
        };
        this.setElementByPos = function(pos, element) {
          var _a = getElementIndex(pos), curNodeBucketIndex = _a.curNodeBucketIndex, curNodePointerIndex = _a.curNodePointerIndex;
          map[curNodeBucketIndex][curNodePointerIndex] = element;
        };
        this.insert = function(pos, element, num) {
          var _this2 = this;
          if (num === void 0) {
            num = 1;
          }
          if (pos === 0) {
            while (num--)
              this.pushFront(element);
          } else if (pos === this.size()) {
            while (num--)
              this.pushBack(element);
          } else {
            var arr = [];
            for (var i = pos; i < len; ++i) {
              arr.push(this.getElementByPos(i));
            }
            this.cut(pos - 1);
            for (var i = 0; i < num; ++i)
              this.pushBack(element);
            arr.forEach(function(element2) {
              return _this2.pushBack(element2);
            });
          }
        };
        this.find = function(element) {
          if (first === last) {
            for (var i = curFirst; i <= curLast; ++i) {
              if (map[first][i] === element)
                return true;
            }
            return false;
          }
          for (var i = curFirst; i < Deque.bucketSize; ++i) {
            if (map[first][i] === element)
              return true;
          }
          for (var i = first + 1; i < last; ++i) {
            for (var j = 0; j < Deque.bucketSize; ++j) {
              if (map[i][j] === element)
                return true;
            }
          }
          for (var i = 0; i <= curLast; ++i) {
            if (map[last][i] === element)
              return true;
          }
          return false;
        };
        this.reverse = function() {
          var l = 0, r = len - 1;
          while (l < r) {
            var tmp = this.getElementByPos(l);
            this.setElementByPos(l, this.getElementByPos(r));
            this.setElementByPos(r, tmp);
            ++l;
            --r;
          }
        };
        this.unique = function() {
          if (this.empty())
            return;
          var arr = [];
          var pre = this.front();
          this.forEach(function(element, index) {
            if (index === 0 || element !== pre) {
              arr.push(element);
              pre = element;
            }
          });
          for (var i = 0; i < len; ++i) {
            this.setElementByPos(i, arr[i]);
          }
          this.cut(arr.length - 1);
        };
        this.sort = function(cmp) {
          var arr = [];
          this.forEach(function(element) {
            arr.push(element);
          });
          arr.sort(cmp);
          for (var i = 0; i < len; ++i)
            this.setElementByPos(i, arr[i]);
        };
        this.pushFront = function(element) {
          if (!this.empty()) {
            if (first === 0 && curFirst === 0) {
              reAllocate.call(this, this.size());
            }
            if (curFirst > 0) {
              --curFirst;
            } else if (first > 0) {
              --first;
              curFirst = Deque.bucketSize - 1;
            }
          }
          ++len;
          map[first][curFirst] = element;
        };
        this.popFront = function() {
          if (this.empty())
            return;
          if (this.size() !== 1) {
            if (curFirst < Deque.bucketSize - 1) {
              ++curFirst;
            } else if (first < last) {
              ++first;
              curFirst = 0;
            }
          }
          if (len > 0)
            --len;
        };
        this.shrinkToFit = function() {
          var _this2 = this;
          var arr = [];
          this.forEach(function(element) {
            arr.push(element);
          });
          var _len = arr.length;
          map = [];
          var bucketNum2 = Math.ceil(_len / Deque.bucketSize);
          for (var i = 0; i < bucketNum2; ++i) {
            map.push(new Array(Deque.bucketSize));
          }
          this.clear();
          arr.forEach(function(element) {
            return _this2.pushBack(element);
          });
        };
        this.cut = function(pos) {
          if (pos < 0) {
            this.clear();
            return;
          }
          var _a = getElementIndex(pos), curNodeBucketIndex = _a.curNodeBucketIndex, curNodePointerIndex = _a.curNodePointerIndex;
          last = curNodeBucketIndex;
          curLast = curNodePointerIndex;
          len = pos + 1;
        };
        this[Symbol.iterator] = function() {
          return function() {
            var i, i, i, j, i;
            return __generator(this, function(_a) {
              switch (_a.label) {
                case 0:
                  if (len === 0)
                    return [2];
                  if (!(first === last))
                    return [3, 5];
                  i = curFirst;
                  _a.label = 1;
                case 1:
                  if (!(i <= curLast))
                    return [3, 4];
                  return [4, map[first][i]];
                case 2:
                  _a.sent();
                  _a.label = 3;
                case 3:
                  ++i;
                  return [3, 1];
                case 4:
                  return [2];
                case 5:
                  i = curFirst;
                  _a.label = 6;
                case 6:
                  if (!(i < Deque.bucketSize))
                    return [3, 9];
                  return [4, map[first][i]];
                case 7:
                  _a.sent();
                  _a.label = 8;
                case 8:
                  ++i;
                  return [3, 6];
                case 9:
                  i = first + 1;
                  _a.label = 10;
                case 10:
                  if (!(i < last))
                    return [3, 15];
                  j = 0;
                  _a.label = 11;
                case 11:
                  if (!(j < Deque.bucketSize))
                    return [3, 14];
                  return [4, map[i][j]];
                case 12:
                  _a.sent();
                  _a.label = 13;
                case 13:
                  ++j;
                  return [3, 11];
                case 14:
                  ++i;
                  return [3, 10];
                case 15:
                  i = 0;
                  _a.label = 16;
                case 16:
                  if (!(i <= curLast))
                    return [3, 19];
                  return [4, map[last][i]];
                case 17:
                  _a.sent();
                  _a.label = 18;
                case 18:
                  ++i;
                  return [3, 16];
                case 19:
                  return [2];
              }
            });
          }();
        };
        (function() {
          var _len = Deque.bucketSize;
          if (container.size) {
            _len = container.size();
          } else if (container.length) {
            _len = container.length;
          }
          var needSize = _len * Deque.sigma;
          bucketNum = Math.ceil(needSize / Deque.bucketSize);
          bucketNum = Math.max(bucketNum, 3);
          for (var i = 0; i < bucketNum; ++i) {
            map.push(new Array(Deque.bucketSize));
          }
          var needBucketNum = Math.ceil(_len / Deque.bucketSize);
          first = Math.floor(bucketNum / 2) - Math.floor(needBucketNum / 2);
          last = first;
          container.forEach(function(element) {
            return _this.pushBack(element);
          });
        })();
        Object.freeze(this);
      }
      Object.freeze(Deque);
      exports2.default = Deque;
    }, {}], 27: [function(require2, module2, exports2) {
      var __generator = this && this.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      var __values = this && this.__values || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
          return m.call(o);
        if (o && typeof o.length === "number")
          return {
            next: function() {
              if (o && i >= o.length)
                o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      Object.defineProperty(exports2, "__esModule", { value: true });
      var LinkList_1 = require2("../LinkList/LinkList");
      var Map_1 = require2("../Map/Map");
      HashMap.initSize = 1 << 4;
      HashMap.maxSize = 1 << 30;
      HashMap.sigma = 0.75;
      HashMap.treeifyThreshold = 8;
      HashMap.untreeifyThreshold = 6;
      HashMap.minTreeifySize = 64;
      function HashMap(container, initBucketNum, hashFunc) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        if (initBucketNum === void 0) {
          initBucketNum = HashMap.initSize;
        }
        hashFunc = hashFunc || function(x) {
          var e_1, _a;
          var hashCode = 0;
          var str = "";
          if (typeof x === "number") {
            hashCode = Math.floor(x);
            hashCode = (hashCode << 5) - hashCode;
            hashCode = hashCode & hashCode;
          } else {
            if (typeof x !== "string") {
              str = JSON.stringify(x);
            } else
              str = x;
            try {
              for (var str_1 = __values(str), str_1_1 = str_1.next(); !str_1_1.done; str_1_1 = str_1.next()) {
                var ch = str_1_1.value;
                var character = ch.charCodeAt(0);
                hashCode = (hashCode << 5) - hashCode + character;
                hashCode = hashCode & hashCode;
              }
            } catch (e_1_1) {
              e_1 = { error: e_1_1 };
            } finally {
              try {
                if (str_1_1 && !str_1_1.done && (_a = str_1.return))
                  _a.call(str_1);
              } finally {
                if (e_1)
                  throw e_1.error;
              }
            }
          }
          hashCode ^= hashCode >>> 16;
          return hashCode;
        };
        if ((initBucketNum & initBucketNum - 1) !== 0) {
          throw new Error("initBucketNum must be 2 to the power of n");
        }
        var len = 0;
        var hashTable = [];
        var bucketNum = Math.max(HashMap.initSize, Math.min(HashMap.maxSize, initBucketNum));
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          len = 0;
          bucketNum = initBucketNum;
          hashTable = [];
        };
        this.forEach = function(callback) {
          var index = 0;
          hashTable.forEach(function(container2) {
            container2.forEach(function(element) {
              callback(element, index++);
            });
          });
        };
        var reAllocate = function(originalBucketNum) {
          if (originalBucketNum >= HashMap.maxSize)
            return;
          bucketNum = originalBucketNum * 2;
          var newHashTable = [];
          hashTable.forEach(function(container2, index) {
            if (container2.empty())
              return;
            if (container2 instanceof LinkList_1.default && container2.size() === 1) {
              var _a = container2.front(), key = _a.key, value = _a.value;
              newHashTable[hashFunc(key) & bucketNum - 1] = new LinkList_1.default([{
                key,
                value
              }]);
            } else if (container2 instanceof Map_1.default) {
              var lowList_1 = new LinkList_1.default();
              var highList_1 = new LinkList_1.default();
              container2.forEach(function(pair) {
                var hashCode = hashFunc(pair.key);
                if ((hashCode & originalBucketNum) === 0) {
                  lowList_1.pushBack(pair);
                } else
                  highList_1.pushBack(pair);
              });
              if (lowList_1.size() > HashMap.untreeifyThreshold)
                newHashTable[index] = new Map_1.default(lowList_1);
              else if (lowList_1.size())
                newHashTable[index] = lowList_1;
              if (highList_1.size() > HashMap.untreeifyThreshold)
                newHashTable[index + originalBucketNum] = new Map_1.default(highList_1);
              else if (highList_1.size())
                newHashTable[index + originalBucketNum] = highList_1;
            } else {
              var lowList_2 = new LinkList_1.default();
              var highList_2 = new LinkList_1.default();
              container2.forEach(function(pair) {
                var hashCode = hashFunc(pair.key);
                if ((hashCode & originalBucketNum) === 0) {
                  lowList_2.pushBack(pair);
                } else
                  highList_2.pushBack(pair);
              });
              if (lowList_2.size())
                newHashTable[index] = lowList_2;
              if (highList_2.size())
                newHashTable[index + originalBucketNum] = highList_2;
            }
            hashTable[index].clear();
          });
          hashTable = newHashTable;
        };
        this.setElement = function(key, value) {
          var e_2, _a;
          if (key === null || key === void 0) {
            throw new Error("to avoid some unnecessary errors, we don't suggest you insert null or undefined here");
          }
          if (value === null || value === void 0) {
            this.eraseElementByKey(key);
            return;
          }
          var index = hashFunc(key) & bucketNum - 1;
          if (!hashTable[index]) {
            ++len;
            hashTable[index] = new LinkList_1.default([{ key, value }]);
          } else {
            var preSize = hashTable[index].size();
            if (hashTable[index] instanceof LinkList_1.default) {
              try {
                for (var _b = __values(hashTable[index]), _c = _b.next(); !_c.done; _c = _b.next()) {
                  var pair = _c.value;
                  if (pair.key === key) {
                    pair.value = value;
                    return;
                  }
                }
              } catch (e_2_1) {
                e_2 = { error: e_2_1 };
              } finally {
                try {
                  if (_c && !_c.done && (_a = _b.return))
                    _a.call(_b);
                } finally {
                  if (e_2)
                    throw e_2.error;
                }
              }
              hashTable[index].pushBack({
                key,
                value
              });
              if (hashTable[index].size() >= HashMap.treeifyThreshold) {
                hashTable[index] = new Map_1.default(hashTable[index]);
              }
            } else
              hashTable[index].setElement(key, value);
            var curSize = hashTable[index].size();
            len += curSize - preSize;
          }
          if (len > bucketNum * HashMap.sigma) {
            reAllocate.call(this, bucketNum);
          }
        };
        this.getElementByKey = function(key) {
          var e_3, _a;
          var index = hashFunc(key) & bucketNum - 1;
          if (!hashTable[index])
            return void 0;
          if (hashTable[index] instanceof Map_1.default)
            return hashTable[index].getElementByKey(key);
          else {
            try {
              for (var _b = __values(hashTable[index]), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pair = _c.value;
                if (pair.key === key)
                  return pair.value;
              }
            } catch (e_3_1) {
              e_3 = { error: e_3_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return))
                  _a.call(_b);
              } finally {
                if (e_3)
                  throw e_3.error;
              }
            }
            return void 0;
          }
        };
        this.eraseElementByKey = function(key) {
          var e_4, _a;
          var index = hashFunc(key) & bucketNum - 1;
          if (!hashTable[index])
            return;
          var preSize = hashTable[index].size();
          if (hashTable[index] instanceof Map_1.default) {
            hashTable[index].eraseElementByKey(key);
            if (hashTable[index].size() <= HashMap.untreeifyThreshold) {
              hashTable[index] = new LinkList_1.default(hashTable[index]);
            }
          } else {
            var pos = -1;
            try {
              for (var _b = __values(hashTable[index]), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pair = _c.value;
                ++pos;
                if (pair.key === key) {
                  hashTable[index].eraseElementByPos(pos);
                  break;
                }
              }
            } catch (e_4_1) {
              e_4 = { error: e_4_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return))
                  _a.call(_b);
              } finally {
                if (e_4)
                  throw e_4.error;
              }
            }
          }
          var curSize = hashTable[index].size();
          len += curSize - preSize;
        };
        this.find = function(key) {
          var e_5, _a;
          var index = hashFunc(key) & bucketNum - 1;
          if (!hashTable[index])
            return false;
          if (hashTable[index] instanceof Map_1.default)
            return hashTable[index].find(key);
          try {
            for (var _b = __values(hashTable[index]), _c = _b.next(); !_c.done; _c = _b.next()) {
              var pair = _c.value;
              if (pair.key === key)
                return true;
            }
          } catch (e_5_1) {
            e_5 = { error: e_5_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return))
                _a.call(_b);
            } finally {
              if (e_5)
                throw e_5.error;
            }
          }
          return false;
        };
        this[Symbol.iterator] = function() {
          return function() {
            var index, _a, _b, pair, e_6_1;
            var e_6, _c;
            return __generator(this, function(_d) {
              switch (_d.label) {
                case 0:
                  index = 0;
                  _d.label = 1;
                case 1:
                  if (!(index < bucketNum))
                    return [3, 10];
                  while (index < bucketNum && !hashTable[index])
                    ++index;
                  if (index >= bucketNum)
                    return [3, 10];
                  _d.label = 2;
                case 2:
                  _d.trys.push([2, 7, 8, 9]);
                  _a = (e_6 = void 0, __values(hashTable[index])), _b = _a.next();
                  _d.label = 3;
                case 3:
                  if (!!_b.done)
                    return [3, 6];
                  pair = _b.value;
                  return [4, pair];
                case 4:
                  _d.sent();
                  _d.label = 5;
                case 5:
                  _b = _a.next();
                  return [3, 3];
                case 6:
                  return [3, 9];
                case 7:
                  e_6_1 = _d.sent();
                  e_6 = { error: e_6_1 };
                  return [3, 9];
                case 8:
                  try {
                    if (_b && !_b.done && (_c = _a.return))
                      _c.call(_a);
                  } finally {
                    if (e_6)
                      throw e_6.error;
                  }
                  return [7];
                case 9:
                  ++index;
                  return [3, 1];
                case 10:
                  return [2];
              }
            });
          }();
        };
        container.forEach(function(_a) {
          var key = _a.key, value = _a.value;
          return _this.setElement(key, value);
        });
        Object.freeze(this);
      }
      Object.freeze(HashMap);
      exports2.default = HashMap;
    }, { "../LinkList/LinkList": 29, "../Map/Map": 30 }], 28: [function(require2, module2, exports2) {
      var __generator = this && this.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      var __values = this && this.__values || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
          return m.call(o);
        if (o && typeof o.length === "number")
          return {
            next: function() {
              if (o && i >= o.length)
                o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      Object.defineProperty(exports2, "__esModule", { value: true });
      var Set_1 = require2("../Set/Set");
      var LinkList_1 = require2("../LinkList/LinkList");
      HashSet.initSize = 1 << 4;
      HashSet.maxSize = 1 << 30;
      HashSet.sigma = 0.75;
      HashSet.treeifyThreshold = 8;
      HashSet.untreeifyThreshold = 6;
      HashSet.minTreeifySize = 64;
      function HashSet(container, initBucketNum, hashFunc) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        if (initBucketNum === void 0) {
          initBucketNum = HashSet.initSize;
        }
        hashFunc = hashFunc || function(x) {
          var hashCode = 0;
          var str = "";
          if (typeof x === "number") {
            hashCode = Math.floor(x);
            hashCode = (hashCode << 5) - hashCode;
            hashCode = hashCode & hashCode;
          } else {
            if (typeof x !== "string") {
              str = JSON.stringify(x);
            } else
              str = x;
            for (var i = 0; i < str.length; i++) {
              var character = str.charCodeAt(i);
              hashCode = (hashCode << 5) - hashCode + character;
              hashCode = hashCode & hashCode;
            }
          }
          hashCode ^= hashCode >>> 16;
          return hashCode;
        };
        if ((initBucketNum & initBucketNum - 1) !== 0) {
          throw new Error("initBucketNum must be 2 to the power of n");
        }
        var len = 0;
        var hashTable = [];
        var bucketNum = Math.max(HashSet.initSize, Math.min(HashSet.maxSize, initBucketNum));
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          len = 0;
          bucketNum = initBucketNum;
          hashTable = [];
        };
        this.forEach = function(callback) {
          var index = 0;
          hashTable.forEach(function(container2) {
            container2.forEach(function(element) {
              callback(element, index++);
            });
          });
        };
        var reAllocate = function(originalBucketNum) {
          if (originalBucketNum >= HashSet.maxSize)
            return;
          bucketNum = originalBucketNum * 2;
          var newHashTable = [];
          hashTable.forEach(function(container2, index) {
            if (container2.empty())
              return;
            if (container2 instanceof LinkList_1.default && container2.size() === 1) {
              var element = container2.front();
              if (element === void 0)
                throw new Error("unknown error");
              newHashTable[hashFunc(element) & bucketNum - 1] = new LinkList_1.default([element]);
            } else if (container2 instanceof Set_1.default) {
              var lowList_1 = new LinkList_1.default();
              var highList_1 = new LinkList_1.default();
              container2.forEach(function(element2) {
                var hashCode = hashFunc(element2);
                if ((hashCode & originalBucketNum) === 0) {
                  lowList_1.pushBack(element2);
                } else
                  highList_1.pushBack(element2);
              });
              if (lowList_1.size() > HashSet.untreeifyThreshold)
                newHashTable[index] = new Set_1.default(lowList_1);
              else if (lowList_1.size())
                newHashTable[index] = lowList_1;
              if (highList_1.size() > HashSet.untreeifyThreshold)
                newHashTable[index + originalBucketNum] = new Set_1.default(highList_1);
              else if (highList_1.size())
                newHashTable[index + originalBucketNum] = highList_1;
            } else {
              var lowList_2 = new LinkList_1.default();
              var highList_2 = new LinkList_1.default();
              container2.forEach(function(element2) {
                var hashCode = hashFunc(element2);
                if ((hashCode & originalBucketNum) === 0) {
                  lowList_2.pushBack(element2);
                } else
                  highList_2.pushBack(element2);
              });
              if (lowList_2.size())
                newHashTable[index] = lowList_2;
              if (highList_2.size())
                newHashTable[index + originalBucketNum] = highList_2;
            }
            hashTable[index].clear();
          });
          hashTable = newHashTable;
        };
        this.insert = function(element) {
          if (element === null || element === void 0) {
            throw new Error("to avoid some unnecessary errors, we don't suggest you insert null or undefined here");
          }
          var index = hashFunc(element) & bucketNum - 1;
          if (!hashTable[index]) {
            hashTable[index] = new LinkList_1.default([element]);
            ++len;
          } else {
            var preSize = hashTable[index].size();
            if (hashTable[index] instanceof LinkList_1.default) {
              if (hashTable[index].find(element))
                return;
              hashTable[index].pushBack(element);
              if (hashTable[index].size() >= HashSet.treeifyThreshold) {
                hashTable[index] = new Set_1.default(hashTable[index]);
              }
            } else
              hashTable[index].insert(element);
            var curSize = hashTable[index].size();
            len += curSize - preSize;
          }
          if (len > bucketNum * HashSet.sigma) {
            reAllocate.call(this, bucketNum);
          }
        };
        this.eraseElementByValue = function(element) {
          var index = hashFunc(element) & bucketNum - 1;
          if (!hashTable[index])
            return;
          var preSize = hashTable[index].size();
          hashTable[index].eraseElementByValue(element);
          if (hashTable[index] instanceof Set_1.default) {
            if (hashTable[index].size() <= HashSet.untreeifyThreshold) {
              hashTable[index] = new LinkList_1.default(hashTable[index]);
            }
          }
          var curSize = hashTable[index].size();
          len += curSize - preSize;
        };
        this.find = function(element) {
          var index = hashFunc(element) & bucketNum - 1;
          if (!hashTable[index])
            return false;
          return hashTable[index].find(element);
        };
        this[Symbol.iterator] = function() {
          return function() {
            var index, _a, _b, element, e_1_1;
            var e_1, _c;
            return __generator(this, function(_d) {
              switch (_d.label) {
                case 0:
                  index = 0;
                  _d.label = 1;
                case 1:
                  if (!(index < bucketNum))
                    return [3, 10];
                  while (index < bucketNum && !hashTable[index])
                    ++index;
                  if (index >= bucketNum)
                    return [3, 10];
                  _d.label = 2;
                case 2:
                  _d.trys.push([2, 7, 8, 9]);
                  _a = (e_1 = void 0, __values(hashTable[index])), _b = _a.next();
                  _d.label = 3;
                case 3:
                  if (!!_b.done)
                    return [3, 6];
                  element = _b.value;
                  return [4, element];
                case 4:
                  _d.sent();
                  _d.label = 5;
                case 5:
                  _b = _a.next();
                  return [3, 3];
                case 6:
                  return [3, 9];
                case 7:
                  e_1_1 = _d.sent();
                  e_1 = { error: e_1_1 };
                  return [3, 9];
                case 8:
                  try {
                    if (_b && !_b.done && (_c = _a.return))
                      _c.call(_a);
                  } finally {
                    if (e_1)
                      throw e_1.error;
                  }
                  return [7];
                case 9:
                  ++index;
                  return [3, 1];
                case 10:
                  return [2];
              }
            });
          }();
        };
        container.forEach(function(element) {
          return _this.insert(element);
        });
        Object.freeze(this);
      }
      Object.freeze(HashSet);
      exports2.default = HashSet;
    }, { "../LinkList/LinkList": 29, "../Set/Set": 33 }], 29: [function(require2, module2, exports2) {
      var __generator = this && this.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      Object.defineProperty(exports2, "__esModule", { value: true });
      var LinkNode = function() {
        function LinkNode2(element) {
          this.value = void 0;
          this.pre = void 0;
          this.next = void 0;
          this.value = element;
        }
        return LinkNode2;
      }();
      function LinkList(container) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        var len = 0;
        var head = void 0;
        var tail = void 0;
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          head = tail = void 0;
          len = 0;
        };
        this.front = function() {
          return head === null || head === void 0 ? void 0 : head.value;
        };
        this.back = function() {
          return tail === null || tail === void 0 ? void 0 : tail.value;
        };
        this.forEach = function(callback) {
          var curNode = head;
          var index = 0;
          while (curNode) {
            if (curNode.value === void 0)
              throw new Error("unknown error");
            callback(curNode.value, index++);
            curNode = curNode.next;
          }
        };
        this.getElementByPos = function(pos) {
          if (pos < 0 || pos >= len)
            throw new Error("pos must more then 0 and less then the list length");
          var curNode = head;
          while (pos--) {
            if (!curNode)
              break;
            curNode = curNode.next;
          }
          if (!curNode || curNode.value === void 0)
            throw new Error("unknown error");
          return curNode.value;
        };
        this.eraseElementByPos = function(pos) {
          if (pos < 0 || pos >= len)
            throw new Error("erase pos must more then 0 and less then the list length");
          if (pos === 0)
            this.popFront();
          else if (pos === len - 1)
            this.popBack();
          else {
            var curNode = head;
            while (pos--) {
              if (!(curNode === null || curNode === void 0 ? void 0 : curNode.next))
                throw new Error("unknown error");
              curNode = curNode.next;
            }
            if (!curNode || !curNode.pre || !curNode.next) {
              throw new Error("unknown error");
            }
            var pre = curNode.pre;
            var next = curNode.next;
            next.pre = pre;
            pre.next = next;
            if (len > 0)
              --len;
          }
        };
        this.eraseElementByValue = function(value) {
          while (head && head.value === value)
            this.popFront();
          while (tail && tail.value === value)
            this.popBack();
          if (!head)
            return;
          var curNode = head;
          while (curNode) {
            if (curNode.value === value) {
              var pre = curNode.pre;
              var next = curNode.next;
              if (next)
                next.pre = pre;
              if (pre)
                pre.next = next;
              if (len > 0)
                --len;
            }
            curNode = curNode.next;
          }
        };
        this.pushBack = function(element) {
          if (element === null || element === void 0) {
            throw new Error("you can't push null or undefined here");
          }
          ++len;
          var newTail = new LinkNode(element);
          if (!tail) {
            head = tail = newTail;
          } else {
            tail.next = newTail;
            newTail.pre = tail;
            tail = newTail;
          }
        };
        this.popBack = function() {
          if (!tail)
            return;
          if (len > 0)
            --len;
          if (!tail)
            return;
          if (head === tail) {
            head = tail = void 0;
          } else {
            tail = tail.pre;
            if (tail)
              tail.next = void 0;
          }
        };
        this.setElementByPos = function(pos, element) {
          if (element === null || element === void 0) {
            throw new Error("you can't set null or undefined here");
          }
          if (pos < 0 || pos >= len)
            throw new Error("pos must more then 0 and less then the list length");
          var curNode = head;
          while (pos--) {
            if (!curNode)
              throw new Error("unknown error");
            curNode = curNode.next;
          }
          if (curNode)
            curNode.value = element;
        };
        this.insert = function(pos, element, num) {
          if (num === void 0) {
            num = 1;
          }
          if (element === null || element === void 0) {
            throw new Error("you can't insert null or undefined here");
          }
          if (pos < 0 || pos > len)
            throw new Error("insert pos must more then 0 and less then or equal to the list length");
          if (num < 0)
            throw new Error("insert size must more than 0");
          if (pos === 0) {
            while (num--)
              this.pushFront(element);
          } else if (pos === len) {
            while (num--)
              this.pushBack(element);
          } else {
            var curNode = head;
            for (var i = 1; i < pos; ++i) {
              if (!(curNode === null || curNode === void 0 ? void 0 : curNode.next))
                throw new Error("unknown error");
              curNode = curNode === null || curNode === void 0 ? void 0 : curNode.next;
            }
            if (!curNode) {
              throw new Error("unknown error");
            }
            var next = curNode.next;
            len += num;
            while (num--) {
              curNode.next = new LinkNode(element);
              curNode.next.pre = curNode;
              curNode = curNode.next;
            }
            curNode.next = next;
            if (next)
              next.pre = curNode;
          }
        };
        this.find = function(element) {
          var curNode = head;
          while (curNode) {
            if (curNode.value === element)
              return true;
            curNode = curNode.next;
          }
          return false;
        };
        this.reverse = function() {
          var pHead = head;
          var pTail = tail;
          var cnt = 0;
          while (pHead && pTail && cnt * 2 < len) {
            var tmp = pHead.value;
            pHead.value = pTail.value;
            pTail.value = tmp;
            pHead = pHead.next;
            pTail = pTail.pre;
            ++cnt;
          }
        };
        this.unique = function() {
          var curNode = head;
          while (curNode) {
            var tmpNode = curNode;
            while (tmpNode && tmpNode.next && tmpNode.value === tmpNode.next.value) {
              tmpNode = tmpNode.next;
              if (len > 0)
                --len;
            }
            curNode.next = tmpNode.next;
            if (curNode.next)
              curNode.next.pre = curNode;
            curNode = curNode.next;
          }
        };
        this.sort = function(cmp) {
          var arr = [];
          this.forEach(function(element) {
            arr.push(element);
          });
          arr.sort(cmp);
          var curNode = head;
          arr.forEach(function(element) {
            if (curNode) {
              curNode.value = element;
              curNode = curNode.next;
            }
          });
        };
        this.pushFront = function(element) {
          if (element === null || element === void 0) {
            throw new Error("you can't push null or undefined here");
          }
          ++len;
          var newHead = new LinkNode(element);
          if (!head) {
            head = tail = newHead;
          } else {
            newHead.next = head;
            head.pre = newHead;
            head = newHead;
          }
        };
        this.popFront = function() {
          if (!head)
            return;
          if (len > 0)
            --len;
          if (!head)
            return;
          if (head === tail) {
            head = tail = void 0;
          } else {
            head = head.next;
            if (head)
              head.pre = void 0;
          }
        };
        this.merge = function(list) {
          var _this2 = this;
          var curNode = head;
          list.forEach(function(element) {
            while (curNode && curNode.value !== void 0 && curNode.value <= element) {
              curNode = curNode.next;
            }
            if (curNode === void 0) {
              _this2.pushBack(element);
              curNode = tail;
            } else if (curNode === head) {
              _this2.pushFront(element);
              curNode = head;
            } else {
              ++len;
              var pre = curNode.pre;
              if (pre) {
                pre.next = new LinkNode(element);
                pre.next.pre = pre;
                pre.next.next = curNode;
                if (curNode)
                  curNode.pre = pre.next;
              }
            }
          });
        };
        this[Symbol.iterator] = function() {
          return function() {
            var curNode;
            return __generator(this, function(_a) {
              switch (_a.label) {
                case 0:
                  curNode = head;
                  _a.label = 1;
                case 1:
                  if (!(curNode !== void 0))
                    return [3, 3];
                  if (!curNode.value)
                    throw new Error("unknown error");
                  return [4, curNode.value];
                case 2:
                  _a.sent();
                  curNode = curNode.next;
                  return [3, 1];
                case 3:
                  return [2];
              }
            });
          }();
        };
        container.forEach(function(element) {
          return _this.pushBack(element);
        });
        Object.freeze(this);
      }
      Object.freeze(LinkList);
      exports2.default = LinkList;
    }, {}], 30: [function(require2, module2, exports2) {
      var __generator = this && this.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      var __values = this && this.__values || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
          return m.call(o);
        if (o && typeof o.length === "number")
          return {
            next: function() {
              if (o && i >= o.length)
                o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      Object.defineProperty(exports2, "__esModule", { value: true });
      var TreeNode_1 = require2("../Base/TreeNode");
      function Map2(container, cmp) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        cmp = cmp || function(x, y) {
          if (x < y)
            return -1;
          if (x > y)
            return 1;
          return 0;
        };
        var len = 0;
        var root = new TreeNode_1.default();
        root.color = TreeNode_1.default.TreeNodeColorType.black;
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          len = 0;
          root.key = root.value = void 0;
          root.leftChild = root.rightChild = root.brother = void 0;
        };
        var findSubTreeMinNode = function(curNode) {
          if (!curNode || curNode.key === void 0)
            throw new Error("unknown error");
          return curNode.leftChild ? findSubTreeMinNode(curNode.leftChild) : curNode;
        };
        var findSubTreeMaxNode = function(curNode) {
          if (!curNode || curNode.key === void 0)
            throw new Error("unknown error");
          return curNode.rightChild ? findSubTreeMaxNode(curNode.rightChild) : curNode;
        };
        this.front = function() {
          if (this.empty())
            return void 0;
          var minNode = findSubTreeMinNode(root);
          if (minNode.key === void 0 || minNode.value === void 0)
            throw new Error("unknown error");
          return {
            key: minNode.key,
            value: minNode.value
          };
        };
        this.back = function() {
          if (this.empty())
            return void 0;
          var maxNode = findSubTreeMaxNode(root);
          if (maxNode.key === void 0 || maxNode.value === void 0)
            throw new Error("unknown error");
          return {
            key: maxNode.key,
            value: maxNode.value
          };
        };
        this.forEach = function(callback) {
          var e_1, _a;
          var index = 0;
          try {
            for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
              var pair = _c.value;
              callback(pair, index++);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return))
                _a.call(_b);
            } finally {
              if (e_1)
                throw e_1.error;
            }
          }
        };
        this.getElementByPos = function(pos) {
          var e_2, _a;
          if (pos < 0 || pos >= this.size())
            throw new Error("pos must more than 0 and less than set's size");
          var index = 0;
          try {
            for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
              var pair = _c.value;
              if (index === pos)
                return pair;
              ++index;
            }
          } catch (e_2_1) {
            e_2 = { error: e_2_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return))
                _a.call(_b);
            } finally {
              if (e_2)
                throw e_2.error;
            }
          }
          throw new Error("unknown Error");
        };
        var _lowerBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0 || curNode.value === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult === 0)
            return { key: curNode.key, value: curNode.value };
          if (cmpResult < 0)
            return _lowerBound(curNode.rightChild, key);
          return _lowerBound(curNode.leftChild, key) || {
            key: curNode.key,
            value: curNode.value
          };
        };
        this.lowerBound = function(key) {
          return _lowerBound(root, key);
        };
        var _upperBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0 || curNode.value === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult <= 0)
            return _upperBound(curNode.rightChild, key);
          return _upperBound(curNode.leftChild, key) || {
            key: curNode.key,
            value: curNode.value
          };
        };
        this.upperBound = function(key) {
          return _upperBound(root, key);
        };
        var _reverseLowerBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0 || curNode.value === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult === 0)
            return { key: curNode.key, value: curNode.value };
          if (cmpResult > 0)
            return _reverseLowerBound(curNode.leftChild, key);
          return _reverseLowerBound(curNode.rightChild, key) || {
            key: curNode.key,
            value: curNode.value
          };
        };
        this.reverseLowerBound = function(key) {
          return _reverseLowerBound(root, key);
        };
        var _reverseUpperBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0 || curNode.value === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult >= 0)
            return _reverseUpperBound(curNode.leftChild, key);
          return _reverseUpperBound(curNode.rightChild, key) || {
            key: curNode.key,
            value: curNode.value
          };
        };
        this.reverseUpperBound = function(key) {
          return _reverseUpperBound(root, key);
        };
        var eraseNodeSelfBalance = function(curNode) {
          var parentNode = curNode.parent;
          if (!parentNode) {
            if (curNode === root)
              return;
            throw new Error("unknown error");
          }
          if (curNode.color === TreeNode_1.default.TreeNodeColorType.red) {
            curNode.color = TreeNode_1.default.TreeNodeColorType.black;
            return;
          }
          var brotherNode = curNode.brother;
          if (!brotherNode)
            throw new Error("unknown error");
          if (curNode === parentNode.leftChild) {
            if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.red) {
              brotherNode.color = TreeNode_1.default.TreeNodeColorType.black;
              parentNode.color = TreeNode_1.default.TreeNodeColorType.red;
              var newRoot = parentNode.rotateLeft();
              if (root === parentNode)
                root = newRoot;
              eraseNodeSelfBalance(curNode);
            } else if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.black) {
              if (brotherNode.rightChild && brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = parentNode.color;
                parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                if (brotherNode.rightChild)
                  brotherNode.rightChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = parentNode.rotateLeft();
                if (root === parentNode)
                  root = newRoot;
                curNode.color = TreeNode_1.default.TreeNodeColorType.black;
              } else if ((!brotherNode.rightChild || brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.black) && brotherNode.leftChild && brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                if (brotherNode.leftChild)
                  brotherNode.leftChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = brotherNode.rotateRight();
                if (root === brotherNode)
                  root = newRoot;
                eraseNodeSelfBalance(curNode);
              } else if ((!brotherNode.leftChild || brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.black) && (!brotherNode.rightChild || brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.black)) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                eraseNodeSelfBalance(parentNode);
              }
            }
          } else if (curNode === parentNode.rightChild) {
            if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.red) {
              brotherNode.color = TreeNode_1.default.TreeNodeColorType.black;
              parentNode.color = TreeNode_1.default.TreeNodeColorType.red;
              var newRoot = parentNode.rotateRight();
              if (root === parentNode)
                root = newRoot;
              eraseNodeSelfBalance(curNode);
            } else if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.black) {
              if (brotherNode.leftChild && brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = parentNode.color;
                parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                if (brotherNode.leftChild)
                  brotherNode.leftChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = parentNode.rotateRight();
                if (root === parentNode)
                  root = newRoot;
                curNode.color = TreeNode_1.default.TreeNodeColorType.black;
              } else if ((!brotherNode.leftChild || brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.black) && brotherNode.rightChild && brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                if (brotherNode.rightChild)
                  brotherNode.rightChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = brotherNode.rotateLeft();
                if (root === brotherNode)
                  root = newRoot;
                eraseNodeSelfBalance(curNode);
              } else if ((!brotherNode.leftChild || brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.black) && (!brotherNode.rightChild || brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.black)) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                eraseNodeSelfBalance(parentNode);
              }
            }
          }
        };
        var eraseNode = function(curNode) {
          var swapNode = curNode;
          while (swapNode.leftChild || swapNode.rightChild) {
            if (swapNode.rightChild) {
              swapNode = findSubTreeMinNode(swapNode.rightChild);
              var tmpKey = curNode.key;
              curNode.key = swapNode.key;
              swapNode.key = tmpKey;
              var tmpValue = curNode.value;
              curNode.value = swapNode.value;
              swapNode.value = tmpValue;
              curNode = swapNode;
            }
            if (swapNode.leftChild) {
              swapNode = findSubTreeMaxNode(swapNode.leftChild);
              var tmpKey = curNode.key;
              curNode.key = swapNode.key;
              swapNode.key = tmpKey;
              var tmpValue = curNode.value;
              curNode.value = swapNode.value;
              swapNode.value = tmpValue;
              curNode = swapNode;
            }
          }
          eraseNodeSelfBalance(swapNode);
          if (swapNode)
            swapNode.remove();
          --len;
          root.color = TreeNode_1.default.TreeNodeColorType.black;
        };
        var inOrderTraversal = function(curNode, callback) {
          if (!curNode || curNode.key === void 0)
            return false;
          var ifReturn = inOrderTraversal(curNode.leftChild, callback);
          if (ifReturn)
            return true;
          if (callback(curNode))
            return true;
          return inOrderTraversal(curNode.rightChild, callback);
        };
        this.eraseElementByPos = function(pos) {
          if (pos < 0 || pos >= len)
            throw new Error("pos must more than 0 and less than set's size");
          var index = 0;
          inOrderTraversal(root, function(curNode) {
            if (pos === index) {
              eraseNode(curNode);
              return true;
            }
            ++index;
            return false;
          });
        };
        this.eraseElementByKey = function(key) {
          if (this.empty())
            return;
          var curNode = findElementPos(root, key);
          if (curNode === void 0 || curNode.key === void 0 || cmp(curNode.key, key) !== 0)
            return;
          eraseNode(curNode);
        };
        var findInsertPos = function(curNode, element) {
          if (!curNode || curNode.key === void 0)
            throw new Error("unknown error");
          var cmpResult = cmp(element, curNode.key);
          if (cmpResult < 0) {
            if (!curNode.leftChild) {
              curNode.leftChild = new TreeNode_1.default();
              curNode.leftChild.parent = curNode;
              curNode.leftChild.brother = curNode.rightChild;
              if (curNode.rightChild)
                curNode.rightChild.brother = curNode.leftChild;
              return curNode.leftChild;
            }
            return findInsertPos(curNode.leftChild, element);
          } else if (cmpResult > 0) {
            if (!curNode.rightChild) {
              curNode.rightChild = new TreeNode_1.default();
              curNode.rightChild.parent = curNode;
              curNode.rightChild.brother = curNode.leftChild;
              if (curNode.leftChild)
                curNode.leftChild.brother = curNode.rightChild;
              return curNode.rightChild;
            }
            return findInsertPos(curNode.rightChild, element);
          }
          return curNode;
        };
        var insertNodeSelfBalance = function(curNode) {
          var parentNode = curNode.parent;
          if (!parentNode) {
            if (curNode === root)
              return;
            throw new Error("unknown error");
          }
          if (parentNode.color === TreeNode_1.default.TreeNodeColorType.black)
            return;
          if (parentNode.color === TreeNode_1.default.TreeNodeColorType.red) {
            var uncleNode = parentNode.brother;
            var grandParent = parentNode.parent;
            if (!grandParent)
              throw new Error("unknown error");
            if (uncleNode && uncleNode.color === TreeNode_1.default.TreeNodeColorType.red) {
              uncleNode.color = parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
              grandParent.color = TreeNode_1.default.TreeNodeColorType.red;
              insertNodeSelfBalance(grandParent);
            } else if (!uncleNode || uncleNode.color === TreeNode_1.default.TreeNodeColorType.black) {
              if (parentNode === grandParent.leftChild) {
                if (curNode === parentNode.leftChild) {
                  parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                  grandParent.color = TreeNode_1.default.TreeNodeColorType.red;
                  var newRoot = grandParent.rotateRight();
                  if (grandParent === root)
                    root = newRoot;
                } else if (curNode === parentNode.rightChild) {
                  var newRoot = parentNode.rotateLeft();
                  if (grandParent === root)
                    root = newRoot;
                  insertNodeSelfBalance(parentNode);
                }
              } else if (parentNode === grandParent.rightChild) {
                if (curNode === parentNode.leftChild) {
                  var newRoot = parentNode.rotateRight();
                  if (grandParent === root)
                    root = newRoot;
                  insertNodeSelfBalance(parentNode);
                } else if (curNode === parentNode.rightChild) {
                  parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                  grandParent.color = TreeNode_1.default.TreeNodeColorType.red;
                  var newRoot = grandParent.rotateLeft();
                  if (grandParent === root)
                    root = newRoot;
                }
              }
            }
          }
        };
        this.setElement = function(key, value) {
          if (key === null || key === void 0) {
            throw new Error("to avoid some unnecessary errors, we don't suggest you insert null or undefined here");
          }
          if (value === null || value === void 0) {
            this.eraseElementByKey(key);
            return;
          }
          if (this.empty()) {
            ++len;
            root.key = key;
            root.value = value;
            root.color = TreeNode_1.default.TreeNodeColorType.black;
            return;
          }
          var curNode = findInsertPos(root, key);
          if (curNode.key !== void 0 && cmp(curNode.key, key) === 0) {
            curNode.value = value;
            return;
          }
          ++len;
          curNode.key = key;
          curNode.value = value;
          insertNodeSelfBalance(curNode);
          root.color = TreeNode_1.default.TreeNodeColorType.black;
        };
        var findElementPos = function(curNode, element) {
          if (!curNode || curNode.key === void 0)
            return void 0;
          var cmpResult = cmp(element, curNode.key);
          if (cmpResult < 0)
            return findElementPos(curNode.leftChild, element);
          else if (cmpResult > 0)
            return findElementPos(curNode.rightChild, element);
          return curNode;
        };
        this.find = function(element) {
          return !!findElementPos(root, element);
        };
        this.getElementByKey = function(element) {
          var curNode = findElementPos(root, element);
          if ((curNode === null || curNode === void 0 ? void 0 : curNode.key) === void 0 || (curNode === null || curNode === void 0 ? void 0 : curNode.value) === void 0)
            throw new Error("unknown error");
          return curNode.value;
        };
        this.union = function(other) {
          var _this2 = this;
          other.forEach(function(_a) {
            var key = _a.key, value = _a.value;
            return _this2.setElement(key, value);
          });
        };
        this.getHeight = function() {
          if (this.empty())
            return 0;
          var traversal = function(curNode) {
            if (!curNode)
              return 1;
            return Math.max(traversal(curNode.leftChild), traversal(curNode.rightChild)) + 1;
          };
          return traversal(root);
        };
        var iterationFunc = function(curNode) {
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                if (!curNode || curNode.key === void 0 || curNode.value === void 0)
                  return [2];
                return [5, __values(iterationFunc(curNode.leftChild))];
              case 1:
                _a.sent();
                return [4, { key: curNode.key, value: curNode.value }];
              case 2:
                _a.sent();
                return [5, __values(iterationFunc(curNode.rightChild))];
              case 3:
                _a.sent();
                return [2];
            }
          });
        };
        this[Symbol.iterator] = function() {
          return iterationFunc(root);
        };
        container.forEach(function(_a) {
          var key = _a.key, value = _a.value;
          return _this.setElement(key, value);
        });
        Object.freeze(this);
      }
      Object.freeze(Map2);
      exports2.default = Map2;
    }, { "../Base/TreeNode": 25 }], 31: [function(require2, module2, exports2) {
      Object.defineProperty(exports2, "__esModule", { value: true });
      function PriorityQueue(container, cmp) {
        if (container === void 0) {
          container = [];
        }
        cmp = cmp || function(x, y) {
          if (x > y)
            return -1;
          if (x < y)
            return 1;
          return 0;
        };
        var priorityQueue = [];
        container.forEach(function(element) {
          return priorityQueue.push(element);
        });
        var len = priorityQueue.length;
        var swap = function(x, y) {
          if (x < 0 || x >= len)
            throw new Error("unknown error");
          if (y < 0 || y >= len)
            throw new Error("unknown error");
          var tmp = priorityQueue[x];
          priorityQueue[x] = priorityQueue[y];
          priorityQueue[y] = tmp;
        };
        var adjust = function(parent) {
          if (parent < 0 || parent >= len)
            throw new Error("unknown error");
          var leftChild = parent * 2 + 1;
          var rightChild = parent * 2 + 2;
          if (leftChild < len && cmp(priorityQueue[parent], priorityQueue[leftChild]) > 0)
            swap(parent, leftChild);
          if (rightChild < len && cmp(priorityQueue[parent], priorityQueue[rightChild]) > 0)
            swap(parent, rightChild);
        };
        (function() {
          for (var parent_1 = Math.floor((len - 1) / 2); parent_1 >= 0; --parent_1) {
            var curParent = parent_1;
            var curChild = curParent * 2 + 1;
            while (curChild < len) {
              var leftChild = curChild;
              var rightChild = leftChild + 1;
              var minChild = leftChild;
              if (rightChild < len && cmp(priorityQueue[leftChild], priorityQueue[rightChild]) > 0)
                minChild = rightChild;
              if (cmp(priorityQueue[curParent], priorityQueue[minChild]) <= 0)
                break;
              swap(curParent, minChild);
              curParent = minChild;
              curChild = curParent * 2 + 1;
            }
          }
        })();
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          len = 0;
          priorityQueue.length = 0;
        };
        this.push = function(element) {
          priorityQueue.push(element);
          ++len;
          if (len === 1)
            return;
          var curNode = len - 1;
          while (curNode > 0) {
            var parent_2 = Math.floor((curNode - 1) / 2);
            if (cmp(priorityQueue[parent_2], element) <= 0)
              break;
            adjust(parent_2);
            curNode = parent_2;
          }
        };
        this.pop = function() {
          if (this.empty())
            return;
          if (this.size() === 1) {
            --len;
            return;
          }
          var last = priorityQueue[len - 1];
          --len;
          var parent = 0;
          while (parent < this.size()) {
            var leftChild = parent * 2 + 1;
            var rightChild = parent * 2 + 2;
            if (leftChild >= this.size())
              break;
            var minChild = leftChild;
            if (rightChild < this.size() && cmp(priorityQueue[leftChild], priorityQueue[rightChild]) > 0)
              minChild = rightChild;
            if (cmp(priorityQueue[minChild], last) >= 0)
              break;
            priorityQueue[parent] = priorityQueue[minChild];
            parent = minChild;
          }
          priorityQueue[parent] = last;
        };
        this.top = function() {
          return priorityQueue[0];
        };
        Object.freeze(this);
      }
      Object.freeze(PriorityQueue);
      exports2.default = PriorityQueue;
    }, {}], 32: [function(require2, module2, exports2) {
      Object.defineProperty(exports2, "__esModule", { value: true });
      var LinkList_1 = require2("../LinkList/LinkList");
      function Queue(container) {
        if (container === void 0) {
          container = [];
        }
        var queue = new LinkList_1.default(container);
        this.size = function() {
          return queue.size();
        };
        this.empty = function() {
          return queue.empty();
        };
        this.clear = function() {
          queue.clear();
        };
        this.push = function(element) {
          queue.pushBack(element);
        };
        this.pop = function() {
          queue.popFront();
        };
        this.front = function() {
          return queue.front();
        };
        Object.freeze(this);
      }
      Object.freeze(Queue);
      exports2.default = Queue;
    }, { "../LinkList/LinkList": 29 }], 33: [function(require2, module2, exports2) {
      var __generator = this && this.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      var __values = this && this.__values || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
          return m.call(o);
        if (o && typeof o.length === "number")
          return {
            next: function() {
              if (o && i >= o.length)
                o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      Object.defineProperty(exports2, "__esModule", { value: true });
      var TreeNode_1 = require2("../Base/TreeNode");
      function Set2(container, cmp) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        cmp = cmp || function(x, y) {
          if (x < y)
            return -1;
          if (x > y)
            return 1;
          return 0;
        };
        var len = 0;
        var root = new TreeNode_1.default();
        root.color = TreeNode_1.default.TreeNodeColorType.black;
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          len = 0;
          root.key = void 0;
          root.leftChild = root.rightChild = root.brother = root.parent = void 0;
          root.color = TreeNode_1.default.TreeNodeColorType.black;
        };
        var findSubTreeMinNode = function(curNode) {
          if (!curNode || curNode.key === void 0)
            throw new Error("unknown error");
          return curNode.leftChild ? findSubTreeMinNode(curNode.leftChild) : curNode;
        };
        var findSubTreeMaxNode = function(curNode) {
          if (!curNode || curNode.key === void 0)
            throw new Error("unknown error");
          return curNode.rightChild ? findSubTreeMaxNode(curNode.rightChild) : curNode;
        };
        this.front = function() {
          if (this.empty())
            return void 0;
          var minNode = findSubTreeMinNode(root);
          return minNode.key;
        };
        this.back = function() {
          if (this.empty())
            return void 0;
          var maxNode = findSubTreeMaxNode(root);
          return maxNode.key;
        };
        this.forEach = function(callback) {
          var e_1, _a;
          var index = 0;
          try {
            for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
              var element = _c.value;
              callback(element, index++);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return))
                _a.call(_b);
            } finally {
              if (e_1)
                throw e_1.error;
            }
          }
        };
        this.getElementByPos = function(pos) {
          var e_2, _a;
          if (pos < 0 || pos >= this.size())
            throw new Error("pos must more than 0 and less than set's size");
          var index = 0;
          try {
            for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
              var element = _c.value;
              if (index === pos)
                return element;
              ++index;
            }
          } catch (e_2_1) {
            e_2 = { error: e_2_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return))
                _a.call(_b);
            } finally {
              if (e_2)
                throw e_2.error;
            }
          }
          throw new Error("unknown error");
        };
        var eraseNodeSelfBalance = function(curNode) {
          var parentNode = curNode.parent;
          if (!parentNode) {
            if (curNode === root)
              return;
            throw new Error("unknown error");
          }
          if (curNode.color === TreeNode_1.default.TreeNodeColorType.red) {
            curNode.color = TreeNode_1.default.TreeNodeColorType.black;
            return;
          }
          var brotherNode = curNode.brother;
          if (!brotherNode)
            throw new Error("unknown error");
          if (curNode === parentNode.leftChild) {
            if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.red) {
              brotherNode.color = TreeNode_1.default.TreeNodeColorType.black;
              parentNode.color = TreeNode_1.default.TreeNodeColorType.red;
              var newRoot = parentNode.rotateLeft();
              if (root === parentNode)
                root = newRoot;
              eraseNodeSelfBalance(curNode);
            } else if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.black) {
              if (brotherNode.rightChild && brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = parentNode.color;
                parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                if (brotherNode.rightChild)
                  brotherNode.rightChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = parentNode.rotateLeft();
                if (root === parentNode)
                  root = newRoot;
                curNode.color = TreeNode_1.default.TreeNodeColorType.black;
              } else if ((!brotherNode.rightChild || brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.black) && brotherNode.leftChild && brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                if (brotherNode.leftChild)
                  brotherNode.leftChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = brotherNode.rotateRight();
                if (root === brotherNode)
                  root = newRoot;
                eraseNodeSelfBalance(curNode);
              } else if ((!brotherNode.leftChild || brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.black) && (!brotherNode.rightChild || brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.black)) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                eraseNodeSelfBalance(parentNode);
              }
            }
          } else if (curNode === parentNode.rightChild) {
            if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.red) {
              brotherNode.color = TreeNode_1.default.TreeNodeColorType.black;
              parentNode.color = TreeNode_1.default.TreeNodeColorType.red;
              var newRoot = parentNode.rotateRight();
              if (root === parentNode)
                root = newRoot;
              eraseNodeSelfBalance(curNode);
            } else if (brotherNode.color === TreeNode_1.default.TreeNodeColorType.black) {
              if (brotherNode.leftChild && brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = parentNode.color;
                parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                if (brotherNode.leftChild)
                  brotherNode.leftChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = parentNode.rotateRight();
                if (root === parentNode)
                  root = newRoot;
                curNode.color = TreeNode_1.default.TreeNodeColorType.black;
              } else if ((!brotherNode.leftChild || brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.black) && brotherNode.rightChild && brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.red) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                if (brotherNode.rightChild)
                  brotherNode.rightChild.color = TreeNode_1.default.TreeNodeColorType.black;
                var newRoot = brotherNode.rotateLeft();
                if (root === brotherNode)
                  root = newRoot;
                eraseNodeSelfBalance(curNode);
              } else if ((!brotherNode.leftChild || brotherNode.leftChild.color === TreeNode_1.default.TreeNodeColorType.black) && (!brotherNode.rightChild || brotherNode.rightChild.color === TreeNode_1.default.TreeNodeColorType.black)) {
                brotherNode.color = TreeNode_1.default.TreeNodeColorType.red;
                eraseNodeSelfBalance(parentNode);
              }
            }
          }
        };
        var eraseNode = function(curNode) {
          var swapNode = curNode;
          while (swapNode.leftChild || swapNode.rightChild) {
            if (swapNode.rightChild) {
              swapNode = findSubTreeMinNode(swapNode.rightChild);
              var tmpKey = curNode.key;
              curNode.key = swapNode.key;
              swapNode.key = tmpKey;
              curNode = swapNode;
            }
            if (swapNode.leftChild) {
              swapNode = findSubTreeMaxNode(swapNode.leftChild);
              var tmpKey = curNode.key;
              curNode.key = swapNode.key;
              swapNode.key = tmpKey;
              curNode = swapNode;
            }
          }
          eraseNodeSelfBalance(swapNode);
          if (swapNode)
            swapNode.remove();
          --len;
          root.color = TreeNode_1.default.TreeNodeColorType.black;
        };
        var inOrderTraversal = function(curNode, callback) {
          if (!curNode || curNode.key === void 0)
            return false;
          var ifReturn = inOrderTraversal(curNode.leftChild, callback);
          if (ifReturn)
            return true;
          if (callback(curNode))
            return true;
          return inOrderTraversal(curNode.rightChild, callback);
        };
        this.eraseElementByPos = function(pos) {
          if (pos < 0 || pos >= len)
            throw new Error("pos must more than 0 and less than set's size");
          var index = 0;
          inOrderTraversal(root, function(curNode) {
            if (pos === index) {
              eraseNode(curNode);
              return true;
            }
            ++index;
            return false;
          });
        };
        this.eraseElementByValue = function(value) {
          if (this.empty())
            return;
          var curNode = findElementPos(root, value);
          if (curNode === void 0 || curNode.key === void 0 || cmp(curNode.key, value) !== 0)
            return;
          eraseNode(curNode);
        };
        var findInsertPos = function(curNode, element) {
          if (!curNode || curNode.key === void 0)
            throw new Error("unknown error");
          var cmpResult = cmp(element, curNode.key);
          if (cmpResult < 0) {
            if (!curNode.leftChild) {
              curNode.leftChild = new TreeNode_1.default();
              curNode.leftChild.parent = curNode;
              curNode.leftChild.brother = curNode.rightChild;
              if (curNode.rightChild)
                curNode.rightChild.brother = curNode.leftChild;
              return curNode.leftChild;
            }
            return findInsertPos(curNode.leftChild, element);
          } else if (cmpResult > 0) {
            if (!curNode.rightChild) {
              curNode.rightChild = new TreeNode_1.default();
              curNode.rightChild.parent = curNode;
              curNode.rightChild.brother = curNode.leftChild;
              if (curNode.leftChild)
                curNode.leftChild.brother = curNode.rightChild;
              return curNode.rightChild;
            }
            return findInsertPos(curNode.rightChild, element);
          }
          return curNode;
        };
        var insertNodeSelfBalance = function(curNode) {
          var parentNode = curNode.parent;
          if (!parentNode) {
            if (curNode === root)
              return;
            throw new Error("unknown error");
          }
          if (parentNode.color === TreeNode_1.default.TreeNodeColorType.black)
            return;
          if (parentNode.color === TreeNode_1.default.TreeNodeColorType.red) {
            var uncleNode = parentNode.brother;
            var grandParent = parentNode.parent;
            if (!grandParent)
              throw new Error("unknown error");
            if (uncleNode && uncleNode.color === TreeNode_1.default.TreeNodeColorType.red) {
              uncleNode.color = parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
              grandParent.color = TreeNode_1.default.TreeNodeColorType.red;
              insertNodeSelfBalance(grandParent);
            } else if (!uncleNode || uncleNode.color === TreeNode_1.default.TreeNodeColorType.black) {
              if (parentNode === grandParent.leftChild) {
                if (curNode === parentNode.leftChild) {
                  parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                  grandParent.color = TreeNode_1.default.TreeNodeColorType.red;
                  var newRoot = grandParent.rotateRight();
                  if (grandParent === root)
                    root = newRoot;
                } else if (curNode === parentNode.rightChild) {
                  var newRoot = parentNode.rotateLeft();
                  if (grandParent === root)
                    root = newRoot;
                  insertNodeSelfBalance(parentNode);
                }
              } else if (parentNode === grandParent.rightChild) {
                if (curNode === parentNode.leftChild) {
                  var newRoot = parentNode.rotateRight();
                  if (grandParent === root)
                    root = newRoot;
                  insertNodeSelfBalance(parentNode);
                } else if (curNode === parentNode.rightChild) {
                  parentNode.color = TreeNode_1.default.TreeNodeColorType.black;
                  grandParent.color = TreeNode_1.default.TreeNodeColorType.red;
                  var newRoot = grandParent.rotateLeft();
                  if (grandParent === root)
                    root = newRoot;
                }
              }
            }
          }
        };
        this.insert = function(element) {
          if (element === null || element === void 0) {
            throw new Error("to avoid some unnecessary errors, we don't suggest you insert null or undefined here");
          }
          if (this.empty()) {
            ++len;
            root.key = element;
            root.color = TreeNode_1.default.TreeNodeColorType.black;
            return;
          }
          var curNode = findInsertPos(root, element);
          if (curNode.key !== void 0 && cmp(curNode.key, element) === 0)
            return;
          ++len;
          curNode.key = element;
          insertNodeSelfBalance(curNode);
          root.color = TreeNode_1.default.TreeNodeColorType.black;
        };
        var findElementPos = function(curNode, element) {
          if (!curNode || curNode.key === void 0)
            return void 0;
          var cmpResult = cmp(element, curNode.key);
          if (cmpResult < 0)
            return findElementPos(curNode.leftChild, element);
          else if (cmpResult > 0)
            return findElementPos(curNode.rightChild, element);
          return curNode;
        };
        this.find = function(element) {
          var curNode = findElementPos(root, element);
          return curNode !== void 0 && curNode.key !== void 0 && cmp(curNode.key, element) === 0;
        };
        var _lowerBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult === 0)
            return curNode.key;
          if (cmpResult < 0)
            return _lowerBound(curNode.rightChild, key);
          var res = _lowerBound(curNode.leftChild, key);
          if (res !== void 0)
            return res;
          return curNode.key;
        };
        this.lowerBound = function(key) {
          return _lowerBound(root, key);
        };
        var _upperBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult <= 0)
            return _upperBound(curNode.rightChild, key);
          var res = _upperBound(curNode.leftChild, key);
          if (res !== void 0)
            return res;
          return curNode.key;
        };
        this.upperBound = function(key) {
          return _upperBound(root, key);
        };
        var _reverseLowerBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult === 0)
            return curNode.key;
          if (cmpResult > 0)
            return _reverseLowerBound(curNode.leftChild, key);
          var res = _reverseLowerBound(curNode.rightChild, key);
          if (res !== void 0)
            return res;
          return curNode.key;
        };
        this.reverseLowerBound = function(key) {
          return _reverseLowerBound(root, key);
        };
        var _reverseUpperBound = function(curNode, key) {
          if (!curNode || curNode.key === void 0)
            return void 0;
          var cmpResult = cmp(curNode.key, key);
          if (cmpResult >= 0)
            return _reverseUpperBound(curNode.leftChild, key);
          var res = _reverseUpperBound(curNode.rightChild, key);
          if (res !== void 0)
            return res;
          return curNode.key;
        };
        this.reverseUpperBound = function(key) {
          return _reverseUpperBound(root, key);
        };
        this.union = function(other) {
          var _this2 = this;
          other.forEach(function(element) {
            return _this2.insert(element);
          });
        };
        this.getHeight = function() {
          if (this.empty())
            return 0;
          var traversal = function(curNode) {
            if (!curNode)
              return 1;
            return Math.max(traversal(curNode.leftChild), traversal(curNode.rightChild)) + 1;
          };
          return traversal(root);
        };
        var iterationFunc = function(curNode) {
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                if (!curNode || curNode.key === void 0)
                  return [2];
                return [5, __values(iterationFunc(curNode.leftChild))];
              case 1:
                _a.sent();
                return [4, curNode.key];
              case 2:
                _a.sent();
                return [5, __values(iterationFunc(curNode.rightChild))];
              case 3:
                _a.sent();
                return [2];
            }
          });
        };
        this[Symbol.iterator] = function() {
          return iterationFunc(root);
        };
        container.forEach(function(element) {
          return _this.insert(element);
        });
        Object.freeze(this);
      }
      Object.freeze(Set2);
      exports2.default = Set2;
    }, { "../Base/TreeNode": 25 }], 34: [function(require2, module2, exports2) {
      Object.defineProperty(exports2, "__esModule", { value: true });
      function Stack(container) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        var len = 0;
        var stack = [];
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          len = 0;
          stack.length = 0;
        };
        this.push = function(element) {
          stack.push(element);
          ++len;
        };
        this.pop = function() {
          stack.pop();
          if (len > 0)
            --len;
        };
        this.top = function() {
          return stack[len - 1];
        };
        container.forEach(function(element) {
          return _this.push(element);
        });
        Object.freeze(this);
      }
      Object.freeze(Stack);
      exports2.default = Stack;
    }, {}], 35: [function(require2, module2, exports2) {
      var __generator = this && this.__generator || function(thisArg, body) {
        var _ = { label: 0, sent: function() {
          if (t[0] & 1)
            throw t[1];
          return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        function step(op) {
          if (f)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                return t;
              if (y = 0, t)
                op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
      };
      var __read = this && this.__read || function(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
          return o;
        var i = m.call(o), r, ar = [], e;
        try {
          while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
            ar.push(r.value);
        } catch (error) {
          e = { error };
        } finally {
          try {
            if (r && !r.done && (m = i["return"]))
              m.call(i);
          } finally {
            if (e)
              throw e.error;
          }
        }
        return ar;
      };
      var __spreadArray = this && this.__spreadArray || function(to, from, pack) {
        if (pack || arguments.length === 2)
          for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
              if (!ar)
                ar = Array.prototype.slice.call(from, 0, i);
              ar[i] = from[i];
            }
          }
        return to.concat(ar || Array.prototype.slice.call(from));
      };
      var __values = this && this.__values || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
          return m.call(o);
        if (o && typeof o.length === "number")
          return {
            next: function() {
              if (o && i >= o.length)
                o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      Object.defineProperty(exports2, "__esModule", { value: true });
      function Vector(container) {
        var _this = this;
        if (container === void 0) {
          container = [];
        }
        var len = 0;
        var vector = [];
        this.size = function() {
          return len;
        };
        this.empty = function() {
          return len === 0;
        };
        this.clear = function() {
          len = 0;
          vector.length = 0;
        };
        this.front = function() {
          if (this.empty())
            return void 0;
          return vector[0];
        };
        this.back = function() {
          if (this.empty())
            return void 0;
          return vector[len - 1];
        };
        this.forEach = function(callback) {
          vector.forEach(callback);
        };
        this.getElementByPos = function(pos) {
          if (pos < 0 || pos >= len)
            throw new Error("pos must more than 0 and less than vector's size");
          return vector[pos];
        };
        this.eraseElementByPos = function(pos) {
          if (pos < 0 || pos >= len)
            throw new Error("pos must more than 0 and less than vector's size");
          for (var i = pos; i < len - 1; ++i)
            vector[i] = vector[i + 1];
          this.popBack();
        };
        this.eraseElementByValue = function(value) {
          var newArr = [];
          this.forEach(function(element) {
            if (element !== value)
              newArr.push(element);
          });
          newArr.forEach(function(element, index) {
            vector[index] = element;
          });
          var newLen = newArr.length;
          while (len > newLen)
            this.popBack();
        };
        this.pushBack = function(element) {
          vector.push(element);
          ++len;
        };
        this.popBack = function() {
          vector.pop();
          if (len > 0)
            --len;
        };
        this.setElementByPos = function(pos, element) {
          if (pos < 0 || pos >= len)
            throw new Error("pos must more than 0 and less than vector's size");
          vector[pos] = element;
        };
        this.insert = function(pos, element, num) {
          if (num === void 0) {
            num = 1;
          }
          if (pos < 0 || pos > len)
            throw new Error("pos must more than 0 and less than or equal to vector's size");
          vector.splice.apply(vector, __spreadArray([pos, 0], __read(new Array(num).fill(element)), false));
          len += num;
        };
        this.find = function(element) {
          return vector.includes(element);
        };
        this.reverse = function() {
          vector.reverse();
        };
        this.unique = function() {
          var pre;
          var newArr = [];
          this.forEach(function(element, index) {
            if (index === 0 || element !== pre) {
              newArr.push(element);
              pre = element;
            }
          });
          newArr.forEach(function(element, index) {
            vector[index] = element;
          });
          var newLen = newArr.length;
          while (len > newLen)
            this.popBack();
        };
        this.sort = function(cmp) {
          vector.sort(cmp);
        };
        this[Symbol.iterator] = function() {
          return function() {
            return __generator(this, function(_a) {
              switch (_a.label) {
                case 0:
                  return [5, __values(vector)];
                case 1:
                  return [2, _a.sent()];
              }
            });
          }();
        };
        container.forEach(function(element) {
          return _this.pushBack(element);
        });
        Object.freeze(this);
      }
      Object.freeze(Vector);
      exports2.default = Vector;
    }, {}], 36: [function(require2, module2, exports2) {
      Object.defineProperty(exports2, "__esModule", { value: true });
      exports2.HashMap = exports2.HashSet = exports2.Map = exports2.Set = exports2.PriorityQueue = exports2.Deque = exports2.LinkList = exports2.Queue = exports2.Stack = exports2.Vector = void 0;
      var Vector_1 = require2("./Vector/Vector");
      exports2.Vector = Vector_1.default;
      var Stack_1 = require2("./Stack/Stack");
      exports2.Stack = Stack_1.default;
      var Queue_1 = require2("./Queue/Queue");
      exports2.Queue = Queue_1.default;
      var LinkList_1 = require2("./LinkList/LinkList");
      exports2.LinkList = LinkList_1.default;
      var Deque_1 = require2("./Deque/Deque");
      exports2.Deque = Deque_1.default;
      var PriorityQueue_1 = require2("./PriorityQueue/PriorityQueue");
      exports2.PriorityQueue = PriorityQueue_1.default;
      var Set_1 = require2("./Set/Set");
      exports2.Set = Set_1.default;
      var Map_1 = require2("./Map/Map");
      exports2.Map = Map_1.default;
      var HashSet_1 = require2("./HashSet/HashSet");
      exports2.HashSet = HashSet_1.default;
      var HashMap_1 = require2("./HashMap/HashMap");
      exports2.HashMap = HashMap_1.default;
    }, { "./Deque/Deque": 26, "./HashMap/HashMap": 27, "./HashSet/HashSet": 28, "./LinkList/LinkList": 29, "./Map/Map": 30, "./PriorityQueue/PriorityQueue": 31, "./Queue/Queue": 32, "./Set/Set": 33, "./Stack/Stack": 34, "./Vector/Vector": 35 }], 37: [function(require2, module2, exports2) {
      const Yallist = require2("yallist");
      const MAX = Symbol("max");
      const LENGTH = Symbol("length");
      const LENGTH_CALCULATOR = Symbol("lengthCalculator");
      const ALLOW_STALE = Symbol("allowStale");
      const MAX_AGE = Symbol("maxAge");
      const DISPOSE = Symbol("dispose");
      const NO_DISPOSE_ON_SET = Symbol("noDisposeOnSet");
      const LRU_LIST = Symbol("lruList");
      const CACHE = Symbol("cache");
      const UPDATE_AGE_ON_GET = Symbol("updateAgeOnGet");
      const naiveLength = () => 1;
      class LRUCache {
        constructor(options) {
          if (typeof options === "number")
            options = { max: options };
          if (!options)
            options = {};
          if (options.max && (typeof options.max !== "number" || options.max < 0))
            throw new TypeError("max must be a non-negative number");
          this[MAX] = options.max || Infinity;
          const lc = options.length || naiveLength;
          this[LENGTH_CALCULATOR] = typeof lc !== "function" ? naiveLength : lc;
          this[ALLOW_STALE] = options.stale || false;
          if (options.maxAge && typeof options.maxAge !== "number")
            throw new TypeError("maxAge must be a number");
          this[MAX_AGE] = options.maxAge || 0;
          this[DISPOSE] = options.dispose;
          this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
          this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
          this.reset();
        }
        set max(mL) {
          if (typeof mL !== "number" || mL < 0)
            throw new TypeError("max must be a non-negative number");
          this[MAX] = mL || Infinity;
          trim(this);
        }
        get max() {
          return this[MAX];
        }
        set allowStale(allowStale) {
          this[ALLOW_STALE] = !!allowStale;
        }
        get allowStale() {
          return this[ALLOW_STALE];
        }
        set maxAge(mA) {
          if (typeof mA !== "number")
            throw new TypeError("maxAge must be a non-negative number");
          this[MAX_AGE] = mA;
          trim(this);
        }
        get maxAge() {
          return this[MAX_AGE];
        }
        set lengthCalculator(lC) {
          if (typeof lC !== "function")
            lC = naiveLength;
          if (lC !== this[LENGTH_CALCULATOR]) {
            this[LENGTH_CALCULATOR] = lC;
            this[LENGTH] = 0;
            this[LRU_LIST].forEach((hit) => {
              hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
              this[LENGTH] += hit.length;
            });
          }
          trim(this);
        }
        get lengthCalculator() {
          return this[LENGTH_CALCULATOR];
        }
        get length() {
          return this[LENGTH];
        }
        get itemCount() {
          return this[LRU_LIST].length;
        }
        rforEach(fn, thisp) {
          thisp = thisp || this;
          for (let walker = this[LRU_LIST].tail; walker !== null; ) {
            const prev = walker.prev;
            forEachStep(this, fn, walker, thisp);
            walker = prev;
          }
        }
        forEach(fn, thisp) {
          thisp = thisp || this;
          for (let walker = this[LRU_LIST].head; walker !== null; ) {
            const next = walker.next;
            forEachStep(this, fn, walker, thisp);
            walker = next;
          }
        }
        keys() {
          return this[LRU_LIST].toArray().map((k) => k.key);
        }
        values() {
          return this[LRU_LIST].toArray().map((k) => k.value);
        }
        reset() {
          if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) {
            this[LRU_LIST].forEach((hit) => this[DISPOSE](hit.key, hit.value));
          }
          this[CACHE] = /* @__PURE__ */ new Map();
          this[LRU_LIST] = new Yallist();
          this[LENGTH] = 0;
        }
        dump() {
          return this[LRU_LIST].map((hit) => isStale(this, hit) ? false : {
            k: hit.key,
            v: hit.value,
            e: hit.now + (hit.maxAge || 0)
          }).toArray().filter((h) => h);
        }
        dumpLru() {
          return this[LRU_LIST];
        }
        set(key, value, maxAge) {
          maxAge = maxAge || this[MAX_AGE];
          if (maxAge && typeof maxAge !== "number")
            throw new TypeError("maxAge must be a number");
          const now = maxAge ? Date.now() : 0;
          const len = this[LENGTH_CALCULATOR](value, key);
          if (this[CACHE].has(key)) {
            if (len > this[MAX]) {
              del(this, this[CACHE].get(key));
              return false;
            }
            const node = this[CACHE].get(key);
            const item = node.value;
            if (this[DISPOSE]) {
              if (!this[NO_DISPOSE_ON_SET])
                this[DISPOSE](key, item.value);
            }
            item.now = now;
            item.maxAge = maxAge;
            item.value = value;
            this[LENGTH] += len - item.length;
            item.length = len;
            this.get(key);
            trim(this);
            return true;
          }
          const hit = new Entry(key, value, len, now, maxAge);
          if (hit.length > this[MAX]) {
            if (this[DISPOSE])
              this[DISPOSE](key, value);
            return false;
          }
          this[LENGTH] += hit.length;
          this[LRU_LIST].unshift(hit);
          this[CACHE].set(key, this[LRU_LIST].head);
          trim(this);
          return true;
        }
        has(key) {
          if (!this[CACHE].has(key))
            return false;
          const hit = this[CACHE].get(key).value;
          return !isStale(this, hit);
        }
        get(key) {
          return get(this, key, true);
        }
        peek(key) {
          return get(this, key, false);
        }
        pop() {
          const node = this[LRU_LIST].tail;
          if (!node)
            return null;
          del(this, node);
          return node.value;
        }
        del(key) {
          del(this, this[CACHE].get(key));
        }
        load(arr) {
          this.reset();
          const now = Date.now();
          for (let l = arr.length - 1; l >= 0; l--) {
            const hit = arr[l];
            const expiresAt = hit.e || 0;
            if (expiresAt === 0)
              this.set(hit.k, hit.v);
            else {
              const maxAge = expiresAt - now;
              if (maxAge > 0) {
                this.set(hit.k, hit.v, maxAge);
              }
            }
          }
        }
        prune() {
          this[CACHE].forEach((value, key) => get(this, key, false));
        }
      }
      const get = (self2, key, doUse) => {
        const node = self2[CACHE].get(key);
        if (node) {
          const hit = node.value;
          if (isStale(self2, hit)) {
            del(self2, node);
            if (!self2[ALLOW_STALE])
              return void 0;
          } else {
            if (doUse) {
              if (self2[UPDATE_AGE_ON_GET])
                node.value.now = Date.now();
              self2[LRU_LIST].unshiftNode(node);
            }
          }
          return hit.value;
        }
      };
      const isStale = (self2, hit) => {
        if (!hit || !hit.maxAge && !self2[MAX_AGE])
          return false;
        const diff = Date.now() - hit.now;
        return hit.maxAge ? diff > hit.maxAge : self2[MAX_AGE] && diff > self2[MAX_AGE];
      };
      const trim = (self2) => {
        if (self2[LENGTH] > self2[MAX]) {
          for (let walker = self2[LRU_LIST].tail; self2[LENGTH] > self2[MAX] && walker !== null; ) {
            const prev = walker.prev;
            del(self2, walker);
            walker = prev;
          }
        }
      };
      const del = (self2, node) => {
        if (node) {
          const hit = node.value;
          if (self2[DISPOSE])
            self2[DISPOSE](hit.key, hit.value);
          self2[LENGTH] -= hit.length;
          self2[CACHE].delete(hit.key);
          self2[LRU_LIST].removeNode(node);
        }
      };
      class Entry {
        constructor(key, value, length, now, maxAge) {
          this.key = key;
          this.value = value;
          this.length = length;
          this.now = now;
          this.maxAge = maxAge || 0;
        }
      }
      const forEachStep = (self2, fn, node, thisp) => {
        let hit = node.value;
        if (isStale(self2, hit)) {
          del(self2, node);
          if (!self2[ALLOW_STALE])
            hit = void 0;
        }
        if (hit)
          fn.call(thisp, hit.value, hit.key, self2);
      };
      module2.exports = LRUCache;
    }, { "yallist": 83 }], 38: [function(require2, module2, exports2) {
      (function(Buffer2) {
        (function() {
          const protocol = module2.exports;
          protocol.types = {
            0: "reserved",
            1: "connect",
            2: "connack",
            3: "publish",
            4: "puback",
            5: "pubrec",
            6: "pubrel",
            7: "pubcomp",
            8: "subscribe",
            9: "suback",
            10: "unsubscribe",
            11: "unsuback",
            12: "pingreq",
            13: "pingresp",
            14: "disconnect",
            15: "auth"
          };
          protocol.codes = {};
          for (const k in protocol.types) {
            const v = protocol.types[k];
            protocol.codes[v] = k;
          }
          protocol.CMD_SHIFT = 4;
          protocol.CMD_MASK = 240;
          protocol.DUP_MASK = 8;
          protocol.QOS_MASK = 3;
          protocol.QOS_SHIFT = 1;
          protocol.RETAIN_MASK = 1;
          protocol.VARBYTEINT_MASK = 127;
          protocol.VARBYTEINT_FIN_MASK = 128;
          protocol.VARBYTEINT_MAX = 268435455;
          protocol.SESSIONPRESENT_MASK = 1;
          protocol.SESSIONPRESENT_HEADER = Buffer2.from([protocol.SESSIONPRESENT_MASK]);
          protocol.CONNACK_HEADER = Buffer2.from([protocol.codes.connack << protocol.CMD_SHIFT]);
          protocol.USERNAME_MASK = 128;
          protocol.PASSWORD_MASK = 64;
          protocol.WILL_RETAIN_MASK = 32;
          protocol.WILL_QOS_MASK = 24;
          protocol.WILL_QOS_SHIFT = 3;
          protocol.WILL_FLAG_MASK = 4;
          protocol.CLEAN_SESSION_MASK = 2;
          protocol.CONNECT_HEADER = Buffer2.from([protocol.codes.connect << protocol.CMD_SHIFT]);
          protocol.properties = {
            sessionExpiryInterval: 17,
            willDelayInterval: 24,
            receiveMaximum: 33,
            maximumPacketSize: 39,
            topicAliasMaximum: 34,
            requestResponseInformation: 25,
            requestProblemInformation: 23,
            userProperties: 38,
            authenticationMethod: 21,
            authenticationData: 22,
            payloadFormatIndicator: 1,
            messageExpiryInterval: 2,
            contentType: 3,
            responseTopic: 8,
            correlationData: 9,
            maximumQoS: 36,
            retainAvailable: 37,
            assignedClientIdentifier: 18,
            reasonString: 31,
            wildcardSubscriptionAvailable: 40,
            subscriptionIdentifiersAvailable: 41,
            sharedSubscriptionAvailable: 42,
            serverKeepAlive: 19,
            responseInformation: 26,
            serverReference: 28,
            topicAlias: 35,
            subscriptionIdentifier: 11
          };
          protocol.propertiesCodes = {};
          for (const prop in protocol.properties) {
            const id = protocol.properties[prop];
            protocol.propertiesCodes[id] = prop;
          }
          protocol.propertiesTypes = {
            sessionExpiryInterval: "int32",
            willDelayInterval: "int32",
            receiveMaximum: "int16",
            maximumPacketSize: "int32",
            topicAliasMaximum: "int16",
            requestResponseInformation: "byte",
            requestProblemInformation: "byte",
            userProperties: "pair",
            authenticationMethod: "string",
            authenticationData: "binary",
            payloadFormatIndicator: "byte",
            messageExpiryInterval: "int32",
            contentType: "string",
            responseTopic: "string",
            correlationData: "binary",
            maximumQoS: "int8",
            retainAvailable: "byte",
            assignedClientIdentifier: "string",
            reasonString: "string",
            wildcardSubscriptionAvailable: "byte",
            subscriptionIdentifiersAvailable: "byte",
            sharedSubscriptionAvailable: "byte",
            serverKeepAlive: "int16",
            responseInformation: "string",
            serverReference: "string",
            topicAlias: "int16",
            subscriptionIdentifier: "var"
          };
          function genHeader(type) {
            return [0, 1, 2].map((qos) => {
              return [0, 1].map((dup) => {
                return [0, 1].map((retain) => {
                  const buf = Buffer2.alloc(1);
                  buf.writeUInt8(protocol.codes[type] << protocol.CMD_SHIFT | (dup ? protocol.DUP_MASK : 0) | qos << protocol.QOS_SHIFT | retain, 0, true);
                  return buf;
                });
              });
            });
          }
          protocol.PUBLISH_HEADER = genHeader("publish");
          protocol.SUBSCRIBE_HEADER = genHeader("subscribe");
          protocol.SUBSCRIBE_OPTIONS_QOS_MASK = 3;
          protocol.SUBSCRIBE_OPTIONS_NL_MASK = 1;
          protocol.SUBSCRIBE_OPTIONS_NL_SHIFT = 2;
          protocol.SUBSCRIBE_OPTIONS_RAP_MASK = 1;
          protocol.SUBSCRIBE_OPTIONS_RAP_SHIFT = 3;
          protocol.SUBSCRIBE_OPTIONS_RH_MASK = 3;
          protocol.SUBSCRIBE_OPTIONS_RH_SHIFT = 4;
          protocol.SUBSCRIBE_OPTIONS_RH = [0, 16, 32];
          protocol.SUBSCRIBE_OPTIONS_NL = 4;
          protocol.SUBSCRIBE_OPTIONS_RAP = 8;
          protocol.SUBSCRIBE_OPTIONS_QOS = [0, 1, 2];
          protocol.UNSUBSCRIBE_HEADER = genHeader("unsubscribe");
          protocol.ACKS = {
            unsuback: genHeader("unsuback"),
            puback: genHeader("puback"),
            pubcomp: genHeader("pubcomp"),
            pubrel: genHeader("pubrel"),
            pubrec: genHeader("pubrec")
          };
          protocol.SUBACK_HEADER = Buffer2.from([protocol.codes.suback << protocol.CMD_SHIFT]);
          protocol.VERSION3 = Buffer2.from([3]);
          protocol.VERSION4 = Buffer2.from([4]);
          protocol.VERSION5 = Buffer2.from([5]);
          protocol.VERSION131 = Buffer2.from([131]);
          protocol.VERSION132 = Buffer2.from([132]);
          protocol.QOS = [0, 1, 2].map((qos) => {
            return Buffer2.from([qos]);
          });
          protocol.EMPTY = {
            pingreq: Buffer2.from([protocol.codes.pingreq << 4, 0]),
            pingresp: Buffer2.from([protocol.codes.pingresp << 4, 0]),
            disconnect: Buffer2.from([protocol.codes.disconnect << 4, 0])
          };
        }).call(this);
      }).call(this, require2("buffer").Buffer);
    }, { "buffer": 17 }], 39: [function(require2, module2, exports2) {
      (function(Buffer2) {
        (function() {
          const writeToStream = require2("./writeToStream");
          const EventEmitter = require2("events");
          function generate(packet, opts) {
            const stream = new Accumulator();
            writeToStream(packet, stream, opts);
            return stream.concat();
          }
          class Accumulator extends EventEmitter {
            constructor() {
              super();
              this._array = new Array(20);
              this._i = 0;
            }
            write(chunk) {
              this._array[this._i++] = chunk;
              return true;
            }
            concat() {
              let length = 0;
              const lengths = new Array(this._array.length);
              const list = this._array;
              let pos = 0;
              let i;
              for (i = 0; i < list.length && list[i] !== void 0; i++) {
                if (typeof list[i] !== "string")
                  lengths[i] = list[i].length;
                else
                  lengths[i] = Buffer2.byteLength(list[i]);
                length += lengths[i];
              }
              const result = Buffer2.allocUnsafe(length);
              for (i = 0; i < list.length && list[i] !== void 0; i++) {
                if (typeof list[i] !== "string") {
                  list[i].copy(result, pos);
                  pos += lengths[i];
                } else {
                  result.write(list[i], pos);
                  pos += lengths[i];
                }
              }
              return result;
            }
          }
          module2.exports = generate;
        }).call(this);
      }).call(this, require2("buffer").Buffer);
    }, { "./writeToStream": 44, "buffer": 17, "events": 22 }], 40: [function(require2, module2, exports2) {
      exports2.parser = require2("./parser").parser;
      exports2.generate = require2("./generate");
      exports2.writeToStream = require2("./writeToStream");
    }, { "./generate": 39, "./parser": 43, "./writeToStream": 44 }], 41: [function(require2, module2, exports2) {
      (function(Buffer2) {
        (function() {
          const max = 65536;
          const cache = {};
          const SubOk = Buffer2.isBuffer(Buffer2.from([1, 2]).subarray(0, 1));
          function generateBuffer(i) {
            const buffer = Buffer2.allocUnsafe(2);
            buffer.writeUInt8(i >> 8, 0);
            buffer.writeUInt8(i & 255, 0 + 1);
            return buffer;
          }
          function generateCache() {
            for (let i = 0; i < max; i++) {
              cache[i] = generateBuffer(i);
            }
          }
          function genBufVariableByteInt(num) {
            const maxLength = 4;
            let digit = 0;
            let pos = 0;
            const buffer = Buffer2.allocUnsafe(maxLength);
            do {
              digit = num % 128 | 0;
              num = num / 128 | 0;
              if (num > 0)
                digit = digit | 128;
              buffer.writeUInt8(digit, pos++);
            } while (num > 0 && pos < maxLength);
            if (num > 0) {
              pos = 0;
            }
            return SubOk ? buffer.subarray(0, pos) : buffer.slice(0, pos);
          }
          function generate4ByteBuffer(num) {
            const buffer = Buffer2.allocUnsafe(4);
            buffer.writeUInt32BE(num, 0);
            return buffer;
          }
          module2.exports = {
            cache,
            generateCache,
            generateNumber: generateBuffer,
            genBufVariableByteInt,
            generate4ByteBuffer
          };
        }).call(this);
      }).call(this, require2("buffer").Buffer);
    }, { "buffer": 17 }], 42: [function(require2, module2, exports2) {
      class Packet {
        constructor() {
          this.cmd = null;
          this.retain = false;
          this.qos = 0;
          this.dup = false;
          this.length = -1;
          this.topic = null;
          this.payload = null;
        }
      }
      module2.exports = Packet;
    }, {}], 43: [function(require2, module2, exports2) {
      const bl = require2("bl");
      const EventEmitter = require2("events");
      const Packet = require2("./packet");
      const constants = require2("./constants");
      const debug = require2("debug")("mqtt-packet:parser");
      class Parser extends EventEmitter {
        constructor() {
          super();
          this.parser = this.constructor.parser;
        }
        static parser(opt) {
          if (!(this instanceof Parser))
            return new Parser().parser(opt);
          this.settings = opt || {};
          this._states = [
            "_parseHeader",
            "_parseLength",
            "_parsePayload",
            "_newPacket"
          ];
          this._resetState();
          return this;
        }
        _resetState() {
          debug("_resetState: resetting packet, error, _list, and _stateCounter");
          this.packet = new Packet();
          this.error = null;
          this._list = bl();
          this._stateCounter = 0;
        }
        parse(buf) {
          if (this.error)
            this._resetState();
          this._list.append(buf);
          debug("parse: current state: %s", this._states[this._stateCounter]);
          while ((this.packet.length !== -1 || this._list.length > 0) && this[this._states[this._stateCounter]]() && !this.error) {
            this._stateCounter++;
            debug("parse: state complete. _stateCounter is now: %d", this._stateCounter);
            debug("parse: packet.length: %d, buffer list length: %d", this.packet.length, this._list.length);
            if (this._stateCounter >= this._states.length)
              this._stateCounter = 0;
          }
          debug("parse: exited while loop. packet: %d, buffer list length: %d", this.packet.length, this._list.length);
          return this._list.length;
        }
        _parseHeader() {
          const zero = this._list.readUInt8(0);
          this.packet.cmd = constants.types[zero >> constants.CMD_SHIFT];
          this.packet.retain = (zero & constants.RETAIN_MASK) !== 0;
          this.packet.qos = zero >> constants.QOS_SHIFT & constants.QOS_MASK;
          this.packet.dup = (zero & constants.DUP_MASK) !== 0;
          debug("_parseHeader: packet: %o", this.packet);
          this._list.consume(1);
          return true;
        }
        _parseLength() {
          const result = this._parseVarByteNum(true);
          if (result) {
            this.packet.length = result.value;
            this._list.consume(result.bytes);
          }
          debug("_parseLength %d", result.value);
          return !!result;
        }
        _parsePayload() {
          debug("_parsePayload: payload %O", this._list);
          let result = false;
          if (this.packet.length === 0 || this._list.length >= this.packet.length) {
            this._pos = 0;
            switch (this.packet.cmd) {
              case "connect":
                this._parseConnect();
                break;
              case "connack":
                this._parseConnack();
                break;
              case "publish":
                this._parsePublish();
                break;
              case "puback":
              case "pubrec":
              case "pubrel":
              case "pubcomp":
                this._parseConfirmation();
                break;
              case "subscribe":
                this._parseSubscribe();
                break;
              case "suback":
                this._parseSuback();
                break;
              case "unsubscribe":
                this._parseUnsubscribe();
                break;
              case "unsuback":
                this._parseUnsuback();
                break;
              case "pingreq":
              case "pingresp":
                break;
              case "disconnect":
                this._parseDisconnect();
                break;
              case "auth":
                this._parseAuth();
                break;
              default:
                this._emitError(new Error("Not supported"));
            }
            result = true;
          }
          debug("_parsePayload complete result: %s", result);
          return result;
        }
        _parseConnect() {
          debug("_parseConnect");
          let topic;
          let payload;
          let password;
          let username;
          const flags = {};
          const packet = this.packet;
          const protocolId = this._parseString();
          if (protocolId === null)
            return this._emitError(new Error("Cannot parse protocolId"));
          if (protocolId !== "MQTT" && protocolId !== "MQIsdp") {
            return this._emitError(new Error("Invalid protocolId"));
          }
          packet.protocolId = protocolId;
          if (this._pos >= this._list.length)
            return this._emitError(new Error("Packet too short"));
          packet.protocolVersion = this._list.readUInt8(this._pos);
          if (packet.protocolVersion >= 128) {
            packet.bridgeMode = true;
            packet.protocolVersion = packet.protocolVersion - 128;
          }
          if (packet.protocolVersion !== 3 && packet.protocolVersion !== 4 && packet.protocolVersion !== 5) {
            return this._emitError(new Error("Invalid protocol version"));
          }
          this._pos++;
          if (this._pos >= this._list.length) {
            return this._emitError(new Error("Packet too short"));
          }
          flags.username = this._list.readUInt8(this._pos) & constants.USERNAME_MASK;
          flags.password = this._list.readUInt8(this._pos) & constants.PASSWORD_MASK;
          flags.will = this._list.readUInt8(this._pos) & constants.WILL_FLAG_MASK;
          if (flags.will) {
            packet.will = {};
            packet.will.retain = (this._list.readUInt8(this._pos) & constants.WILL_RETAIN_MASK) !== 0;
            packet.will.qos = (this._list.readUInt8(this._pos) & constants.WILL_QOS_MASK) >> constants.WILL_QOS_SHIFT;
          }
          packet.clean = (this._list.readUInt8(this._pos) & constants.CLEAN_SESSION_MASK) !== 0;
          this._pos++;
          packet.keepalive = this._parseNum();
          if (packet.keepalive === -1)
            return this._emitError(new Error("Packet too short"));
          if (packet.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          const clientId = this._parseString();
          if (clientId === null)
            return this._emitError(new Error("Packet too short"));
          packet.clientId = clientId;
          debug("_parseConnect: packet.clientId: %s", packet.clientId);
          if (flags.will) {
            if (packet.protocolVersion === 5) {
              const willProperties = this._parseProperties();
              if (Object.getOwnPropertyNames(willProperties).length) {
                packet.will.properties = willProperties;
              }
            }
            topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse will topic"));
            packet.will.topic = topic;
            debug("_parseConnect: packet.will.topic: %s", packet.will.topic);
            payload = this._parseBuffer();
            if (payload === null)
              return this._emitError(new Error("Cannot parse will payload"));
            packet.will.payload = payload;
            debug("_parseConnect: packet.will.paylaod: %s", packet.will.payload);
          }
          if (flags.username) {
            username = this._parseString();
            if (username === null)
              return this._emitError(new Error("Cannot parse username"));
            packet.username = username;
            debug("_parseConnect: packet.username: %s", packet.username);
          }
          if (flags.password) {
            password = this._parseBuffer();
            if (password === null)
              return this._emitError(new Error("Cannot parse password"));
            packet.password = password;
          }
          this.settings = packet;
          debug("_parseConnect: complete");
          return packet;
        }
        _parseConnack() {
          debug("_parseConnack");
          const packet = this.packet;
          if (this._list.length < 1)
            return null;
          packet.sessionPresent = !!(this._list.readUInt8(this._pos++) & constants.SESSIONPRESENT_MASK);
          if (this.settings.protocolVersion === 5) {
            if (this._list.length >= 2) {
              packet.reasonCode = this._list.readUInt8(this._pos++);
            } else {
              packet.reasonCode = 0;
            }
          } else {
            if (this._list.length < 2)
              return null;
            packet.returnCode = this._list.readUInt8(this._pos++);
          }
          if (packet.returnCode === -1 || packet.reasonCode === -1)
            return this._emitError(new Error("Cannot parse return code"));
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          debug("_parseConnack: complete");
        }
        _parsePublish() {
          debug("_parsePublish");
          const packet = this.packet;
          packet.topic = this._parseString();
          if (packet.topic === null)
            return this._emitError(new Error("Cannot parse topic"));
          if (packet.qos > 0) {
            if (!this._parseMessageId()) {
              return;
            }
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          packet.payload = this._list.slice(this._pos, packet.length);
          debug("_parsePublish: payload from buffer list: %o", packet.payload);
        }
        _parseSubscribe() {
          debug("_parseSubscribe");
          const packet = this.packet;
          let topic;
          let options;
          let qos;
          let rh;
          let rap;
          let nl;
          let subscription;
          if (packet.qos !== 1) {
            return this._emitError(new Error("Wrong subscribe header"));
          }
          packet.subscriptions = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          while (this._pos < packet.length) {
            topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse topic"));
            if (this._pos >= packet.length)
              return this._emitError(new Error("Malformed Subscribe Payload"));
            options = this._parseByte();
            qos = options & constants.SUBSCRIBE_OPTIONS_QOS_MASK;
            nl = (options >> constants.SUBSCRIBE_OPTIONS_NL_SHIFT & constants.SUBSCRIBE_OPTIONS_NL_MASK) !== 0;
            rap = (options >> constants.SUBSCRIBE_OPTIONS_RAP_SHIFT & constants.SUBSCRIBE_OPTIONS_RAP_MASK) !== 0;
            rh = options >> constants.SUBSCRIBE_OPTIONS_RH_SHIFT & constants.SUBSCRIBE_OPTIONS_RH_MASK;
            subscription = { topic, qos };
            if (this.settings.protocolVersion === 5) {
              subscription.nl = nl;
              subscription.rap = rap;
              subscription.rh = rh;
            } else if (this.settings.bridgeMode) {
              subscription.rh = 0;
              subscription.rap = true;
              subscription.nl = true;
            }
            debug("_parseSubscribe: push subscription `%s` to subscription", subscription);
            packet.subscriptions.push(subscription);
          }
        }
        _parseSuback() {
          debug("_parseSuback");
          const packet = this.packet;
          this.packet.granted = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          while (this._pos < this.packet.length) {
            this.packet.granted.push(this._list.readUInt8(this._pos++));
          }
        }
        _parseUnsubscribe() {
          debug("_parseUnsubscribe");
          const packet = this.packet;
          packet.unsubscriptions = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          while (this._pos < packet.length) {
            const topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse topic"));
            debug("_parseUnsubscribe: push topic `%s` to unsubscriptions", topic);
            packet.unsubscriptions.push(topic);
          }
        }
        _parseUnsuback() {
          debug("_parseUnsuback");
          const packet = this.packet;
          if (!this._parseMessageId())
            return this._emitError(new Error("Cannot parse messageId"));
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
            packet.granted = [];
            while (this._pos < this.packet.length) {
              this.packet.granted.push(this._list.readUInt8(this._pos++));
            }
          }
        }
        _parseConfirmation() {
          debug("_parseConfirmation: packet.cmd: `%s`", this.packet.cmd);
          const packet = this.packet;
          this._parseMessageId();
          if (this.settings.protocolVersion === 5) {
            if (packet.length > 2) {
              packet.reasonCode = this._parseByte();
              debug("_parseConfirmation: packet.reasonCode `%d`", packet.reasonCode);
            } else {
              packet.reasonCode = 0;
            }
            if (packet.length > 3) {
              const properties = this._parseProperties();
              if (Object.getOwnPropertyNames(properties).length) {
                packet.properties = properties;
              }
            }
          }
          return true;
        }
        _parseDisconnect() {
          const packet = this.packet;
          debug("_parseDisconnect");
          if (this.settings.protocolVersion === 5) {
            if (this._list.length > 0) {
              packet.reasonCode = this._parseByte();
            } else {
              packet.reasonCode = 0;
            }
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          debug("_parseDisconnect result: true");
          return true;
        }
        _parseAuth() {
          debug("_parseAuth");
          const packet = this.packet;
          if (this.settings.protocolVersion !== 5) {
            return this._emitError(new Error("Not supported auth packet for this version MQTT"));
          }
          packet.reasonCode = this._parseByte();
          const properties = this._parseProperties();
          if (Object.getOwnPropertyNames(properties).length) {
            packet.properties = properties;
          }
          debug("_parseAuth: result: true");
          return true;
        }
        _parseMessageId() {
          const packet = this.packet;
          packet.messageId = this._parseNum();
          if (packet.messageId === null) {
            this._emitError(new Error("Cannot parse messageId"));
            return false;
          }
          debug("_parseMessageId: packet.messageId %d", packet.messageId);
          return true;
        }
        _parseString(maybeBuffer) {
          const length = this._parseNum();
          const end = length + this._pos;
          if (length === -1 || end > this._list.length || end > this.packet.length)
            return null;
          const result = this._list.toString("utf8", this._pos, end);
          this._pos += length;
          debug("_parseString: result: %s", result);
          return result;
        }
        _parseStringPair() {
          debug("_parseStringPair");
          return {
            name: this._parseString(),
            value: this._parseString()
          };
        }
        _parseBuffer() {
          const length = this._parseNum();
          const end = length + this._pos;
          if (length === -1 || end > this._list.length || end > this.packet.length)
            return null;
          const result = this._list.slice(this._pos, end);
          this._pos += length;
          debug("_parseBuffer: result: %o", result);
          return result;
        }
        _parseNum() {
          if (this._list.length - this._pos < 2)
            return -1;
          const result = this._list.readUInt16BE(this._pos);
          this._pos += 2;
          debug("_parseNum: result: %s", result);
          return result;
        }
        _parse4ByteNum() {
          if (this._list.length - this._pos < 4)
            return -1;
          const result = this._list.readUInt32BE(this._pos);
          this._pos += 4;
          debug("_parse4ByteNum: result: %s", result);
          return result;
        }
        _parseVarByteNum(fullInfoFlag) {
          debug("_parseVarByteNum");
          const maxBytes = 4;
          let bytes = 0;
          let mul = 1;
          let value = 0;
          let result = false;
          let current;
          const padding = this._pos ? this._pos : 0;
          while (bytes < maxBytes && padding + bytes < this._list.length) {
            current = this._list.readUInt8(padding + bytes++);
            value += mul * (current & constants.VARBYTEINT_MASK);
            mul *= 128;
            if ((current & constants.VARBYTEINT_FIN_MASK) === 0) {
              result = true;
              break;
            }
            if (this._list.length <= bytes) {
              break;
            }
          }
          if (!result && bytes === maxBytes && this._list.length >= bytes) {
            this._emitError(new Error("Invalid variable byte integer"));
          }
          if (padding) {
            this._pos += bytes;
          }
          result = result ? fullInfoFlag ? {
            bytes,
            value
          } : value : false;
          debug("_parseVarByteNum: result: %o", result);
          return result;
        }
        _parseByte() {
          let result;
          if (this._pos < this._list.length) {
            result = this._list.readUInt8(this._pos);
            this._pos++;
          }
          debug("_parseByte: result: %o", result);
          return result;
        }
        _parseByType(type) {
          debug("_parseByType: type: %s", type);
          switch (type) {
            case "byte": {
              return this._parseByte() !== 0;
            }
            case "int8": {
              return this._parseByte();
            }
            case "int16": {
              return this._parseNum();
            }
            case "int32": {
              return this._parse4ByteNum();
            }
            case "var": {
              return this._parseVarByteNum();
            }
            case "string": {
              return this._parseString();
            }
            case "pair": {
              return this._parseStringPair();
            }
            case "binary": {
              return this._parseBuffer();
            }
          }
        }
        _parseProperties() {
          debug("_parseProperties");
          const length = this._parseVarByteNum();
          const start = this._pos;
          const end = start + length;
          const result = {};
          while (this._pos < end) {
            const type = this._parseByte();
            if (!type) {
              this._emitError(new Error("Cannot parse property code type"));
              return false;
            }
            const name = constants.propertiesCodes[type];
            if (!name) {
              this._emitError(new Error("Unknown property"));
              return false;
            }
            if (name === "userProperties") {
              if (!result[name]) {
                result[name] = /* @__PURE__ */ Object.create(null);
              }
              const currentUserProperty = this._parseByType(constants.propertiesTypes[name]);
              if (result[name][currentUserProperty.name]) {
                if (Array.isArray(result[name][currentUserProperty.name])) {
                  result[name][currentUserProperty.name].push(currentUserProperty.value);
                } else {
                  const currentValue = result[name][currentUserProperty.name];
                  result[name][currentUserProperty.name] = [currentValue];
                  result[name][currentUserProperty.name].push(currentUserProperty.value);
                }
              } else {
                result[name][currentUserProperty.name] = currentUserProperty.value;
              }
              continue;
            }
            if (result[name]) {
              if (Array.isArray(result[name])) {
                result[name].push(this._parseByType(constants.propertiesTypes[name]));
              } else {
                result[name] = [result[name]];
                result[name].push(this._parseByType(constants.propertiesTypes[name]));
              }
            } else {
              result[name] = this._parseByType(constants.propertiesTypes[name]);
            }
          }
          return result;
        }
        _newPacket() {
          debug("_newPacket");
          if (this.packet) {
            this._list.consume(this.packet.length);
            debug("_newPacket: parser emit packet: packet.cmd: %s, packet.payload: %s, packet.length: %d", this.packet.cmd, this.packet.payload, this.packet.length);
            this.emit("packet", this.packet);
          }
          debug("_newPacket: new packet");
          this.packet = new Packet();
          this._pos = 0;
          return true;
        }
        _emitError(err) {
          debug("_emitError");
          this.error = err;
          this.emit("error", err);
        }
      }
      module2.exports = Parser;
    }, { "./constants": 38, "./packet": 42, "bl": 15, "debug": 18, "events": 22 }], 44: [function(require2, module2, exports2) {
      (function(Buffer2) {
        (function() {
          const protocol = require2("./constants");
          const empty = Buffer2.allocUnsafe(0);
          const zeroBuf = Buffer2.from([0]);
          const numbers = require2("./numbers");
          const nextTick = require2("process-nextick-args").nextTick;
          const debug = require2("debug")("mqtt-packet:writeToStream");
          const numCache = numbers.cache;
          const generateNumber = numbers.generateNumber;
          const generateCache = numbers.generateCache;
          const genBufVariableByteInt = numbers.genBufVariableByteInt;
          const generate4ByteBuffer = numbers.generate4ByteBuffer;
          let writeNumber = writeNumberCached;
          let toGenerate = true;
          function generate(packet, stream, opts) {
            debug("generate called");
            if (stream.cork) {
              stream.cork();
              nextTick(uncork, stream);
            }
            if (toGenerate) {
              toGenerate = false;
              generateCache();
            }
            debug("generate: packet.cmd: %s", packet.cmd);
            switch (packet.cmd) {
              case "connect":
                return connect2(packet, stream);
              case "connack":
                return connack(packet, stream, opts);
              case "publish":
                return publish2(packet, stream, opts);
              case "puback":
              case "pubrec":
              case "pubrel":
              case "pubcomp":
                return confirmation(packet, stream, opts);
              case "subscribe":
                return subscribe2(packet, stream, opts);
              case "suback":
                return suback(packet, stream, opts);
              case "unsubscribe":
                return unsubscribe(packet, stream, opts);
              case "unsuback":
                return unsuback(packet, stream, opts);
              case "pingreq":
              case "pingresp":
                return emptyPacket(packet, stream);
              case "disconnect":
                return disconnect2(packet, stream, opts);
              case "auth":
                return auth(packet, stream, opts);
              default:
                stream.emit("error", new Error("Unknown command"));
                return false;
            }
          }
          Object.defineProperty(generate, "cacheNumbers", {
            get() {
              return writeNumber === writeNumberCached;
            },
            set(value) {
              if (value) {
                if (!numCache || Object.keys(numCache).length === 0)
                  toGenerate = true;
                writeNumber = writeNumberCached;
              } else {
                toGenerate = false;
                writeNumber = writeNumberGenerated;
              }
            }
          });
          function uncork(stream) {
            stream.uncork();
          }
          function connect2(packet, stream, opts) {
            const settings = packet || {};
            const protocolId = settings.protocolId || "MQTT";
            let protocolVersion = settings.protocolVersion || 4;
            const will = settings.will;
            let clean = settings.clean;
            const keepalive = settings.keepalive || 0;
            const clientId = settings.clientId || "";
            const username = settings.username;
            const password = settings.password;
            const properties = settings.properties;
            if (clean === void 0)
              clean = true;
            let length = 0;
            if (!protocolId || typeof protocolId !== "string" && !Buffer2.isBuffer(protocolId)) {
              stream.emit("error", new Error("Invalid protocolId"));
              return false;
            } else
              length += protocolId.length + 2;
            if (protocolVersion !== 3 && protocolVersion !== 4 && protocolVersion !== 5) {
              stream.emit("error", new Error("Invalid protocol version"));
              return false;
            } else
              length += 1;
            if ((typeof clientId === "string" || Buffer2.isBuffer(clientId)) && (clientId || protocolVersion >= 4) && (clientId || clean)) {
              length += Buffer2.byteLength(clientId) + 2;
            } else {
              if (protocolVersion < 4) {
                stream.emit("error", new Error("clientId must be supplied before 3.1.1"));
                return false;
              }
              if (clean * 1 === 0) {
                stream.emit("error", new Error("clientId must be given if cleanSession set to 0"));
                return false;
              }
            }
            if (typeof keepalive !== "number" || keepalive < 0 || keepalive > 65535 || keepalive % 1 !== 0) {
              stream.emit("error", new Error("Invalid keepalive"));
              return false;
            } else
              length += 2;
            length += 1;
            if (protocolVersion === 5) {
              var propertiesData = getProperties(stream, properties);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            if (will) {
              if (typeof will !== "object") {
                stream.emit("error", new Error("Invalid will"));
                return false;
              }
              if (!will.topic || typeof will.topic !== "string") {
                stream.emit("error", new Error("Invalid will topic"));
                return false;
              } else {
                length += Buffer2.byteLength(will.topic) + 2;
              }
              length += 2;
              if (will.payload) {
                if (will.payload.length >= 0) {
                  if (typeof will.payload === "string") {
                    length += Buffer2.byteLength(will.payload);
                  } else {
                    length += will.payload.length;
                  }
                } else {
                  stream.emit("error", new Error("Invalid will payload"));
                  return false;
                }
              }
              var willProperties = {};
              if (protocolVersion === 5) {
                willProperties = getProperties(stream, will.properties);
                if (!willProperties) {
                  return false;
                }
                length += willProperties.length;
              }
            }
            let providedUsername = false;
            if (username != null) {
              if (isStringOrBuffer(username)) {
                providedUsername = true;
                length += Buffer2.byteLength(username) + 2;
              } else {
                stream.emit("error", new Error("Invalid username"));
                return false;
              }
            }
            if (password != null) {
              if (!providedUsername) {
                stream.emit("error", new Error("Username is required to use password"));
                return false;
              }
              if (isStringOrBuffer(password)) {
                length += byteLength(password) + 2;
              } else {
                stream.emit("error", new Error("Invalid password"));
                return false;
              }
            }
            stream.write(protocol.CONNECT_HEADER);
            writeVarByteInt(stream, length);
            writeStringOrBuffer(stream, protocolId);
            if (settings.bridgeMode) {
              protocolVersion += 128;
            }
            stream.write(protocolVersion === 131 ? protocol.VERSION131 : protocolVersion === 132 ? protocol.VERSION132 : protocolVersion === 4 ? protocol.VERSION4 : protocolVersion === 5 ? protocol.VERSION5 : protocol.VERSION3);
            let flags = 0;
            flags |= username != null ? protocol.USERNAME_MASK : 0;
            flags |= password != null ? protocol.PASSWORD_MASK : 0;
            flags |= will && will.retain ? protocol.WILL_RETAIN_MASK : 0;
            flags |= will && will.qos ? will.qos << protocol.WILL_QOS_SHIFT : 0;
            flags |= will ? protocol.WILL_FLAG_MASK : 0;
            flags |= clean ? protocol.CLEAN_SESSION_MASK : 0;
            stream.write(Buffer2.from([flags]));
            writeNumber(stream, keepalive);
            if (protocolVersion === 5) {
              propertiesData.write();
            }
            writeStringOrBuffer(stream, clientId);
            if (will) {
              if (protocolVersion === 5) {
                willProperties.write();
              }
              writeString(stream, will.topic);
              writeStringOrBuffer(stream, will.payload);
            }
            if (username != null) {
              writeStringOrBuffer(stream, username);
            }
            if (password != null) {
              writeStringOrBuffer(stream, password);
            }
            return true;
          }
          function connack(packet, stream, opts) {
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const rc = version === 5 ? settings.reasonCode : settings.returnCode;
            const properties = settings.properties;
            let length = 2;
            if (typeof rc !== "number") {
              stream.emit("error", new Error("Invalid return code"));
              return false;
            }
            let propertiesData = null;
            if (version === 5) {
              propertiesData = getProperties(stream, properties);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            stream.write(protocol.CONNACK_HEADER);
            writeVarByteInt(stream, length);
            stream.write(settings.sessionPresent ? protocol.SESSIONPRESENT_HEADER : zeroBuf);
            stream.write(Buffer2.from([rc]));
            if (propertiesData != null) {
              propertiesData.write();
            }
            return true;
          }
          function publish2(packet, stream, opts) {
            debug("publish: packet: %o", packet);
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const qos = settings.qos || 0;
            const retain = settings.retain ? protocol.RETAIN_MASK : 0;
            const topic = settings.topic;
            const payload = settings.payload || empty;
            const id = settings.messageId;
            const properties = settings.properties;
            let length = 0;
            if (typeof topic === "string")
              length += Buffer2.byteLength(topic) + 2;
            else if (Buffer2.isBuffer(topic))
              length += topic.length + 2;
            else {
              stream.emit("error", new Error("Invalid topic"));
              return false;
            }
            if (!Buffer2.isBuffer(payload))
              length += Buffer2.byteLength(payload);
            else
              length += payload.length;
            if (qos && typeof id !== "number") {
              stream.emit("error", new Error("Invalid messageId"));
              return false;
            } else if (qos)
              length += 2;
            let propertiesData = null;
            if (version === 5) {
              propertiesData = getProperties(stream, properties);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            stream.write(protocol.PUBLISH_HEADER[qos][settings.dup ? 1 : 0][retain ? 1 : 0]);
            writeVarByteInt(stream, length);
            writeNumber(stream, byteLength(topic));
            stream.write(topic);
            if (qos > 0)
              writeNumber(stream, id);
            if (propertiesData != null) {
              propertiesData.write();
            }
            debug("publish: payload: %o", payload);
            return stream.write(payload);
          }
          function confirmation(packet, stream, opts) {
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const type = settings.cmd || "puback";
            const id = settings.messageId;
            const dup = settings.dup && type === "pubrel" ? protocol.DUP_MASK : 0;
            let qos = 0;
            const reasonCode = settings.reasonCode;
            const properties = settings.properties;
            let length = version === 5 ? 3 : 2;
            if (type === "pubrel")
              qos = 1;
            if (typeof id !== "number") {
              stream.emit("error", new Error("Invalid messageId"));
              return false;
            }
            let propertiesData = null;
            if (version === 5) {
              if (typeof properties === "object") {
                propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
                if (!propertiesData) {
                  return false;
                }
                length += propertiesData.length;
              }
            }
            stream.write(protocol.ACKS[type][qos][dup][0]);
            writeVarByteInt(stream, length);
            writeNumber(stream, id);
            if (version === 5) {
              stream.write(Buffer2.from([reasonCode]));
            }
            if (propertiesData !== null) {
              propertiesData.write();
            }
            return true;
          }
          function subscribe2(packet, stream, opts) {
            debug("subscribe: packet: ");
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const dup = settings.dup ? protocol.DUP_MASK : 0;
            const id = settings.messageId;
            const subs = settings.subscriptions;
            const properties = settings.properties;
            let length = 0;
            if (typeof id !== "number") {
              stream.emit("error", new Error("Invalid messageId"));
              return false;
            } else
              length += 2;
            let propertiesData = null;
            if (version === 5) {
              propertiesData = getProperties(stream, properties);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            if (typeof subs === "object" && subs.length) {
              for (let i = 0; i < subs.length; i += 1) {
                const itopic = subs[i].topic;
                const iqos = subs[i].qos;
                if (typeof itopic !== "string") {
                  stream.emit("error", new Error("Invalid subscriptions - invalid topic"));
                  return false;
                }
                if (typeof iqos !== "number") {
                  stream.emit("error", new Error("Invalid subscriptions - invalid qos"));
                  return false;
                }
                if (version === 5) {
                  const nl = subs[i].nl || false;
                  if (typeof nl !== "boolean") {
                    stream.emit("error", new Error("Invalid subscriptions - invalid No Local"));
                    return false;
                  }
                  const rap = subs[i].rap || false;
                  if (typeof rap !== "boolean") {
                    stream.emit("error", new Error("Invalid subscriptions - invalid Retain as Published"));
                    return false;
                  }
                  const rh = subs[i].rh || 0;
                  if (typeof rh !== "number" || rh > 2) {
                    stream.emit("error", new Error("Invalid subscriptions - invalid Retain Handling"));
                    return false;
                  }
                }
                length += Buffer2.byteLength(itopic) + 2 + 1;
              }
            } else {
              stream.emit("error", new Error("Invalid subscriptions"));
              return false;
            }
            debug("subscribe: writing to stream: %o", protocol.SUBSCRIBE_HEADER);
            stream.write(protocol.SUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);
            writeVarByteInt(stream, length);
            writeNumber(stream, id);
            if (propertiesData !== null) {
              propertiesData.write();
            }
            let result = true;
            for (const sub of subs) {
              const jtopic = sub.topic;
              const jqos = sub.qos;
              const jnl = +sub.nl;
              const jrap = +sub.rap;
              const jrh = sub.rh;
              let joptions;
              writeString(stream, jtopic);
              joptions = protocol.SUBSCRIBE_OPTIONS_QOS[jqos];
              if (version === 5) {
                joptions |= jnl ? protocol.SUBSCRIBE_OPTIONS_NL : 0;
                joptions |= jrap ? protocol.SUBSCRIBE_OPTIONS_RAP : 0;
                joptions |= jrh ? protocol.SUBSCRIBE_OPTIONS_RH[jrh] : 0;
              }
              result = stream.write(Buffer2.from([joptions]));
            }
            return result;
          }
          function suback(packet, stream, opts) {
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const id = settings.messageId;
            const granted = settings.granted;
            const properties = settings.properties;
            let length = 0;
            if (typeof id !== "number") {
              stream.emit("error", new Error("Invalid messageId"));
              return false;
            } else
              length += 2;
            if (typeof granted === "object" && granted.length) {
              for (let i = 0; i < granted.length; i += 1) {
                if (typeof granted[i] !== "number") {
                  stream.emit("error", new Error("Invalid qos vector"));
                  return false;
                }
                length += 1;
              }
            } else {
              stream.emit("error", new Error("Invalid qos vector"));
              return false;
            }
            let propertiesData = null;
            if (version === 5) {
              propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            stream.write(protocol.SUBACK_HEADER);
            writeVarByteInt(stream, length);
            writeNumber(stream, id);
            if (propertiesData !== null) {
              propertiesData.write();
            }
            return stream.write(Buffer2.from(granted));
          }
          function unsubscribe(packet, stream, opts) {
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const id = settings.messageId;
            const dup = settings.dup ? protocol.DUP_MASK : 0;
            const unsubs = settings.unsubscriptions;
            const properties = settings.properties;
            let length = 0;
            if (typeof id !== "number") {
              stream.emit("error", new Error("Invalid messageId"));
              return false;
            } else {
              length += 2;
            }
            if (typeof unsubs === "object" && unsubs.length) {
              for (let i = 0; i < unsubs.length; i += 1) {
                if (typeof unsubs[i] !== "string") {
                  stream.emit("error", new Error("Invalid unsubscriptions"));
                  return false;
                }
                length += Buffer2.byteLength(unsubs[i]) + 2;
              }
            } else {
              stream.emit("error", new Error("Invalid unsubscriptions"));
              return false;
            }
            let propertiesData = null;
            if (version === 5) {
              propertiesData = getProperties(stream, properties);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            stream.write(protocol.UNSUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);
            writeVarByteInt(stream, length);
            writeNumber(stream, id);
            if (propertiesData !== null) {
              propertiesData.write();
            }
            let result = true;
            for (let j = 0; j < unsubs.length; j++) {
              result = writeString(stream, unsubs[j]);
            }
            return result;
          }
          function unsuback(packet, stream, opts) {
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const id = settings.messageId;
            const dup = settings.dup ? protocol.DUP_MASK : 0;
            const granted = settings.granted;
            const properties = settings.properties;
            const type = settings.cmd;
            const qos = 0;
            let length = 2;
            if (typeof id !== "number") {
              stream.emit("error", new Error("Invalid messageId"));
              return false;
            }
            if (version === 5) {
              if (typeof granted === "object" && granted.length) {
                for (let i = 0; i < granted.length; i += 1) {
                  if (typeof granted[i] !== "number") {
                    stream.emit("error", new Error("Invalid qos vector"));
                    return false;
                  }
                  length += 1;
                }
              } else {
                stream.emit("error", new Error("Invalid qos vector"));
                return false;
              }
            }
            let propertiesData = null;
            if (version === 5) {
              propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            stream.write(protocol.ACKS[type][qos][dup][0]);
            writeVarByteInt(stream, length);
            writeNumber(stream, id);
            if (propertiesData !== null) {
              propertiesData.write();
            }
            if (version === 5) {
              stream.write(Buffer2.from(granted));
            }
            return true;
          }
          function emptyPacket(packet, stream, opts) {
            return stream.write(protocol.EMPTY[packet.cmd]);
          }
          function disconnect2(packet, stream, opts) {
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const reasonCode = settings.reasonCode;
            const properties = settings.properties;
            let length = version === 5 ? 1 : 0;
            let propertiesData = null;
            if (version === 5) {
              propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
              if (!propertiesData) {
                return false;
              }
              length += propertiesData.length;
            }
            stream.write(Buffer2.from([protocol.codes.disconnect << 4]));
            writeVarByteInt(stream, length);
            if (version === 5) {
              stream.write(Buffer2.from([reasonCode]));
            }
            if (propertiesData !== null) {
              propertiesData.write();
            }
            return true;
          }
          function auth(packet, stream, opts) {
            const version = opts ? opts.protocolVersion : 4;
            const settings = packet || {};
            const reasonCode = settings.reasonCode;
            const properties = settings.properties;
            let length = version === 5 ? 1 : 0;
            if (version !== 5)
              stream.emit("error", new Error("Invalid mqtt version for auth packet"));
            const propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
            if (!propertiesData) {
              return false;
            }
            length += propertiesData.length;
            stream.write(Buffer2.from([protocol.codes.auth << 4]));
            writeVarByteInt(stream, length);
            stream.write(Buffer2.from([reasonCode]));
            if (propertiesData !== null) {
              propertiesData.write();
            }
            return true;
          }
          const varByteIntCache = {};
          function writeVarByteInt(stream, num) {
            if (num > protocol.VARBYTEINT_MAX) {
              stream.emit("error", new Error(`Invalid variable byte integer: ${num}`));
              return false;
            }
            let buffer = varByteIntCache[num];
            if (!buffer) {
              buffer = genBufVariableByteInt(num);
              if (num < 16384)
                varByteIntCache[num] = buffer;
            }
            debug("writeVarByteInt: writing to stream: %o", buffer);
            return stream.write(buffer);
          }
          function writeString(stream, string) {
            const strlen = Buffer2.byteLength(string);
            writeNumber(stream, strlen);
            debug("writeString: %s", string);
            return stream.write(string, "utf8");
          }
          function writeStringPair(stream, name, value) {
            writeString(stream, name);
            writeString(stream, value);
          }
          function writeNumberCached(stream, number) {
            debug("writeNumberCached: number: %d", number);
            debug("writeNumberCached: %o", numCache[number]);
            return stream.write(numCache[number]);
          }
          function writeNumberGenerated(stream, number) {
            const generatedNumber = generateNumber(number);
            debug("writeNumberGenerated: %o", generatedNumber);
            return stream.write(generatedNumber);
          }
          function write4ByteNumber(stream, number) {
            const generated4ByteBuffer = generate4ByteBuffer(number);
            debug("write4ByteNumber: %o", generated4ByteBuffer);
            return stream.write(generated4ByteBuffer);
          }
          function writeStringOrBuffer(stream, toWrite) {
            if (typeof toWrite === "string") {
              writeString(stream, toWrite);
            } else if (toWrite) {
              writeNumber(stream, toWrite.length);
              stream.write(toWrite);
            } else
              writeNumber(stream, 0);
          }
          function getProperties(stream, properties) {
            if (typeof properties !== "object" || properties.length != null) {
              return {
                length: 1,
                write() {
                  writeProperties(stream, {}, 0);
                }
              };
            }
            let propertiesLength = 0;
            function getLengthProperty(name, value) {
              const type = protocol.propertiesTypes[name];
              let length = 0;
              switch (type) {
                case "byte": {
                  if (typeof value !== "boolean") {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += 1 + 1;
                  break;
                }
                case "int8": {
                  if (typeof value !== "number" || value < 0 || value > 255) {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += 1 + 1;
                  break;
                }
                case "binary": {
                  if (value && value === null) {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += 1 + Buffer2.byteLength(value) + 2;
                  break;
                }
                case "int16": {
                  if (typeof value !== "number" || value < 0 || value > 65535) {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += 1 + 2;
                  break;
                }
                case "int32": {
                  if (typeof value !== "number" || value < 0 || value > 4294967295) {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += 1 + 4;
                  break;
                }
                case "var": {
                  if (typeof value !== "number" || value < 0 || value > 268435455) {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += 1 + Buffer2.byteLength(genBufVariableByteInt(value));
                  break;
                }
                case "string": {
                  if (typeof value !== "string") {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += 1 + 2 + Buffer2.byteLength(value.toString());
                  break;
                }
                case "pair": {
                  if (typeof value !== "object") {
                    stream.emit("error", new Error(`Invalid ${name}: ${value}`));
                    return false;
                  }
                  length += Object.getOwnPropertyNames(value).reduce((result, name2) => {
                    const currentValue = value[name2];
                    if (Array.isArray(currentValue)) {
                      result += currentValue.reduce((currentLength, value2) => {
                        currentLength += 1 + 2 + Buffer2.byteLength(name2.toString()) + 2 + Buffer2.byteLength(value2.toString());
                        return currentLength;
                      }, 0);
                    } else {
                      result += 1 + 2 + Buffer2.byteLength(name2.toString()) + 2 + Buffer2.byteLength(value[name2].toString());
                    }
                    return result;
                  }, 0);
                  break;
                }
                default: {
                  stream.emit("error", new Error(`Invalid property ${name}: ${value}`));
                  return false;
                }
              }
              return length;
            }
            if (properties) {
              for (const propName in properties) {
                let propLength = 0;
                let propValueLength = 0;
                const propValue = properties[propName];
                if (Array.isArray(propValue)) {
                  for (let valueIndex = 0; valueIndex < propValue.length; valueIndex++) {
                    propValueLength = getLengthProperty(propName, propValue[valueIndex]);
                    if (!propValueLength) {
                      return false;
                    }
                    propLength += propValueLength;
                  }
                } else {
                  propValueLength = getLengthProperty(propName, propValue);
                  if (!propValueLength) {
                    return false;
                  }
                  propLength = propValueLength;
                }
                if (!propLength)
                  return false;
                propertiesLength += propLength;
              }
            }
            const propertiesLengthLength = Buffer2.byteLength(genBufVariableByteInt(propertiesLength));
            return {
              length: propertiesLengthLength + propertiesLength,
              write() {
                writeProperties(stream, properties, propertiesLength);
              }
            };
          }
          function getPropertiesByMaximumPacketSize(stream, properties, opts, length) {
            const mayEmptyProps = ["reasonString", "userProperties"];
            const maximumPacketSize = opts && opts.properties && opts.properties.maximumPacketSize ? opts.properties.maximumPacketSize : 0;
            let propertiesData = getProperties(stream, properties);
            if (maximumPacketSize) {
              while (length + propertiesData.length > maximumPacketSize) {
                const currentMayEmptyProp = mayEmptyProps.shift();
                if (currentMayEmptyProp && properties[currentMayEmptyProp]) {
                  delete properties[currentMayEmptyProp];
                  propertiesData = getProperties(stream, properties);
                } else {
                  return false;
                }
              }
            }
            return propertiesData;
          }
          function writeProperty(stream, propName, value) {
            const type = protocol.propertiesTypes[propName];
            switch (type) {
              case "byte": {
                stream.write(Buffer2.from([protocol.properties[propName]]));
                stream.write(Buffer2.from([+value]));
                break;
              }
              case "int8": {
                stream.write(Buffer2.from([protocol.properties[propName]]));
                stream.write(Buffer2.from([value]));
                break;
              }
              case "binary": {
                stream.write(Buffer2.from([protocol.properties[propName]]));
                writeStringOrBuffer(stream, value);
                break;
              }
              case "int16": {
                stream.write(Buffer2.from([protocol.properties[propName]]));
                writeNumber(stream, value);
                break;
              }
              case "int32": {
                stream.write(Buffer2.from([protocol.properties[propName]]));
                write4ByteNumber(stream, value);
                break;
              }
              case "var": {
                stream.write(Buffer2.from([protocol.properties[propName]]));
                writeVarByteInt(stream, value);
                break;
              }
              case "string": {
                stream.write(Buffer2.from([protocol.properties[propName]]));
                writeString(stream, value);
                break;
              }
              case "pair": {
                Object.getOwnPropertyNames(value).forEach((name) => {
                  const currentValue = value[name];
                  if (Array.isArray(currentValue)) {
                    currentValue.forEach((value2) => {
                      stream.write(Buffer2.from([protocol.properties[propName]]));
                      writeStringPair(stream, name.toString(), value2.toString());
                    });
                  } else {
                    stream.write(Buffer2.from([protocol.properties[propName]]));
                    writeStringPair(stream, name.toString(), currentValue.toString());
                  }
                });
                break;
              }
              default: {
                stream.emit("error", new Error(`Invalid property ${propName} value: ${value}`));
                return false;
              }
            }
          }
          function writeProperties(stream, properties, propertiesLength) {
            writeVarByteInt(stream, propertiesLength);
            for (const propName in properties) {
              if (Object.prototype.hasOwnProperty.call(properties, propName) && properties[propName] !== null) {
                const value = properties[propName];
                if (Array.isArray(value)) {
                  for (let valueIndex = 0; valueIndex < value.length; valueIndex++) {
                    writeProperty(stream, propName, value[valueIndex]);
                  }
                } else {
                  writeProperty(stream, propName, value);
                }
              }
            }
          }
          function byteLength(bufOrString) {
            if (!bufOrString)
              return 0;
            else if (bufOrString instanceof Buffer2)
              return bufOrString.length;
            else
              return Buffer2.byteLength(bufOrString);
          }
          function isStringOrBuffer(field) {
            return typeof field === "string" || field instanceof Buffer2;
          }
          module2.exports = generate;
        }).call(this);
      }).call(this, require2("buffer").Buffer);
    }, { "./constants": 38, "./numbers": 41, "buffer": 17, "debug": 18, "process-nextick-args": 49 }], 45: [function(require2, module2, exports2) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module2.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }, {}], 46: [function(require2, module2, exports2) {
      const NumberAllocator = require2("./lib/number-allocator.js");
      module2.exports.NumberAllocator = NumberAllocator;
    }, { "./lib/number-allocator.js": 47 }], 47: [function(require2, module2, exports2) {
      const SortedSet = require2("js-sdsl").Set;
      const debugTrace = require2("debug")("number-allocator:trace");
      const debugError = require2("debug")("number-allocator:error");
      function Interval(low, high) {
        this.low = low;
        this.high = high;
      }
      Interval.prototype.equals = function(other) {
        return this.low === other.low && this.high === other.high;
      };
      Interval.prototype.compare = function(other) {
        if (this.low < other.low && this.high < other.low)
          return -1;
        if (other.low < this.low && other.high < this.low)
          return 1;
        return 0;
      };
      function NumberAllocator(min, max) {
        if (!(this instanceof NumberAllocator)) {
          return new NumberAllocator(min, max);
        }
        this.min = min;
        this.max = max;
        this.ss = new SortedSet([], (lhs, rhs) => {
          return lhs.compare(rhs);
        });
        debugTrace("Create");
        this.clear();
      }
      NumberAllocator.prototype.firstVacant = function() {
        if (this.ss.size() === 0)
          return null;
        return this.ss.front().low;
      };
      NumberAllocator.prototype.alloc = function() {
        if (this.ss.size() === 0) {
          debugTrace("alloc():empty");
          return null;
        }
        const it = this.ss.front();
        const num = it.low;
        if (num + 1 <= it.high) {
          ++it.low;
        } else {
          this.ss.eraseElementByPos(0);
        }
        debugTrace("alloc():" + num);
        return num;
      };
      NumberAllocator.prototype.use = function(num) {
        const key = new Interval(num, num);
        const it = this.ss.lowerBound(key);
        if (it) {
          if (it.equals(key)) {
            this.ss.eraseElementByValue(it);
            debugTrace("use():" + num);
            return true;
          }
          if (it.low > num)
            return false;
          if (it.low === num) {
            ++it.low;
            debugTrace("use():" + num);
            return true;
          }
          if (it.high === num) {
            --it.high;
            debugTrace("use():" + num);
            return true;
          }
          const low = it.low;
          it.low = num + 1;
          this.ss.insert(new Interval(low, num - 1));
          debugTrace("use():" + num);
          return true;
        }
        debugTrace("use():failed");
        return false;
      };
      NumberAllocator.prototype.free = function(num) {
        if (num < this.min || num > this.max) {
          debugError("free():" + num + " is out of range");
          return;
        }
        const key = new Interval(num, num);
        const it = this.ss.lowerBound(key);
        if (it) {
          if (it.low <= num && num <= it.high) {
            debugError("free():" + num + " has already been vacant");
            return;
          }
          if (it === this.ss.front()) {
            if (num + 1 === it.low) {
              --it.low;
            } else {
              this.ss.insert(key);
            }
          } else {
            const itl = this.ss.reverseLowerBound(key);
            if (itl.high + 1 === num) {
              if (num + 1 === it.low) {
                this.ss.eraseElementByValue(itl);
                it.low = itl.low;
              } else {
                itl.high = num;
              }
            } else {
              if (num + 1 === it.low) {
                it.low = num;
              } else {
                this.ss.insert(key);
              }
            }
          }
        } else {
          if (it === this.ss.front()) {
            this.ss.insert(key);
            return;
          }
          const itl = this.ss.reverseLowerBound(key);
          if (itl.high + 1 === num) {
            itl.high = num;
          } else {
            this.ss.insert(key);
          }
        }
        debugTrace("free():" + num);
      };
      NumberAllocator.prototype.clear = function() {
        debugTrace("clear()");
        this.ss.clear();
        this.ss.insert(new Interval(this.min, this.max));
      };
      NumberAllocator.prototype.intervalCount = function() {
        return this.ss.size();
      };
      NumberAllocator.prototype.dump = function() {
        console.log("length:" + this.ss.size());
        for (const element of this.ss) {
          console.log(element);
        }
      };
      module2.exports = NumberAllocator;
    }, { "debug": 18, "js-sdsl": 36 }], 48: [function(require2, module2, exports2) {
      var wrappy = require2("wrappy");
      module2.exports = wrappy(once);
      module2.exports.strict = wrappy(onceStrict);
      once.proto = once(function() {
        Object.defineProperty(Function.prototype, "once", {
          value: function() {
            return once(this);
          },
          configurable: true
        });
        Object.defineProperty(Function.prototype, "onceStrict", {
          value: function() {
            return onceStrict(this);
          },
          configurable: true
        });
      });
      function once(fn) {
        var f = function() {
          if (f.called)
            return f.value;
          f.called = true;
          return f.value = fn.apply(this, arguments);
        };
        f.called = false;
        return f;
      }
      function onceStrict(fn) {
        var f = function() {
          if (f.called)
            throw new Error(f.onceError);
          f.called = true;
          return f.value = fn.apply(this, arguments);
        };
        var name = fn.name || "Function wrapped with `once`";
        f.onceError = name + " shouldn't be called more than once";
        f.called = false;
        return f;
      }
    }, { "wrappy": 79 }], 49: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          if (typeof process === "undefined" || !process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.indexOf("v1.8.") !== 0) {
            module2.exports = { nextTick };
          } else {
            module2.exports = process;
          }
          function nextTick(fn, arg1, arg2, arg3) {
            if (typeof fn !== "function") {
              throw new TypeError('"callback" argument must be a function');
            }
            var len = arguments.length;
            var args, i;
            switch (len) {
              case 0:
              case 1:
                return process.nextTick(fn);
              case 2:
                return process.nextTick(function afterTickOne() {
                  fn.call(null, arg1);
                });
              case 3:
                return process.nextTick(function afterTickTwo() {
                  fn.call(null, arg1, arg2);
                });
              case 4:
                return process.nextTick(function afterTickThree() {
                  fn.call(null, arg1, arg2, arg3);
                });
              default:
                args = new Array(len - 1);
                i = 0;
                while (i < args.length) {
                  args[i++] = arguments[i];
                }
                return process.nextTick(function afterTick() {
                  fn.apply(null, args);
                });
            }
          }
        }).call(this);
      }).call(this, require2("_process"));
    }, { "_process": 50 }], 50: [function(require2, module2, exports2) {
      var process = module2.exports = {};
      var cachedSetTimeout;
      var cachedClearTimeout;
      function defaultSetTimout() {
        throw new Error("setTimeout has not been defined");
      }
      function defaultClearTimeout() {
        throw new Error("clearTimeout has not been defined");
      }
      (function() {
        try {
          if (typeof setTimeout === "function") {
            cachedSetTimeout = setTimeout;
          } else {
            cachedSetTimeout = defaultSetTimout;
          }
        } catch (e) {
          cachedSetTimeout = defaultSetTimout;
        }
        try {
          if (typeof clearTimeout === "function") {
            cachedClearTimeout = clearTimeout;
          } else {
            cachedClearTimeout = defaultClearTimeout;
          }
        } catch (e) {
          cachedClearTimeout = defaultClearTimeout;
        }
      })();
      function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
          return setTimeout(fun, 0);
        }
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
        }
        try {
          return cachedSetTimeout(fun, 0);
        } catch (e) {
          try {
            return cachedSetTimeout.call(null, fun, 0);
          } catch (e2) {
            return cachedSetTimeout.call(this, fun, 0);
          }
        }
      }
      function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
          return clearTimeout(marker);
        }
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
        }
        try {
          return cachedClearTimeout(marker);
        } catch (e) {
          try {
            return cachedClearTimeout.call(null, marker);
          } catch (e2) {
            return cachedClearTimeout.call(this, marker);
          }
        }
      }
      var queue = [];
      var draining = false;
      var currentQueue;
      var queueIndex = -1;
      function cleanUpNextTick() {
        if (!draining || !currentQueue) {
          return;
        }
        draining = false;
        if (currentQueue.length) {
          queue = currentQueue.concat(queue);
        } else {
          queueIndex = -1;
        }
        if (queue.length) {
          drainQueue();
        }
      }
      function drainQueue() {
        if (draining) {
          return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;
        var len = queue.length;
        while (len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
            if (currentQueue) {
              currentQueue[queueIndex].run();
            }
          }
          queueIndex = -1;
          len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
      }
      process.nextTick = function(fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
          }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
          runTimeout(drainQueue);
        }
      };
      function Item(fun, array) {
        this.fun = fun;
        this.array = array;
      }
      Item.prototype.run = function() {
        this.fun.apply(null, this.array);
      };
      process.title = "browser";
      process.browser = true;
      process.env = {};
      process.argv = [];
      process.version = "";
      process.versions = {};
      function noop() {
      }
      process.on = noop;
      process.addListener = noop;
      process.once = noop;
      process.off = noop;
      process.removeListener = noop;
      process.removeAllListeners = noop;
      process.emit = noop;
      process.prependListener = noop;
      process.prependOnceListener = noop;
      process.listeners = function(name) {
        return [];
      };
      process.binding = function(name) {
        throw new Error("process.binding is not supported");
      };
      process.cwd = function() {
        return "/";
      };
      process.chdir = function(dir) {
        throw new Error("process.chdir is not supported");
      };
      process.umask = function() {
        return 0;
      };
    }, {}], 51: [function(require2, module2, exports2) {
      (function(global2) {
        (function() {
          (function(root) {
            var freeExports = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
            var freeModule = typeof module2 == "object" && module2 && !module2.nodeType && module2;
            var freeGlobal = typeof global2 == "object" && global2;
            if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) {
              root = freeGlobal;
            }
            var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
              "overflow": "Overflow: input needs wider integers to process",
              "not-basic": "Illegal input >= 0x80 (not a basic code point)",
              "invalid-input": "Invalid input"
            }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
            function error(type) {
              throw new RangeError(errors[type]);
            }
            function map(array, fn) {
              var length = array.length;
              var result = [];
              while (length--) {
                result[length] = fn(array[length]);
              }
              return result;
            }
            function mapDomain(string, fn) {
              var parts = string.split("@");
              var result = "";
              if (parts.length > 1) {
                result = parts[0] + "@";
                string = parts[1];
              }
              string = string.replace(regexSeparators, ".");
              var labels = string.split(".");
              var encoded = map(labels, fn).join(".");
              return result + encoded;
            }
            function ucs2decode(string) {
              var output = [], counter = 0, length = string.length, value, extra;
              while (counter < length) {
                value = string.charCodeAt(counter++);
                if (value >= 55296 && value <= 56319 && counter < length) {
                  extra = string.charCodeAt(counter++);
                  if ((extra & 64512) == 56320) {
                    output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
                  } else {
                    output.push(value);
                    counter--;
                  }
                } else {
                  output.push(value);
                }
              }
              return output;
            }
            function ucs2encode(array) {
              return map(array, function(value) {
                var output = "";
                if (value > 65535) {
                  value -= 65536;
                  output += stringFromCharCode(value >>> 10 & 1023 | 55296);
                  value = 56320 | value & 1023;
                }
                output += stringFromCharCode(value);
                return output;
              }).join("");
            }
            function basicToDigit(codePoint) {
              if (codePoint - 48 < 10) {
                return codePoint - 22;
              }
              if (codePoint - 65 < 26) {
                return codePoint - 65;
              }
              if (codePoint - 97 < 26) {
                return codePoint - 97;
              }
              return base;
            }
            function digitToBasic(digit, flag) {
              return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
            }
            function adapt(delta, numPoints, firstTime) {
              var k = 0;
              delta = firstTime ? floor(delta / damp) : delta >> 1;
              delta += floor(delta / numPoints);
              for (; delta > baseMinusTMin * tMax >> 1; k += base) {
                delta = floor(delta / baseMinusTMin);
              }
              return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
            }
            function decode(input) {
              var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
              basic = input.lastIndexOf(delimiter);
              if (basic < 0) {
                basic = 0;
              }
              for (j = 0; j < basic; ++j) {
                if (input.charCodeAt(j) >= 128) {
                  error("not-basic");
                }
                output.push(input.charCodeAt(j));
              }
              for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
                for (oldi = i, w = 1, k = base; ; k += base) {
                  if (index >= inputLength) {
                    error("invalid-input");
                  }
                  digit = basicToDigit(input.charCodeAt(index++));
                  if (digit >= base || digit > floor((maxInt - i) / w)) {
                    error("overflow");
                  }
                  i += digit * w;
                  t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                  if (digit < t) {
                    break;
                  }
                  baseMinusT = base - t;
                  if (w > floor(maxInt / baseMinusT)) {
                    error("overflow");
                  }
                  w *= baseMinusT;
                }
                out = output.length + 1;
                bias = adapt(i - oldi, out, oldi == 0);
                if (floor(i / out) > maxInt - n) {
                  error("overflow");
                }
                n += floor(i / out);
                i %= out;
                output.splice(i++, 0, n);
              }
              return ucs2encode(output);
            }
            function encode(input) {
              var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
              input = ucs2decode(input);
              inputLength = input.length;
              n = initialN;
              delta = 0;
              bias = initialBias;
              for (j = 0; j < inputLength; ++j) {
                currentValue = input[j];
                if (currentValue < 128) {
                  output.push(stringFromCharCode(currentValue));
                }
              }
              handledCPCount = basicLength = output.length;
              if (basicLength) {
                output.push(delimiter);
              }
              while (handledCPCount < inputLength) {
                for (m = maxInt, j = 0; j < inputLength; ++j) {
                  currentValue = input[j];
                  if (currentValue >= n && currentValue < m) {
                    m = currentValue;
                  }
                }
                handledCPCountPlusOne = handledCPCount + 1;
                if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
                  error("overflow");
                }
                delta += (m - n) * handledCPCountPlusOne;
                n = m;
                for (j = 0; j < inputLength; ++j) {
                  currentValue = input[j];
                  if (currentValue < n && ++delta > maxInt) {
                    error("overflow");
                  }
                  if (currentValue == n) {
                    for (q = delta, k = base; ; k += base) {
                      t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                      if (q < t) {
                        break;
                      }
                      qMinusT = q - t;
                      baseMinusT = base - t;
                      output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
                      q = floor(qMinusT / baseMinusT);
                    }
                    output.push(stringFromCharCode(digitToBasic(q, 0)));
                    bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
                    delta = 0;
                    ++handledCPCount;
                  }
                }
                ++delta;
                ++n;
              }
              return output.join("");
            }
            function toUnicode(input) {
              return mapDomain(input, function(string) {
                return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
              });
            }
            function toASCII(input) {
              return mapDomain(input, function(string) {
                return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
              });
            }
            punycode = {
              "version": "1.4.1",
              "ucs2": {
                "decode": ucs2decode,
                "encode": ucs2encode
              },
              "decode": decode,
              "encode": encode,
              "toASCII": toASCII,
              "toUnicode": toUnicode
            };
            if (freeExports && freeModule) {
              if (module2.exports == freeExports) {
                freeModule.exports = punycode;
              } else {
                for (key in punycode) {
                  punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
                }
              }
            } else {
              root.punycode = punycode;
            }
          })(this);
        }).call(this);
      }).call(this, typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {}], 52: [function(require2, module2, exports2) {
      function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
      }
      module2.exports = function(qs, sep, eq2, options) {
        sep = sep || "&";
        eq2 = eq2 || "=";
        var obj = {};
        if (typeof qs !== "string" || qs.length === 0) {
          return obj;
        }
        var regexp = /\+/g;
        qs = qs.split(sep);
        var maxKeys = 1e3;
        if (options && typeof options.maxKeys === "number") {
          maxKeys = options.maxKeys;
        }
        var len = qs.length;
        if (maxKeys > 0 && len > maxKeys) {
          len = maxKeys;
        }
        for (var i = 0; i < len; ++i) {
          var x = qs[i].replace(regexp, "%20"), idx = x.indexOf(eq2), kstr, vstr, k, v;
          if (idx >= 0) {
            kstr = x.substr(0, idx);
            vstr = x.substr(idx + 1);
          } else {
            kstr = x;
            vstr = "";
          }
          k = decodeURIComponent(kstr);
          v = decodeURIComponent(vstr);
          if (!hasOwnProperty(obj, k)) {
            obj[k] = v;
          } else if (isArray(obj[k])) {
            obj[k].push(v);
          } else {
            obj[k] = [obj[k], v];
          }
        }
        return obj;
      };
      var isArray = Array.isArray || function(xs) {
        return Object.prototype.toString.call(xs) === "[object Array]";
      };
    }, {}], 53: [function(require2, module2, exports2) {
      var stringifyPrimitive = function(v) {
        switch (typeof v) {
          case "string":
            return v;
          case "boolean":
            return v ? "true" : "false";
          case "number":
            return isFinite(v) ? v : "";
          default:
            return "";
        }
      };
      module2.exports = function(obj, sep, eq2, name) {
        sep = sep || "&";
        eq2 = eq2 || "=";
        if (obj === null) {
          obj = void 0;
        }
        if (typeof obj === "object") {
          return map(objectKeys(obj), function(k) {
            var ks = encodeURIComponent(stringifyPrimitive(k)) + eq2;
            if (isArray(obj[k])) {
              return map(obj[k], function(v) {
                return ks + encodeURIComponent(stringifyPrimitive(v));
              }).join(sep);
            } else {
              return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
            }
          }).join(sep);
        }
        if (!name)
          return "";
        return encodeURIComponent(stringifyPrimitive(name)) + eq2 + encodeURIComponent(stringifyPrimitive(obj));
      };
      var isArray = Array.isArray || function(xs) {
        return Object.prototype.toString.call(xs) === "[object Array]";
      };
      function map(xs, f) {
        if (xs.map)
          return xs.map(f);
        var res = [];
        for (var i = 0; i < xs.length; i++) {
          res.push(f(xs[i], i));
        }
        return res;
      }
      var objectKeys = Object.keys || function(obj) {
        var res = [];
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key))
            res.push(key);
        }
        return res;
      };
    }, {}], 54: [function(require2, module2, exports2) {
      exports2.decode = exports2.parse = require2("./decode");
      exports2.encode = exports2.stringify = require2("./encode");
    }, { "./decode": 52, "./encode": 53 }], 55: [function(require2, module2, exports2) {
      function _inheritsLoose(subClass, superClass) {
        subClass.prototype = Object.create(superClass.prototype);
        subClass.prototype.constructor = subClass;
        subClass.__proto__ = superClass;
      }
      var codes = {};
      function createErrorType(code, message, Base) {
        if (!Base) {
          Base = Error;
        }
        function getMessage(arg1, arg2, arg3) {
          if (typeof message === "string") {
            return message;
          } else {
            return message(arg1, arg2, arg3);
          }
        }
        var NodeError = /* @__PURE__ */ function(_Base) {
          _inheritsLoose(NodeError2, _Base);
          function NodeError2(arg1, arg2, arg3) {
            return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
          }
          return NodeError2;
        }(Base);
        NodeError.prototype.name = Base.name;
        NodeError.prototype.code = code;
        codes[code] = NodeError;
      }
      function oneOf(expected, thing) {
        if (Array.isArray(expected)) {
          var len = expected.length;
          expected = expected.map(function(i) {
            return String(i);
          });
          if (len > 2) {
            return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(", "), ", or ") + expected[len - 1];
          } else if (len === 2) {
            return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
          } else {
            return "of ".concat(thing, " ").concat(expected[0]);
          }
        } else {
          return "of ".concat(thing, " ").concat(String(expected));
        }
      }
      function startsWith(str, search, pos) {
        return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
      }
      function endsWith(str, search, this_len) {
        if (this_len === void 0 || this_len > str.length) {
          this_len = str.length;
        }
        return str.substring(this_len - search.length, this_len) === search;
      }
      function includes(str, search, start) {
        if (typeof start !== "number") {
          start = 0;
        }
        if (start + search.length > str.length) {
          return false;
        } else {
          return str.indexOf(search, start) !== -1;
        }
      }
      createErrorType("ERR_INVALID_OPT_VALUE", function(name, value) {
        return 'The value "' + value + '" is invalid for option "' + name + '"';
      }, TypeError);
      createErrorType("ERR_INVALID_ARG_TYPE", function(name, expected, actual) {
        var determiner;
        if (typeof expected === "string" && startsWith(expected, "not ")) {
          determiner = "must not be";
          expected = expected.replace(/^not /, "");
        } else {
          determiner = "must be";
        }
        var msg;
        if (endsWith(name, " argument")) {
          msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
        } else {
          var type = includes(name, ".") ? "property" : "argument";
          msg = 'The "'.concat(name, '" ').concat(type, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
        }
        msg += ". Received type ".concat(typeof actual);
        return msg;
      }, TypeError);
      createErrorType("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF");
      createErrorType("ERR_METHOD_NOT_IMPLEMENTED", function(name) {
        return "The " + name + " method is not implemented";
      });
      createErrorType("ERR_STREAM_PREMATURE_CLOSE", "Premature close");
      createErrorType("ERR_STREAM_DESTROYED", function(name) {
        return "Cannot call " + name + " after a stream was destroyed";
      });
      createErrorType("ERR_MULTIPLE_CALLBACK", "Callback called multiple times");
      createErrorType("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable");
      createErrorType("ERR_STREAM_WRITE_AFTER_END", "write after end");
      createErrorType("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
      createErrorType("ERR_UNKNOWN_ENCODING", function(arg) {
        return "Unknown encoding: " + arg;
      }, TypeError);
      createErrorType("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event");
      module2.exports.codes = codes;
    }, {}], 56: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          var objectKeys = Object.keys || function(obj) {
            var keys2 = [];
            for (var key in obj) {
              keys2.push(key);
            }
            return keys2;
          };
          module2.exports = Duplex;
          var Readable = require2("./_stream_readable");
          var Writable = require2("./_stream_writable");
          require2("inherits")(Duplex, Readable);
          {
            var keys = objectKeys(Writable.prototype);
            for (var v = 0; v < keys.length; v++) {
              var method = keys[v];
              if (!Duplex.prototype[method])
                Duplex.prototype[method] = Writable.prototype[method];
            }
          }
          function Duplex(options) {
            if (!(this instanceof Duplex))
              return new Duplex(options);
            Readable.call(this, options);
            Writable.call(this, options);
            this.allowHalfOpen = true;
            if (options) {
              if (options.readable === false)
                this.readable = false;
              if (options.writable === false)
                this.writable = false;
              if (options.allowHalfOpen === false) {
                this.allowHalfOpen = false;
                this.once("end", onend);
              }
            }
          }
          Object.defineProperty(Duplex.prototype, "writableHighWaterMark", {
            enumerable: false,
            get: function get() {
              return this._writableState.highWaterMark;
            }
          });
          Object.defineProperty(Duplex.prototype, "writableBuffer", {
            enumerable: false,
            get: function get() {
              return this._writableState && this._writableState.getBuffer();
            }
          });
          Object.defineProperty(Duplex.prototype, "writableLength", {
            enumerable: false,
            get: function get() {
              return this._writableState.length;
            }
          });
          function onend() {
            if (this._writableState.ended)
              return;
            process.nextTick(onEndNT, this);
          }
          function onEndNT(self2) {
            self2.end();
          }
          Object.defineProperty(Duplex.prototype, "destroyed", {
            enumerable: false,
            get: function get() {
              if (this._readableState === void 0 || this._writableState === void 0) {
                return false;
              }
              return this._readableState.destroyed && this._writableState.destroyed;
            },
            set: function set(value) {
              if (this._readableState === void 0 || this._writableState === void 0) {
                return;
              }
              this._readableState.destroyed = value;
              this._writableState.destroyed = value;
            }
          });
        }).call(this);
      }).call(this, require2("_process"));
    }, { "./_stream_readable": 58, "./_stream_writable": 60, "_process": 50, "inherits": 24 }], 57: [function(require2, module2, exports2) {
      module2.exports = PassThrough;
      var Transform = require2("./_stream_transform");
      require2("inherits")(PassThrough, Transform);
      function PassThrough(options) {
        if (!(this instanceof PassThrough))
          return new PassThrough(options);
        Transform.call(this, options);
      }
      PassThrough.prototype._transform = function(chunk, encoding, cb) {
        cb(null, chunk);
      };
    }, { "./_stream_transform": 59, "inherits": 24 }], 58: [function(require2, module2, exports2) {
      (function(process, global2) {
        (function() {
          module2.exports = Readable;
          var Duplex;
          Readable.ReadableState = ReadableState;
          require2("events").EventEmitter;
          var EElistenerCount = function EElistenerCount2(emitter, type) {
            return emitter.listeners(type).length;
          };
          var Stream = require2("./internal/streams/stream");
          var Buffer2 = require2("buffer").Buffer;
          var OurUint8Array = global2.Uint8Array || function() {
          };
          function _uint8ArrayToBuffer(chunk) {
            return Buffer2.from(chunk);
          }
          function _isUint8Array(obj) {
            return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
          }
          var debugUtil = require2("util");
          var debug;
          if (debugUtil && debugUtil.debuglog) {
            debug = debugUtil.debuglog("stream");
          } else {
            debug = function debug2() {
            };
          }
          var BufferList = require2("./internal/streams/buffer_list");
          var destroyImpl = require2("./internal/streams/destroy");
          var _require = require2("./internal/streams/state"), getHighWaterMark = _require.getHighWaterMark;
          var _require$codes = require2("../errors").codes, ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE, ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF, ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED, ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;
          var StringDecoder;
          var createReadableStreamAsyncIterator;
          var from;
          require2("inherits")(Readable, Stream);
          var errorOrDestroy = destroyImpl.errorOrDestroy;
          var kProxyEvents = ["error", "close", "destroy", "pause", "resume"];
          function prependListener(emitter, event, fn) {
            if (typeof emitter.prependListener === "function")
              return emitter.prependListener(event, fn);
            if (!emitter._events || !emitter._events[event])
              emitter.on(event, fn);
            else if (Array.isArray(emitter._events[event]))
              emitter._events[event].unshift(fn);
            else
              emitter._events[event] = [fn, emitter._events[event]];
          }
          function ReadableState(options, stream, isDuplex) {
            Duplex = Duplex || require2("./_stream_duplex");
            options = options || {};
            if (typeof isDuplex !== "boolean")
              isDuplex = stream instanceof Duplex;
            this.objectMode = !!options.objectMode;
            if (isDuplex)
              this.objectMode = this.objectMode || !!options.readableObjectMode;
            this.highWaterMark = getHighWaterMark(this, options, "readableHighWaterMark", isDuplex);
            this.buffer = new BufferList();
            this.length = 0;
            this.pipes = null;
            this.pipesCount = 0;
            this.flowing = null;
            this.ended = false;
            this.endEmitted = false;
            this.reading = false;
            this.sync = true;
            this.needReadable = false;
            this.emittedReadable = false;
            this.readableListening = false;
            this.resumeScheduled = false;
            this.paused = true;
            this.emitClose = options.emitClose !== false;
            this.autoDestroy = !!options.autoDestroy;
            this.destroyed = false;
            this.defaultEncoding = options.defaultEncoding || "utf8";
            this.awaitDrain = 0;
            this.readingMore = false;
            this.decoder = null;
            this.encoding = null;
            if (options.encoding) {
              if (!StringDecoder)
                StringDecoder = require2("string_decoder/").StringDecoder;
              this.decoder = new StringDecoder(options.encoding);
              this.encoding = options.encoding;
            }
          }
          function Readable(options) {
            Duplex = Duplex || require2("./_stream_duplex");
            if (!(this instanceof Readable))
              return new Readable(options);
            var isDuplex = this instanceof Duplex;
            this._readableState = new ReadableState(options, this, isDuplex);
            this.readable = true;
            if (options) {
              if (typeof options.read === "function")
                this._read = options.read;
              if (typeof options.destroy === "function")
                this._destroy = options.destroy;
            }
            Stream.call(this);
          }
          Object.defineProperty(Readable.prototype, "destroyed", {
            enumerable: false,
            get: function get() {
              if (this._readableState === void 0) {
                return false;
              }
              return this._readableState.destroyed;
            },
            set: function set(value) {
              if (!this._readableState) {
                return;
              }
              this._readableState.destroyed = value;
            }
          });
          Readable.prototype.destroy = destroyImpl.destroy;
          Readable.prototype._undestroy = destroyImpl.undestroy;
          Readable.prototype._destroy = function(err, cb) {
            cb(err);
          };
          Readable.prototype.push = function(chunk, encoding) {
            var state = this._readableState;
            var skipChunkCheck;
            if (!state.objectMode) {
              if (typeof chunk === "string") {
                encoding = encoding || state.defaultEncoding;
                if (encoding !== state.encoding) {
                  chunk = Buffer2.from(chunk, encoding);
                  encoding = "";
                }
                skipChunkCheck = true;
              }
            } else {
              skipChunkCheck = true;
            }
            return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
          };
          Readable.prototype.unshift = function(chunk) {
            return readableAddChunk(this, chunk, null, true, false);
          };
          function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
            debug("readableAddChunk", chunk);
            var state = stream._readableState;
            if (chunk === null) {
              state.reading = false;
              onEofChunk(stream, state);
            } else {
              var er;
              if (!skipChunkCheck)
                er = chunkInvalid(state, chunk);
              if (er) {
                errorOrDestroy(stream, er);
              } else if (state.objectMode || chunk && chunk.length > 0) {
                if (typeof chunk !== "string" && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer2.prototype) {
                  chunk = _uint8ArrayToBuffer(chunk);
                }
                if (addToFront) {
                  if (state.endEmitted)
                    errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
                  else
                    addChunk(stream, state, chunk, true);
                } else if (state.ended) {
                  errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
                } else if (state.destroyed) {
                  return false;
                } else {
                  state.reading = false;
                  if (state.decoder && !encoding) {
                    chunk = state.decoder.write(chunk);
                    if (state.objectMode || chunk.length !== 0)
                      addChunk(stream, state, chunk, false);
                    else
                      maybeReadMore(stream, state);
                  } else {
                    addChunk(stream, state, chunk, false);
                  }
                }
              } else if (!addToFront) {
                state.reading = false;
                maybeReadMore(stream, state);
              }
            }
            return !state.ended && (state.length < state.highWaterMark || state.length === 0);
          }
          function addChunk(stream, state, chunk, addToFront) {
            if (state.flowing && state.length === 0 && !state.sync) {
              state.awaitDrain = 0;
              stream.emit("data", chunk);
            } else {
              state.length += state.objectMode ? 1 : chunk.length;
              if (addToFront)
                state.buffer.unshift(chunk);
              else
                state.buffer.push(chunk);
              if (state.needReadable)
                emitReadable(stream);
            }
            maybeReadMore(stream, state);
          }
          function chunkInvalid(state, chunk) {
            var er;
            if (!_isUint8Array(chunk) && typeof chunk !== "string" && chunk !== void 0 && !state.objectMode) {
              er = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
            }
            return er;
          }
          Readable.prototype.isPaused = function() {
            return this._readableState.flowing === false;
          };
          Readable.prototype.setEncoding = function(enc) {
            if (!StringDecoder)
              StringDecoder = require2("string_decoder/").StringDecoder;
            var decoder = new StringDecoder(enc);
            this._readableState.decoder = decoder;
            this._readableState.encoding = this._readableState.decoder.encoding;
            var p = this._readableState.buffer.head;
            var content = "";
            while (p !== null) {
              content += decoder.write(p.data);
              p = p.next;
            }
            this._readableState.buffer.clear();
            if (content !== "")
              this._readableState.buffer.push(content);
            this._readableState.length = content.length;
            return this;
          };
          var MAX_HWM = 1073741824;
          function computeNewHighWaterMark(n) {
            if (n >= MAX_HWM) {
              n = MAX_HWM;
            } else {
              n--;
              n |= n >>> 1;
              n |= n >>> 2;
              n |= n >>> 4;
              n |= n >>> 8;
              n |= n >>> 16;
              n++;
            }
            return n;
          }
          function howMuchToRead(n, state) {
            if (n <= 0 || state.length === 0 && state.ended)
              return 0;
            if (state.objectMode)
              return 1;
            if (n !== n) {
              if (state.flowing && state.length)
                return state.buffer.head.data.length;
              else
                return state.length;
            }
            if (n > state.highWaterMark)
              state.highWaterMark = computeNewHighWaterMark(n);
            if (n <= state.length)
              return n;
            if (!state.ended) {
              state.needReadable = true;
              return 0;
            }
            return state.length;
          }
          Readable.prototype.read = function(n) {
            debug("read", n);
            n = parseInt(n, 10);
            var state = this._readableState;
            var nOrig = n;
            if (n !== 0)
              state.emittedReadable = false;
            if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
              debug("read: emitReadable", state.length, state.ended);
              if (state.length === 0 && state.ended)
                endReadable(this);
              else
                emitReadable(this);
              return null;
            }
            n = howMuchToRead(n, state);
            if (n === 0 && state.ended) {
              if (state.length === 0)
                endReadable(this);
              return null;
            }
            var doRead = state.needReadable;
            debug("need readable", doRead);
            if (state.length === 0 || state.length - n < state.highWaterMark) {
              doRead = true;
              debug("length less than watermark", doRead);
            }
            if (state.ended || state.reading) {
              doRead = false;
              debug("reading or ended", doRead);
            } else if (doRead) {
              debug("do read");
              state.reading = true;
              state.sync = true;
              if (state.length === 0)
                state.needReadable = true;
              this._read(state.highWaterMark);
              state.sync = false;
              if (!state.reading)
                n = howMuchToRead(nOrig, state);
            }
            var ret;
            if (n > 0)
              ret = fromList(n, state);
            else
              ret = null;
            if (ret === null) {
              state.needReadable = state.length <= state.highWaterMark;
              n = 0;
            } else {
              state.length -= n;
              state.awaitDrain = 0;
            }
            if (state.length === 0) {
              if (!state.ended)
                state.needReadable = true;
              if (nOrig !== n && state.ended)
                endReadable(this);
            }
            if (ret !== null)
              this.emit("data", ret);
            return ret;
          };
          function onEofChunk(stream, state) {
            debug("onEofChunk");
            if (state.ended)
              return;
            if (state.decoder) {
              var chunk = state.decoder.end();
              if (chunk && chunk.length) {
                state.buffer.push(chunk);
                state.length += state.objectMode ? 1 : chunk.length;
              }
            }
            state.ended = true;
            if (state.sync) {
              emitReadable(stream);
            } else {
              state.needReadable = false;
              if (!state.emittedReadable) {
                state.emittedReadable = true;
                emitReadable_(stream);
              }
            }
          }
          function emitReadable(stream) {
            var state = stream._readableState;
            debug("emitReadable", state.needReadable, state.emittedReadable);
            state.needReadable = false;
            if (!state.emittedReadable) {
              debug("emitReadable", state.flowing);
              state.emittedReadable = true;
              process.nextTick(emitReadable_, stream);
            }
          }
          function emitReadable_(stream) {
            var state = stream._readableState;
            debug("emitReadable_", state.destroyed, state.length, state.ended);
            if (!state.destroyed && (state.length || state.ended)) {
              stream.emit("readable");
              state.emittedReadable = false;
            }
            state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
            flow(stream);
          }
          function maybeReadMore(stream, state) {
            if (!state.readingMore) {
              state.readingMore = true;
              process.nextTick(maybeReadMore_, stream, state);
            }
          }
          function maybeReadMore_(stream, state) {
            while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
              var len = state.length;
              debug("maybeReadMore read 0");
              stream.read(0);
              if (len === state.length)
                break;
            }
            state.readingMore = false;
          }
          Readable.prototype._read = function(n) {
            errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED("_read()"));
          };
          Readable.prototype.pipe = function(dest, pipeOpts) {
            var src = this;
            var state = this._readableState;
            switch (state.pipesCount) {
              case 0:
                state.pipes = dest;
                break;
              case 1:
                state.pipes = [state.pipes, dest];
                break;
              default:
                state.pipes.push(dest);
                break;
            }
            state.pipesCount += 1;
            debug("pipe count=%d opts=%j", state.pipesCount, pipeOpts);
            var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
            var endFn = doEnd ? onend : unpipe;
            if (state.endEmitted)
              process.nextTick(endFn);
            else
              src.once("end", endFn);
            dest.on("unpipe", onunpipe);
            function onunpipe(readable, unpipeInfo) {
              debug("onunpipe");
              if (readable === src) {
                if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
                  unpipeInfo.hasUnpiped = true;
                  cleanup();
                }
              }
            }
            function onend() {
              debug("onend");
              dest.end();
            }
            var ondrain = pipeOnDrain(src);
            dest.on("drain", ondrain);
            var cleanedUp = false;
            function cleanup() {
              debug("cleanup");
              dest.removeListener("close", onclose);
              dest.removeListener("finish", onfinish);
              dest.removeListener("drain", ondrain);
              dest.removeListener("error", onerror);
              dest.removeListener("unpipe", onunpipe);
              src.removeListener("end", onend);
              src.removeListener("end", unpipe);
              src.removeListener("data", ondata);
              cleanedUp = true;
              if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain))
                ondrain();
            }
            src.on("data", ondata);
            function ondata(chunk) {
              debug("ondata");
              var ret = dest.write(chunk);
              debug("dest.write", ret);
              if (ret === false) {
                if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
                  debug("false write response, pause", state.awaitDrain);
                  state.awaitDrain++;
                }
                src.pause();
              }
            }
            function onerror(er) {
              debug("onerror", er);
              unpipe();
              dest.removeListener("error", onerror);
              if (EElistenerCount(dest, "error") === 0)
                errorOrDestroy(dest, er);
            }
            prependListener(dest, "error", onerror);
            function onclose() {
              dest.removeListener("finish", onfinish);
              unpipe();
            }
            dest.once("close", onclose);
            function onfinish() {
              debug("onfinish");
              dest.removeListener("close", onclose);
              unpipe();
            }
            dest.once("finish", onfinish);
            function unpipe() {
              debug("unpipe");
              src.unpipe(dest);
            }
            dest.emit("pipe", src);
            if (!state.flowing) {
              debug("pipe resume");
              src.resume();
            }
            return dest;
          };
          function pipeOnDrain(src) {
            return function pipeOnDrainFunctionResult() {
              var state = src._readableState;
              debug("pipeOnDrain", state.awaitDrain);
              if (state.awaitDrain)
                state.awaitDrain--;
              if (state.awaitDrain === 0 && EElistenerCount(src, "data")) {
                state.flowing = true;
                flow(src);
              }
            };
          }
          Readable.prototype.unpipe = function(dest) {
            var state = this._readableState;
            var unpipeInfo = {
              hasUnpiped: false
            };
            if (state.pipesCount === 0)
              return this;
            if (state.pipesCount === 1) {
              if (dest && dest !== state.pipes)
                return this;
              if (!dest)
                dest = state.pipes;
              state.pipes = null;
              state.pipesCount = 0;
              state.flowing = false;
              if (dest)
                dest.emit("unpipe", this, unpipeInfo);
              return this;
            }
            if (!dest) {
              var dests = state.pipes;
              var len = state.pipesCount;
              state.pipes = null;
              state.pipesCount = 0;
              state.flowing = false;
              for (var i = 0; i < len; i++) {
                dests[i].emit("unpipe", this, {
                  hasUnpiped: false
                });
              }
              return this;
            }
            var index = indexOf(state.pipes, dest);
            if (index === -1)
              return this;
            state.pipes.splice(index, 1);
            state.pipesCount -= 1;
            if (state.pipesCount === 1)
              state.pipes = state.pipes[0];
            dest.emit("unpipe", this, unpipeInfo);
            return this;
          };
          Readable.prototype.on = function(ev, fn) {
            var res = Stream.prototype.on.call(this, ev, fn);
            var state = this._readableState;
            if (ev === "data") {
              state.readableListening = this.listenerCount("readable") > 0;
              if (state.flowing !== false)
                this.resume();
            } else if (ev === "readable") {
              if (!state.endEmitted && !state.readableListening) {
                state.readableListening = state.needReadable = true;
                state.flowing = false;
                state.emittedReadable = false;
                debug("on readable", state.length, state.reading);
                if (state.length) {
                  emitReadable(this);
                } else if (!state.reading) {
                  process.nextTick(nReadingNextTick, this);
                }
              }
            }
            return res;
          };
          Readable.prototype.addListener = Readable.prototype.on;
          Readable.prototype.removeListener = function(ev, fn) {
            var res = Stream.prototype.removeListener.call(this, ev, fn);
            if (ev === "readable") {
              process.nextTick(updateReadableListening, this);
            }
            return res;
          };
          Readable.prototype.removeAllListeners = function(ev) {
            var res = Stream.prototype.removeAllListeners.apply(this, arguments);
            if (ev === "readable" || ev === void 0) {
              process.nextTick(updateReadableListening, this);
            }
            return res;
          };
          function updateReadableListening(self2) {
            var state = self2._readableState;
            state.readableListening = self2.listenerCount("readable") > 0;
            if (state.resumeScheduled && !state.paused) {
              state.flowing = true;
            } else if (self2.listenerCount("data") > 0) {
              self2.resume();
            }
          }
          function nReadingNextTick(self2) {
            debug("readable nexttick read 0");
            self2.read(0);
          }
          Readable.prototype.resume = function() {
            var state = this._readableState;
            if (!state.flowing) {
              debug("resume");
              state.flowing = !state.readableListening;
              resume(this, state);
            }
            state.paused = false;
            return this;
          };
          function resume(stream, state) {
            if (!state.resumeScheduled) {
              state.resumeScheduled = true;
              process.nextTick(resume_, stream, state);
            }
          }
          function resume_(stream, state) {
            debug("resume", state.reading);
            if (!state.reading) {
              stream.read(0);
            }
            state.resumeScheduled = false;
            stream.emit("resume");
            flow(stream);
            if (state.flowing && !state.reading)
              stream.read(0);
          }
          Readable.prototype.pause = function() {
            debug("call pause flowing=%j", this._readableState.flowing);
            if (this._readableState.flowing !== false) {
              debug("pause");
              this._readableState.flowing = false;
              this.emit("pause");
            }
            this._readableState.paused = true;
            return this;
          };
          function flow(stream) {
            var state = stream._readableState;
            debug("flow", state.flowing);
            while (state.flowing && stream.read() !== null) {
            }
          }
          Readable.prototype.wrap = function(stream) {
            var _this = this;
            var state = this._readableState;
            var paused = false;
            stream.on("end", function() {
              debug("wrapped end");
              if (state.decoder && !state.ended) {
                var chunk = state.decoder.end();
                if (chunk && chunk.length)
                  _this.push(chunk);
              }
              _this.push(null);
            });
            stream.on("data", function(chunk) {
              debug("wrapped data");
              if (state.decoder)
                chunk = state.decoder.write(chunk);
              if (state.objectMode && (chunk === null || chunk === void 0))
                return;
              else if (!state.objectMode && (!chunk || !chunk.length))
                return;
              var ret = _this.push(chunk);
              if (!ret) {
                paused = true;
                stream.pause();
              }
            });
            for (var i in stream) {
              if (this[i] === void 0 && typeof stream[i] === "function") {
                this[i] = function methodWrap(method) {
                  return function methodWrapReturnFunction() {
                    return stream[method].apply(stream, arguments);
                  };
                }(i);
              }
            }
            for (var n = 0; n < kProxyEvents.length; n++) {
              stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
            }
            this._read = function(n2) {
              debug("wrapped _read", n2);
              if (paused) {
                paused = false;
                stream.resume();
              }
            };
            return this;
          };
          if (typeof Symbol === "function") {
            Readable.prototype[Symbol.asyncIterator] = function() {
              if (createReadableStreamAsyncIterator === void 0) {
                createReadableStreamAsyncIterator = require2("./internal/streams/async_iterator");
              }
              return createReadableStreamAsyncIterator(this);
            };
          }
          Object.defineProperty(Readable.prototype, "readableHighWaterMark", {
            enumerable: false,
            get: function get() {
              return this._readableState.highWaterMark;
            }
          });
          Object.defineProperty(Readable.prototype, "readableBuffer", {
            enumerable: false,
            get: function get() {
              return this._readableState && this._readableState.buffer;
            }
          });
          Object.defineProperty(Readable.prototype, "readableFlowing", {
            enumerable: false,
            get: function get() {
              return this._readableState.flowing;
            },
            set: function set(state) {
              if (this._readableState) {
                this._readableState.flowing = state;
              }
            }
          });
          Readable._fromList = fromList;
          Object.defineProperty(Readable.prototype, "readableLength", {
            enumerable: false,
            get: function get() {
              return this._readableState.length;
            }
          });
          function fromList(n, state) {
            if (state.length === 0)
              return null;
            var ret;
            if (state.objectMode)
              ret = state.buffer.shift();
            else if (!n || n >= state.length) {
              if (state.decoder)
                ret = state.buffer.join("");
              else if (state.buffer.length === 1)
                ret = state.buffer.first();
              else
                ret = state.buffer.concat(state.length);
              state.buffer.clear();
            } else {
              ret = state.buffer.consume(n, state.decoder);
            }
            return ret;
          }
          function endReadable(stream) {
            var state = stream._readableState;
            debug("endReadable", state.endEmitted);
            if (!state.endEmitted) {
              state.ended = true;
              process.nextTick(endReadableNT, state, stream);
            }
          }
          function endReadableNT(state, stream) {
            debug("endReadableNT", state.endEmitted, state.length);
            if (!state.endEmitted && state.length === 0) {
              state.endEmitted = true;
              stream.readable = false;
              stream.emit("end");
              if (state.autoDestroy) {
                var wState = stream._writableState;
                if (!wState || wState.autoDestroy && wState.finished) {
                  stream.destroy();
                }
              }
            }
          }
          if (typeof Symbol === "function") {
            Readable.from = function(iterable, opts) {
              if (from === void 0) {
                from = require2("./internal/streams/from");
              }
              return from(Readable, iterable, opts);
            };
          }
          function indexOf(xs, x) {
            for (var i = 0, l = xs.length; i < l; i++) {
              if (xs[i] === x)
                return i;
            }
            return -1;
          }
        }).call(this);
      }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, { "../errors": 55, "./_stream_duplex": 56, "./internal/streams/async_iterator": 61, "./internal/streams/buffer_list": 62, "./internal/streams/destroy": 63, "./internal/streams/from": 65, "./internal/streams/state": 67, "./internal/streams/stream": 68, "_process": 50, "buffer": 17, "events": 22, "inherits": 24, "string_decoder/": 75, "util": 16 }], 59: [function(require2, module2, exports2) {
      module2.exports = Transform;
      var _require$codes = require2("../errors").codes, ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED, ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK, ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING, ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
      var Duplex = require2("./_stream_duplex");
      require2("inherits")(Transform, Duplex);
      function afterTransform(er, data) {
        var ts = this._transformState;
        ts.transforming = false;
        var cb = ts.writecb;
        if (cb === null) {
          return this.emit("error", new ERR_MULTIPLE_CALLBACK());
        }
        ts.writechunk = null;
        ts.writecb = null;
        if (data != null)
          this.push(data);
        cb(er);
        var rs = this._readableState;
        rs.reading = false;
        if (rs.needReadable || rs.length < rs.highWaterMark) {
          this._read(rs.highWaterMark);
        }
      }
      function Transform(options) {
        if (!(this instanceof Transform))
          return new Transform(options);
        Duplex.call(this, options);
        this._transformState = {
          afterTransform: afterTransform.bind(this),
          needTransform: false,
          transforming: false,
          writecb: null,
          writechunk: null,
          writeencoding: null
        };
        this._readableState.needReadable = true;
        this._readableState.sync = false;
        if (options) {
          if (typeof options.transform === "function")
            this._transform = options.transform;
          if (typeof options.flush === "function")
            this._flush = options.flush;
        }
        this.on("prefinish", prefinish);
      }
      function prefinish() {
        var _this = this;
        if (typeof this._flush === "function" && !this._readableState.destroyed) {
          this._flush(function(er, data) {
            done(_this, er, data);
          });
        } else {
          done(this, null, null);
        }
      }
      Transform.prototype.push = function(chunk, encoding) {
        this._transformState.needTransform = false;
        return Duplex.prototype.push.call(this, chunk, encoding);
      };
      Transform.prototype._transform = function(chunk, encoding, cb) {
        cb(new ERR_METHOD_NOT_IMPLEMENTED("_transform()"));
      };
      Transform.prototype._write = function(chunk, encoding, cb) {
        var ts = this._transformState;
        ts.writecb = cb;
        ts.writechunk = chunk;
        ts.writeencoding = encoding;
        if (!ts.transforming) {
          var rs = this._readableState;
          if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
            this._read(rs.highWaterMark);
        }
      };
      Transform.prototype._read = function(n) {
        var ts = this._transformState;
        if (ts.writechunk !== null && !ts.transforming) {
          ts.transforming = true;
          this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
        } else {
          ts.needTransform = true;
        }
      };
      Transform.prototype._destroy = function(err, cb) {
        Duplex.prototype._destroy.call(this, err, function(err2) {
          cb(err2);
        });
      };
      function done(stream, er, data) {
        if (er)
          return stream.emit("error", er);
        if (data != null)
          stream.push(data);
        if (stream._writableState.length)
          throw new ERR_TRANSFORM_WITH_LENGTH_0();
        if (stream._transformState.transforming)
          throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
        return stream.push(null);
      }
    }, { "../errors": 55, "./_stream_duplex": 56, "inherits": 24 }], 60: [function(require2, module2, exports2) {
      (function(process, global2) {
        (function() {
          module2.exports = Writable;
          function CorkedRequest(state) {
            var _this = this;
            this.next = null;
            this.entry = null;
            this.finish = function() {
              onCorkedFinish(_this, state);
            };
          }
          var Duplex;
          Writable.WritableState = WritableState;
          var internalUtil = {
            deprecate: require2("util-deprecate")
          };
          var Stream = require2("./internal/streams/stream");
          var Buffer2 = require2("buffer").Buffer;
          var OurUint8Array = global2.Uint8Array || function() {
          };
          function _uint8ArrayToBuffer(chunk) {
            return Buffer2.from(chunk);
          }
          function _isUint8Array(obj) {
            return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
          }
          var destroyImpl = require2("./internal/streams/destroy");
          var _require = require2("./internal/streams/state"), getHighWaterMark = _require.getHighWaterMark;
          var _require$codes = require2("../errors").codes, ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE, ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED, ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK, ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE, ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED, ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES, ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END, ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
          var errorOrDestroy = destroyImpl.errorOrDestroy;
          require2("inherits")(Writable, Stream);
          function nop() {
          }
          function WritableState(options, stream, isDuplex) {
            Duplex = Duplex || require2("./_stream_duplex");
            options = options || {};
            if (typeof isDuplex !== "boolean")
              isDuplex = stream instanceof Duplex;
            this.objectMode = !!options.objectMode;
            if (isDuplex)
              this.objectMode = this.objectMode || !!options.writableObjectMode;
            this.highWaterMark = getHighWaterMark(this, options, "writableHighWaterMark", isDuplex);
            this.finalCalled = false;
            this.needDrain = false;
            this.ending = false;
            this.ended = false;
            this.finished = false;
            this.destroyed = false;
            var noDecode = options.decodeStrings === false;
            this.decodeStrings = !noDecode;
            this.defaultEncoding = options.defaultEncoding || "utf8";
            this.length = 0;
            this.writing = false;
            this.corked = 0;
            this.sync = true;
            this.bufferProcessing = false;
            this.onwrite = function(er) {
              onwrite(stream, er);
            };
            this.writecb = null;
            this.writelen = 0;
            this.bufferedRequest = null;
            this.lastBufferedRequest = null;
            this.pendingcb = 0;
            this.prefinished = false;
            this.errorEmitted = false;
            this.emitClose = options.emitClose !== false;
            this.autoDestroy = !!options.autoDestroy;
            this.bufferedRequestCount = 0;
            this.corkedRequestsFree = new CorkedRequest(this);
          }
          WritableState.prototype.getBuffer = function getBuffer() {
            var current = this.bufferedRequest;
            var out = [];
            while (current) {
              out.push(current);
              current = current.next;
            }
            return out;
          };
          (function() {
            try {
              Object.defineProperty(WritableState.prototype, "buffer", {
                get: internalUtil.deprecate(function writableStateBufferGetter() {
                  return this.getBuffer();
                }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
              });
            } catch (_) {
            }
          })();
          var realHasInstance;
          if (typeof Symbol === "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === "function") {
            realHasInstance = Function.prototype[Symbol.hasInstance];
            Object.defineProperty(Writable, Symbol.hasInstance, {
              value: function value(object) {
                if (realHasInstance.call(this, object))
                  return true;
                if (this !== Writable)
                  return false;
                return object && object._writableState instanceof WritableState;
              }
            });
          } else {
            realHasInstance = function realHasInstance2(object) {
              return object instanceof this;
            };
          }
          function Writable(options) {
            Duplex = Duplex || require2("./_stream_duplex");
            var isDuplex = this instanceof Duplex;
            if (!isDuplex && !realHasInstance.call(Writable, this))
              return new Writable(options);
            this._writableState = new WritableState(options, this, isDuplex);
            this.writable = true;
            if (options) {
              if (typeof options.write === "function")
                this._write = options.write;
              if (typeof options.writev === "function")
                this._writev = options.writev;
              if (typeof options.destroy === "function")
                this._destroy = options.destroy;
              if (typeof options.final === "function")
                this._final = options.final;
            }
            Stream.call(this);
          }
          Writable.prototype.pipe = function() {
            errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
          };
          function writeAfterEnd(stream, cb) {
            var er = new ERR_STREAM_WRITE_AFTER_END();
            errorOrDestroy(stream, er);
            process.nextTick(cb, er);
          }
          function validChunk(stream, state, chunk, cb) {
            var er;
            if (chunk === null) {
              er = new ERR_STREAM_NULL_VALUES();
            } else if (typeof chunk !== "string" && !state.objectMode) {
              er = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer"], chunk);
            }
            if (er) {
              errorOrDestroy(stream, er);
              process.nextTick(cb, er);
              return false;
            }
            return true;
          }
          Writable.prototype.write = function(chunk, encoding, cb) {
            var state = this._writableState;
            var ret = false;
            var isBuf = !state.objectMode && _isUint8Array(chunk);
            if (isBuf && !Buffer2.isBuffer(chunk)) {
              chunk = _uint8ArrayToBuffer(chunk);
            }
            if (typeof encoding === "function") {
              cb = encoding;
              encoding = null;
            }
            if (isBuf)
              encoding = "buffer";
            else if (!encoding)
              encoding = state.defaultEncoding;
            if (typeof cb !== "function")
              cb = nop;
            if (state.ending)
              writeAfterEnd(this, cb);
            else if (isBuf || validChunk(this, state, chunk, cb)) {
              state.pendingcb++;
              ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
            }
            return ret;
          };
          Writable.prototype.cork = function() {
            this._writableState.corked++;
          };
          Writable.prototype.uncork = function() {
            var state = this._writableState;
            if (state.corked) {
              state.corked--;
              if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest)
                clearBuffer(this, state);
            }
          };
          Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
            if (typeof encoding === "string")
              encoding = encoding.toLowerCase();
            if (!(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((encoding + "").toLowerCase()) > -1))
              throw new ERR_UNKNOWN_ENCODING(encoding);
            this._writableState.defaultEncoding = encoding;
            return this;
          };
          Object.defineProperty(Writable.prototype, "writableBuffer", {
            enumerable: false,
            get: function get() {
              return this._writableState && this._writableState.getBuffer();
            }
          });
          function decodeChunk(state, chunk, encoding) {
            if (!state.objectMode && state.decodeStrings !== false && typeof chunk === "string") {
              chunk = Buffer2.from(chunk, encoding);
            }
            return chunk;
          }
          Object.defineProperty(Writable.prototype, "writableHighWaterMark", {
            enumerable: false,
            get: function get() {
              return this._writableState.highWaterMark;
            }
          });
          function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
            if (!isBuf) {
              var newChunk = decodeChunk(state, chunk, encoding);
              if (chunk !== newChunk) {
                isBuf = true;
                encoding = "buffer";
                chunk = newChunk;
              }
            }
            var len = state.objectMode ? 1 : chunk.length;
            state.length += len;
            var ret = state.length < state.highWaterMark;
            if (!ret)
              state.needDrain = true;
            if (state.writing || state.corked) {
              var last = state.lastBufferedRequest;
              state.lastBufferedRequest = {
                chunk,
                encoding,
                isBuf,
                callback: cb,
                next: null
              };
              if (last) {
                last.next = state.lastBufferedRequest;
              } else {
                state.bufferedRequest = state.lastBufferedRequest;
              }
              state.bufferedRequestCount += 1;
            } else {
              doWrite(stream, state, false, len, chunk, encoding, cb);
            }
            return ret;
          }
          function doWrite(stream, state, writev, len, chunk, encoding, cb) {
            state.writelen = len;
            state.writecb = cb;
            state.writing = true;
            state.sync = true;
            if (state.destroyed)
              state.onwrite(new ERR_STREAM_DESTROYED("write"));
            else if (writev)
              stream._writev(chunk, state.onwrite);
            else
              stream._write(chunk, encoding, state.onwrite);
            state.sync = false;
          }
          function onwriteError(stream, state, sync, er, cb) {
            --state.pendingcb;
            if (sync) {
              process.nextTick(cb, er);
              process.nextTick(finishMaybe, stream, state);
              stream._writableState.errorEmitted = true;
              errorOrDestroy(stream, er);
            } else {
              cb(er);
              stream._writableState.errorEmitted = true;
              errorOrDestroy(stream, er);
              finishMaybe(stream, state);
            }
          }
          function onwriteStateUpdate(state) {
            state.writing = false;
            state.writecb = null;
            state.length -= state.writelen;
            state.writelen = 0;
          }
          function onwrite(stream, er) {
            var state = stream._writableState;
            var sync = state.sync;
            var cb = state.writecb;
            if (typeof cb !== "function")
              throw new ERR_MULTIPLE_CALLBACK();
            onwriteStateUpdate(state);
            if (er)
              onwriteError(stream, state, sync, er, cb);
            else {
              var finished = needFinish(state) || stream.destroyed;
              if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
                clearBuffer(stream, state);
              }
              if (sync) {
                process.nextTick(afterWrite, stream, state, finished, cb);
              } else {
                afterWrite(stream, state, finished, cb);
              }
            }
          }
          function afterWrite(stream, state, finished, cb) {
            if (!finished)
              onwriteDrain(stream, state);
            state.pendingcb--;
            cb();
            finishMaybe(stream, state);
          }
          function onwriteDrain(stream, state) {
            if (state.length === 0 && state.needDrain) {
              state.needDrain = false;
              stream.emit("drain");
            }
          }
          function clearBuffer(stream, state) {
            state.bufferProcessing = true;
            var entry = state.bufferedRequest;
            if (stream._writev && entry && entry.next) {
              var l = state.bufferedRequestCount;
              var buffer = new Array(l);
              var holder = state.corkedRequestsFree;
              holder.entry = entry;
              var count = 0;
              var allBuffers = true;
              while (entry) {
                buffer[count] = entry;
                if (!entry.isBuf)
                  allBuffers = false;
                entry = entry.next;
                count += 1;
              }
              buffer.allBuffers = allBuffers;
              doWrite(stream, state, true, state.length, buffer, "", holder.finish);
              state.pendingcb++;
              state.lastBufferedRequest = null;
              if (holder.next) {
                state.corkedRequestsFree = holder.next;
                holder.next = null;
              } else {
                state.corkedRequestsFree = new CorkedRequest(state);
              }
              state.bufferedRequestCount = 0;
            } else {
              while (entry) {
                var chunk = entry.chunk;
                var encoding = entry.encoding;
                var cb = entry.callback;
                var len = state.objectMode ? 1 : chunk.length;
                doWrite(stream, state, false, len, chunk, encoding, cb);
                entry = entry.next;
                state.bufferedRequestCount--;
                if (state.writing) {
                  break;
                }
              }
              if (entry === null)
                state.lastBufferedRequest = null;
            }
            state.bufferedRequest = entry;
            state.bufferProcessing = false;
          }
          Writable.prototype._write = function(chunk, encoding, cb) {
            cb(new ERR_METHOD_NOT_IMPLEMENTED("_write()"));
          };
          Writable.prototype._writev = null;
          Writable.prototype.end = function(chunk, encoding, cb) {
            var state = this._writableState;
            if (typeof chunk === "function") {
              cb = chunk;
              chunk = null;
              encoding = null;
            } else if (typeof encoding === "function") {
              cb = encoding;
              encoding = null;
            }
            if (chunk !== null && chunk !== void 0)
              this.write(chunk, encoding);
            if (state.corked) {
              state.corked = 1;
              this.uncork();
            }
            if (!state.ending)
              endWritable(this, state, cb);
            return this;
          };
          Object.defineProperty(Writable.prototype, "writableLength", {
            enumerable: false,
            get: function get() {
              return this._writableState.length;
            }
          });
          function needFinish(state) {
            return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
          }
          function callFinal(stream, state) {
            stream._final(function(err) {
              state.pendingcb--;
              if (err) {
                errorOrDestroy(stream, err);
              }
              state.prefinished = true;
              stream.emit("prefinish");
              finishMaybe(stream, state);
            });
          }
          function prefinish(stream, state) {
            if (!state.prefinished && !state.finalCalled) {
              if (typeof stream._final === "function" && !state.destroyed) {
                state.pendingcb++;
                state.finalCalled = true;
                process.nextTick(callFinal, stream, state);
              } else {
                state.prefinished = true;
                stream.emit("prefinish");
              }
            }
          }
          function finishMaybe(stream, state) {
            var need = needFinish(state);
            if (need) {
              prefinish(stream, state);
              if (state.pendingcb === 0) {
                state.finished = true;
                stream.emit("finish");
                if (state.autoDestroy) {
                  var rState = stream._readableState;
                  if (!rState || rState.autoDestroy && rState.endEmitted) {
                    stream.destroy();
                  }
                }
              }
            }
            return need;
          }
          function endWritable(stream, state, cb) {
            state.ending = true;
            finishMaybe(stream, state);
            if (cb) {
              if (state.finished)
                process.nextTick(cb);
              else
                stream.once("finish", cb);
            }
            state.ended = true;
            stream.writable = false;
          }
          function onCorkedFinish(corkReq, state, err) {
            var entry = corkReq.entry;
            corkReq.entry = null;
            while (entry) {
              var cb = entry.callback;
              state.pendingcb--;
              cb(err);
              entry = entry.next;
            }
            state.corkedRequestsFree.next = corkReq;
          }
          Object.defineProperty(Writable.prototype, "destroyed", {
            enumerable: false,
            get: function get() {
              if (this._writableState === void 0) {
                return false;
              }
              return this._writableState.destroyed;
            },
            set: function set(value) {
              if (!this._writableState) {
                return;
              }
              this._writableState.destroyed = value;
            }
          });
          Writable.prototype.destroy = destroyImpl.destroy;
          Writable.prototype._undestroy = destroyImpl.undestroy;
          Writable.prototype._destroy = function(err, cb) {
            cb(err);
          };
        }).call(this);
      }).call(this, require2("_process"), typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, { "../errors": 55, "./_stream_duplex": 56, "./internal/streams/destroy": 63, "./internal/streams/state": 67, "./internal/streams/stream": 68, "_process": 50, "buffer": 17, "inherits": 24, "util-deprecate": 78 }], 61: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          var _Object$setPrototypeO;
          function _defineProperty(obj, key, value) {
            if (key in obj) {
              Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
            } else {
              obj[key] = value;
            }
            return obj;
          }
          var finished = require2("./end-of-stream");
          var kLastResolve = Symbol("lastResolve");
          var kLastReject = Symbol("lastReject");
          var kError = Symbol("error");
          var kEnded = Symbol("ended");
          var kLastPromise = Symbol("lastPromise");
          var kHandlePromise = Symbol("handlePromise");
          var kStream = Symbol("stream");
          function createIterResult(value, done) {
            return {
              value,
              done
            };
          }
          function readAndResolve(iter) {
            var resolve = iter[kLastResolve];
            if (resolve !== null) {
              var data = iter[kStream].read();
              if (data !== null) {
                iter[kLastPromise] = null;
                iter[kLastResolve] = null;
                iter[kLastReject] = null;
                resolve(createIterResult(data, false));
              }
            }
          }
          function onReadable(iter) {
            process.nextTick(readAndResolve, iter);
          }
          function wrapForNext(lastPromise, iter) {
            return function(resolve, reject) {
              lastPromise.then(function() {
                if (iter[kEnded]) {
                  resolve(createIterResult(void 0, true));
                  return;
                }
                iter[kHandlePromise](resolve, reject);
              }, reject);
            };
          }
          var AsyncIteratorPrototype = Object.getPrototypeOf(function() {
          });
          var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
            get stream() {
              return this[kStream];
            },
            next: function next() {
              var _this = this;
              var error = this[kError];
              if (error !== null) {
                return Promise.reject(error);
              }
              if (this[kEnded]) {
                return Promise.resolve(createIterResult(void 0, true));
              }
              if (this[kStream].destroyed) {
                return new Promise(function(resolve, reject) {
                  process.nextTick(function() {
                    if (_this[kError]) {
                      reject(_this[kError]);
                    } else {
                      resolve(createIterResult(void 0, true));
                    }
                  });
                });
              }
              var lastPromise = this[kLastPromise];
              var promise;
              if (lastPromise) {
                promise = new Promise(wrapForNext(lastPromise, this));
              } else {
                var data = this[kStream].read();
                if (data !== null) {
                  return Promise.resolve(createIterResult(data, false));
                }
                promise = new Promise(this[kHandlePromise]);
              }
              this[kLastPromise] = promise;
              return promise;
            }
          }, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function() {
            return this;
          }), _defineProperty(_Object$setPrototypeO, "return", function _return() {
            var _this2 = this;
            return new Promise(function(resolve, reject) {
              _this2[kStream].destroy(null, function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve(createIterResult(void 0, true));
              });
            });
          }), _Object$setPrototypeO), AsyncIteratorPrototype);
          var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator2(stream) {
            var _Object$create;
            var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
              value: stream,
              writable: true
            }), _defineProperty(_Object$create, kLastResolve, {
              value: null,
              writable: true
            }), _defineProperty(_Object$create, kLastReject, {
              value: null,
              writable: true
            }), _defineProperty(_Object$create, kError, {
              value: null,
              writable: true
            }), _defineProperty(_Object$create, kEnded, {
              value: stream._readableState.endEmitted,
              writable: true
            }), _defineProperty(_Object$create, kHandlePromise, {
              value: function value(resolve, reject) {
                var data = iterator[kStream].read();
                if (data) {
                  iterator[kLastPromise] = null;
                  iterator[kLastResolve] = null;
                  iterator[kLastReject] = null;
                  resolve(createIterResult(data, false));
                } else {
                  iterator[kLastResolve] = resolve;
                  iterator[kLastReject] = reject;
                }
              },
              writable: true
            }), _Object$create));
            iterator[kLastPromise] = null;
            finished(stream, function(err) {
              if (err && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
                var reject = iterator[kLastReject];
                if (reject !== null) {
                  iterator[kLastPromise] = null;
                  iterator[kLastResolve] = null;
                  iterator[kLastReject] = null;
                  reject(err);
                }
                iterator[kError] = err;
                return;
              }
              var resolve = iterator[kLastResolve];
              if (resolve !== null) {
                iterator[kLastPromise] = null;
                iterator[kLastResolve] = null;
                iterator[kLastReject] = null;
                resolve(createIterResult(void 0, true));
              }
              iterator[kEnded] = true;
            });
            stream.on("readable", onReadable.bind(null, iterator));
            return iterator;
          };
          module2.exports = createReadableStreamAsyncIterator;
        }).call(this);
      }).call(this, require2("_process"));
    }, { "./end-of-stream": 64, "_process": 50 }], 62: [function(require2, module2, exports2) {
      function ownKeys(object, enumerableOnly) {
        var keys = Object.keys(object);
        if (Object.getOwnPropertySymbols) {
          var symbols = Object.getOwnPropertySymbols(object);
          if (enumerableOnly)
            symbols = symbols.filter(function(sym) {
              return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            });
          keys.push.apply(keys, symbols);
        }
        return keys;
      }
      function _objectSpread(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i] != null ? arguments[i] : {};
          if (i % 2) {
            ownKeys(Object(source), true).forEach(function(key) {
              _defineProperty(target, key, source[key]);
            });
          } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
          } else {
            ownKeys(Object(source)).forEach(function(key) {
              Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
            });
          }
        }
        return target;
      }
      function _defineProperty(obj, key, value) {
        if (key in obj) {
          Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
        } else {
          obj[key] = value;
        }
        return obj;
      }
      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }
      function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor)
            descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }
      function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps)
          _defineProperties(Constructor.prototype, protoProps);
        if (staticProps)
          _defineProperties(Constructor, staticProps);
        return Constructor;
      }
      var _require = require2("buffer"), Buffer2 = _require.Buffer;
      var _require2 = require2("util"), inspect = _require2.inspect;
      var custom = inspect && inspect.custom || "inspect";
      function copyBuffer(src, target, offset) {
        Buffer2.prototype.copy.call(src, target, offset);
      }
      module2.exports = /* @__PURE__ */ function() {
        function BufferList() {
          _classCallCheck(this, BufferList);
          this.head = null;
          this.tail = null;
          this.length = 0;
        }
        _createClass(BufferList, [{
          key: "push",
          value: function push(v) {
            var entry = {
              data: v,
              next: null
            };
            if (this.length > 0)
              this.tail.next = entry;
            else
              this.head = entry;
            this.tail = entry;
            ++this.length;
          }
        }, {
          key: "unshift",
          value: function unshift(v) {
            var entry = {
              data: v,
              next: this.head
            };
            if (this.length === 0)
              this.tail = entry;
            this.head = entry;
            ++this.length;
          }
        }, {
          key: "shift",
          value: function shift() {
            if (this.length === 0)
              return;
            var ret = this.head.data;
            if (this.length === 1)
              this.head = this.tail = null;
            else
              this.head = this.head.next;
            --this.length;
            return ret;
          }
        }, {
          key: "clear",
          value: function clear() {
            this.head = this.tail = null;
            this.length = 0;
          }
        }, {
          key: "join",
          value: function join(s) {
            if (this.length === 0)
              return "";
            var p = this.head;
            var ret = "" + p.data;
            while (p = p.next) {
              ret += s + p.data;
            }
            return ret;
          }
        }, {
          key: "concat",
          value: function concat(n) {
            if (this.length === 0)
              return Buffer2.alloc(0);
            var ret = Buffer2.allocUnsafe(n >>> 0);
            var p = this.head;
            var i = 0;
            while (p) {
              copyBuffer(p.data, ret, i);
              i += p.data.length;
              p = p.next;
            }
            return ret;
          }
        }, {
          key: "consume",
          value: function consume(n, hasStrings) {
            var ret;
            if (n < this.head.data.length) {
              ret = this.head.data.slice(0, n);
              this.head.data = this.head.data.slice(n);
            } else if (n === this.head.data.length) {
              ret = this.shift();
            } else {
              ret = hasStrings ? this._getString(n) : this._getBuffer(n);
            }
            return ret;
          }
        }, {
          key: "first",
          value: function first() {
            return this.head.data;
          }
        }, {
          key: "_getString",
          value: function _getString(n) {
            var p = this.head;
            var c = 1;
            var ret = p.data;
            n -= ret.length;
            while (p = p.next) {
              var str = p.data;
              var nb = n > str.length ? str.length : n;
              if (nb === str.length)
                ret += str;
              else
                ret += str.slice(0, n);
              n -= nb;
              if (n === 0) {
                if (nb === str.length) {
                  ++c;
                  if (p.next)
                    this.head = p.next;
                  else
                    this.head = this.tail = null;
                } else {
                  this.head = p;
                  p.data = str.slice(nb);
                }
                break;
              }
              ++c;
            }
            this.length -= c;
            return ret;
          }
        }, {
          key: "_getBuffer",
          value: function _getBuffer(n) {
            var ret = Buffer2.allocUnsafe(n);
            var p = this.head;
            var c = 1;
            p.data.copy(ret);
            n -= p.data.length;
            while (p = p.next) {
              var buf = p.data;
              var nb = n > buf.length ? buf.length : n;
              buf.copy(ret, ret.length - n, 0, nb);
              n -= nb;
              if (n === 0) {
                if (nb === buf.length) {
                  ++c;
                  if (p.next)
                    this.head = p.next;
                  else
                    this.head = this.tail = null;
                } else {
                  this.head = p;
                  p.data = buf.slice(nb);
                }
                break;
              }
              ++c;
            }
            this.length -= c;
            return ret;
          }
        }, {
          key: custom,
          value: function value(_, options) {
            return inspect(this, _objectSpread({}, options, {
              depth: 0,
              customInspect: false
            }));
          }
        }]);
        return BufferList;
      }();
    }, { "buffer": 17, "util": 16 }], 63: [function(require2, module2, exports2) {
      (function(process) {
        (function() {
          function destroy(err, cb) {
            var _this = this;
            var readableDestroyed = this._readableState && this._readableState.destroyed;
            var writableDestroyed = this._writableState && this._writableState.destroyed;
            if (readableDestroyed || writableDestroyed) {
              if (cb) {
                cb(err);
              } else if (err) {
                if (!this._writableState) {
                  process.nextTick(emitErrorNT, this, err);
                } else if (!this._writableState.errorEmitted) {
                  this._writableState.errorEmitted = true;
                  process.nextTick(emitErrorNT, this, err);
                }
              }
              return this;
            }
            if (this._readableState) {
              this._readableState.destroyed = true;
            }
            if (this._writableState) {
              this._writableState.destroyed = true;
            }
            this._destroy(err || null, function(err2) {
              if (!cb && err2) {
                if (!_this._writableState) {
                  process.nextTick(emitErrorAndCloseNT, _this, err2);
                } else if (!_this._writableState.errorEmitted) {
                  _this._writableState.errorEmitted = true;
                  process.nextTick(emitErrorAndCloseNT, _this, err2);
                } else {
                  process.nextTick(emitCloseNT, _this);
                }
              } else if (cb) {
                process.nextTick(emitCloseNT, _this);
                cb(err2);
              } else {
                process.nextTick(emitCloseNT, _this);
              }
            });
            return this;
          }
          function emitErrorAndCloseNT(self2, err) {
            emitErrorNT(self2, err);
            emitCloseNT(self2);
          }
          function emitCloseNT(self2) {
            if (self2._writableState && !self2._writableState.emitClose)
              return;
            if (self2._readableState && !self2._readableState.emitClose)
              return;
            self2.emit("close");
          }
          function undestroy() {
            if (this._readableState) {
              this._readableState.destroyed = false;
              this._readableState.reading = false;
              this._readableState.ended = false;
              this._readableState.endEmitted = false;
            }
            if (this._writableState) {
              this._writableState.destroyed = false;
              this._writableState.ended = false;
              this._writableState.ending = false;
              this._writableState.finalCalled = false;
              this._writableState.prefinished = false;
              this._writableState.finished = false;
              this._writableState.errorEmitted = false;
            }
          }
          function emitErrorNT(self2, err) {
            self2.emit("error", err);
          }
          function errorOrDestroy(stream, err) {
            var rState = stream._readableState;
            var wState = stream._writableState;
            if (rState && rState.autoDestroy || wState && wState.autoDestroy)
              stream.destroy(err);
            else
              stream.emit("error", err);
          }
          module2.exports = {
            destroy,
            undestroy,
            errorOrDestroy
          };
        }).call(this);
      }).call(this, require2("_process"));
    }, { "_process": 50 }], 64: [function(require2, module2, exports2) {
      var ERR_STREAM_PREMATURE_CLOSE = require2("../../../errors").codes.ERR_STREAM_PREMATURE_CLOSE;
      function once(callback) {
        var called = false;
        return function() {
          if (called)
            return;
          called = true;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          callback.apply(this, args);
        };
      }
      function noop() {
      }
      function isRequest(stream) {
        return stream.setHeader && typeof stream.abort === "function";
      }
      function eos(stream, opts, callback) {
        if (typeof opts === "function")
          return eos(stream, null, opts);
        if (!opts)
          opts = {};
        callback = once(callback || noop);
        var readable = opts.readable || opts.readable !== false && stream.readable;
        var writable = opts.writable || opts.writable !== false && stream.writable;
        var onlegacyfinish = function onlegacyfinish2() {
          if (!stream.writable)
            onfinish();
        };
        var writableEnded = stream._writableState && stream._writableState.finished;
        var onfinish = function onfinish2() {
          writable = false;
          writableEnded = true;
          if (!readable)
            callback.call(stream);
        };
        var readableEnded = stream._readableState && stream._readableState.endEmitted;
        var onend = function onend2() {
          readable = false;
          readableEnded = true;
          if (!writable)
            callback.call(stream);
        };
        var onerror = function onerror2(err) {
          callback.call(stream, err);
        };
        var onclose = function onclose2() {
          var err;
          if (readable && !readableEnded) {
            if (!stream._readableState || !stream._readableState.ended)
              err = new ERR_STREAM_PREMATURE_CLOSE();
            return callback.call(stream, err);
          }
          if (writable && !writableEnded) {
            if (!stream._writableState || !stream._writableState.ended)
              err = new ERR_STREAM_PREMATURE_CLOSE();
            return callback.call(stream, err);
          }
        };
        var onrequest = function onrequest2() {
          stream.req.on("finish", onfinish);
        };
        if (isRequest(stream)) {
          stream.on("complete", onfinish);
          stream.on("abort", onclose);
          if (stream.req)
            onrequest();
          else
            stream.on("request", onrequest);
        } else if (writable && !stream._writableState) {
          stream.on("end", onlegacyfinish);
          stream.on("close", onlegacyfinish);
        }
        stream.on("end", onend);
        stream.on("finish", onfinish);
        if (opts.error !== false)
          stream.on("error", onerror);
        stream.on("close", onclose);
        return function() {
          stream.removeListener("complete", onfinish);
          stream.removeListener("abort", onclose);
          stream.removeListener("request", onrequest);
          if (stream.req)
            stream.req.removeListener("finish", onfinish);
          stream.removeListener("end", onlegacyfinish);
          stream.removeListener("close", onlegacyfinish);
          stream.removeListener("finish", onfinish);
          stream.removeListener("end", onend);
          stream.removeListener("error", onerror);
          stream.removeListener("close", onclose);
        };
      }
      module2.exports = eos;
    }, { "../../../errors": 55 }], 65: [function(require2, module2, exports2) {
      module2.exports = function() {
        throw new Error("Readable.from is not available in the browser");
      };
    }, {}], 66: [function(require2, module2, exports2) {
      var eos;
      function once(callback) {
        var called = false;
        return function() {
          if (called)
            return;
          called = true;
          callback.apply(void 0, arguments);
        };
      }
      var _require$codes = require2("../../../errors").codes, ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS, ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
      function noop(err) {
        if (err)
          throw err;
      }
      function isRequest(stream) {
        return stream.setHeader && typeof stream.abort === "function";
      }
      function destroyer(stream, reading, writing, callback) {
        callback = once(callback);
        var closed = false;
        stream.on("close", function() {
          closed = true;
        });
        if (eos === void 0)
          eos = require2("./end-of-stream");
        eos(stream, {
          readable: reading,
          writable: writing
        }, function(err) {
          if (err)
            return callback(err);
          closed = true;
          callback();
        });
        var destroyed = false;
        return function(err) {
          if (closed)
            return;
          if (destroyed)
            return;
          destroyed = true;
          if (isRequest(stream))
            return stream.abort();
          if (typeof stream.destroy === "function")
            return stream.destroy();
          callback(err || new ERR_STREAM_DESTROYED("pipe"));
        };
      }
      function call(fn) {
        fn();
      }
      function pipe(from, to) {
        return from.pipe(to);
      }
      function popCallback(streams) {
        if (!streams.length)
          return noop;
        if (typeof streams[streams.length - 1] !== "function")
          return noop;
        return streams.pop();
      }
      function pipeline() {
        for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
          streams[_key] = arguments[_key];
        }
        var callback = popCallback(streams);
        if (Array.isArray(streams[0]))
          streams = streams[0];
        if (streams.length < 2) {
          throw new ERR_MISSING_ARGS("streams");
        }
        var error;
        var destroys = streams.map(function(stream, i) {
          var reading = i < streams.length - 1;
          var writing = i > 0;
          return destroyer(stream, reading, writing, function(err) {
            if (!error)
              error = err;
            if (err)
              destroys.forEach(call);
            if (reading)
              return;
            destroys.forEach(call);
            callback(error);
          });
        });
        return streams.reduce(pipe);
      }
      module2.exports = pipeline;
    }, { "../../../errors": 55, "./end-of-stream": 64 }], 67: [function(require2, module2, exports2) {
      var ERR_INVALID_OPT_VALUE = require2("../../../errors").codes.ERR_INVALID_OPT_VALUE;
      function highWaterMarkFrom(options, isDuplex, duplexKey) {
        return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
      }
      function getHighWaterMark(state, options, duplexKey, isDuplex) {
        var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
        if (hwm != null) {
          if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
            var name = isDuplex ? duplexKey : "highWaterMark";
            throw new ERR_INVALID_OPT_VALUE(name, hwm);
          }
          return Math.floor(hwm);
        }
        return state.objectMode ? 16 : 16 * 1024;
      }
      module2.exports = {
        getHighWaterMark
      };
    }, { "../../../errors": 55 }], 68: [function(require2, module2, exports2) {
      module2.exports = require2("events").EventEmitter;
    }, { "events": 22 }], 69: [function(require2, module2, exports2) {
      exports2 = module2.exports = require2("./lib/_stream_readable.js");
      exports2.Stream = exports2;
      exports2.Readable = exports2;
      exports2.Writable = require2("./lib/_stream_writable.js");
      exports2.Duplex = require2("./lib/_stream_duplex.js");
      exports2.Transform = require2("./lib/_stream_transform.js");
      exports2.PassThrough = require2("./lib/_stream_passthrough.js");
      exports2.finished = require2("./lib/internal/streams/end-of-stream.js");
      exports2.pipeline = require2("./lib/internal/streams/pipeline.js");
    }, { "./lib/_stream_duplex.js": 56, "./lib/_stream_passthrough.js": 57, "./lib/_stream_readable.js": 58, "./lib/_stream_transform.js": 59, "./lib/_stream_writable.js": 60, "./lib/internal/streams/end-of-stream.js": 64, "./lib/internal/streams/pipeline.js": 66 }], 70: [function(require2, module2, exports2) {
      function ReInterval(callback, interval, args) {
        var self2 = this;
        this._callback = callback;
        this._args = args;
        this._interval = setInterval(callback, interval, this._args);
        this.reschedule = function(interval2) {
          if (!interval2)
            interval2 = self2._interval;
          if (self2._interval)
            clearInterval(self2._interval);
          self2._interval = setInterval(self2._callback, interval2, self2._args);
        };
        this.clear = function() {
          if (self2._interval) {
            clearInterval(self2._interval);
            self2._interval = void 0;
          }
        };
        this.destroy = function() {
          if (self2._interval) {
            clearInterval(self2._interval);
          }
          self2._callback = void 0;
          self2._interval = void 0;
          self2._args = void 0;
        };
      }
      function reInterval() {
        if (typeof arguments[0] !== "function")
          throw new Error("callback needed");
        if (typeof arguments[1] !== "number")
          throw new Error("interval needed");
        var args;
        if (arguments.length > 0) {
          args = new Array(arguments.length - 2);
          for (var i = 0; i < args.length; i++) {
            args[i] = arguments[i + 2];
          }
        }
        return new ReInterval(arguments[0], arguments[1], args);
      }
      module2.exports = reInterval;
    }, {}], 71: [function(require2, module2, exports2) {
      module2.exports = require2("./index.js")();
    }, { "./index.js": 72 }], 72: [function(require2, module2, exports2) {
      (function(Buffer2) {
        (function() {
          module2.exports = rfdc;
          function copyBuffer(cur) {
            if (cur instanceof Buffer2) {
              return Buffer2.from(cur);
            }
            return new cur.constructor(cur.buffer.slice(), cur.byteOffset, cur.length);
          }
          function rfdc(opts) {
            opts = opts || {};
            if (opts.circles)
              return rfdcCircles(opts);
            return opts.proto ? cloneProto : clone;
            function cloneArray(a, fn) {
              var keys = Object.keys(a);
              var a2 = new Array(keys.length);
              for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                var cur = a[k];
                if (typeof cur !== "object" || cur === null) {
                  a2[k] = cur;
                } else if (cur instanceof Date) {
                  a2[k] = new Date(cur);
                } else if (ArrayBuffer.isView(cur)) {
                  a2[k] = copyBuffer(cur);
                } else {
                  a2[k] = fn(cur);
                }
              }
              return a2;
            }
            function clone(o) {
              if (typeof o !== "object" || o === null)
                return o;
              if (o instanceof Date)
                return new Date(o);
              if (Array.isArray(o))
                return cloneArray(o, clone);
              if (o instanceof Map)
                return new Map(cloneArray(Array.from(o), clone));
              if (o instanceof Set)
                return new Set(cloneArray(Array.from(o), clone));
              var o2 = {};
              for (var k in o) {
                if (Object.hasOwnProperty.call(o, k) === false)
                  continue;
                var cur = o[k];
                if (typeof cur !== "object" || cur === null) {
                  o2[k] = cur;
                } else if (cur instanceof Date) {
                  o2[k] = new Date(cur);
                } else if (cur instanceof Map) {
                  o2[k] = new Map(cloneArray(Array.from(cur), clone));
                } else if (cur instanceof Set) {
                  o2[k] = new Set(cloneArray(Array.from(cur), clone));
                } else if (ArrayBuffer.isView(cur)) {
                  o2[k] = copyBuffer(cur);
                } else {
                  o2[k] = clone(cur);
                }
              }
              return o2;
            }
            function cloneProto(o) {
              if (typeof o !== "object" || o === null)
                return o;
              if (o instanceof Date)
                return new Date(o);
              if (Array.isArray(o))
                return cloneArray(o, cloneProto);
              if (o instanceof Map)
                return new Map(cloneArray(Array.from(o), cloneProto));
              if (o instanceof Set)
                return new Set(cloneArray(Array.from(o), cloneProto));
              var o2 = {};
              for (var k in o) {
                var cur = o[k];
                if (typeof cur !== "object" || cur === null) {
                  o2[k] = cur;
                } else if (cur instanceof Date) {
                  o2[k] = new Date(cur);
                } else if (cur instanceof Map) {
                  o2[k] = new Map(cloneArray(Array.from(cur), cloneProto));
                } else if (cur instanceof Set) {
                  o2[k] = new Set(cloneArray(Array.from(cur), cloneProto));
                } else if (ArrayBuffer.isView(cur)) {
                  o2[k] = copyBuffer(cur);
                } else {
                  o2[k] = cloneProto(cur);
                }
              }
              return o2;
            }
          }
          function rfdcCircles(opts) {
            var refs = [];
            var refsNew = [];
            return opts.proto ? cloneProto : clone;
            function cloneArray(a, fn) {
              var keys = Object.keys(a);
              var a2 = new Array(keys.length);
              for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                var cur = a[k];
                if (typeof cur !== "object" || cur === null) {
                  a2[k] = cur;
                } else if (cur instanceof Date) {
                  a2[k] = new Date(cur);
                } else if (ArrayBuffer.isView(cur)) {
                  a2[k] = copyBuffer(cur);
                } else {
                  var index = refs.indexOf(cur);
                  if (index !== -1) {
                    a2[k] = refsNew[index];
                  } else {
                    a2[k] = fn(cur);
                  }
                }
              }
              return a2;
            }
            function clone(o) {
              if (typeof o !== "object" || o === null)
                return o;
              if (o instanceof Date)
                return new Date(o);
              if (Array.isArray(o))
                return cloneArray(o, clone);
              if (o instanceof Map)
                return new Map(cloneArray(Array.from(o), clone));
              if (o instanceof Set)
                return new Set(cloneArray(Array.from(o), clone));
              var o2 = {};
              refs.push(o);
              refsNew.push(o2);
              for (var k in o) {
                if (Object.hasOwnProperty.call(o, k) === false)
                  continue;
                var cur = o[k];
                if (typeof cur !== "object" || cur === null) {
                  o2[k] = cur;
                } else if (cur instanceof Date) {
                  o2[k] = new Date(cur);
                } else if (cur instanceof Map) {
                  o2[k] = new Map(cloneArray(Array.from(cur), clone));
                } else if (cur instanceof Set) {
                  o2[k] = new Set(cloneArray(Array.from(cur), clone));
                } else if (ArrayBuffer.isView(cur)) {
                  o2[k] = copyBuffer(cur);
                } else {
                  var i = refs.indexOf(cur);
                  if (i !== -1) {
                    o2[k] = refsNew[i];
                  } else {
                    o2[k] = clone(cur);
                  }
                }
              }
              refs.pop();
              refsNew.pop();
              return o2;
            }
            function cloneProto(o) {
              if (typeof o !== "object" || o === null)
                return o;
              if (o instanceof Date)
                return new Date(o);
              if (Array.isArray(o))
                return cloneArray(o, cloneProto);
              if (o instanceof Map)
                return new Map(cloneArray(Array.from(o), cloneProto));
              if (o instanceof Set)
                return new Set(cloneArray(Array.from(o), cloneProto));
              var o2 = {};
              refs.push(o);
              refsNew.push(o2);
              for (var k in o) {
                var cur = o[k];
                if (typeof cur !== "object" || cur === null) {
                  o2[k] = cur;
                } else if (cur instanceof Date) {
                  o2[k] = new Date(cur);
                } else if (cur instanceof Map) {
                  o2[k] = new Map(cloneArray(Array.from(cur), cloneProto));
                } else if (cur instanceof Set) {
                  o2[k] = new Set(cloneArray(Array.from(cur), cloneProto));
                } else if (ArrayBuffer.isView(cur)) {
                  o2[k] = copyBuffer(cur);
                } else {
                  var i = refs.indexOf(cur);
                  if (i !== -1) {
                    o2[k] = refsNew[i];
                  } else {
                    o2[k] = cloneProto(cur);
                  }
                }
              }
              refs.pop();
              refsNew.pop();
              return o2;
            }
          }
        }).call(this);
      }).call(this, require2("buffer").Buffer);
    }, { "buffer": 17 }], 73: [function(require2, module2, exports2) {
      /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
      var buffer = require2("buffer");
      var Buffer2 = buffer.Buffer;
      function copyProps(src, dst) {
        for (var key in src) {
          dst[key] = src[key];
        }
      }
      if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
        module2.exports = buffer;
      } else {
        copyProps(buffer, exports2);
        exports2.Buffer = SafeBuffer;
      }
      function SafeBuffer(arg, encodingOrOffset, length) {
        return Buffer2(arg, encodingOrOffset, length);
      }
      SafeBuffer.prototype = Object.create(Buffer2.prototype);
      copyProps(Buffer2, SafeBuffer);
      SafeBuffer.from = function(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          throw new TypeError("Argument must not be a number");
        }
        return Buffer2(arg, encodingOrOffset, length);
      };
      SafeBuffer.alloc = function(size, fill, encoding) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        var buf = Buffer2(size);
        if (fill !== void 0) {
          if (typeof encoding === "string") {
            buf.fill(fill, encoding);
          } else {
            buf.fill(fill);
          }
        } else {
          buf.fill(0);
        }
        return buf;
      };
      SafeBuffer.allocUnsafe = function(size) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        return Buffer2(size);
      };
      SafeBuffer.allocUnsafeSlow = function(size) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        return buffer.SlowBuffer(size);
      };
    }, { "buffer": 17 }], 74: [function(require2, module2, exports2) {
      module2.exports = shift;
      function shift(stream) {
        var rs = stream._readableState;
        if (!rs)
          return null;
        return rs.objectMode || typeof stream._duplexState === "number" ? stream.read() : stream.read(getStateLength(rs));
      }
      function getStateLength(state) {
        if (state.buffer.length) {
          if (state.buffer.head) {
            return state.buffer.head.data.length;
          }
          return state.buffer[0].length;
        }
        return state.length;
      }
    }, {}], 75: [function(require2, module2, exports2) {
      var Buffer2 = require2("safe-buffer").Buffer;
      var isEncoding = Buffer2.isEncoding || function(encoding) {
        encoding = "" + encoding;
        switch (encoding && encoding.toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
          case "raw":
            return true;
          default:
            return false;
        }
      };
      function _normalizeEncoding(enc) {
        if (!enc)
          return "utf8";
        var retried;
        while (true) {
          switch (enc) {
            case "utf8":
            case "utf-8":
              return "utf8";
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return "utf16le";
            case "latin1":
            case "binary":
              return "latin1";
            case "base64":
            case "ascii":
            case "hex":
              return enc;
            default:
              if (retried)
                return;
              enc = ("" + enc).toLowerCase();
              retried = true;
          }
        }
      }
      function normalizeEncoding(enc) {
        var nenc = _normalizeEncoding(enc);
        if (typeof nenc !== "string" && (Buffer2.isEncoding === isEncoding || !isEncoding(enc)))
          throw new Error("Unknown encoding: " + enc);
        return nenc || enc;
      }
      exports2.StringDecoder = StringDecoder;
      function StringDecoder(encoding) {
        this.encoding = normalizeEncoding(encoding);
        var nb;
        switch (this.encoding) {
          case "utf16le":
            this.text = utf16Text;
            this.end = utf16End;
            nb = 4;
            break;
          case "utf8":
            this.fillLast = utf8FillLast;
            nb = 4;
            break;
          case "base64":
            this.text = base64Text;
            this.end = base64End;
            nb = 3;
            break;
          default:
            this.write = simpleWrite;
            this.end = simpleEnd;
            return;
        }
        this.lastNeed = 0;
        this.lastTotal = 0;
        this.lastChar = Buffer2.allocUnsafe(nb);
      }
      StringDecoder.prototype.write = function(buf) {
        if (buf.length === 0)
          return "";
        var r;
        var i;
        if (this.lastNeed) {
          r = this.fillLast(buf);
          if (r === void 0)
            return "";
          i = this.lastNeed;
          this.lastNeed = 0;
        } else {
          i = 0;
        }
        if (i < buf.length)
          return r ? r + this.text(buf, i) : this.text(buf, i);
        return r || "";
      };
      StringDecoder.prototype.end = utf8End;
      StringDecoder.prototype.text = utf8Text;
      StringDecoder.prototype.fillLast = function(buf) {
        if (this.lastNeed <= buf.length) {
          buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
          return this.lastChar.toString(this.encoding, 0, this.lastTotal);
        }
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
        this.lastNeed -= buf.length;
      };
      function utf8CheckByte(byte) {
        if (byte <= 127)
          return 0;
        else if (byte >> 5 === 6)
          return 2;
        else if (byte >> 4 === 14)
          return 3;
        else if (byte >> 3 === 30)
          return 4;
        return byte >> 6 === 2 ? -1 : -2;
      }
      function utf8CheckIncomplete(self2, buf, i) {
        var j = buf.length - 1;
        if (j < i)
          return 0;
        var nb = utf8CheckByte(buf[j]);
        if (nb >= 0) {
          if (nb > 0)
            self2.lastNeed = nb - 1;
          return nb;
        }
        if (--j < i || nb === -2)
          return 0;
        nb = utf8CheckByte(buf[j]);
        if (nb >= 0) {
          if (nb > 0)
            self2.lastNeed = nb - 2;
          return nb;
        }
        if (--j < i || nb === -2)
          return 0;
        nb = utf8CheckByte(buf[j]);
        if (nb >= 0) {
          if (nb > 0) {
            if (nb === 2)
              nb = 0;
            else
              self2.lastNeed = nb - 3;
          }
          return nb;
        }
        return 0;
      }
      function utf8CheckExtraBytes(self2, buf, p) {
        if ((buf[0] & 192) !== 128) {
          self2.lastNeed = 0;
          return "\uFFFD";
        }
        if (self2.lastNeed > 1 && buf.length > 1) {
          if ((buf[1] & 192) !== 128) {
            self2.lastNeed = 1;
            return "\uFFFD";
          }
          if (self2.lastNeed > 2 && buf.length > 2) {
            if ((buf[2] & 192) !== 128) {
              self2.lastNeed = 2;
              return "\uFFFD";
            }
          }
        }
      }
      function utf8FillLast(buf) {
        var p = this.lastTotal - this.lastNeed;
        var r = utf8CheckExtraBytes(this, buf);
        if (r !== void 0)
          return r;
        if (this.lastNeed <= buf.length) {
          buf.copy(this.lastChar, p, 0, this.lastNeed);
          return this.lastChar.toString(this.encoding, 0, this.lastTotal);
        }
        buf.copy(this.lastChar, p, 0, buf.length);
        this.lastNeed -= buf.length;
      }
      function utf8Text(buf, i) {
        var total = utf8CheckIncomplete(this, buf, i);
        if (!this.lastNeed)
          return buf.toString("utf8", i);
        this.lastTotal = total;
        var end = buf.length - (total - this.lastNeed);
        buf.copy(this.lastChar, 0, end);
        return buf.toString("utf8", i, end);
      }
      function utf8End(buf) {
        var r = buf && buf.length ? this.write(buf) : "";
        if (this.lastNeed)
          return r + "\uFFFD";
        return r;
      }
      function utf16Text(buf, i) {
        if ((buf.length - i) % 2 === 0) {
          var r = buf.toString("utf16le", i);
          if (r) {
            var c = r.charCodeAt(r.length - 1);
            if (c >= 55296 && c <= 56319) {
              this.lastNeed = 2;
              this.lastTotal = 4;
              this.lastChar[0] = buf[buf.length - 2];
              this.lastChar[1] = buf[buf.length - 1];
              return r.slice(0, -1);
            }
          }
          return r;
        }
        this.lastNeed = 1;
        this.lastTotal = 2;
        this.lastChar[0] = buf[buf.length - 1];
        return buf.toString("utf16le", i, buf.length - 1);
      }
      function utf16End(buf) {
        var r = buf && buf.length ? this.write(buf) : "";
        if (this.lastNeed) {
          var end = this.lastTotal - this.lastNeed;
          return r + this.lastChar.toString("utf16le", 0, end);
        }
        return r;
      }
      function base64Text(buf, i) {
        var n = (buf.length - i) % 3;
        if (n === 0)
          return buf.toString("base64", i);
        this.lastNeed = 3 - n;
        this.lastTotal = 3;
        if (n === 1) {
          this.lastChar[0] = buf[buf.length - 1];
        } else {
          this.lastChar[0] = buf[buf.length - 2];
          this.lastChar[1] = buf[buf.length - 1];
        }
        return buf.toString("base64", i, buf.length - n);
      }
      function base64End(buf) {
        var r = buf && buf.length ? this.write(buf) : "";
        if (this.lastNeed)
          return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
        return r;
      }
      function simpleWrite(buf) {
        return buf.toString(this.encoding);
      }
      function simpleEnd(buf) {
        return buf && buf.length ? this.write(buf) : "";
      }
    }, { "safe-buffer": 73 }], 76: [function(require2, module2, exports2) {
      var punycode = require2("punycode");
      var util = require2("./util");
      exports2.parse = urlParse;
      exports2.resolve = urlResolve;
      exports2.resolveObject = urlResolveObject;
      exports2.format = urlFormat;
      exports2.Url = Url;
      function Url() {
        this.protocol = null;
        this.slashes = null;
        this.auth = null;
        this.host = null;
        this.port = null;
        this.hostname = null;
        this.hash = null;
        this.search = null;
        this.query = null;
        this.pathname = null;
        this.path = null;
        this.href = null;
      }
      var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]*$/, simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, delims = ["<", ">", '"', "`", " ", "\r", "\n", "	"], unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims), autoEscape = ["'"].concat(unwise), nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape), hostEndingChars = ["/", "?", "#"], hostnameMaxLen = 255, hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/, hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, unsafeProtocol = {
        "javascript": true,
        "javascript:": true
      }, hostlessProtocol = {
        "javascript": true,
        "javascript:": true
      }, slashedProtocol = {
        "http": true,
        "https": true,
        "ftp": true,
        "gopher": true,
        "file": true,
        "http:": true,
        "https:": true,
        "ftp:": true,
        "gopher:": true,
        "file:": true
      }, querystring = require2("querystring");
      function urlParse(url, parseQueryString, slashesDenoteHost) {
        if (url && util.isObject(url) && url instanceof Url)
          return url;
        var u = new Url();
        u.parse(url, parseQueryString, slashesDenoteHost);
        return u;
      }
      Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
        if (!util.isString(url)) {
          throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
        }
        var queryIndex = url.indexOf("?"), splitter = queryIndex !== -1 && queryIndex < url.indexOf("#") ? "?" : "#", uSplit = url.split(splitter), slashRegex = /\\/g;
        uSplit[0] = uSplit[0].replace(slashRegex, "/");
        url = uSplit.join(splitter);
        var rest = url;
        rest = rest.trim();
        if (!slashesDenoteHost && url.split("#").length === 1) {
          var simplePath = simplePathPattern.exec(rest);
          if (simplePath) {
            this.path = rest;
            this.href = rest;
            this.pathname = simplePath[1];
            if (simplePath[2]) {
              this.search = simplePath[2];
              if (parseQueryString) {
                this.query = querystring.parse(this.search.substr(1));
              } else {
                this.query = this.search.substr(1);
              }
            } else if (parseQueryString) {
              this.search = "";
              this.query = {};
            }
            return this;
          }
        }
        var proto = protocolPattern.exec(rest);
        if (proto) {
          proto = proto[0];
          var lowerProto = proto.toLowerCase();
          this.protocol = lowerProto;
          rest = rest.substr(proto.length);
        }
        if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
          var slashes = rest.substr(0, 2) === "//";
          if (slashes && !(proto && hostlessProtocol[proto])) {
            rest = rest.substr(2);
            this.slashes = true;
          }
        }
        if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
          var hostEnd = -1;
          for (var i = 0; i < hostEndingChars.length; i++) {
            var hec = rest.indexOf(hostEndingChars[i]);
            if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
              hostEnd = hec;
          }
          var auth, atSign;
          if (hostEnd === -1) {
            atSign = rest.lastIndexOf("@");
          } else {
            atSign = rest.lastIndexOf("@", hostEnd);
          }
          if (atSign !== -1) {
            auth = rest.slice(0, atSign);
            rest = rest.slice(atSign + 1);
            this.auth = decodeURIComponent(auth);
          }
          hostEnd = -1;
          for (var i = 0; i < nonHostChars.length; i++) {
            var hec = rest.indexOf(nonHostChars[i]);
            if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
              hostEnd = hec;
          }
          if (hostEnd === -1)
            hostEnd = rest.length;
          this.host = rest.slice(0, hostEnd);
          rest = rest.slice(hostEnd);
          this.parseHost();
          this.hostname = this.hostname || "";
          var ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
          if (!ipv6Hostname) {
            var hostparts = this.hostname.split(/\./);
            for (var i = 0, l = hostparts.length; i < l; i++) {
              var part = hostparts[i];
              if (!part)
                continue;
              if (!part.match(hostnamePartPattern)) {
                var newpart = "";
                for (var j = 0, k = part.length; j < k; j++) {
                  if (part.charCodeAt(j) > 127) {
                    newpart += "x";
                  } else {
                    newpart += part[j];
                  }
                }
                if (!newpart.match(hostnamePartPattern)) {
                  var validParts = hostparts.slice(0, i);
                  var notHost = hostparts.slice(i + 1);
                  var bit = part.match(hostnamePartStart);
                  if (bit) {
                    validParts.push(bit[1]);
                    notHost.unshift(bit[2]);
                  }
                  if (notHost.length) {
                    rest = "/" + notHost.join(".") + rest;
                  }
                  this.hostname = validParts.join(".");
                  break;
                }
              }
            }
          }
          if (this.hostname.length > hostnameMaxLen) {
            this.hostname = "";
          } else {
            this.hostname = this.hostname.toLowerCase();
          }
          if (!ipv6Hostname) {
            this.hostname = punycode.toASCII(this.hostname);
          }
          var p = this.port ? ":" + this.port : "";
          var h = this.hostname || "";
          this.host = h + p;
          this.href += this.host;
          if (ipv6Hostname) {
            this.hostname = this.hostname.substr(1, this.hostname.length - 2);
            if (rest[0] !== "/") {
              rest = "/" + rest;
            }
          }
        }
        if (!unsafeProtocol[lowerProto]) {
          for (var i = 0, l = autoEscape.length; i < l; i++) {
            var ae = autoEscape[i];
            if (rest.indexOf(ae) === -1)
              continue;
            var esc = encodeURIComponent(ae);
            if (esc === ae) {
              esc = escape(ae);
            }
            rest = rest.split(ae).join(esc);
          }
        }
        var hash = rest.indexOf("#");
        if (hash !== -1) {
          this.hash = rest.substr(hash);
          rest = rest.slice(0, hash);
        }
        var qm = rest.indexOf("?");
        if (qm !== -1) {
          this.search = rest.substr(qm);
          this.query = rest.substr(qm + 1);
          if (parseQueryString) {
            this.query = querystring.parse(this.query);
          }
          rest = rest.slice(0, qm);
        } else if (parseQueryString) {
          this.search = "";
          this.query = {};
        }
        if (rest)
          this.pathname = rest;
        if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
          this.pathname = "/";
        }
        if (this.pathname || this.search) {
          var p = this.pathname || "";
          var s = this.search || "";
          this.path = p + s;
        }
        this.href = this.format();
        return this;
      };
      function urlFormat(obj) {
        if (util.isString(obj))
          obj = urlParse(obj);
        if (!(obj instanceof Url))
          return Url.prototype.format.call(obj);
        return obj.format();
      }
      Url.prototype.format = function() {
        var auth = this.auth || "";
        if (auth) {
          auth = encodeURIComponent(auth);
          auth = auth.replace(/%3A/i, ":");
          auth += "@";
        }
        var protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = false, query = "";
        if (this.host) {
          host = auth + this.host;
        } else if (this.hostname) {
          host = auth + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]");
          if (this.port) {
            host += ":" + this.port;
          }
        }
        if (this.query && util.isObject(this.query) && Object.keys(this.query).length) {
          query = querystring.stringify(this.query);
        }
        var search = this.search || query && "?" + query || "";
        if (protocol && protocol.substr(-1) !== ":")
          protocol += ":";
        if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
          host = "//" + (host || "");
          if (pathname && pathname.charAt(0) !== "/")
            pathname = "/" + pathname;
        } else if (!host) {
          host = "";
        }
        if (hash && hash.charAt(0) !== "#")
          hash = "#" + hash;
        if (search && search.charAt(0) !== "?")
          search = "?" + search;
        pathname = pathname.replace(/[?#]/g, function(match) {
          return encodeURIComponent(match);
        });
        search = search.replace("#", "%23");
        return protocol + host + pathname + search + hash;
      };
      function urlResolve(source, relative) {
        return urlParse(source, false, true).resolve(relative);
      }
      Url.prototype.resolve = function(relative) {
        return this.resolveObject(urlParse(relative, false, true)).format();
      };
      function urlResolveObject(source, relative) {
        if (!source)
          return relative;
        return urlParse(source, false, true).resolveObject(relative);
      }
      Url.prototype.resolveObject = function(relative) {
        if (util.isString(relative)) {
          var rel = new Url();
          rel.parse(relative, false, true);
          relative = rel;
        }
        var result = new Url();
        var tkeys = Object.keys(this);
        for (var tk = 0; tk < tkeys.length; tk++) {
          var tkey = tkeys[tk];
          result[tkey] = this[tkey];
        }
        result.hash = relative.hash;
        if (relative.href === "") {
          result.href = result.format();
          return result;
        }
        if (relative.slashes && !relative.protocol) {
          var rkeys = Object.keys(relative);
          for (var rk = 0; rk < rkeys.length; rk++) {
            var rkey = rkeys[rk];
            if (rkey !== "protocol")
              result[rkey] = relative[rkey];
          }
          if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
            result.path = result.pathname = "/";
          }
          result.href = result.format();
          return result;
        }
        if (relative.protocol && relative.protocol !== result.protocol) {
          if (!slashedProtocol[relative.protocol]) {
            var keys = Object.keys(relative);
            for (var v = 0; v < keys.length; v++) {
              var k = keys[v];
              result[k] = relative[k];
            }
            result.href = result.format();
            return result;
          }
          result.protocol = relative.protocol;
          if (!relative.host && !hostlessProtocol[relative.protocol]) {
            var relPath = (relative.pathname || "").split("/");
            while (relPath.length && !(relative.host = relPath.shift()))
              ;
            if (!relative.host)
              relative.host = "";
            if (!relative.hostname)
              relative.hostname = "";
            if (relPath[0] !== "")
              relPath.unshift("");
            if (relPath.length < 2)
              relPath.unshift("");
            result.pathname = relPath.join("/");
          } else {
            result.pathname = relative.pathname;
          }
          result.search = relative.search;
          result.query = relative.query;
          result.host = relative.host || "";
          result.auth = relative.auth;
          result.hostname = relative.hostname || relative.host;
          result.port = relative.port;
          if (result.pathname || result.search) {
            var p = result.pathname || "";
            var s = result.search || "";
            result.path = p + s;
          }
          result.slashes = result.slashes || relative.slashes;
          result.href = result.format();
          return result;
        }
        var isSourceAbs = result.pathname && result.pathname.charAt(0) === "/", isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === "/", mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [], relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
        if (psychotic) {
          result.hostname = "";
          result.port = null;
          if (result.host) {
            if (srcPath[0] === "")
              srcPath[0] = result.host;
            else
              srcPath.unshift(result.host);
          }
          result.host = "";
          if (relative.protocol) {
            relative.hostname = null;
            relative.port = null;
            if (relative.host) {
              if (relPath[0] === "")
                relPath[0] = relative.host;
              else
                relPath.unshift(relative.host);
            }
            relative.host = null;
          }
          mustEndAbs = mustEndAbs && (relPath[0] === "" || srcPath[0] === "");
        }
        if (isRelAbs) {
          result.host = relative.host || relative.host === "" ? relative.host : result.host;
          result.hostname = relative.hostname || relative.hostname === "" ? relative.hostname : result.hostname;
          result.search = relative.search;
          result.query = relative.query;
          srcPath = relPath;
        } else if (relPath.length) {
          if (!srcPath)
            srcPath = [];
          srcPath.pop();
          srcPath = srcPath.concat(relPath);
          result.search = relative.search;
          result.query = relative.query;
        } else if (!util.isNullOrUndefined(relative.search)) {
          if (psychotic) {
            result.hostname = result.host = srcPath.shift();
            var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
            if (authInHost) {
              result.auth = authInHost.shift();
              result.host = result.hostname = authInHost.shift();
            }
          }
          result.search = relative.search;
          result.query = relative.query;
          if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
            result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
          }
          result.href = result.format();
          return result;
        }
        if (!srcPath.length) {
          result.pathname = null;
          if (result.search) {
            result.path = "/" + result.search;
          } else {
            result.path = null;
          }
          result.href = result.format();
          return result;
        }
        var last = srcPath.slice(-1)[0];
        var hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last === "." || last === "..") || last === "";
        var up = 0;
        for (var i = srcPath.length; i >= 0; i--) {
          last = srcPath[i];
          if (last === ".") {
            srcPath.splice(i, 1);
          } else if (last === "..") {
            srcPath.splice(i, 1);
            up++;
          } else if (up) {
            srcPath.splice(i, 1);
            up--;
          }
        }
        if (!mustEndAbs && !removeAllDots) {
          for (; up--; up) {
            srcPath.unshift("..");
          }
        }
        if (mustEndAbs && srcPath[0] !== "" && (!srcPath[0] || srcPath[0].charAt(0) !== "/")) {
          srcPath.unshift("");
        }
        if (hasTrailingSlash && srcPath.join("/").substr(-1) !== "/") {
          srcPath.push("");
        }
        var isAbsolute = srcPath[0] === "" || srcPath[0] && srcPath[0].charAt(0) === "/";
        if (psychotic) {
          result.hostname = result.host = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
          var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
          if (authInHost) {
            result.auth = authInHost.shift();
            result.host = result.hostname = authInHost.shift();
          }
        }
        mustEndAbs = mustEndAbs || result.host && srcPath.length;
        if (mustEndAbs && !isAbsolute) {
          srcPath.unshift("");
        }
        if (!srcPath.length) {
          result.pathname = null;
          result.path = null;
        } else {
          result.pathname = srcPath.join("/");
        }
        if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
          result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
        }
        result.auth = relative.auth || result.auth;
        result.slashes = result.slashes || relative.slashes;
        result.href = result.format();
        return result;
      };
      Url.prototype.parseHost = function() {
        var host = this.host;
        var port = portPattern.exec(host);
        if (port) {
          port = port[0];
          if (port !== ":") {
            this.port = port.substr(1);
          }
          host = host.substr(0, host.length - port.length);
        }
        if (host)
          this.hostname = host;
      };
    }, { "./util": 77, "punycode": 51, "querystring": 54 }], 77: [function(require2, module2, exports2) {
      module2.exports = {
        isString: function(arg) {
          return typeof arg === "string";
        },
        isObject: function(arg) {
          return typeof arg === "object" && arg !== null;
        },
        isNull: function(arg) {
          return arg === null;
        },
        isNullOrUndefined: function(arg) {
          return arg == null;
        }
      };
    }, {}], 78: [function(require2, module2, exports2) {
      (function(global2) {
        (function() {
          module2.exports = deprecate;
          function deprecate(fn, msg) {
            if (config("noDeprecation")) {
              return fn;
            }
            var warned = false;
            function deprecated() {
              if (!warned) {
                if (config("throwDeprecation")) {
                  throw new Error(msg);
                } else if (config("traceDeprecation")) {
                  console.trace(msg);
                } else {
                  console.warn(msg);
                }
                warned = true;
              }
              return fn.apply(this, arguments);
            }
            return deprecated;
          }
          function config(name) {
            try {
              if (!global2.localStorage)
                return false;
            } catch (_) {
              return false;
            }
            var val = global2.localStorage[name];
            if (val == null)
              return false;
            return String(val).toLowerCase() === "true";
          }
        }).call(this);
      }).call(this, typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {}], 79: [function(require2, module2, exports2) {
      module2.exports = wrappy;
      function wrappy(fn, cb) {
        if (fn && cb)
          return wrappy(fn)(cb);
        if (typeof fn !== "function")
          throw new TypeError("need wrapper function");
        Object.keys(fn).forEach(function(k) {
          wrapper[k] = fn[k];
        });
        return wrapper;
        function wrapper() {
          var args = new Array(arguments.length);
          for (var i = 0; i < args.length; i++) {
            args[i] = arguments[i];
          }
          var ret = fn.apply(this, args);
          var cb2 = args[args.length - 1];
          if (typeof ret === "function" && ret !== cb2) {
            Object.keys(cb2).forEach(function(k) {
              ret[k] = cb2[k];
            });
          }
          return ret;
        }
      }
    }, {}], 80: [function(require2, module2, exports2) {
      module2.exports = function() {
        throw new Error("ws does not work in the browser. Browser clients must use the native WebSocket object");
      };
    }, {}], 81: [function(require2, module2, exports2) {
      module2.exports = extend;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      function extend() {
        var target = {};
        for (var i = 0; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      }
    }, {}], 82: [function(require2, module2, exports2) {
      module2.exports = function(Yallist) {
        Yallist.prototype[Symbol.iterator] = function* () {
          for (let walker = this.head; walker; walker = walker.next) {
            yield walker.value;
          }
        };
      };
    }, {}], 83: [function(require2, module2, exports2) {
      module2.exports = Yallist;
      Yallist.Node = Node;
      Yallist.create = Yallist;
      function Yallist(list) {
        var self2 = this;
        if (!(self2 instanceof Yallist)) {
          self2 = new Yallist();
        }
        self2.tail = null;
        self2.head = null;
        self2.length = 0;
        if (list && typeof list.forEach === "function") {
          list.forEach(function(item) {
            self2.push(item);
          });
        } else if (arguments.length > 0) {
          for (var i = 0, l = arguments.length; i < l; i++) {
            self2.push(arguments[i]);
          }
        }
        return self2;
      }
      Yallist.prototype.removeNode = function(node) {
        if (node.list !== this) {
          throw new Error("removing node which does not belong to this list");
        }
        var next = node.next;
        var prev = node.prev;
        if (next) {
          next.prev = prev;
        }
        if (prev) {
          prev.next = next;
        }
        if (node === this.head) {
          this.head = next;
        }
        if (node === this.tail) {
          this.tail = prev;
        }
        node.list.length--;
        node.next = null;
        node.prev = null;
        node.list = null;
        return next;
      };
      Yallist.prototype.unshiftNode = function(node) {
        if (node === this.head) {
          return;
        }
        if (node.list) {
          node.list.removeNode(node);
        }
        var head = this.head;
        node.list = this;
        node.next = head;
        if (head) {
          head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
          this.tail = node;
        }
        this.length++;
      };
      Yallist.prototype.pushNode = function(node) {
        if (node === this.tail) {
          return;
        }
        if (node.list) {
          node.list.removeNode(node);
        }
        var tail = this.tail;
        node.list = this;
        node.prev = tail;
        if (tail) {
          tail.next = node;
        }
        this.tail = node;
        if (!this.head) {
          this.head = node;
        }
        this.length++;
      };
      Yallist.prototype.push = function() {
        for (var i = 0, l = arguments.length; i < l; i++) {
          push(this, arguments[i]);
        }
        return this.length;
      };
      Yallist.prototype.unshift = function() {
        for (var i = 0, l = arguments.length; i < l; i++) {
          unshift(this, arguments[i]);
        }
        return this.length;
      };
      Yallist.prototype.pop = function() {
        if (!this.tail) {
          return void 0;
        }
        var res = this.tail.value;
        this.tail = this.tail.prev;
        if (this.tail) {
          this.tail.next = null;
        } else {
          this.head = null;
        }
        this.length--;
        return res;
      };
      Yallist.prototype.shift = function() {
        if (!this.head) {
          return void 0;
        }
        var res = this.head.value;
        this.head = this.head.next;
        if (this.head) {
          this.head.prev = null;
        } else {
          this.tail = null;
        }
        this.length--;
        return res;
      };
      Yallist.prototype.forEach = function(fn, thisp) {
        thisp = thisp || this;
        for (var walker = this.head, i = 0; walker !== null; i++) {
          fn.call(thisp, walker.value, i, this);
          walker = walker.next;
        }
      };
      Yallist.prototype.forEachReverse = function(fn, thisp) {
        thisp = thisp || this;
        for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
          fn.call(thisp, walker.value, i, this);
          walker = walker.prev;
        }
      };
      Yallist.prototype.get = function(n) {
        for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
          walker = walker.next;
        }
        if (i === n && walker !== null) {
          return walker.value;
        }
      };
      Yallist.prototype.getReverse = function(n) {
        for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
          walker = walker.prev;
        }
        if (i === n && walker !== null) {
          return walker.value;
        }
      };
      Yallist.prototype.map = function(fn, thisp) {
        thisp = thisp || this;
        var res = new Yallist();
        for (var walker = this.head; walker !== null; ) {
          res.push(fn.call(thisp, walker.value, this));
          walker = walker.next;
        }
        return res;
      };
      Yallist.prototype.mapReverse = function(fn, thisp) {
        thisp = thisp || this;
        var res = new Yallist();
        for (var walker = this.tail; walker !== null; ) {
          res.push(fn.call(thisp, walker.value, this));
          walker = walker.prev;
        }
        return res;
      };
      Yallist.prototype.reduce = function(fn, initial) {
        var acc;
        var walker = this.head;
        if (arguments.length > 1) {
          acc = initial;
        } else if (this.head) {
          walker = this.head.next;
          acc = this.head.value;
        } else {
          throw new TypeError("Reduce of empty list with no initial value");
        }
        for (var i = 0; walker !== null; i++) {
          acc = fn(acc, walker.value, i);
          walker = walker.next;
        }
        return acc;
      };
      Yallist.prototype.reduceReverse = function(fn, initial) {
        var acc;
        var walker = this.tail;
        if (arguments.length > 1) {
          acc = initial;
        } else if (this.tail) {
          walker = this.tail.prev;
          acc = this.tail.value;
        } else {
          throw new TypeError("Reduce of empty list with no initial value");
        }
        for (var i = this.length - 1; walker !== null; i--) {
          acc = fn(acc, walker.value, i);
          walker = walker.prev;
        }
        return acc;
      };
      Yallist.prototype.toArray = function() {
        var arr = new Array(this.length);
        for (var i = 0, walker = this.head; walker !== null; i++) {
          arr[i] = walker.value;
          walker = walker.next;
        }
        return arr;
      };
      Yallist.prototype.toArrayReverse = function() {
        var arr = new Array(this.length);
        for (var i = 0, walker = this.tail; walker !== null; i++) {
          arr[i] = walker.value;
          walker = walker.prev;
        }
        return arr;
      };
      Yallist.prototype.slice = function(from, to) {
        to = to || this.length;
        if (to < 0) {
          to += this.length;
        }
        from = from || 0;
        if (from < 0) {
          from += this.length;
        }
        var ret = new Yallist();
        if (to < from || to < 0) {
          return ret;
        }
        if (from < 0) {
          from = 0;
        }
        if (to > this.length) {
          to = this.length;
        }
        for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
          walker = walker.next;
        }
        for (; walker !== null && i < to; i++, walker = walker.next) {
          ret.push(walker.value);
        }
        return ret;
      };
      Yallist.prototype.sliceReverse = function(from, to) {
        to = to || this.length;
        if (to < 0) {
          to += this.length;
        }
        from = from || 0;
        if (from < 0) {
          from += this.length;
        }
        var ret = new Yallist();
        if (to < from || to < 0) {
          return ret;
        }
        if (from < 0) {
          from = 0;
        }
        if (to > this.length) {
          to = this.length;
        }
        for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
          walker = walker.prev;
        }
        for (; walker !== null && i > from; i--, walker = walker.prev) {
          ret.push(walker.value);
        }
        return ret;
      };
      Yallist.prototype.splice = function(start, deleteCount, ...nodes) {
        if (start > this.length) {
          start = this.length - 1;
        }
        if (start < 0) {
          start = this.length + start;
        }
        for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
          walker = walker.next;
        }
        var ret = [];
        for (var i = 0; walker && i < deleteCount; i++) {
          ret.push(walker.value);
          walker = this.removeNode(walker);
        }
        if (walker === null) {
          walker = this.tail;
        }
        if (walker !== this.head && walker !== this.tail) {
          walker = walker.prev;
        }
        for (var i = 0; i < nodes.length; i++) {
          walker = insert(this, walker, nodes[i]);
        }
        return ret;
      };
      Yallist.prototype.reverse = function() {
        var head = this.head;
        var tail = this.tail;
        for (var walker = head; walker !== null; walker = walker.prev) {
          var p = walker.prev;
          walker.prev = walker.next;
          walker.next = p;
        }
        this.head = tail;
        this.tail = head;
        return this;
      };
      function insert(self2, node, value) {
        var inserted = node === self2.head ? new Node(value, null, node, self2) : new Node(value, node, node.next, self2);
        if (inserted.next === null) {
          self2.tail = inserted;
        }
        if (inserted.prev === null) {
          self2.head = inserted;
        }
        self2.length++;
        return inserted;
      }
      function push(self2, item) {
        self2.tail = new Node(item, self2.tail, null, self2);
        if (!self2.head) {
          self2.head = self2.tail;
        }
        self2.length++;
      }
      function unshift(self2, item) {
        self2.head = new Node(item, null, self2.head, self2);
        if (!self2.tail) {
          self2.tail = self2.head;
        }
        self2.length++;
      }
      function Node(value, prev, next, list) {
        if (!(this instanceof Node)) {
          return new Node(value, prev, next, list);
        }
        this.list = list;
        this.value = value;
        if (prev) {
          prev.next = this;
          this.prev = prev;
        } else {
          this.prev = null;
        }
        if (next) {
          next.prev = this;
          this.next = next;
        } else {
          this.next = null;
        }
      }
      try {
        require2("./iterator.js")(Yallist);
      } catch (er) {
      }
    }, { "./iterator.js": 82 }] }, {}, [12])(12);
  });
})(mqtt$1);
var mqtt = /* @__PURE__ */ getDefaultExportFromCjs(mqtt$1.exports);
const eq = (str1, str2) => {
  let arr1 = str1.split("/");
  let arr2 = str2.split("/");
  if (!str1.includes("#") && !str2.includes("#") && arr1.length !== arr2.length) {
    return false;
  }
  if (arr2.length < arr1.length) {
    arr2 = str1.split("/");
    arr1 = str2.split("/");
  }
  let ret = true;
  arr1.forEach((val, i) => {
    if (val === "+" || val === "#" || arr2[i] && arr2[i] === "+" || arr2[i] && arr2[i] === "#" || arr2[i] && arr2[i] === val) {
      return;
    }
    ret = false;
  });
  return ret;
};
var common = { eq };
let client = null;
const messageListeners = /* @__PURE__ */ new Map();
const onConnectFail = () => {
  client == null ? void 0 : client.on("error", (error) => {
    console.log("connect fail", error);
    client == null ? void 0 : client.end();
  });
};
const onMessage = () => {
  client == null ? void 0 : client.on("message", (topic, message) => {
    if (message) {
      messageListeners.forEach((listeners, key) => {
        if (common.eq(topic, key) && listeners && listeners.length) {
          listeners.forEach((listener) => {
            listener.callback(topic, message);
          });
        }
      });
    }
  });
};
const onReconnect = () => {
  client == null ? void 0 : client.on("reconnect", () => {
    console.log("try to reconnect:", client == null ? void 0 : client.options);
  });
};
const connect = async (url, _options) => {
  client = mqtt.connect(url, _options);
  client.on("connect", () => {
    console.log(`success connect to host:${url}`);
  });
  onMessage();
  onReconnect();
  onConnectFail();
};
const disconnect = () => {
  client == null ? void 0 : client.end();
  client = null;
  console.log("mqtt disconnected");
};
const reconnect = (url, _options) => {
  disconnect();
  connect(url, _options);
  console.log("mqtt reconnect");
};
const subscribe = (topicArray, qos = 1) => {
  client == null ? void 0 : client.subscribe(topicArray, { qos });
};
const unSubscribe = (unTopic) => {
  client == null ? void 0 : client.unsubscribe(unTopic, () => {
    console.log(`unsubscribe: ${unTopic}`);
  });
};
const publish = (topic, message, qos = 0) => {
  if (!(client == null ? void 0 : client.connected)) {
    console.error("mqtt client is disconnected");
  } else {
    client.publish(topic, message, { qos });
  }
};
const registerEvent = (topic, callback, vm = "none") => {
  messageListeners.has(topic) || messageListeners.set(topic, []);
  messageListeners.get(topic).push({ callback, vm });
};
const unRegisterEvent = (topic, vm = "none") => {
  const listeners = messageListeners.get(topic);
  const indexArray = [];
  if (listeners && listeners.length) {
    for (let i = listeners.length - 1; i >= 0; i -= 1) {
      const listener = listeners[i];
      if (listener.vm === vm) {
        indexArray.push(i);
      }
    }
    if (indexArray.length > 0) {
      indexArray.forEach((index) => {
        listeners.splice(index, 1);
      });
      if (listeners.length > 0) {
        messageListeners.set(topic, listeners);
      } else {
        messageListeners.delete(topic);
      }
    }
  }
};
const clearEvent = () => {
  messageListeners.clear();
};
const test = () => common.eq("+/test/#", "1/test/erw/2342");
const mqttHook = () => ({
  disconnect,
  reconnect,
  subscribe,
  unSubscribe,
  publish,
  registerEvent,
  unRegisterEvent,
  clearEvent,
  test
});
var mqttVueHook = {
  install: async (_app, url, options) => {
    await connect(url, options);
  }
};
const useMQTT = () => mqttHook();
export { mqttVueHook as default, useMQTT };
