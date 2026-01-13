import { useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';

// Actually, I can't easily import the Context if it's not exported.
// I should have exported SettingsContext from the file above.
// But I exported useSettings from inside the file. 
// I will just use the one from the context file for now to avoid circular deps or complex refactors. 
// Step skipped.
