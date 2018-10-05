'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.acknowledge = exports.receiveQueue = exports.receiveTopic = exports.sendToQueue = exports.sendTopic = exports.createAndBindQueue = exports.setupConnection = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var handleFailedSending = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(send) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return send();

          case 3:
            _context.next = 10;
            break;

          case 5:
            _context.prev = 5;
            _context.t0 = _context['catch'](0);

            offlinePublishQueues.push(send);
            _context.next = 10;
            return setupConnection(options);

          case 10:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 5]]);
  }));

  return function handleFailedSending(_x) {
    return _ref.apply(this, arguments);
  };
}();

var handleFailedSubscribing = function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(receive) {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            subscribers.push(receive);
            _context2.prev = 1;
            _context2.next = 4;
            return receive();

          case 4:
            _context2.next = 11;
            break;

          case 6:
            _context2.prev = 6;
            _context2.t0 = _context2['catch'](1);

            console.log(_context2.t0);
            _context2.next = 11;
            return setupConnection(options);

          case 11:
            return _context2.abrupt('return', subscribers.length - 1);

          case 12:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[1, 6]]);
  }));

  return function handleFailedSubscribing(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

var autoReconnect = function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(connectFn, options) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 3;
            return connectFn(options);

          case 3:
            return _context3.abrupt('return', _context3.sent);

          case 6:
            _context3.prev = 6;
            _context3.t0 = _context3['catch'](0);

            errorLogger('Could not connect to amqp server (' + _context3.t0.toString() + ')');

            if (!(options.reconnectIntervalLimit === 0 && options.reconnectOption === 0)) {
              _context3.next = 11;
              break;
            }

            throw new Error('AMQP: Reconnecting limit reached');

          case 11:
            if (options.reconnectIntervalLimit === 0 && options.reconnectOption === 1) {
              process.exit(1);
            }
            return _context3.abrupt('return', new Promise(function (resolve, reject) {
              setTimeout(function () {
                resolve(autoReconnect(connectFn, _extends({}, options, { reconnectIntervalLimit: options.reconnectIntervalLimit - 1 })));
              }, options.reconnectTime);
            }));

          case 13:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[0, 6]]);
  }));

  return function autoReconnect(_x3, _x4) {
    return _ref3.apply(this, arguments);
  };
}();

var setupConnection = exports.setupConnection = function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(overidingOptions) {
    var handleUnexpectedClose;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
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
            _context4.next = 4;
            return autoReconnect(getConnection, options);

          case 4:
            connection = _context4.sent;

            connection.on('error', handleUnexpectedClose);
            connection.on('close', handleUnexpectedClose);

            _context4.next = 9;
            return connection.createChannel();

          case 9:
            channel = _context4.sent;

            channel.prefetch(options.prefetch);

            if (!offlinePublishQueues.length) {
              _context4.next = 14;
              break;
            }

            _context4.next = 14;
            return Promise.all(offlinePublishQueues.map(function (queue) {
              return queue();
            }));

          case 14:
            if (!subscribers.length) {
              _context4.next = 17;
              break;
            }

            _context4.next = 17;
            return Promise.all(subscribers.map(function (subscriber) {
              return subscriber();
            }));

          case 17:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function setupConnection(_x5) {
    return _ref4.apply(this, arguments);
  };
}();

var createAndBindQueue = exports.createAndBindQueue = function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(queueName, exchangeName, key, options) {
    var queue;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return channel.assertQueue(queueName, options);

          case 2:
            queue = _context5.sent;
            _context5.next = 5;
            return channel.bindQueue(queue.queue, exchangeName, key);

          case 5:
            return _context5.abrupt('return', queue);

          case 6:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function createAndBindQueue(_x6, _x7, _x8, _x9) {
    return _ref5.apply(this, arguments);
  };
}();

var sendTopic = exports.sendTopic = function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(exchangeName, key, message) {
    var send = function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return channel.assertExchange(exchangeName, 'topic', options);

              case 2:
                _context6.next = 4;
                return channel.publish(exchangeName, key, Buffer.from(messageString));

              case 4:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      return function send() {
        return _ref7.apply(this, arguments);
      };
    }();

    var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { durable: true, persistent: true, autoDelete: false };
    var messageString;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            messageString = JSON.stringify(message);
            _context7.next = 3;
            return handleFailedSending(send);

          case 3:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function sendTopic(_x10, _x11, _x12) {
    return _ref6.apply(this, arguments);
  };
}();

var sendToQueue = exports.sendToQueue = function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(queueName, message) {
    var send = function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8() {
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return channel.assertQueue(queueName, options);

              case 2:
                _context8.next = 4;
                return channel.sendToQueue(queueName, Buffer.from(messageString));

              case 4:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      return function send() {
        return _ref9.apply(this, arguments);
      };
    }();

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { durable: true, persistent: true, autoDelete: false };
    var messageString;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            messageString = JSON.stringify(message);
            _context9.next = 3;
            return handleFailedSending(send);

          case 3:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function sendToQueue(_x14, _x15) {
    return _ref8.apply(this, arguments);
  };
}();

var receiveTopic = exports.receiveTopic = function () {
  var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(exchangeName, key) {
    var queueName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    var callback = arguments[3];

    var receive = function () {
      var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10() {
        var queue;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return channel.assertExchange(exchangeName, 'topic');

              case 2:
                _context10.next = 4;
                return createAndBindQueue(queueName, exchangeName, key, options);

              case 4:
                queue = _context10.sent;
                _context10.next = 7;
                return channel.consume(queue.queue, callback, { noAck: options.noAck });

              case 7:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      return function receive() {
        return _ref11.apply(this, arguments);
      };
    }();

    var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : DEFAULT_QUEUE_OPTIONS;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _context11.next = 2;
            return handleFailedSubscribing(receive);

          case 2:
            return _context11.abrupt('return', _context11.sent);

          case 3:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function receiveTopic(_x17, _x18) {
    return _ref10.apply(this, arguments);
  };
}();

var receiveQueue = exports.receiveQueue = function () {
  var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13(queueName, callback) {
    var receive = function () {
      var _ref13 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12() {
        var queue;
        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return channel.assertQueue(queueName, options);

              case 2:
                queue = _context12.sent;
                _context12.next = 5;
                return channel.consume(queue.queue, callback, { noAck: options.noAck });

              case 5:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      return function receive() {
        return _ref13.apply(this, arguments);
      };
    }();

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : DEFAULT_QUEUE_OPTIONS;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            _context13.next = 2;
            return handleFailedSubscribing(receive);

          case 2:
            return _context13.abrupt('return', _context13.sent);

          case 3:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function receiveQueue(_x21, _x22) {
    return _ref12.apply(this, arguments);
  };
}();

var acknowledge = exports.acknowledge = function () {
  var _ref14 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14(message) {
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            return _context14.abrupt('return', channel.ack(message));

          case 1:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function acknowledge(_x24) {
    return _ref14.apply(this, arguments);
  };
}();

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var errorLogger = (0, _debug2.default)('app:library:amqp:error');

var DEFAULT_OPTIONS = {
  uri: 'localhost',
  user: 'guest',
  password: 'guest',
  reconnectIntervalLimit: -1,
  reconnectTime: 1000,
  heartbeat: 15,
  prefetch: 20,
  reconnectOption: 0
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
