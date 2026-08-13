import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import type { Card, Suit } from '@/utils/blackjack';

const CARD_WIDTH = 64;
const CARD_HEIGHT = 92;
const OVERLAP = 30;

const SUIT_ICON: Record<Suit, keyof typeof MaterialCommunityIcons.glyphMap> = {
  hearts: 'cards-heart',
  diamonds: 'cards-diamond',
  clubs: 'cards-club',
  spades: 'cards-spade',
};

const RED_SUITS: readonly Suit[] = ['hearts', 'diamonds'];

type PlayingCardProps = {
  card: Card;
  faceDown?: boolean;
};

export function PlayingCard({ card, faceDown }: PlayingCardProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
    // Re-run only when the card identity changes, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.rank, card.suit, faceDown]);

  const animatedStyle = {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
    ],
  };

  if (faceDown) {
    return (
      <Animated.View style={[styles.card, styles.cardBack, animatedStyle]}>
        <MaterialCommunityIcons name="cards-playing-outline" size={26} color={Colors.light.surface} />
      </Animated.View>
    );
  }

  const isRed = RED_SUITS.includes(card.suit);
  const color = isRed ? Colors.light.accent : Colors.light.text;

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.corner}>
        <Text style={[styles.rank, { color }]}>{card.rank}</Text>
        <MaterialCommunityIcons name={SUIT_ICON[card.suit]} size={12} color={color} />
      </View>
      <MaterialCommunityIcons name={SUIT_ICON[card.suit]} size={26} color={color} style={styles.centerSuit} />
      <View style={[styles.corner, styles.cornerBottom]}>
        <Text style={[styles.rank, { color }]}>{card.rank}</Text>
        <MaterialCommunityIcons name={SUIT_ICON[card.suit]} size={12} color={color} />
      </View>
    </Animated.View>
  );
}

type HandProps = {
  cards: Card[];
  hideSecondCard?: boolean;
};

export function Hand({ cards, hideSecondCard }: HandProps) {
  return (
    <View style={styles.hand}>
      {cards.map((card, index) => (
        <View key={`${card.rank}-${card.suit}-${index}`} style={index > 0 ? { marginLeft: -OVERLAP } : undefined}>
          <PlayingCard card={card} faceDown={hideSecondCard && index === 1} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    padding: 6,
    justifyContent: 'space-between',
    shadowColor: Colors.light.shadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardBack: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    alignItems: 'center',
  },
  cornerBottom: {
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  rank: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 16,
  },
  centerSuit: {
    alignSelf: 'center',
  },
});
