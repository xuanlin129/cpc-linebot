import express from 'express';
import { middleware, messagingApi } from '@line/bot-sdk';
import oilPrice from './commands/oilPrice.js';
import station from './commands/station.js';

const { MessagingApiClient } = messagingApi;

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};

const app = express();

const client = new MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

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

export default app;

if (process.env.NODE_ENV !== 'production') {
  const port = 8080;
  app.listen(port, () => console.log(`機器人啟動在 http://localhost:${port}`));
}
