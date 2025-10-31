// Component for highlighting search terms in text

import React from 'react';
import { Text, TextStyle } from 'react-native';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  numberOfLines?: number;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  searchTerm,
  style,
  highlightStyle = { backgroundColor: '#fef3c7', fontWeight: 'bold' },
  numberOfLines,
}) => {
  if (!searchTerm || !text) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        const isHighlight = regex.test(part);
        return (
          <Text
            key={index}
            style={isHighlight ? [style, highlightStyle] : style}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};