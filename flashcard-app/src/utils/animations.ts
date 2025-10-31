/**
 * Animation utilities for improved user experience
 */

import React from 'react';
import { Animated, Easing } from 'react-native';

export interface AnimationConfig {
  duration?: number;
  easing?: (value: number) => number;
  useNativeDriver?: boolean;
  delay?: number;
}

/**
 * Default animation configurations
 */
export const AnimationPresets = {
  // Quick animations for immediate feedback
  quick: {
    duration: 150,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  },
  
  // Standard animations for most UI interactions
  standard: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  
  // Smooth animations for complex transitions
  smooth: {
    duration: 500,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    useNativeDriver: true,
  },
  
  // Bounce effect for playful interactions
  bounce: {
    duration: 600,
    easing: Easing.bounce,
    useNativeDriver: true,
  },
  
  // Spring animation for natural feel
  spring: {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  },
} as const;

/**
 * Fade animation utilities
 */
export class FadeAnimation {
  private animatedValue: Animated.Value;

  constructor(initialValue: number = 0) {
    this.animatedValue = new Animated.Value(initialValue);
  }

  fadeIn(config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: 1,
        ...config,
      }).start(() => resolve());
    });
  }

  fadeOut(config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: 0,
        ...config,
      }).start(() => resolve());
    });
  }

  fadeToggle(config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    const currentValue = (this.animatedValue as any)._value;
    const toValue = currentValue > 0.5 ? 0 : 1;
    
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue,
        ...config,
      }).start(() => resolve());
    });
  }

  getAnimatedStyle() {
    return {
      opacity: this.animatedValue,
    };
  }

  getValue(): Animated.Value {
    return this.animatedValue;
  }
}

/**
 * Scale animation utilities
 */
export class ScaleAnimation {
  private animatedValue: Animated.Value;

  constructor(initialValue: number = 1) {
    this.animatedValue = new Animated.Value(initialValue);
  }

  scaleIn(config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: 1,
        ...config,
      }).start(() => resolve());
    });
  }

  scaleOut(config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: 0,
        ...config,
      }).start(() => resolve());
    });
  }

  pulse(config: AnimationConfig = AnimationPresets.quick): Promise<void> {
    return new Promise((resolve) => {
      Animated.sequence([
        Animated.timing(this.animatedValue, {
          toValue: 1.1,
          ...config,
        }),
        Animated.timing(this.animatedValue, {
          toValue: 1,
          ...config,
        }),
      ]).start(() => resolve());
    });
  }

  getAnimatedStyle() {
    return {
      transform: [{ scale: this.animatedValue }],
    };
  }

  getValue(): Animated.Value {
    return this.animatedValue;
  }
}

/**
 * Slide animation utilities
 */
export class SlideAnimation {
  private animatedValue: Animated.Value;

  constructor(initialValue: number = 0) {
    this.animatedValue = new Animated.Value(initialValue);
  }

  slideInFromLeft(distance: number = 300, config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    this.animatedValue.setValue(-distance);
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: 0,
        ...config,
      }).start(() => resolve());
    });
  }

  slideInFromRight(distance: number = 300, config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    this.animatedValue.setValue(distance);
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: 0,
        ...config,
      }).start(() => resolve());
    });
  }

  slideOutToLeft(distance: number = 300, config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: -distance,
        ...config,
      }).start(() => resolve());
    });
  }

  slideOutToRight(distance: number = 300, config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: distance,
        ...config,
      }).start(() => resolve());
    });
  }

  getAnimatedStyle() {
    return {
      transform: [{ translateX: this.animatedValue }],
    };
  }

  getValue(): Animated.Value {
    return this.animatedValue;
  }
}

/**
 * Rotation animation utilities
 */
export class RotationAnimation {
  private animatedValue: Animated.Value;

  constructor(initialValue: number = 0) {
    this.animatedValue = new Animated.Value(initialValue);
  }

  rotate(degrees: number, config: AnimationConfig = AnimationPresets.standard): Promise<void> {
    return new Promise((resolve) => {
      Animated.timing(this.animatedValue, {
        toValue: degrees,
        ...config,
      }).start(() => resolve());
    });
  }

  spin(config: AnimationConfig = { duration: 1000, useNativeDriver: true }): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.timing(this.animatedValue, {
        toValue: 360,
        ...config,
      })
    );
  }

  getAnimatedStyle() {
    const rotate = this.animatedValue.interpolate({
      inputRange: [0, 360],
      outputRange: ['0deg', '360deg'],
    });

    return {
      transform: [{ rotate }],
    };
  }

  getValue(): Animated.Value {
    return this.animatedValue;
  }
}

/**
 * Combined animation utilities
 */
export class CombinedAnimation {
  private animations: { [key: string]: Animated.Value } = {};

  constructor(initialValues: { [key: string]: number } = {}) {
    Object.keys(initialValues).forEach(key => {
      this.animations[key] = new Animated.Value(initialValues[key]);
    });
  }

  addAnimation(name: string, initialValue: number = 0): void {
    this.animations[name] = new Animated.Value(initialValue);
  }

  parallel(animations: { [key: string]: { toValue: number; config?: AnimationConfig } }): Promise<void> {
    const animationArray = Object.keys(animations).map(key => {
      const { toValue, config = AnimationPresets.standard } = animations[key];
      return Animated.timing(this.animations[key], {
        toValue,
        ...config,
      });
    });

    return new Promise((resolve) => {
      Animated.parallel(animationArray).start(() => resolve());
    });
  }

  sequence(animations: { name: string; toValue: number; config?: AnimationConfig }[]): Promise<void> {
    const animationArray = animations.map(({ name, toValue, config = AnimationPresets.standard }) =>
      Animated.timing(this.animations[name], {
        toValue,
        ...config,
      })
    );

    return new Promise((resolve) => {
      Animated.sequence(animationArray).start(() => resolve());
    });
  }

  stagger(
    delay: number,
    animations: { name: string; toValue: number; config?: AnimationConfig }[]
  ): Promise<void> {
    const animationArray = animations.map(({ name, toValue, config = AnimationPresets.standard }) =>
      Animated.timing(this.animations[name], {
        toValue,
        ...config,
      })
    );

    return new Promise((resolve) => {
      Animated.stagger(delay, animationArray).start(() => resolve());
    });
  }

  getAnimatedValue(name: string): Animated.Value | undefined {
    return this.animations[name];
  }

  getAllAnimatedValues(): { [key: string]: Animated.Value } {
    return this.animations;
  }
}

/**
 * React hooks for animations
 */
export function useFadeAnimation(initialValue: number = 0) {
  const [animation] = React.useState(() => new FadeAnimation(initialValue));
  return animation;
}

export function useScaleAnimation(initialValue: number = 1) {
  const [animation] = React.useState(() => new ScaleAnimation(initialValue));
  return animation;
}

export function useSlideAnimation(initialValue: number = 0) {
  const [animation] = React.useState(() => new SlideAnimation(initialValue));
  return animation;
}

export function useRotationAnimation(initialValue: number = 0) {
  const [animation] = React.useState(() => new RotationAnimation(initialValue));
  return animation;
}

export function useCombinedAnimation(initialValues: { [key: string]: number } = {}) {
  const [animation] = React.useState(() => new CombinedAnimation(initialValues));
  return animation;
}

/**
 * Gesture-based animations
 */
export function createPressAnimation(
  animatedValue: Animated.Value,
  pressedScale: number = 0.95,
  config: AnimationConfig = AnimationPresets.quick
) {
  const animateIn = () => {
    Animated.timing(animatedValue, {
      toValue: pressedScale,
      ...config,
    }).start();
  };

  const animateOut = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      ...config,
    }).start();
  };

  return { animateIn, animateOut };
}

/**
 * List item animations
 */
export function createListItemAnimation(index: number, delay: number = 50) {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * delay,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getAnimatedStyle = () => ({
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  });

  return { animateIn, getAnimatedStyle };
}