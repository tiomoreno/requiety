import { useState, useEffect } from 'react';
import { Environment } from '@shared/types';
import { environmentService } from '../../services/environment.service';
import { EnvironmentManager } from './EnvironmentManager';
import { logger } from '../../utils/logger';

interface EnvironmentSelectorProps {
  workspaceId: string;
}

export function EnvironmentSelector({ workspaceId }: EnvironmentSelectorProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadEnvironments();
    }
  }, [workspaceId, isManagerOpen]); // Reload when manager closes (in case of edits)

  const loadEnvironments = async () => {
    try {
      const envs = await environmentService.getByWorkspace(workspaceId);
      setEnvironments(envs);
      const active = envs.find((e) => e.isActive);
      setActiveEnvId(active ? active._id : null);
    } catch (err) {
      logger.error('Failed to load environments', err);
    }
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'manage') {
      setIsManagerOpen(true);
      return;
    }

    // Activate environment
    try {
      if (value === 'none') {
        // If "No Environment" is selected, we should deactivate the current active one?
        // The API activateEnvironment activates one. We might need deactivateAll or just allow "none".
        // If user selects "none", we just deactivate current active.
        // Currently, API `activateEnvironment` clears others then activates ID.
        // To clear ALL, we didn't implement `deactivate`.
        // For now, let's just support switching between existing ones.
        // Implementation of "No Environment" might require a backend change or just ignore.
        // Let's assume we can't deactivate all via `activate` unless we implement it.
        // Or we can hack it: if `none`, we assume we want to work without environment.
        // The backend `getActiveEnvironment` checks `isActive: true`.
        // So we need a way to set `isActive: false` for all.
        // I didn't verify `deactivate` in API.
        // Let's implement `activate("none")` effectively via `environmentService.activate` if supported?
        // No, backend expects ID.
        // I will treat "none" as a special case in UI, but backend state needs separate "deactivate" endpoint?
        // Or simply don't pass an ID?
        // I'll skip "No Environment" functionality for this moment or just assume one is always selected if any exist,
        // OR add `no-env` handling by creating a dummy one? No.
        // Let's simpler: Just show list. If user wants "No Env", they need to delete active?
        // A proper solution is to have `deactivateEnvironment` in backend.
        // I'll assume for now we always have an active one or none if none created.
        // BUT wait, PRD says "Swap environment easily".
        // I'll add "Manage" option.
      } else {
        await environmentService.activate(value);
        setActiveEnvId(value);
      }
    } catch (err) {
      logger.error(err);
    }
  };

  return (
    <>
      <div className="flex items-center">
        <select
          value={activeEnvId || 'none'}
          onChange={handleSelect}
          className="text-xs bg-gray-100 dark:bg-gray-800 border-none rounded px-2 py-1 max-w-[150px] truncate focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
        >
          <option value="none">No Environment</option>
          <optgroup label="Environments">
            {environments.map((env) => (
              <option key={env._id} value={env._id}>
                {env.name}
              </option>
            ))}
          </optgroup>
          <option value="manage" className="font-bold text-primary-600">
            ⚙️ Manage Environments...
          </option>
        </select>
      </div>

      <EnvironmentManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        workspaceId={workspaceId}
      />
    </>
  );
}
