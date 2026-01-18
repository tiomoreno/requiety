import { useState, useEffect } from 'react';
import { Dialog } from '../common/Dialog';
import { useSettings } from '../../contexts/SettingsContext';
import { Settings } from '../../../shared/types';
import { SyncSettings } from './SyncSettings';

export function SettingsModal() {
  const { settings, updateSettings, isSettingsOpen, closeSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({});

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        theme: settings.theme,
        timeout: settings.timeout,
        fontSize: settings.fontSize,
        followRedirects: settings.followRedirects,
        validateSSL: settings.validateSSL,
      });
    }
  }, [settings, isSettingsOpen]);

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      closeSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleChange = (field: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  if (!settings) return null;

  return (
    <Dialog isOpen={isSettingsOpen} onClose={closeSettings} title="Settings">
      <div className="space-y-6 p-4">
        {/* Appearance */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 border-b pb-1 dark:border-gray-700">Appearance</h3>
          <div className="grid grid-cols-2 gap-4 items-center">
            <label className="text-sm text-gray-700 dark:text-gray-300">Theme</label>
            <select
              value={localSettings.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">System (Auto)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center mt-3">
             <label className="text-sm text-gray-700 dark:text-gray-300">Font Size (px)</label>
             <input
               type="number"
               value={localSettings.fontSize}
               onChange={(e) => handleChange('fontSize', parseInt(e.target.value) || 14)}
               className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
             />
          </div>
        </div>

        {/* Request Defaults */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 border-b pb-1 dark:border-gray-700">Request Defaults</h3>
          <div className="grid grid-cols-2 gap-4 items-center">
            <label className="text-sm text-gray-700 dark:text-gray-300">Timeout (ms)</label>
            <input
              type="number"
              value={localSettings.timeout}
              onChange={(e) => handleChange('timeout', parseInt(e.target.value) || 0)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            />
          </div>
          
           <div className="flex items-center mt-3">
             <input
               id="follow-redirects"
               type="checkbox"
               checked={localSettings.followRedirects}
               onChange={(e) => handleChange('followRedirects', e.target.checked)}
               className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
             />
             <label htmlFor="follow-redirects" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Follow Redirects</label>
           </div>
           
           <div className="flex items-center mt-3">
             <input
               id="validate-ssl"
               type="checkbox"
               checked={localSettings.validateSSL}
               onChange={(e) => handleChange('validateSSL', e.target.checked)}
               className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
             />
             <label htmlFor="validate-ssl" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Validate SSL Certificates</label>
           </div>
        </div>

        {/* Git Sync */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 border-b pb-1 dark:border-gray-700">Git Sync</h3>
          <SyncSettings />
        </div>
      
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            className="text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          >
            Save & Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
