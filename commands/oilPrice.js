import axios from 'axios';
import oilMsg from '../templates/oil.js';

const oilMap = {
  '92無鉛汽油': '92',
  '95無鉛汽油': '95',
  '98無鉛汽油': '98',
  超級柴油: '超級柴油',
};

export default async (event) => {
  try {
    const { data } = await axios.get('https://vipmbr.cpc.com.tw/opendata/sixtypeoillistprice');
    const oils = ['92無鉛汽油', '95無鉛汽油', '98無鉛汽油', '超級柴油'];

    const replyMsg = oilMsg;

    if (replyMsg.contents.body.contents.length === 1) {
      oils.forEach((oilName) => {
        const targetOil = data.find((item) => item.產品名稱 === oilName);

        if (targetOil) {
          const _info = {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: oilMap[oilName] ?? oilName,
                    size: oilName !== '超級柴油' ? '3xl' : 'xl',
                    weight: 'bold',
                    flex: 0,
                  },
                  ...(oilName !== '超級柴油'
                    ? [
                        {
                          type: 'text',
                          text: '無鉛\n汽油',
                          size: 'xs',
                          color: '#888888',
                          flex: 0,
                          wrap: true,
                          margin: 'sm',
                        },
                      ]
                    : []),
                ],
                flex: 0,
                alignItems: 'center',
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: `${targetOil.參考牌價_金額.toFixed(1)}`,
                    size: 'xxl',
                    weight: 'bold',
                    color: '#C62027',
                    flex: 0,
                    align: 'end',
                  },
                  {
                    type: 'text',
                    text: '元',
                    color: '#888888',
                    align: 'end',
                    flex: 0,
                    margin: 'md',
                  },
                ],
                alignItems: 'center',
                flex: 0,
              },
            ],
            justifyContent: 'space-between',
            paddingStart: '10%',
            paddingEnd: '10%',
            margin: 'xl',
          };

          // 處理民國 YYYMMDD 格式 (例如 "1150409")
          const rawDate = String(targetOil.牌價生效日期);

          // 假設民國年可能是 2 位數或 3 位數，我們由後往前切
          const day = rawDate.slice(-2);
          const month = rawDate.slice(-4, -2);
          const rocYear = rawDate.slice(0, -4); // 剩下的就是年份部分

          // 轉換為西元年
          const adYear = parseInt(rocYear, 10) + 1911;

          // 組合為西元格式字串 "2026/04/09"
          const adDateString = `${adYear}/${month}/${day}`;

          replyMsg.contents.body.contents.push(_info);
          // 牌價生效日期通常每筆都一樣，這裡保留你的邏輯更新 footer
          replyMsg.contents.footer.contents[1].text = `${adDateString}`;
        }
      });
    }

    return replyMsg;
  } catch (error) {
    console.error(error);
  }
};
