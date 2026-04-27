const bubble = (data) =>
  data.slice(0, 5).map((info) => ({
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: info.站名,
          weight: 'bold',
          size: 'xxl',
          margin: 'md',
        },
        {
          type: 'text',
          text: info.縣市 + info.鄉鎮區 + info.地址,
          size: 'xs',
          color: '#aaaaaa',
          wrap: true,
        },
        {
          type: 'filler',
          flex: 1,
        },
        {
          type: 'separator',
          margin: 'xxl',
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xxl',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '營業時間',
                  size: 'md',
                  color: '#555555',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: info.營業時間,
                  size: 'md',
                  color: '#111111',
                  align: 'end',
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '聯絡電話',
                  size: 'md',
                  color: '#555555',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: info.電話,
                  size: 'md',
                  color: '#0069D9',
                  align: 'end',
                  action: {
                    type: 'uri',
                    label: info.電話,
                    uri: `tel:${info.電話}`,
                  },
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '距　　離',
                  size: 'md',
                  color: '#555555',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `${Math.round(info.distance * 100) / 100} km`,
                  size: 'md',
                  color: '#111111',
                  align: 'end',
                },
              ],
            },
          ],
        },
      ],
      justifyContent: 'space-between',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '打開地圖',
                uri: `https://www.google.com/maps/search/${encodeURI('台灣中油' + info.站名)}`,
              },
              color: '#ffffff',
            },
          ],
          backgroundColor: '#07BE00',
          cornerRadius: 'lg',
        },
      ],
    },
  }));

export default (data) => ({
  type: 'flex',
  altText: '直營加油站查詢結果',
  contents: {
    type: 'carousel',
    contents: bubble(data),
  },
});
