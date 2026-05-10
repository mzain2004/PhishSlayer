// icons.jsx — minimal stroke icons (Lucide-style 16/18px) used across PhishSlayer.

const Icon = ({ d, size = 16, fill = 'none', stroke = 'currentColor', sw = 1.6, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const IShield = (p) => <Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/></Icon>;
const ICrosshair = (p) => <Icon {...p}><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2"/></Icon>;
const IFingerprint = (p) => <Icon {...p}><path d="M6 11a6 6 0 0 1 12 0v3"/><path d="M9 11v4a3 3 0 0 0 3 3"/><path d="M12 11v6"/><path d="M15 14v3a3 3 0 0 1-3 3"/></Icon>;
const IFile = (p) => <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></Icon>;
const ICpu = (p) => <Icon {...p}><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/><line x1="9" y1="19" x2="9" y2="22"/><line x1="15" y1="19" x2="15" y2="22"/><line x1="2" y1="9" x2="5" y2="9"/><line x1="2" y1="15" x2="5" y2="15"/><line x1="19" y1="9" x2="22" y2="9"/><line x1="19" y1="15" x2="22" y2="15"/></Icon>;
const IDna = (p) => <Icon {...p}><path d="M4 3c0 6 16 6 16 12s-16 6-16 12"/><path d="M20 3c0 6-16 6-16 12s16 6 16 12"/></Icon>;
const IChart = (p) => <Icon {...p}><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="11" width="3" height="9"/><rect x="11" y="6" width="3" height="14"/><rect x="16" y="14" width="3" height="6"/></Icon>;
const ISettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>;
const IBell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>;
const ISearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></Icon>;
const IChevDown = (p) => <Icon {...p} sw={2}><polyline points="6 9 12 15 18 9"/></Icon>;
const IChevRight = (p) => <Icon {...p} sw={2}><polyline points="9 6 15 12 9 18"/></Icon>;
const IChevLeft = (p) => <Icon {...p} sw={2}><polyline points="15 6 9 12 15 18"/></Icon>;
const IPlus = (p) => <Icon {...p} sw={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const IX = (p) => <Icon {...p} sw={2}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></Icon>;
const ICheck = (p) => <Icon {...p} sw={2.4}><polyline points="4 12 10 18 20 6"/></Icon>;
const IArrowRight = (p) => <Icon {...p} sw={2}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>;
const IExternal = (p) => <Icon {...p}><path d="M14 4h6v6"/><line x1="20" y1="4" x2="11" y2="13"/><path d="M20 14v6H4V4h6"/></Icon>;
const IAlert = (p) => <Icon {...p}><path d="M12 3l10 18H2z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.5"/></Icon>;
const ICopy = (p) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></Icon>;
const ILock = (p) => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></Icon>;
const ITrend = (p) => <Icon {...p} sw={2}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></Icon>;
const ITrendDown = (p) => <Icon {...p} sw={2}><polyline points="3 7 9 13 13 9 21 17"/><polyline points="14 17 21 17 21 10"/></Icon>;
const IDownload = (p) => <Icon {...p}><path d="M12 4v12"/><polyline points="6 12 12 18 18 12"/><line x1="4" y1="20" x2="20" y2="20"/></Icon>;
const IBook = (p) => <Icon {...p}><path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M19 18H6a2 2 0 0 0-2 2"/></Icon>;
const IPause = (p) => <Icon {...p}><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></Icon>;
const IPlay = (p) => <Icon {...p}><polygon points="6 4 20 12 6 20" fill="currentColor"/></Icon>;
const IExpand = (p) => <Icon {...p}><polyline points="9 4 4 4 4 9"/><polyline points="15 4 20 4 20 9"/><polyline points="9 20 4 20 4 15"/><polyline points="15 20 20 20 20 15"/></Icon>;

Object.assign(window, {
  IShield, ICrosshair, IFingerprint, IFile, ICpu, IDna, IChart, ISettings,
  IBell, ISearch, IChevDown, IChevRight, IChevLeft, IPlus, IX, ICheck,
  IArrowRight, IExternal, IAlert, ICopy, ILock, ITrend, ITrendDown,
  IDownload, IBook, IPause, IPlay, IExpand,
});
