import fs from 'fs';
import path from 'path';
import { AppData } from '../types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'store.json');

// Ensure data directory exists
const ensureDataDir = () => {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const defaultData: AppData = {
    residents: [],
    transactions: [],
};

export const getAppData = (): AppData => {
    ensureDataDir();
    if (!fs.existsSync(DATA_FILE_PATH)) {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading data file:', error);
        return defaultData;
    }
};

export const saveAppData = (data: AppData): void => {
    ensureDataDir();
    try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data file:', error);
        throw new Error('Failed to save data');
    }
};
