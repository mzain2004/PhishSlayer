import yaml from 'yaml';

export interface SigmaRule {
  title: string;
  status?: string;
  description?: string;
  logsource?: {
    product?: string;
    service?: string;
    category?: string;
  };
  detection: {
    [key: string]: any;
    condition: string;
  };
  level?: 'low' | 'medium' | 'high' | 'critical';
}

export function parseSigmaRule(content: string): SigmaRule {
  try {
    const doc = yaml.parse(content);
    if (!doc.title || !doc.detection || !doc.detection.condition) {
      throw new Error('Invalid Sigma rule structure: missing title or detection/condition');
    }
    return doc as SigmaRule;
  } catch (error: any) {
    throw new Error(`Sigma Parse Error: ${error.message}`);
  }
}

export function sigmaToSql(rule: SigmaRule): string {
  const { detection } = rule;
  const condition = detection.condition;
  
  // Very simplified conversion logic
  // Sigma supports complex conditions like "selection1 and not 1 of selection*"
  // We'll implement a basic one-to-one mapping for simple selections.
  
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(detection)) {
    if (key === 'condition') continue;
    
    const subParts: string[] = [];
    if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [field, pattern] of Object.entries(value)) {
        if (Array.isArray(pattern)) {
           subParts.push(`${field} IN (${pattern.map(p => `'${p}'`).join(', ')})`);
        } else {
           subParts.push(`${field} = '${pattern}'`);
        }
      }
    }
    
    if (subParts.length > 0) {
      parts.push(`(${subParts.join(' AND ')})`);
    }
  }

  // If condition is just "selection", return the selection part
  if (condition === 'selection' && parts.length === 1) {
    return parts[0];
  }

  // Fallback for complex conditions - return a placeholder or partial
  return parts.join(' OR '); 
}
