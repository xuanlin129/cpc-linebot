import { fetchCurrentOilPrices } from '../services/cpcOilPriceService.js';
import { createCurrentOilPriceMessage } from '../templates/oil.js';

export default async (event) => {
  try {
    const oilPrices = await fetchCurrentOilPrices();
    return createCurrentOilPriceMessage(oilPrices);
  } catch (error) {
    console.error(error);
  }
};
