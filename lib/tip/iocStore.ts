import mongoose from 'mongoose';
import { IOC } from './feedManager';
import { connectMongo } from '../mongodb';

const IocSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  value: { type: String, required: true, unique: true, index: true },
  tags: [String],
  confidence: Number,
  sources: [String],
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  hitCount: { type: Number, default: 0 }
});

export const IocModel = mongoose.models.Ioc || mongoose.model('Ioc', IocSchema);

export async function storeIOCs(iocs: IOC[]) {
  await connectMongo();
  
  for (const ioc of iocs) {
    await IocModel.findOneAndUpdate(
      { value: ioc.value },
      {
        $set: { type: ioc.iocType, confidence: ioc.confidence, lastSeen: new Date() },
        $addToSet: { tags: { $each: ioc.tags }, sources: ioc.source },
        $setOnInsert: { firstSeen: new Date() }
      },
      { upsert: true }
    );
  }
}

export async function isKnownBad(value: string) {
  await connectMongo();
  const ioc = await IocModel.findOne({ value });
  if (ioc) {
    ioc.hitCount += 1;
    await ioc.save();
    return ioc;
  }
  return null;
}
