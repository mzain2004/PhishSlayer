import mongoose from 'mongoose';
import { connectMongo } from '../mongodb';

const UbaBaselineSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  avgLoginHour: { type: Number, default: 0 },
  commonIPs: [{ type: String }],
  commonEndpoints: [{ type: String }],
  alertFrequency: { type: Number, default: 0 }, // alerts per day
  lastUpdated: { type: Date, default: Date.now }
});

export const UbaBaseline = mongoose.models.UbaBaseline || mongoose.model('UbaBaseline', UbaBaselineSchema);

export async function getBaseline(userId: string, orgId: string) {
  await connectMongo();
  return await UbaBaseline.findOne({ userId, orgId });
}

export async function updateBaseline(userId: string, orgId: string, data: Partial<any>) {
  await connectMongo();
  return await UbaBaseline.findOneAndUpdate(
    { userId, orgId },
    { ...data, lastUpdated: new Date() },
    { upsert: true, new: true }
  );
}
