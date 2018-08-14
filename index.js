'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.acknowledge = exports.receiveTopic = exports.sendTopic = exports.createAndBindQueue = exports.setupConnection = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var autoReconnect = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(connectFn, options) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return connectFn(options);

          case 3:
            return _context.abrupt('return', _context.sent);

          case 6:
            _context.prev = 6;
            _context.t0 = _context['catch'](0);

            errorLogger('Could not connect to amqp server (' + _context.t0.toString() + ')');

            if (!(options.reconnectIntervalLimit === 0)) {
              _context.next = 11;
              break;
            }

            throw new Error('AMQP: Reconnecting limit reached');

          case 11:
            return _context.abrupt('return', new Promise(function (resolve, reject) {
              setTimeout(function () {
                resolve(autoReconnect(connectFn, _extends({}, options, { reconnectIntervalLimit: options.reconnectIntervalLimit - 1 })));
              }, options.reconnectTime);
            }));

          case 12:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 6]]);
  }));

  return function autoReconnect(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var setupConnection = exports.setupConnection = function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(overidingOptions) {
    var handleUnexpectedClose;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            handleUnexpectedClose = function handleUnexpectedClose(err) {
              if (err) {
                errorLogger('Something went wrong to the connection (' + err.toString() + '), Reconnecting');
              }
              connection = null;
              channel = null;
              setupConnection(options);
            };

            options = _extends({}, options, overidingOptions);
            _context2.next = 4;
            return autoReconnect(getConnection, options);

          case 4:
            connection = _context2.sent;

            connection.on('error', handleUnexpectedClose);
            connection.on('close', handleUnexpectedClose);

            _context2.next = 9;
            return connection.createChannel();

          case 9:
            channel = _context2.sent;

            channel.prefetch(DEFAULT_OPTIONS.prefetch);

            if (!offlinePublishQueues.length) {
              _context2.next = 14;
              break;
            }

            _context2.next = 14;
            return Promise.all(offlinePublishQueues.map(function (queue) {
              return queue();
            }));

          case 14:
            if (!subscribers.length) {
              _context2.next = 17;
              break;
            }

            _context2.next = 17;
            return Promise.all(subscribers.map(function (subscriber) {
              return subscriber();
            }));

          case 17:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function setupConnection(_x3) {
    return _ref2.apply(this, arguments);
  };
}();

var createAndBindQueue = exports.createAndBindQueue = function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(queueName, exchangeName, key, options) {
    var queue;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return channel.assertQueue(queueName, options);

          case 2:
            queue = _context3.sent;
            _context3.next = 5;
            return channel.bindQueue(queue.queue, exchangeName, key);

          case 5:
            return _context3.abrupt('return', queue);

          case 6:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function createAndBindQueue(_x4, _x5, _x6, _x7) {
    return _ref3.apply(this, arguments);
  };
}();

var sendTopic = exports.sendTopic = function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(exchangeName, key, message) {
    var send = function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4() {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return channel.assertExchange(exchangeName, 'topic', options);

              case 2:
                _context4.next = 4;
                return channel.publish(exchangeName, key, Buffer.alloc(messageString.length, messageString));

              case 4:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      return function send() {
        return _ref5.apply(this, arguments);
      };
    }();

    var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { durable: true, persistent: true, autoDelete: false };
    var messageString;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            messageString = JSON.stringify(message);
            _context5.prev = 1;
            _context5.next = 4;
            return send();

          case 4:
            _context5.next = 11;
            break;

          case 6:
            _context5.prev = 6;
            _context5.t0 = _context5['catch'](1);

            offlinePublishQueues.push(send);
            _context5.next = 11;
            return setupConnection(options);

          case 11:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[1, 6]]);
  }));

  return function sendTopic(_x8, _x9, _x10) {
    return _ref4.apply(this, arguments);
  };
}();

var receiveTopic = exports.receiveTopic = function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(exchangeName, key) {
    var queueName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    var callback = arguments[3];

    var receive = function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
        var queue;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return channel.assertExchange(exchangeName, 'topic');

              case 2:
                _context6.next = 4;
                return createAndBindQueue(queueName, exchangeName, key, options);

              case 4:
                queue = _context6.sent;
                _context6.next = 7;
                return channel.consume(queue.queue, callback, { noAck: options.noAck });

              case 7:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      return function receive() {
        return _ref7.apply(this, arguments);
      };
    }();

    var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : DEFAULT_QUEUE_OPTIONS;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            subscribers.push(receive);
            _context7.prev = 1;
            _context7.next = 4;
            return receive();

          case 4:
            _context7.next = 11;
            break;

          case 6:
            _context7.prev = 6;
            _context7.t0 = _context7['catch'](1);

            console.log(_context7.t0);
            _context7.next = 11;
            return setupConnection(options);

          case 11:
            return _context7.abrupt('return', subscribers.length - 1);

          case 12:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this, [[1, 6]]);
  }));

  return function receiveTopic(_x12, _x13) {
    return _ref6.apply(this, arguments);
  };
}();

var acknowledge = exports.acknowledge = function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(message) {
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            return _context8.abrupt('return', channel.ack(message));

          case 1:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function acknowledge(_x16) {
    return _ref8.apply(this, arguments);
  };
}();

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

require('babel-polyfill');


var errorLogger = (0, _debug2.default)('app:library:amqp:error');

var DEFAULT_OPTIONS = {
  uri: 'localhost',
  user: 'guest',
  password: 'guest',
  reconnectIntervalLimit: -1,
  reconnectTime: 1000,
  heartbeat: 15,
  prefetch: 100
};

var DEFAULT_QUEUE_OPTIONS = {
  exclusive: true, noAck: false
};

var connection = void 0,
    channel = void 0;
var options = DEFAULT_OPTIONS;
var offlinePublishQueues = [];
var subscribers = [];

function getConnection(options) {
  return _amqplib2.default.connect('amqp://' + options.user + ':' + options.password + '@' + options.uri + '?heartbeat=' + options.heartbeat, {});
}
