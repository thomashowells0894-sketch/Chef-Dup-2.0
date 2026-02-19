/**
 * SocialPostCard - Premium social feed post component
 * Features: expandable comments, reaction picker (long-press), comment input
 */
import React, { memo, useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Pressable, ActivityIndicator, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trophy, Dumbbell, Utensils, Camera, Target, Send, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight, Shadows } from '../constants/theme';

const POST_ICONS = {
  achievement: Trophy,
  workout: Dumbbell,
  meal: Utensils,
  progress: Camera,
  milestone: Target,
};

const POST_COLORS = {
  achievement: '#FFD700',
  workout: '#00D4FF',
  meal: '#00E676',
  progress: '#FF6B35',
  milestone: '#BF5AF2',
};

const REACTION_TYPES = [
  { key: 'fire', emoji: '\uD83D\uDD25', label: 'Fire' },
  { key: 'clap', emoji: '\uD83D\uDC4F', label: 'Clap' },
  { key: 'flex', emoji: '\uD83D\uDCAA', label: 'Flex' },
  { key: 'heart', emoji: '\u2764\uFE0F', label: 'Heart' },
];

const INITIAL_COMMENTS_SHOWN = 3;

function SocialPostCard({ post, onLike, onComment, onShare, onMore, onReaction, onFetchComments, onAddComment, onReport, onBlock }) {
  const [showFullContent, setShowFullContent] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const longPressTimer = useRef(null);
  const IconComponent = POST_ICONS[post.type] || Trophy;
  const accentColor = POST_COLORS[post.type] || Colors.primary;

  const handleLike = useCallback(() => {
    if (showReactionPicker) {
      setShowReactionPicker(false);
      return;
    }
    onLike?.(post.id);
  }, [post.id, onLike, showReactionPicker]);

  const handleReaction = useCallback((reactionType) => {
    setShowReactionPicker(false);
    if (onReaction) {
      onReaction(post.id, reactionType);
    } else {
      onLike?.(post.id, reactionType);
    }
  }, [post.id, onLike, onReaction]);

  const handleLongPressIn = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 400);
  }, []);

  const handleLongPressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleToggleComments = useCallback(async () => {
    if (!showComments && onFetchComments) {
      setCommentsLoading(true);
      try {
        const fetchedComments = await onFetchComments(post.id);
        setComments(fetchedComments || []);
      } catch {
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    }
    setShowComments(prev => !prev);
  }, [showComments, onFetchComments, post.id]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = onAddComment
        ? await onAddComment(post.id, commentText.trim())
        : await onComment?.(post.id, commentText.trim());
      if (newComment) {
        setComments(prev => [...prev, newComment]);
        setCommentText('');
      }
    } catch {
      // Comment submission failed silently
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, submittingComment, post.id, onAddComment, onComment]);

  const timeAgo = getTimeAgo(post.createdAt);
  const truncatedContent = post.content?.length > 200 && !showFullContent
    ? post.content.substring(0, 200) + '...'
    : post.content;

  const visibleComments = showAllComments ? comments : comments.slice(0, INITIAL_COMMENTS_SHOWN);
  const hasMoreComments = comments.length > INITIAL_COMMENTS_SHOWN && !showAllComments;

  // Build reaction summary from post.reactions (e.g. { fire: 3, heart: 1 })
  const reactions = post.reactions || {};
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  const hasReactions = totalReactions > 0;
  const userReaction = post.userReaction || null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']} style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {post.avatarUrl ? (
              <Image source={{ uri: post.avatarUrl }} style={styles.avatar} cachePolicy="memory-disk" transition={200} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{(post.userName || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{post.userName}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.typeBadge, { backgroundColor: accentColor + '20' }]}>
                  <IconComponent size={10} color={accentColor} />
                  <Text style={[styles.typeText, { color: accentColor }]}>{post.type}</Text>
                </View>
                <Text style={styles.timeText}>{timeAgo}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              const options = ['Report Post', 'Block User', 'Cancel'];
              const cancelIndex = 2;
              const destructiveIndex = 1;

              if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                  { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
                  (buttonIndex) => {
                    if (buttonIndex === 0) onReport?.(post);
                    else if (buttonIndex === 1) onBlock?.(post);
                    else onMore?.(post.id);
                  }
                );
              } else {
                Alert.alert('Post Options', undefined, [
                  { text: 'Report Post', onPress: () => onReport?.(post) },
                  { text: 'Block User', style: 'destructive', onPress: () => onBlock?.(post) },
                  { text: 'Cancel', style: 'cancel', onPress: () => onMore?.(post.id) },
                ]);
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreHorizontal size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {post.content && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowFullContent(!showFullContent)}>
            <Text style={styles.content}>{truncatedContent}</Text>
          </TouchableOpacity>
        )}

        {/* Image */}
        {post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} contentFit="cover" cachePolicy="memory-disk" transition={300} />
        )}

        {/* Metadata card (e.g., workout stats, meal macros) */}
        {post.metadata && Object.keys(post.metadata).length > 0 && (
          <View style={styles.metadataCard}>
            {post.metadata.calories && <MetaStat label="Calories" value={post.metadata.calories} unit="kcal" />}
            {post.metadata.duration && <MetaStat label="Duration" value={post.metadata.duration} unit="min" />}
            {post.metadata.protein && <MetaStat label="Protein" value={post.metadata.protein} unit="g" />}
            {post.metadata.xp && <MetaStat label="XP Earned" value={`+${post.metadata.xp}`} color="#FFD700" />}
          </View>
        )}

        {/* Reaction summary */}
        {hasReactions && (
          <View style={styles.reactionSummary}>
            {Object.entries(reactions)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const reactionDef = REACTION_TYPES.find(r => r.key === type);
                if (!reactionDef) return null;
                return (
                  <View key={type} style={[styles.reactionBubble, userReaction === type && styles.reactionBubbleActive]}>
                    <Text style={styles.reactionEmoji}>{reactionDef.emoji}</Text>
                    <Text style={[styles.reactionCount, userReaction === type && styles.reactionCountActive]}>{count}</Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Reaction Picker (shown on long-press) */}
        {showReactionPicker && (
          <View style={styles.reactionPicker}>
            {REACTION_TYPES.map((reaction) => (
              <Pressable
                key={reaction.key}
                style={[styles.reactionOption, userReaction === reaction.key && styles.reactionOptionActive]}
                onPress={() => handleReaction(reaction.key)}
              >
                <Text style={styles.reactionPickerEmoji}>{reaction.emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={handleLike}
            onPressIn={handleLongPressIn}
            onPressOut={handleLongPressOut}
          >
            <Heart
              size={18}
              color={post.isLiked || userReaction ? '#FF5252' : Colors.textTertiary}
              fill={post.isLiked || userReaction ? '#FF5252' : 'none'}
            />
            <Text style={[styles.actionText, (post.isLiked || userReaction) && styles.likedText]}>
              {totalReactions || post.likesCount || ''}
            </Text>
          </Pressable>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleComments}>
            <MessageCircle size={18} color={showComments ? Colors.primary : Colors.textTertiary} />
            <Text style={[styles.actionText, showComments && { color: Colors.primary }]}>
              {post.commentsCount || ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => onShare?.(post.id)}>
            <Share2 size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Expandable Comment Section */}
        {showComments && (
          <View style={styles.commentsSection}>
            {commentsLoading ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.commentsLoadingText}>Loading comments...</Text>
              </View>
            ) : (
              <>
                {comments.length === 0 && (
                  <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
                )}

                {visibleComments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}

                {hasMoreComments && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => setShowAllComments(true)}
                  >
                    <Text style={styles.viewAllText}>
                      View all {comments.length} comments
                    </Text>
                    <ChevronDown size={14} color={Colors.primary} />
                  </TouchableOpacity>
                )}

                {showAllComments && comments.length > INITIAL_COMMENTS_SHOWN && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => setShowAllComments(false)}
                  >
                    <Text style={styles.viewAllText}>Show less</Text>
                    <ChevronUp size={14} color={Colors.primary} />
                  </TouchableOpacity>
                )}

                {/* Comment Input */}
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={Colors.textMuted}
                    value={commentText}
                    onChangeText={setCommentText}
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmitComment}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSubmitComment}
                    disabled={!commentText.trim() || submittingComment}
                  >
                    {submittingComment ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Send size={16} color={commentText.trim() ? Colors.primary : Colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function CommentItem({ comment }) {
  const timeAgo = getTimeAgo(comment.createdAt || comment.created_at);

  return (
    <View style={styles.commentItem}>
      {comment.avatarUrl ? (
        <Image source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} cachePolicy="memory-disk" transition={200} />
      ) : (
        <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
          <Text style={styles.commentAvatarText}>
            {(comment.userName || comment.user_name || '?')[0].toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{comment.userName || comment.user_name || 'Anonymous'}</Text>
          <Text style={styles.commentTime}>{timeAgo}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content || comment.body || ''}</Text>
      </View>
    </View>
  );
}

function MetaStat({ label, value, unit, color }) {
  return (
    <View style={styles.metaStat}>
      <Text style={[styles.metaValue, color && { color }]}>{value}{unit ? ` ${unit}` : ''}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

function getTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, ...Shadows.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.sm },
  avatarPlaceholder: { backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  nameContainer: { flex: 1 },
  userName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: Spacing.xs },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 3 },
  typeText: { fontSize: 10, fontWeight: FontWeight.medium, textTransform: 'capitalize' },
  timeText: { color: Colors.textTertiary, fontSize: FontSize.xs },
  content: { color: Colors.text, fontSize: FontSize.md, lineHeight: 22, marginBottom: Spacing.sm },
  postImage: { width: '100%', height: 200, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  metadataCard: { flexDirection: 'row', backgroundColor: Colors.surfaceGlass, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.md },
  metaStat: { alignItems: 'center', flex: 1 },
  metaValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  metaLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

  // Reaction summary
  reactionSummary: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reactionBubbleActive: {
    borderColor: Colors.primary + '50',
    backgroundColor: Colors.primarySoft,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  reactionCountActive: { color: Colors.primary },

  // Reaction picker
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  reactionOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
  },
  reactionOptionActive: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  reactionPickerEmoji: { fontSize: 22 },

  // Actions
  actions: { flexDirection: 'row', gap: Spacing.lg, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: Colors.textTertiary, fontSize: FontSize.sm },
  likedText: { color: '#FF5252' },

  // Comments section
  commentsSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  commentsLoadingText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
  },
  noCommentsText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },

  // Comment item
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  commentAvatarPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  commentBody: {
    flex: 1,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentUserName: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  commentTime: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  commentText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },

  // View all comments
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },

  // Comment input
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default memo(SocialPostCard);
