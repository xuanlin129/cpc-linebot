export function compareOilPriceSnapshots(latestSnapshotSet, previousSnapshotSet) {
  const previousByCode = new Map(
    previousSnapshotSet.products.map((product) => [product.productCode, product]),
  );

  return latestSnapshotSet.products.map((latestProduct) => {
    const previousProduct = previousByCode.get(latestProduct.productCode);

    if (!previousProduct) {
      throw new Error(`Missing previous oil price snapshot: ${latestProduct.productCode}`);
    }

    const difference = roundPrice(latestProduct.price - previousProduct.price);

    return {
      productCode: latestProduct.productCode,
      productName: latestProduct.productName,
      currentPrice: latestProduct.price,
      previousPrice: previousProduct.price,
      difference,
      direction: getDirection(difference),
    };
  });
}

export function summarizeMovements(movements) {
  return movements
    .map((movement) => `${movement.productCode} ${formatSignedDifference(movement.difference)}`)
    .join(', ');
}

export function formatSignedDifference(difference) {
  if (difference > 0) {
    return `+${difference.toFixed(1)}`;
  }

  return difference.toFixed(1);
}

function getDirection(difference) {
  if (difference > 0) {
    return 'increased';
  }

  if (difference < 0) {
    return 'decreased';
  }

  return 'unchanged';
}

function roundPrice(value) {
  return Math.round(value * 10) / 10;
}
