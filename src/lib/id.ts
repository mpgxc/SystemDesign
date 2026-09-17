import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const generate = customAlphabet(alphabet, 8);

export const newId = (prefix: string): string => `${prefix}_${generate()}`;
