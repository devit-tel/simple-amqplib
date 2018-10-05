import amqplib from 'amqplib'
import debug from 'debug'

let errorLogger = debug('app:library:amqp:error')

const DEFAULT_OPTIONS = {
  uri: 'localhost',
  user: 'guest',
  password: 'guest',
  reconnectIntervalLimit: -1,
  reconnectTime: 1000,
  heartbeat: 15,
  prefetch: 20,
  reconnectOption: 0,
}

const DEFAULT_QUEUE_OPTIONS = {
  exclusive: true, noAck: false
}

let connection, channel
let options = DEFAULT_OPTIONS
let offlinePublishQueues = []
let subscribers = []

function getConnection (options) {
  return amqplib.connect(`amqp://${options.user}:${options.password}@${options.uri}?heartbeat=${options.heartbeat}`, {})
}
async function handleFailedSending (send) {
  try {
    await send()
  } catch (e) {
    offlinePublishQueues.push(send)
    await setupConnection(options)
  }
}

async function handleFailedSubscribing (receive) {
  subscribers.push(receive)
  try {
    await receive()
  } catch (e) {
    console.log(e)
    await setupConnection(options)
  }
  return subscribers.length - 1
}

async function autoReconnect (connectFn, options) {
  try {
    return await connectFn(options)
  } catch (err) {
    errorLogger(`Could not connect to amqp server (${err.toString()})`)
    if (options.reconnectIntervalLimit === 0 && options.reconnectOption === 0) {
      throw new Error('AMQP: Reconnecting limit reached')
    }
    if (options.reconnectIntervalLimit === 0 && options.reconnectOption === 1) {
      process.exit(1)
    }
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(autoReconnect(connectFn, {...options, reconnectIntervalLimit: options.reconnectIntervalLimit - 1}))
      }, options.reconnectTime)
    })
  }
}

export async function setupConnection (overidingOptions) {
  function handleUnexpectedClose (err) {
    if (err) {
      errorLogger(`Something went wrong to the connection (${err.toString()}), Reconnecting`)
    }
    connection = null
    channel = null
    setupConnection(options)
  }
  options = {...options, ...overidingOptions}
  connection = await autoReconnect(getConnection, options)
  connection.on('error', handleUnexpectedClose)
  connection.on('close', handleUnexpectedClose)

  channel = await connection.createChannel()
  channel.prefetch(options.prefetch)
  if (offlinePublishQueues.length) {
    await Promise.all(offlinePublishQueues.map(queue => queue()))
  }
  if (subscribers.length) {
    await Promise.all(subscribers.map(subscriber => subscriber()))
  }
}

export async function createAndBindQueue (queueName, exchangeName, key, options) {
  const queue = await channel.assertQueue(queueName, options)
  await channel.bindQueue(queue.queue, exchangeName, key)
  return queue
}

export async function sendTopic (exchangeName, key, message, options = {durable: true, persistent: true, autoDelete: false}) {
  const messageString = JSON.stringify(message)
  async function send () {
    await channel.assertExchange(exchangeName, 'topic', options)
    await channel.publish(exchangeName, key, Buffer.from(messageString))
  }
  await handleFailedSending(send)
}

export async function sendFanout (exchangeName, key, message, options = {durable: true, persistent: true, autoDelete: false}) {
  const messageString = JSON.stringify(message)
  async function send () {
    await channel.assertExchange(exchangeName, 'fanout', options)
    await channel.publish(exchangeName, key, Buffer.from(messageString))
  }
  await handleFailedSending(send)
}

export async function sendToQueue (queueName, message, options = {durable: true, persistent: true, autoDelete: false}) {
  const messageString = JSON.stringify(message)
  async function send () {
    await channel.assertQueue(queueName, options)
    await channel.sendToQueue(queueName, Buffer.from(messageString))
  }
  await handleFailedSending(send)
}

export async function receiveFanout (exchangeName, key, queueName = '', callback, options = DEFAULT_QUEUE_OPTIONS) {
  async function receive () {
    await channel.assertExchange(exchangeName, 'fanout')
    const queue = await createAndBindQueue(queueName, exchangeName, key, options)
    await channel.consume(queue.queue, callback, {noAck: options.noAck})
  }
  return await handleFailedSubscribing(receive)
}

export async function receiveTopic (exchangeName, key, queueName = '', callback, options = DEFAULT_QUEUE_OPTIONS) {
  async function receive () {
    await channel.assertExchange(exchangeName, 'topic')
    const queue = await createAndBindQueue(queueName, exchangeName, key, options)
    await channel.consume(queue.queue, callback, {noAck: options.noAck})
  }
  return await handleFailedSubscribing(receive)
}

export async function receiveQueue (queueName, callback, options = DEFAULT_QUEUE_OPTIONS) {
  async function receive () {
    const queue = await channel.assertQueue(queueName, options)
    await channel.consume(queue.queue, callback, {noAck: options.noAck})
  }
  return await handleFailedSubscribing(receive)
}

export async function acknowledge (message) {
  return channel.ack(message)
}
