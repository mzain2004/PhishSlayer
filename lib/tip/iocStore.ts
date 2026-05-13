import mongoose from 'mongoose';
import { IOC } from './feedManager';
import { connectMongo } from '../mongodb';

const IocSchema = new mongoose.Schema({
  // org_id: null/undefined means "global threat intel" (shared from public
  // feeds like VirusTotal, AbuseIPDB). A non-null org_id means the indicator
  // is private to that organization and must NOT be returned to other orgs.
  org_id: { type: String, default: null, index: true },
  type: { type: String, required: true, index: true },
  value: { type: String, required: true, index: true },
  tags: [String],
  confidence: Number,
  sources: [String],
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  hitCount: { type: Number, default: 0 }
});

// Uniqueness is per (org_id, value) so an org can add a private indicator that
// happens to match a global one without collision.
IocSchema.index({ org_id: 1, value: 1 }, { unique: true });

export const IocModel = mongoose.models.Ioc || mongoose.model('Ioc', IocSchema);

type StoreOptions = { orgId?: string | null };

export async function storeIOCs(iocs: IOC[], options: StoreOptions = {}) {
  await connectMongo();
  const orgId = options.orgId ?? null;

  for (const ioc of iocs) {
    await IocModel.findOneAndUpdate(
      { org_id: orgId, value: ioc.value },
      {
        $set: { type: ioc.iocType, confidence: ioc.confidence, lastSeen: new Date() },
        $addToSet: { tags: { $each: ioc.tags }, sources: ioc.source },
        $setOnInsert: { firstSeen: new Date(), org_id: orgId }
      },
      { upsert: true }
    );
  }
}

/**
 * Lookup against (1) the requesting org's private indicators AND (2) the
 * shared global CTI store. Never returns another org's private indicator.
 */
export async function isKnownBad(value: string, orgId: string | null = null) {
  await connectMongo();
  const ioc = await IocModel.findOne({
    value,
    $or: [{ org_id: null }, { org_id: orgId }],
  });
  if (ioc) {
    ioc.hitCount += 1;
    await ioc.save();
    return ioc;
  }
  return null;
}
