const storage: Record<string, unknown> = {};

export const storageStore = storage;

export default {
  asApp: () => ({
    requestJira: jest.fn(),
  }),
};

export { route } from './routeHelper';

export const storage = {
  get: jest.fn((key: string) => Promise.resolve(storageStore[key])),
  set: jest.fn((key: string, value: unknown) => {
    storageStore[key] = value;
    return Promise.resolve();
  }),
  delete: jest.fn((key: string) => {
    delete storageStore[key];
    return Promise.resolve();
  }),
};
