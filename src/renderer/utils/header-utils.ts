import { RequestHeader } from '../../shared/types';

export const AUTO_HEADERS: RequestHeader[] = [
  { name: 'Cache-Control', value: 'no-cache', enabled: true, isAuto: true },
  { name: 'Host', value: '<calculated when request is sent>', enabled: true, isAuto: true },
  { name: 'User-Agent', value: 'Requiety/1.0.0', enabled: true, isAuto: true },
  { name: 'Accept', value: '*/*', enabled: true, isAuto: true },
  { name: 'Accept-Encoding', value: 'gzip, deflate, br', enabled: true, isAuto: true },
  { name: 'Connection', value: 'keep-alive', enabled: true, isAuto: true },
];

export const mergeAutoHeaders = (currentHeaders: RequestHeader[]): RequestHeader[] => {
  // Create a map of existing auto headers by name for easy lookup
  const existingAutoHeaders = new Map(
    currentHeaders
      .filter(h => h.isAuto)
      .map(h => [h.name.toLowerCase(), h])
  );

  // Filter out auto headers from current list to avoid duplicates during reconstruction
  // We will re-add them from our master list or the existing preserved state
  const manualHeaders = currentHeaders.filter(h => !h.isAuto);

  // Build the new list of auto headers
  const mergedAutoHeaders = AUTO_HEADERS.map(autoHeader => {
    // If we already have this auto header in the current request, keep its enabled state
    // But enforce values if we want them to be strictly controlled (though user asked for Read Only val, toggleable enabled)
    // Host, User-Agent, Accept, Accept-Encoding, Connection can be toggled.
    // Cache-Control cannot be disabled (user requirement: "somente leitura... Host, User-Agent... podem ser ativados")
    // Use the existing one if present to preserve 'enabled' state
    const existing = existingAutoHeaders.get(autoHeader.name.toLowerCase());
    
    if (existing) {
      // For Cache-Control, always enforce enabled=true
      if (autoHeader.name === 'Cache-Control') {
        return { ...autoHeader, enabled: true };
      }
      // For others, keep the user's enabled preference, but reset value if it somehow changed (it shouldn't if read-only)
      return { ...autoHeader, enabled: existing.enabled };
    }
    
    return autoHeader;
  });

  return [...manualHeaders, ...mergedAutoHeaders];
};
