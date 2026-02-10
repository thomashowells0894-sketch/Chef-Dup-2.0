import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReAnimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Plus,
  Check,
  Bot,
  RotateCcw,
} from 'lucide-react-native';
import { hapticLight, hapticImpact, hapticSuccess } from '../lib/haptics';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { chatWithNutritionist } from '../services/ai';
import { useAIContext } from '../hooks/useAIContext';
import { useFood } from '../context/FoodContext';
import { useFasting } from '../context/FastingContext';
import { useOffline } from '../context/OfflineContext';

const STORAGE_KEY = '@vibefit_chat_history';
const MAX_STORED_MESSAGES = 50;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Typing indicator with sequentially pulsing dots
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 200);
    const a3 = animateDot(dot3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(12)} style={styles.typingContainer}>
      <View style={styles.aiBubbleAvatar}>
        <Bot size={16} color={Colors.primary} />
      </View>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.typingDot, { opacity: dot1, transform: [{ scale: dot1 }] }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot2, transform: [{ scale: dot2 }] }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot3, transform: [{ scale: dot3 }] }]} />
        </View>
      </View>
    </ReAnimated.View>
  );
}

// Suggestion chip component
function SuggestionChip({ text, onPress }) {
  return (
    <Pressable style={styles.suggestionChip} onPress={() => onPress(text)}>
      <Text style={styles.suggestionChipText} numberOfLines={1}>{text}</Text>
    </Pressable>
  );
}

// Food item card in AI response
function FoodItemCard({ food, onAdd, added, foodKey }) {
  return (
    <View style={styles.foodCard}>
      <Text style={styles.foodCardEmoji}>{food.emoji || '🍽️'}</Text>
      <View style={styles.foodCardInfo}>
        <Text style={styles.foodCardName} numberOfLines={1}>{food.name}</Text>
        <Text style={styles.foodCardMacros}>
          {food.calories} kcal · P{food.protein}g · C{food.carbs}g · F{food.fat}g
        </Text>
        <Text style={styles.foodCardServing}>{food.serving}</Text>
      </View>
      <Pressable
        style={[styles.foodCardAddButton, added && styles.foodCardAddedButton]}
        onPress={() => !added && onAdd(food, foodKey)}
        disabled={added}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={added ? "Food added" : "Add food to diary"}
        accessibilityRole="button"
      >
        {added ? (
          <Check size={16} color={Colors.primary} />
        ) : (
          <Plus size={16} color={Colors.background} />
        )}
      </Pressable>
    </View>
  );
}

// Format timestamp for message display
function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const hours = date.getHours();
  const mins = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const time = `${hour12}:${mins} ${ampm}`;
  if (isToday) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

// Message bubble component
function MessageBubble({ message, onAddFood, addedFoods }) {
  const isUser = message.role === 'user';

  return (
    <ReAnimated.View
      entering={FadeInDown.springify().damping(12)}
      style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowUser]}
    >
      {!isUser && (
        <View style={styles.aiBubbleAvatar}>
          <Bot size={16} color={Colors.primary} />
        </View>
      )}
      <View style={styles.messageBubbleContent}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {message.content}
          </Text>

          {/* Food items if present */}
          {!isUser && message.foodItems && message.foodItems.length > 0 && (
            <View style={styles.foodItemsContainer}>
              {message.foodItems.map((food, idx) => {
                const foodKey = `${message.id}-${idx}`;
                return (
                  <FoodItemCard
                    key={idx}
                    food={food}
                    onAdd={onAddFood}
                    added={addedFoods.has(foodKey)}
                    foodKey={foodKey}
                  />
                );
              })}
            </View>
          )}
        </View>
        <Text style={[styles.messageTimestamp, isUser && styles.messageTimestampUser]}>
          {formatMessageTime(message.timestamp)}
        </Text>
      </View>
    </ReAnimated.View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const userContext = useAIContext();
  const { addFood } = useFood();
  const { recordMealLogged } = useFasting();
  const { isOnline } = useOffline();
  const flatListRef = useRef(null);
  const messagesRef = useRef([]);
  const isNearBottomRef = useRef(true);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [addedFoods, setAddedFoods] = useState(new Set());
  const [conversationId, setConversationId] = useState(0);

  // Load conversation history
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        // Ignore load errors
      }
      setHasLoadedHistory(true);
    })();
  }, []);

  // Send initial greeting on first open (no history) or after new conversation
  useEffect(() => {
    if (!hasLoadedHistory) return;
    if (messages.length > 0) return;

    const name = userContext.name || 'there';
    const hour = new Date().getHours();
    const calories = userContext.todayCalories || 0;
    const calorieGoal = userContext.calorieGoal || 0;
    const remaining = userContext.remainingCalories;
    const protein = userContext.todayProtein || 0;
    const proteinGoal = userContext.proteinGoal || 0;
    const streak = userContext.streak || 0;

    // Time-aware greeting
    let timeGreeting;
    if (hour < 6) timeGreeting = `Burning the midnight oil, ${name}?`;
    else if (hour < 10) timeGreeting = `Good morning, ${name}!`;
    else if (hour < 14) timeGreeting = `Hey ${name}, hope your day's going well!`;
    else if (hour < 18) timeGreeting = `Good afternoon, ${name}!`;
    else if (hour < 22) timeGreeting = `Good evening, ${name}!`;
    else timeGreeting = `Still going, ${name}? Let's finish strong.`;

    const parts = [timeGreeting];

    // Fasting context
    if (userContext.isFasting) {
      parts.push("You're in a fasting window right now — stay strong!");
    }

    // Calorie context
    if (calories > 0 && calorieGoal > 0) {
      const pct = Math.round((calories / calorieGoal) * 100);
      if (pct >= 90) {
        parts.push(`You've hit ${calories} kcal (${pct}% of your goal) — nearly done for the day!`);
      } else if (pct >= 50) {
        parts.push(`${calories} kcal logged (${pct}% of ${calorieGoal}), with ${remaining} kcal to go.`);
      } else {
        parts.push(`${calories} kcal logged so far — plenty of room in your ${calorieGoal} kcal budget.`);
      }
    } else if (calories === 0 && hour >= 8 && !userContext.isFasting) {
      parts.push("You haven't logged anything yet today — ready to get started?");
    }

    // Protein check
    if (proteinGoal > 0 && protein > 0) {
      const proteinPct = Math.round((protein / proteinGoal) * 100);
      if (proteinPct < 40 && hour >= 14) {
        parts.push(`Heads up: protein is at ${proteinPct}% — let's make sure you hit your target.`);
      } else if (proteinPct >= 80) {
        parts.push(`Protein is looking great at ${proteinPct}%!`);
      }
    }

    // Streak
    if (streak > 3) {
      parts.push(`${streak}-day streak — incredible consistency!`);
    } else if (streak > 1) {
      parts.push(`${streak}-day streak — keep it going!`);
    }

    parts.push('How can I help?');

    // Contextual suggestion chips
    const contextSuggestions = [];
    if (hour >= 11 && hour < 14 && calories < calorieGoal * 0.3) {
      contextSuggestions.push('What should I eat for lunch?');
    } else if (hour >= 17 && hour < 21) {
      contextSuggestions.push('Suggest a healthy dinner');
    } else {
      contextSuggestions.push('What should I eat next?');
    }

    if (proteinGoal > 0 && protein < proteinGoal * 0.5 && hour >= 12) {
      contextSuggestions.push('High-protein meal ideas');
    } else {
      contextSuggestions.push('How are my macros looking?');
    }
    contextSuggestions.push('Give me a healthy snack idea');

    const greetingMsg = {
      id: generateId(),
      role: 'assistant',
      content: parts.join(' '),
      timestamp: Date.now(),
      foodItems: [],
    };
    setMessages([greetingMsg]);
    setSuggestions(contextSuggestions);
  }, [hasLoadedHistory, conversationId]);

  // Keep messagesRef in sync for stale-closure-free access
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persist messages
  useEffect(() => {
    if (!hasLoadedHistory) return;
    if (messages.length === 0) return;
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore)).catch(() => {});
  }, [messages, hasLoadedHistory]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || isLoading) return;

    if (!isOnline) {
      Alert.alert('No Connection', 'AI chat requires an internet connection.');
      return;
    }

    await hapticLight();

    Keyboard.dismiss();
    setInputText('');
    setSuggestions([]);

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages(prev => {
      const updated = [...prev, userMsg];
      return updated.length > MAX_STORED_MESSAGES ? updated.slice(-MAX_STORED_MESSAGES) : updated;
    });
    setIsLoading(true);

    try {
      // Build conversation history using ref for latest messages (avoids stale closure)
      const history = [...messagesRef.current, userMsg]
        .slice(-20)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

      const response = await chatWithNutritionist(trimmed, history, userContext);

      const aiMsg = {
        id: generateId(),
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
        foodItems: response.foodItems || [],
      };

      setMessages(prev => {
        const updated = [...prev, aiMsg];
        return updated.length > MAX_STORED_MESSAGES ? updated.slice(-MAX_STORED_MESSAGES) : updated;
      });
      setSuggestions(response.suggestions || []);

      await hapticLight();
    } catch (error) {
      const errorMsg = {
        id: generateId(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
        foodItems: [],
      };
      setMessages(prev => {
        const updated = [...prev, errorMsg];
        return updated.length > MAX_STORED_MESSAGES ? updated.slice(-MAX_STORED_MESSAGES) : updated;
      });
      setSuggestions(['Try again', 'What should I eat?']);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, isOnline, userContext]);

  const handleAddFood = useCallback((food, foodKey) => {
    // Determine meal type based on time of day
    const hour = new Date().getHours();
    let mealType = 'snacks';
    if (hour < 11) mealType = 'breakfast';
    else if (hour < 14) mealType = 'lunch';
    else if (hour < 20) mealType = 'dinner';

    const foodEntry = {
      id: generateId(),
      name: food.name,
      emoji: food.emoji || '🍽️',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      serving: food.serving || '1 serving',
      servingSize: 1,
      servingUnit: 'serving',
    };

    addFood(foodEntry, mealType);
    recordMealLogged(mealType);

    hapticSuccess();

    // Inline confirmation — button switches to checkmark
    if (foodKey) {
      setAddedFoods(prev => new Set(prev).add(foodKey));
    }
  }, [addFood, recordMealLogged]);

  const handleSuggestionPress = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleNewConversation = useCallback(() => {
    Alert.alert(
      'New Conversation',
      'Start a fresh chat? Your current conversation will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Fresh',
          style: 'destructive',
          onPress: () => {
            hapticImpact();
            AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
            // Batch all state updates synchronously to avoid race conditions
            setMessages([]);
            setSuggestions([]);
            setAddedFoods(new Set());
            setConversationId(prev => prev + 1);
          },
        },
      ]
    );
  }, []);

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)} style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack} hitSlop={4} accessibilityLabel="Go back" accessibilityRole="button">
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerIcon}>
              <Sparkles size={18} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>VibeFit AI</Text>
          </View>
          <Pressable style={styles.newChatButton} onPress={handleNewConversation}>
            <RotateCcw size={18} color={Colors.textSecondary} />
          </Pressable>
        </ReAnimated.View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} onAddFood={handleAddFood} addedFoods={addedFoods} />
          )}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={({ nativeEvent }) => {
            const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
            const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
            isNearBottomRef.current = distanceFromBottom < 150;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />

        {/* Suggestions */}
        {suggestions.length > 0 && !isLoading && (
          <ReAnimated.View entering={FadeInUp.springify().damping(12)} style={styles.suggestionsContainer}>
            {suggestions.map((s, idx) => (
              <SuggestionChip key={idx} text={s} onPress={handleSuggestionPress} />
            ))}
          </ReAnimated.View>
        )}

        {/* Input Area */}
        <ReAnimated.View entering={FadeInUp.delay(100).springify().damping(12)} style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask your AI nutritionist..."
              placeholderTextColor={Colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Send size={20} color={Colors.background} />
              )}
            </Pressable>
          </View>
        </ReAnimated.View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Messages
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    maxWidth: '85%',
  },
  messageBubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiBubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
    marginBottom: 2,
  },
  messageBubbleContent: {
    flexShrink: 1,
    maxWidth: '100%',
  },
  messageBubble: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    maxWidth: '100%',
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: Colors.primary + '20',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.text,
  },
  messageTimestamp: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 3,
    marginLeft: 2,
  },
  messageTimestampUser: {
    textAlign: 'right',
    marginRight: 2,
  },

  // Food items in messages
  foodItemsContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  foodCardEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  foodCardInfo: {
    flex: 1,
  },
  foodCardName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  foodCardMacros: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  foodCardServing: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  foodCardAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  foodCardAddedButton: {
    backgroundColor: Colors.primary + '20',
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  typingBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: 4,
    padding: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  // Suggestions
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    maxWidth: '95%',
  },
  suggestionChipText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  // Input
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.button,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
});
