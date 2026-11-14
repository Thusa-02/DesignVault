import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Single Artwork Image View with Pinch-to-Zoom, Pan, and Double-Tap Zoom.
 */
function ZoomableArtwork({ uri, onSwipeNext, onSwipePrev }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const currentScale = useRef(1);
  const currentPan = useRef({ x: 0, y: 0 });
  const initialDistance = useRef(null);
  const lastTap = useRef(0);

  // Reset zoom and pan whenever image URI changes
  useEffect(() => {
    resetTransform();
  }, [uri]);

  const resetTransform = () => {
    currentScale.current = 1;
    currentPan.current = { x: 0, y: 0 };
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
    ]).start();
  };

  const setZoom = (targetScale) => {
    currentScale.current = targetScale;
    if (targetScale === 1) {
      currentPan.current = { x: 0, y: 0 };
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.spring(scale, { toValue: targetScale, useNativeDriver: true }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.numberActiveTouches > 1 || Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,

      onPanResponderGrant: (evt) => {
        // Double tap detection
        const now = Date.now();
        if (now - lastTap.current < 300) {
          if (currentScale.current > 1.2) {
            resetTransform();
          } else {
            setZoom(2.5);
          }
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;

        if (evt.nativeEvent.touches.length === 2) {
          const [t1, t2] = evt.nativeEvent.touches;
          initialDistance.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        }
      },

      onPanResponderMove: (evt, gesture) => {
        if (evt.nativeEvent.touches.length === 2 && initialDistance.current) {
          // Pinch to zoom
          const [t1, t2] = evt.nativeEvent.touches;
          const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          let newScale = (dist / initialDistance.current) * currentScale.current;
          newScale = Math.max(1, Math.min(newScale, 4));
          scale.setValue(newScale);
        } else if (evt.nativeEvent.touches.length === 1 && currentScale.current > 1.05) {
          // Pan when zoomed in
          const maxPanX = (SCREEN_WIDTH * (currentScale.current - 1)) / 2;
          const maxPanY = (SCREEN_HEIGHT * (currentScale.current - 1)) / 2;
          const newX = Math.max(-maxPanX, Math.min(maxPanX, currentPan.current.x + gesture.dx));
          const newY = Math.max(-maxPanY, Math.min(maxPanY, currentPan.current.y + gesture.dy));
          pan.setValue({ x: newX, y: newY });
        }
      },

      onPanResponderRelease: (_, gesture) => {
        initialDistance.current = null;

        // If zoomed in, persist the scale and pan offsets
        if (currentScale.current > 1.05) {
          scale.stopAnimation((val) => {
            currentScale.current = Math.max(1, Math.min(val, 4));
          });
          pan.stopAnimation((val) => {
            currentPan.current = val;
          });
        } else {
          // At normal scale: horizontal swipe detection to navigate artworks
          if (gesture.dx < -50 && onSwipeNext) {
            onSwipeNext();
          } else if (gesture.dx > 50 && onSwipePrev) {
            onSwipePrev();
          }
        }
      },
    })
  ).current;

  return (
    <View style={styles.imageViewerContainer} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        style={[
          styles.fullImage,
          {
            transform: [
              { scale },
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          },
        ]}
        resizeMode="contain"
      />

      {/* Quick Zoom Buttons for accessibility */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => {
            const next = Math.min(currentScale.current + 0.75, 4);
            setZoom(next);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="magnify-plus-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>

        {currentScale.current > 1.05 && (
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={resetTransform}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="magnify-minus-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Fullscreen Artwork Gallery Viewer Modal
 */
export default function ArtworkGalleryViewer({
  visible,
  onClose,
  artworks = [],
  initialIndex = 0,
  projectTitle = '',
}) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  if (!visible || !artworks || artworks.length === 0) {
    return null;
  }

  const currentArtwork = artworks[currentIndex] || artworks[0];

  const handleNext = () => {
    if (currentIndex < artworks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      <View style={[styles.modalBackdrop, { paddingTop: Math.max(insets.top, 14) }]}>
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.topCenterInfo}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {artworks.length}
            </Text>
            {projectTitle ? (
              <Text style={styles.projectSubtitle} numberOfLines={1}>
                {projectTitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.topRightSpacer} />
        </View>

        {/* Center Swipeable / Zoomable Artwork Container */}
        <View style={styles.centerContainer}>
          <ZoomableArtwork
            uri={currentArtwork.image_uri}
            onSwipeNext={handleNext}
            onSwipePrev={handlePrev}
          />

          {/* Left Arrow (if previous exists) */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.arrowButton, styles.leftArrow]}
              onPress={handlePrev}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="chevron-left" size={32} color={COLORS.white} />
            </TouchableOpacity>
          )}

          {/* Right Arrow (if next exists) */}
          {currentIndex < artworks.length - 1 && (
            <TouchableOpacity
              style={[styles.arrowButton, styles.rightArrow]}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="chevron-right" size={32} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Details Footer */}
        <View
          style={[
            styles.bottomFooter,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Text style={styles.artworkTitle} numberOfLines={2}>
            {currentArtwork.artwork_title || `Design #${currentIndex + 1}`}
          </Text>

          <View style={styles.hintsRow}>
            <Text style={styles.hintText}>
              {artworks.length > 1 ? 'Swipe left / right to navigate • ' : ''}
              Pinch or double-tap to zoom
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    zIndex: 10,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCenterInfo: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  counterText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  projectSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  topRightSpacer: {
    width: 42,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageViewerContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  arrowButton: {
    position: 'absolute',
    top: '48%',
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  leftArrow: {
    left: 10,
  },
  rightArrow: {
    right: 10,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    zIndex: 30,
  },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomFooter: {
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  artworkTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  hintsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    textAlign: 'center',
  },
});
