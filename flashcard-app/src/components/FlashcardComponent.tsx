import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Flashcard } from '../types';
import { usePerformanceMonitor, throttle } from '../utils/performance';
import { AnimationPresets, createPressAnimation } from '../utils/animations';
import { FlashcardAccessibility, useScreenReader } from '../utils/accessibility';

interface FlashcardComponentProps {
  flashcard: Flashcard;
  onMemoPress?: () => void;
  showMemoButton?: boolean;
  showBack?: boolean;
  onFlip?: () => void;
  style?: any;
}

export const FlashcardComponent: React.FC<FlashcardComponentProps> = React.memo(({
  flashcard,
  onMemoPress,
  showMemoButton = true,
  showBack,
  onFlip,
  style,
}) => {
  const { measure } = usePerformanceMonitor('FlashcardComponent');
  const { isScreenReaderEnabled, announceForAccessibility } = useScreenReader();
  const [isFlipped, setIsFlipped] = useState(showBack || false);
  const [flipAnimation] = useState(new Animated.Value(showBack ? 1 : 0));
  const [pressAnimation] = useState(new Animated.Value(1));

  // Update flip state when showBack prop changes
  React.useEffect(() => {
    if (showBack !== undefined && showBack !== isFlipped) {
      const toValue = showBack ? 1 : 0;
      Animated.timing(flipAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setIsFlipped(showBack);
    }
  }, [showBack, isFlipped, flipAnimation]);

  // Memoize card width calculation
  const cardWidth = useMemo(() => {
    const { width } = Dimensions.get('window');
    return Math.min(width - 40, 350);
  }, []);

  // Press animation handlers
  const { animateIn: pressIn, animateOut: pressOut } = useMemo(
    () => createPressAnimation(pressAnimation, 0.95, AnimationPresets.quick),
    [pressAnimation]
  );

  // Throttled flip function to prevent rapid tapping
  const flipCard = useCallback(
    throttle(() => {
      measure('flipCard', () => {
        const toValue = isFlipped ? 0 : 1;
        
        Animated.timing(flipAnimation, {
          toValue,
          ...AnimationPresets.smooth,
        }).start();
        
        setIsFlipped(!isFlipped);
        onFlip?.();

        // Accessibility announcement
        if (isScreenReaderEnabled) {
          const side = isFlipped ? '表面' : '裏面';
          const content = isFlipped ? flashcard.word : flashcard.translation;
          announceForAccessibility(`${side}を表示: ${content}`);
        }
      });
    }, 400), // Throttle to prevent rapid flips
    [isFlipped, flipAnimation, onFlip, measure, isScreenReaderEnabled, announceForAccessibility, flashcard]
  );

  // Memoize animation interpolations
  const animatedStyles = useMemo(() => {
    const frontInterpolate = flipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    const backInterpolate = flipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '360deg'],
    });

    return {
      front: { transform: [{ rotateY: frontInterpolate }] },
      back: { transform: [{ rotateY: backInterpolate }] },
    };
  }, [flipAnimation]);

  const renderFront = useCallback(() => (
    <Animated.View style={[styles.cardFace, animatedStyles.front, { width: cardWidth }]}>
      <View style={styles.cardContent}>
        <Text style={styles.mainText}>{flashcard.word}</Text>
        {flashcard.wordPronunciation && (
          <Text style={styles.pronunciationText}>
            /{flashcard.wordPronunciation}/
          </Text>
        )}
        <Text style={styles.sideLabel}>表面</Text>
      </View>
    </Animated.View>
  ), [animatedStyles.front, cardWidth, flashcard.word, flashcard.wordPronunciation]);

  const renderBack = useCallback(() => (
    <Animated.View style={[styles.cardFace, styles.cardBack, animatedStyles.back, { width: cardWidth }]}>
      <View style={styles.cardContent}>
        <Text style={styles.mainText}>{flashcard.translation}</Text>
        {flashcard.translationPronunciation && (
          <Text style={styles.pronunciationText}>
            /{flashcard.translationPronunciation}/
          </Text>
        )}
        <Text style={styles.sideLabel}>裏面</Text>
      </View>
    </Animated.View>
  ), [animatedStyles.back, cardWidth, flashcard.translation, flashcard.translationPronunciation]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ transform: [{ scale: pressAnimation }] }}>
        <TouchableOpacity
          style={styles.cardContainer}
          onPress={flipCard}
          onPressIn={pressIn}
          onPressOut={pressOut}
          activeOpacity={0.8}
          {...(isFlipped 
            ? FlashcardAccessibility.cardFlipped({
                word: flashcard.word,
                translation: flashcard.translation,
                memo: flashcard.memo || undefined
              })
            : FlashcardAccessibility.card({
                word: flashcard.word,
                translation: flashcard.translation,
                memo: flashcard.memo || undefined
              })
          )}
        >
          <View style={[styles.card, { width: cardWidth }]}>
            {renderFront()}
            {renderBack()}
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      {showMemoButton && (
        <TouchableOpacity
          style={[styles.memoButton, !flashcard.memo && styles.memoButtonDisabled]}
          onPress={flashcard.memo ? onMemoPress : undefined}
          activeOpacity={flashcard.memo ? 0.7 : 1}
          {...FlashcardAccessibility.memoButton(!!flashcard.memo)}
        >
          <Text style={[styles.memoButtonText, !flashcard.memo && styles.memoButtonTextDisabled]}>
            📝 メモ{flashcard.memo ? '' : ' (なし)'}
          </Text>
        </TouchableOpacity>
      )}
      
      {!isScreenReaderEnabled && (
        <TouchableOpacity
          style={styles.flipHint}
          onPress={flipCard}
          activeOpacity={0.6}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        >
          <Text style={styles.flipHintText}>
            タップして{isFlipped ? '表面' : '裏面'}を表示
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardContainer: {
    marginBottom: 15,
  },
  card: {
    height: 200,
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBack: {
    backgroundColor: '#f8f9fa',
    borderColor: '#007AFF',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  pronunciationText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  sideLabel: {
    position: 'absolute',
    top: 10,
    right: 15,
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  memoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  memoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  memoButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  memoButtonTextDisabled: {
    color: '#d1d5db',
  },
  flipHint: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  flipHintText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});