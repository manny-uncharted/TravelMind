'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  MessageSquare,
  Sparkles,
  Calendar,
  MapPin,
  DollarSign,
  HelpCircle,
  Edit3,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
  interactionType?: 'question' | 'modification';
}

interface ChatInterfaceProps {
  planId: string;
  initialData: any;
  onPlanUpdate?: (updatedPlan: any) => void;
}

export function ChatInterface({ planId, initialData, onPlanUpdate }: ChatInterfaceProps) {
  console.log('🗣️ ChatInterface initialized with:', { planId, initialData: !!initialData, onPlanUpdate: !!onPlanUpdate });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI travel assistant. I've analyzed your travel plan for **${initialData?.itinerary?.destination || 'your destination'}**. 

I can help you in two ways:

🤔 **Ask Questions**: Get details about your itinerary, costs, activities, locations, and timing
✏️ **Make Changes**: Modify your itinerary, add/remove activities, adjust budget, or find alternatives

**Example Questions:**
- "What's planned for day 2?"
- "How much will accommodation cost?"
- "What time does the museum tour start?"

**Example Modifications:**
- "Add a food tour to day 3"
- "Find cheaper hotel options"
- "Remove the early morning activity"

What would you like to know or change?`,
      timestamp: Date.now(),
      suggestions: [
        '❓ What activities are planned for each day?',
        '💰 What\'s the total budget breakdown?',
        '🍽️ Add more restaurant recommendations',
        '🏛️ Include more cultural experiences',
        '💡 Suggest budget-friendly alternatives'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-with-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          message: content,
          currentPlan: initialData,
          chatHistory: messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const result = await response.json();

      // Create assistant response message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
        suggestions: result.suggestions,
        interactionType: result.interactionType
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle different interaction types
      if (result.interactionType === 'modification' && result.updatedPlan && onPlanUpdate) {
        console.log('🔄 Sending plan update to parent:', result.updatedPlan);
        onPlanUpdate(result.updatedPlan);
        toast.success('Travel plan updated successfully! Check the Itinerary tab to see changes.');
        
        // Add a visual indicator message for modifications
        const updateNotification: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: '✅ **Itinerary Modified!** Your travel plan has been updated. Switch to the Itinerary tab to see the changes.',
          timestamp: Date.now(),
          interactionType: 'modification'
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, updateNotification]);
        }, 1000);
      } else if (result.interactionType === 'question') {
        console.log('💬 Question answered about the itinerary');
        // You can add additional logic here for question-specific handling
      } else {
        console.log('ℹ️ No plan update needed or no callback provided');
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Chat with Your Travel Plan
          <Badge variant="outline" className="ml-auto">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Assistant
          </Badge>
        </CardTitle>
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary" className="flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Ask Questions
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Make Changes
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    {/* Add interaction type indicator for assistant messages */}
                    {message.role === 'assistant' && message.interactionType && (
                      <div className="flex items-center gap-1 mb-1 text-xs text-gray-500">
                        {message.interactionType === 'question' ? (
                          <>
                            <HelpCircle className="w-3 h-3" />
                            <span>Information</span>
                          </>
                        ) : message.interactionType === 'modification' ? (
                          <>
                            <Edit3 className="w-3 h-3" />
                            <span>Modification Applied</span>
                          </>
                        ) : null}
                      </div>
                    )}
                    
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white ml-auto' 
                        : message.interactionType === 'modification'
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {message.role === 'assistant' ? (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          className="prose prose-sm dark:prose-invert max-w-none"
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                    
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="bg-green-100 text-green-600">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Thinking...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask questions or request changes to your travel plan..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <div className="flex gap-2 mt-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleSendMessage('What\'s the total cost breakdown?')}
            >
              <HelpCircle className="w-3 h-3 mr-1" />
              Cost Info
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleSendMessage('What activities are planned for each day?')}
            >
              <Info className="w-3 h-3 mr-1" />
              Daily Plans
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleSendMessage('Add more budget-friendly options')}
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Budget Options
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleSendMessage('Add cultural activities to day 2')}
            >
              <Calendar className="w-3 h-3 mr-1" />
              Add Activities
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}