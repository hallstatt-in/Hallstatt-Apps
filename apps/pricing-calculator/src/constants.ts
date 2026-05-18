import { PlatformConfig } from './types';

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    logoColor: '#FF9900',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    fees: [
      { name: 'Referral Fee', type: 'percentage', value: 20.67, isGstApplicable: true },
      { name: 'Closing Fee', type: 'fixed', value: 40, isGstApplicable: true },
      { name: 'Shipping Charges', type: 'fixed', value: 79, isGstApplicable: true },
    ],
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    logoColor: '#2874F0',
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/flipkart.svg',
    fees: [
      { name: 'Commission', type: 'percentage', value: 12, isGstApplicable: true },
      { name: 'Fixed Fee', type: 'fixed', value: 20, isGstApplicable: true },
      { name: 'Collection Fee', type: 'percentage', value: 2, isGstApplicable: true },
      { name: 'Shipping', type: 'fixed', value: 50, isGstApplicable: true },
    ],
  },
  {
    id: 'myntra',
    name: 'Myntra',
    logoColor: '#f13ab1',
    logoUrl: '/logos/myntra.svg',
    fees: [
      { name: 'Commission', type: 'percentage', value: 25, isGstApplicable: true },
      { name: 'Logistic Support', type: 'fixed', value: 60, isGstApplicable: true },
    ],
  },
  {
    id: 'ajio',
    name: 'Ajio',
    logoColor: '#2b2b2b',
    logoUrl: '/logos/ajio.svg',
    fees: [
      { name: 'Base Commission (Incl. GST)', type: 'percentage', value: 38, isGstApplicable: false },
      { name: 'Marketing Commission', type: 'percentage', value: 2, isGstApplicable: false },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    logoColor: '#95BF47',
    logoUrl: '/logos/shopify.svg',
    fees: [
      { name: 'Transaction Fee', type: 'percentage', value: 2, isGstApplicable: false },
      { name: 'Payment Gateway', type: 'percentage', value: 2.5, isGstApplicable: false },
      { name: 'Monthly Plan (Allocated)', type: 'fixed', value: 10, isGstApplicable: false },
    ],
  },
  {
    id: 'stylezen',
    name: 'Stylezen',
    logoColor: '#000000',
    fees: [
      { name: 'Commission', type: 'percentage', value: 28, isGstApplicable: true },
    ],
  },
];

export const DEFAULT_GST_RATE = 18;
