import axios from 'axios';
import oilMsg from '../templates/oil.js';

const OILS = [
  { name: '92無鉛汽油', label: '92', size: '3xl', subtitle: '無鉛\n汽油' },
  { name: '95無鉛汽油', label: '95', size: '3xl', subtitle: '無鉛\n汽油' },
  { name: '98無鉛汽油', label: '98', size: '3xl', subtitle: '無鉛\n汽油' },
  { name: '超級柴油', label: '超級柴油', size: 'xl', subtitle: '' },
];

function createOilInfo(oilConfig, targetOil) {
  const price = Number(targetOil.參考牌價_金額).toFixed(1);

  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: oilConfig.label,
            size: oilConfig.size,
            weight: 'bold',
            flex: 0,
          },
          ...(oilConfig.subtitle
            ? [
                {
                  type: 'text',
                  text: oilConfig.subtitle,
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
            text: price,
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
}

function formatOilDate(date) {
  const rawDate = String(date ?? '').padStart(7, '0');
  const day = rawDate.slice(-2);
  const month = rawDate.slice(-4, -2);
  const rocYear = rawDate.slice(0, -4);
  const adYear = Number.parseInt(rocYear, 10) + 1911;

  if (!Number.isFinite(adYear) || !month || !day) {
    return '';
  }

  return `${adYear}/${month}/${day}`;
}

export default async (event) => {
  try {
    const { data } = await axios.get('https://vipmbr.cpc.com.tw/opendata/sixtypeoillistprice');

    const replyMsg = oilMsg;

    if (replyMsg.contents.body.contents.length === 1) {
      let effectiveDate = '';

      OILS.forEach((oilConfig, idx) => {
        const targetOil = data.find((item) => item.產品名稱 === oilConfig.name);

        if (targetOil) {
          const info = createOilInfo(oilConfig, targetOil);
          replyMsg.contents.body.contents.push(info);

          if (!effectiveDate) {
            effectiveDate = formatOilDate(targetOil.牌價生效日期);
          }
        }
      });

      replyMsg.contents.footer.contents[1].text = effectiveDate;
    }

    return replyMsg;
  } catch (error) {
    console.error(error);
  }
};
