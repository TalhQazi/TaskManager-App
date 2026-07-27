import React from "react";
import { Text, Linking, StyleSheet } from "react-native";

const MENTION_REGEX = /@[A-Za-z][\w.'-]*(?: [A-Z][\w.'-]*){0,2}/g;

function renderPlainSegment(text: string, isMe: boolean | undefined, keyPrefix: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const phoneRegex = /(\+?[0-9]{7,15})/g;

  // Split tokens to isolate links and numbers while keeping spacing intact
  const tokens = text.split(/(\s+)/);

  return tokens.map((token, index) => {
    const uniqueKey = `${keyPrefix}-${index}`;

    // 1. Handle Active URL Redirections
    if (token.match(urlRegex)) {
      return (
        <Text
          key={uniqueKey}
          style={[styles.linkText, isMe ? styles.linkMe : styles.linkOther]}
          onPress={() => Linking.openURL(token).catch((err) => console.error("URL failed", err))}
        >
          {token}
        </Text>
      );
    }

    // 2. Handle Dialable Phone Numbers
    if (token.match(phoneRegex)) {
      return (
        <Text
          key={uniqueKey}
          style={[styles.phoneText, isMe ? styles.phoneMe : styles.phoneOther]}
          onPress={() => Linking.openURL(`tel:${token}`).catch((err) => console.error("Dial failed", err))}
        >
          {token}
        </Text>
      );
    }

    // 3. Plain text pass-through fallback
    return token;
  });
}

export function renderMessageContent(text: string, isMe?: boolean) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderPlainSegment(text.slice(lastIndex, match.index), isMe, `seg-${lastIndex}`));
    }
    
    // 4. Handle Mention Highlights
    parts.push(
      <Text
        key={`mention-${match.index}`}
        style={[styles.mentionBadge, isMe ? styles.mentionMe : styles.mentionOther]}
      >
        {` ${match[0]} `}
      </Text>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderPlainSegment(text.slice(lastIndex), isMe, `seg-${lastIndex}`));
  }

  // Wrapped inside a base container style stack
  return <Text style={styles.baseMessageText}>{parts}</Text>;
}

const styles = StyleSheet.create({
  baseMessageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#c9d1d9",
  },
  linkText: {
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
  linkOther: { color: "#58a6ff" },
  linkMe: { color: "#c8e1ff" },
  phoneText: {
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  phoneOther: { color: "#34d399" },
  phoneMe: { color: "#a7f3d0" },
  mentionBadge: {
    fontWeight: "bold",
  },
  mentionOther: {
    color: "#818cf8",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  mentionMe: {
    color: "#fef08a",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
});