import { BusinessRecord } from '../types';

// Sensitive company credentials must never be bundled into public client-side source.
// Keep the initial dataset empty; authorized users can import their approved workbook.
export const INITIAL_BUSINESS_RECORDS: BusinessRecord[] = [];
