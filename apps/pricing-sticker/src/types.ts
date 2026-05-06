export interface StickerData {
  id: string;
  price: string;
  colour: string;
  style: string;
  size: string;
  barcode: string;
}

export const DEFAULT_STICKER: Omit<StickerData, 'id'> = {
  price: '1499',
  colour: 'Nautical Blue',
  style: 'HL-PL-26-004',
  size: '',
  barcode: '',
};
