export default {
  type: 'flex',
  altText: '油價',
  contents: {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '今日油價',
              size: 'xxl',
              weight: 'bold',
              color: '#C62027',
            },
            {
              type: 'text',
              text: '（單位：元／公升）',
              size: 'xs',
              flex: 0,
            },
          ],
          alignItems: 'center',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '牌價生效日期：',
          size: 'xs',
          flex: 0,
        },
        {
          type: 'text',
          text: '2025/02/04',
          flex: 0,
          size: 'xs',
        },
      ],
      justifyContent: 'center',
      spacing: 'sm',
    },
  },
};
