export const handleAmountFormat = (val) => {
  if (!val) return '';
  let lowerVal = val.toString().toLowerCase();
  let multiplier = 1;
  if (lowerVal.endsWith('k')) {
    multiplier = 1000;
    lowerVal = lowerVal.slice(0, -1);
  } else if (lowerVal.endsWith('l')) {
    multiplier = 100000;
    lowerVal = lowerVal.slice(0, -1);
  }
  
  const cleanVal = lowerVal.replace(/[^0-9.]/g, '');
  if (!cleanVal) return '';

  const parts = cleanVal.split('.');
  let numberPart = parts[0];
  let decimalPart = parts.length > 1 ? '.' + parts[1].substring(0, 2) : '';

  if (multiplier > 1) {
    const rawNumber = parseFloat(cleanVal) * multiplier;
    if (!isNaN(rawNumber)) {
      numberPart = rawNumber.toString();
      decimalPart = '';
    }
  }

  // Format with Indian numbering system commas
  const lastThree = numberPart.substring(numberPart.length - 3);
  const otherNumbers = numberPart.substring(0, numberPart.length - 3);
  const formattedNumber = otherNumbers !== '' ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree : lastThree;

  return formattedNumber + decimalPart;
};
