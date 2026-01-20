import CodeMirror from '@uiw/react-codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { graphql } from 'cm6-graphql';
import { useSettings } from '@renderer/contexts/SettingsContext';
import React, { useEffect, useState } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'json' | 'javascript' | 'graphql';
  readOnly?: boolean;
  schema?: any; // Using any for now to avoid explicit GraphQL dependency if not strictly needed, but better to import types.
}

// Custom theme configuration
const getTheme = (isDark: boolean) => {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: isDark ? '#111827' : '#ffffff', // gray-900 or white
        color: isDark ? '#e5e7eb' : '#374151', // gray-200 or gray-700
        height: '100%',
      },
      '.cm-scroller': {
        fontFamily: 'Fira Code, monospace',
      },
      '.cm-gutters': {
        backgroundColor: isDark ? '#111827' : '#ffffff',
        color: isDark ? '#6b7280' : '#9ca3af', // gray-500 or gray-400
        borderRight: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark ? '#1f2937' : '#f3f4f6', // gray-800 or gray-100
      },
      '.cm-activeLine': {
        backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      },
      '.cm-cursor': {
        borderLeftColor: isDark ? '#e5e7eb' : '#374151',
      },
    },
    { dark: isDark }
  );
};

export function CodeEditor({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  schema,
}: CodeEditorProps) {
  const { settings } = useSettings();

  // Initialize based on system preference to avoid flash
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (settings?.theme) {
      if (settings.theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        setIsDark(settings.theme === 'dark');
      }
    }
  }, [settings?.theme]);

  const themeExtension = React.useMemo(() => {
    return getTheme(isDark);
  }, [isDark]);

  const extensions = React.useMemo(() => {
    const exts = [
      EditorView.lineWrapping,
      // Global bracket configuration via languageData (must be a function returning array)
      EditorState.languageData.of(() => [
        {
          closeBrackets: { brackets: ['(', '[', '{', "'", '"'] },
        },
      ]),
    ];
    if (language === 'json') {
      exts.push(json());
    } else if (language === 'javascript') {
      exts.push(javascript());
    } else if (language === 'graphql') {
      exts.push(graphql(schema));
    }
    return exts;
  }, [language, schema]);

  return (
    <div className="h-full w-full text-sm">
      <CodeMirror
        key={isDark ? 'dark' : 'light'}
        className="h-full"
        value={value}
        height="100%"
        theme={themeExtension}
        extensions={extensions}
        onChange={onChange}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true, // Use default extension
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true, // Use default keymap
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  );
}
