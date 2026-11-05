// Display-only formatting for current and older stored sample records.
export function productName(text:string) {
 return text.replace(/Choose an available demo payout currency\./g,'Choose an available payout currency.').replace(/Demo First Bank/g,'FirstBank').replace(/Demo Access Bank/g,'Access Bank').replace(/Demo Zenith Bank/g,'Zenith Bank').replace(/Demo Bank/g,'FirstBank').replace(/Raven Demo/g,'Raven').replace(/Simulated network/g,'Preview network').replace(/ · Demo\b/gi,'').replace(/\bSimulated deposit\b/gi,'Deposit received').replace(/\bSimulated upfront interest\b/gi,'Interest received').replace(/\bThe simulated transfer failed\. No funds moved\./g,'Transfer failed. Your funds remain available.');
}
