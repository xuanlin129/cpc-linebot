import axios from 'axios';
import { distance } from './distance.js';
import stationCarousel from '../templates/station-carousel.js';

export default async (event) => {
  try {
    const { data } = await axios.get('https://vipmbr.cpc.com.tw/opendata/getstationinfo');
    let stations = data
      .filter((info) => {
        return info.類別 === '自營站';
      })
      .map((info) => {
        info.distance = distance(info.緯度, info.經度, event.message.latitude, event.message.longitude, 'K');
        return info;
      })
      .sort((a, b) => {
        return a.distance - b.distance;
      });

    const replyMsg = stationCarousel(stations);

    return replyMsg;
  } catch (error) {
    console.error(error);
  }
};
