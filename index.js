import express from 'express';
import { middleware, messagingApi } from '@line/bot-sdk';
import oilPrice from './commands/oilPrice.js';
import station from './commands/station.js';
import { getMongoConfig, getMongoDb, ensureOilPriceIndexes } from './db/mongo.js';
import { MongoOilPriceRepository } from './repositories/oilPriceRepository.js';
import { fetchCurrentOilPrices } from './services/cpcOilPriceService.js';
import { isAuthorizedCronRequest } from './services/cronAuth.js';
import { runWeeklyOilPriceNotification } from './services/weeklyOilPriceNotificationService.js';

const { MessagingApiClient } = messagingApi;

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};

const app = express();

const client = new MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

async function createOilPriceRepository() {
  const db = await getMongoDb(getMongoConfig());
  await ensureOilPriceIndexes(db);

  return new MongoOilPriceRepository(db);
}

async function handleEvent(event) {
  if (event.type !== 'message') {
    return null;
  }

  let replyMessage;

  if (event.message.type === 'location') {
    replyMessage = await station(event);
  }

  if (event.message.text === '中油直營站查詢') {
    replyMessage = {
      type: 'text',
      text: '請提供位置訊息',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'location',
              label: '發送位置',
            },
          },
        ],
      },
    };
  } else if (event.message.text === '油價查詢') {
    replyMessage = await oilPrice(event);
  }

  if (!replyMessage) {
    return null;
  }

  try {
    return await client.replyMessage({
      replyToken: event.replyToken,
      messages: [replyMessage],
    });
  } catch (err) {
    console.error('Reply Message Error:', err.details || err);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: '發生錯誤',
        },
      ],
    });
  }
}

app.post('/webhook', middleware(config), (req, res) => {
  if (!req.body.events || req.body.events.length === 0) {
    return res.status(200).send('OK');
  }

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Webhook Error:', err);
      res.status(500).end();
    });
});

async function handleWeeklyOilPriceCron(req, res) {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const oilPriceRepository = await createOilPriceRepository();
    const result = await runWeeklyOilPriceNotification({
      fetchCurrentOilPrices,
      oilPriceRepository,
      lineClient: client,
    });

    return res.json(result);
  } catch (error) {
    console.error('Weekly Oil Price Notification Error:', error);
    return res.status(500).json({ error: 'Weekly oil price notification failed' });
  }
}

app.get('/cron/weekly-oil-price', handleWeeklyOilPriceCron);
app.post('/cron/weekly-oil-price', handleWeeklyOilPriceCron);

export default app;

if (process.env.NODE_ENV !== 'production') {
  const port = 8080;
  app.listen(port, () => console.log(`機器人啟動在 http://localhost:${port}`));
}
