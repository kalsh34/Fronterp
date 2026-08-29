"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';
async function wipe() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('[WIPE] Connected to MongoDB');
        const db = mongoose_1.default.connection.db;
        const collections = await db.listCollections().toArray();
        for (const col of collections) {
            await db.dropCollection(col.name);
            console.log(`[WIPE] Dropped: ${col.name}`);
        }
        console.log(`\n[WIPE] Done — ${collections.length} collections dropped from ${db.databaseName}`);
        process.exit(0);
    }
    catch (error) {
        console.error('[WIPE] Error:', error);
        process.exit(1);
    }
}
wipe();
//# sourceMappingURL=wipe.js.map